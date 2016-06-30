# woodland

[![build status](https://secure.travis-ci.org/avoidwork/woodland.svg)](http://travis-ci.org/avoidwork/woodland)

Lightweight HTTP/HTTPS router with virtual hosts. Sets an accurate `Allow` header based on routes.

## Example

```javascript
"use strict";

const http = require("http");
let router = require("woodland")({defaultHeaders: {"Cache-Control": "no-cache"}});

router.use("/", (req, res) => {
	res.writeHead(200, {"Content-Type": "text/plain"});
	res.end("Hello World!");
});

http.createServer(router.route).listen(8000);
```

## Event Handlers
##### onclose (req, res)
Executes if the connection was terminated before `res.end()` was called or able to flush.

##### onerror (req, res, err)
Executes if the request cannot be routed, default handler sends a basic text response.

##### onfinish (req, res)
Executes after the response has been sent.

## API

##### woodland ({cacheSize: 1000, defaultHeaders: {}, defaultHost: "127.0.0.1", hosts: [], seed: random})
Returns a woodland router.

##### allowed (method, uri, host, override = false)
Calls `routes()` and returns a `Boolean` to indicate if `method` is allowed for `uri`.

##### allows (uri, host, override = false)
Returns a `String` for the `Allow` header. Caches value, & will update cache if `override` is `true`.

##### blacklist (fn)
Blacklists `fn` for calculating the return of `allows()`.

##### decorate (req, res)
Decorates `allow`, `body`, `ip`, `parsed`, `query`, & `host` on `req` and `header()` & `locals{}` on `res`.

##### hash (arg)
Returns a murmur3hash of `arg`.

##### host (arg)
Determines the `host` for `arg`.

##### route (req, res)
Function for `http.createServer()` or `https.createServer()`.

##### routes (uri, host, method, override = false)
Returns an `Array` of middleware for the request. Caches value, & will update cache if `override` is `true`.

##### setHost (arg)
Registers a virtual host with the woodland.

##### use (path, fn, method = "GET", host = "all")
Registers middleware for a route; `path` is a regular expression, and if not passed it defaults to `/.*`.

##### url (req)
Constructs a full URL from `req`.

## License
Copyright (c) 2016 Jason Mulligan
Licensed under the BSD-3 license.