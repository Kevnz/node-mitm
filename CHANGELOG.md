## 0.5.0 (May 19, 2014)
- Adds bypass functionality to not intercept a particular outgoing connection
  and let it connect as usual.  
  Let a connection happen by calling `bypass` on the socket object given to the
  `connect` event:

  ```javascript
  var mitm = Mitm()
  mitm.on("connect", function(socket) { socket.bypass() })
  Net.connect({host: "example.org", port: 25})
  ```

- Emits `connect` and `connection` on Mitm with the _options_ object given to
  `Net.connect`.  
  You can use that with the above bypass functionality to bypass selectively:

  ```javascript
  mitm.on("connect", function(socket, opts) {
    if (opts.host == "sql.example.org" && opts.port = 5432) socket.bypass()
  })
  ```

## 0.4.1 (May 4, 2014)
- Adds [Travis CI](https://travis-ci.org) badge to the README.

## 0.4.0 (May 4, 2014)
- Adds support for Node v0.10.24 and up.
- Adds the `connection` event to Mitm to get the remote `Net.Socket`. You can
  use this to intercept and test any TCP code.  
  If you need the client side socket for any reason, listen to `connect` on
  Mitm.

- Replaces the `Http.ClientRequest` given to the `request` event on Mitm with
  a proper `Http.IncomingMessage` — just like a regular Node server would
  receive.  
  This ensures the requests you make are properly parseable according to HTTP
  specs (assuming Node.js itself is implemented according to spec) and also lets
  you assert on the content of `POST` requests.

  ```javascript
  var mitm = Mitm()
  Http.request({host: "x.org"}).end()
  mitm.on("request", function(req) { req.headers.host.must.equal("x.org") })
  ```

- Replaces [Concert.js](https://github.com/moll/js-concert) with Node's
  EventEmitter for now as I was not sure the extra features were required.  
  Remember kids, _if in doubt, leave it out_.

## 0.3.0 (Apr 26, 2014)
- Adds support for calling `Net.connect` with `port` and `host` arguments.

## 0.2.0 (Apr 19, 2014)
- Does not store requests on an instance of `Mitm` any longer.
- Adds `socket` event to `Mitm`.
- Updated to work with Node v0.11.12.

## 0.1.337 (Mar 11, 2014)
- First private release.
