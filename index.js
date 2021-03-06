var _ = require("underscore")
var Net = require("net")
var Tls = require("tls")
var Http = require("http")
var Https = require("https")
var ClientRequest = Http.ClientRequest
var Socket = Net.Socket
var EventEmitter = require("events").EventEmitter
var InternalSocket = require("./lib/internal_socket")
var Stubs = require("./lib/stubs")
var normalizeConnectArgs = Net._normalizeConnectArgs
var createRequestAndResponse = Http._connectionListener
module.exports = Mitm

function Mitm() {
  if (!(this instanceof Mitm))
    return Mitm.apply(Object.create(Mitm.prototype), arguments).enable()

  this.stubs = new Stubs
  this.on("request", addCrossReferences)

  return this
}

Mitm.prototype.on = EventEmitter.prototype.on
Mitm.prototype.once = EventEmitter.prototype.once
Mitm.prototype.off = EventEmitter.prototype.off
Mitm.prototype.removeListener = EventEmitter.prototype.removeListener
Mitm.prototype.emit = EventEmitter.prototype.emit

var NODE_0_10 = !!process.version.match(/^v0\.10\./)

Mitm.prototype.enable = function() {
  // Connect is called synchronously.
  var netConnect = connect.bind(this, Net.connect)
  this.stubs.stub(Net, "connect", netConnect)
  this.stubs.stub(Net, "createConnection", netConnect)
  this.stubs.stub(Http.Agent.prototype, "createConnection", netConnect)

  if (NODE_0_10) {
    // Node v0.10 sets createConnection on the object in the constructor.
    this.stubs.stub(Http.globalAgent, "createConnection", netConnect)

    // This will create a lot of sockets in tests, but that's the current price
    // to pay until I find a better way to force a new socket for each
    // connection.
    this.stubs.stub(Http.globalAgent, "maxSockets", Infinity)
    this.stubs.stub(Https.globalAgent, "maxSockets", Infinity)
  }

  // Fake a regular, non-SSL socket for now as TLSSocket requires more mocking.
  this.stubs.stub(Tls, "connect", _.compose(authorize, netConnect))

  // ClientRequest.prototype.onSocket is called synchronously from
  // ClientRequest's consturctor and is a convenient place to hook into new
  // ClientRequests.
  var onSocket = _.compose(ClientRequest.prototype.onSocket, request.bind(this))
  this.stubs.stub(ClientRequest.prototype, "onSocket", onSocket)

  return this
}

Mitm.prototype.disable = function() {
  return this.stubs.restore(), this
}

function connect(orig, opts, done) {
  var args = normalizeConnectArgs(Array.prototype.slice.call(arguments, 1))
  opts = args[0]; done = args[1]

  var sockets = InternalSocket.pair()
  var client = new Socket(_.defaults({handle: sockets[0]}, opts))
  client.bypass = bypass

  this.emit("connect", client, opts)
  if (client.bypassed) return orig.call(this, opts, done)

  // The callback is originally bound to the connect event in
  // Socket.prototype.connect.
  if (done) client.once("connect", done)

  var server = client.server = new Socket({handle: sockets[1]})
  this.emit("connection", server, opts)

  // Emit connect in the next tick, otherwise it would be impossible to
  // listen to it after calling Net.connect.
  process.nextTick(client.emit.bind(client, "connect"))
  process.nextTick(server.emit.bind(server, "connect"))

  return client
}

function authorize(socket) {
  return socket.authorized = true, socket
}

function bypass() { this.bypassed = true }

function request(socket) {
  if (!socket.server) return socket

  // Node >= v0.10.24 < v0.11 will crash with: «Assertion failed:
  // (!current_buffer), function Execute, file ../src/node_http_parser.cc, line
  // 387.» if ServerResponse.prototype.write is called from within the
  // "request" event handler. Call it in the next tick to work around that.
  var self = this
  if (NODE_0_10) {
    self = Object.create(this)
    self.emit = _.compose(process.nextTick, Function.bind.bind(this.emit, this))
  }

  return createRequestAndResponse.call(self, socket.server), socket
}

function addCrossReferences(req, res) { req.res = res; res.req = req }
