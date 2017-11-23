<img src="https://avoidwork.github.io/woodland/logo.svg" width="108" />

# woodland

[![build status](https://secure.travis-ci.org/avoidwork/woodland.svg)](http://travis-ci.org/avoidwork/woodland)

Lightweight HTTP/HTTPS/HTTP2 router with automatic `Allow` & `CORS` headers. Routes can use parameter syntax, i.e. `/users/:id`, or `RegExp` syntax. Route parameters are not sanitized. If 2+ routes with parameters match a request the first route will be used to extract parameters. All HTTP methods are supported.

`CORS` (Cross Origin Resource Sharing) is automatically handled, and indicated with `cors` Boolean on the `request` Object for middleware.

## Example
HTTP1 & HTTP2 middleware have the same signature, such that `req` represents the request & `res` represents the response; with `http2` `res` is really `stream` with helper functions decorated for interop with older middleware & easy migration to `http2`.

Switching between protocols is done with a boolean.

#### HTTP
```javascript
"use strict";

const http = require("http"),
	router = require("woodland")({
		defaultHeaders: {"Cache-Control": "no-cache", "Content-Type": "text/plain"}
	});

router.use("/", (req, res) => res.end("Hello World!"));
router.use("/:user", (req, res) => res.end("Hello " + req.params.user + "!"));

http.createServer(router.route).listen(8000);
```

#### HTTP2
```javascript
"use strict";

const http2 = require("http2"),
	fs = require("fs"),
	router = require("woodland")({
		defaultHeaders: {"Cache-Control": "no-cache", "Content-Type": "text/plain"},
		http2: true
	});

router.use("/", (req, res) => res.send("Hello World!"));
router.use("/:user", (req, res) => res.send("Hello " + req.params.user + "!"));

http2.createSecureServer({
	key: fs.readFileSync("./ssl/localhost.key"),
	cert: fs.readFileSync("./ssl/localhost.crt")
}).on("stream", router.route).listen(8443);

```

## Event Handlers
##### onclose (req, res)
Executes if the connection was terminated before `res.end()` was called or able to flush.

##### onconnect (req, res)
Executes after the connection has been decorated, but before the middleware executes.

##### onerror (req, res, err)
Executes if the request cannot be routed, default handler sends a basic text response.

##### onfinish (req, res)
Executes after the response has been sent.

## API
##### woodland ({cacheSize: 1000, coerce: true, defaultHeaders: {}, http2: false, seed: random})
Returns a woodland router.

##### allowed (method, uri, override = false)
Calls `routes()` and returns a `Boolean` to indicate if `method` is allowed for `uri`.

##### allows (uri, override = false)
Returns a `String` for the `Allow` header. Caches value, & will update cache if `override` is `true`.

##### blacklist (fn)
Blacklists `fn` for calculating the return of `allows()`.

##### decorate (req, res)
Decorates `allow`, `body`, `ip`, `params`, `parsed`, `query`, & `host` on `req` and `header()` & `locals{}` on `res`.

##### hash (arg)
Returns a murmur3hash of `arg`.

##### list (method = "get", type = "array")
Returns an `Array` or `Object` of routes for the specified method.

##### route (req, res)
Function for `http.createServer()` or `https.createServer()`.

##### routes (uri, method, override = false)
Returns an `Array` of middleware for the request. Caches value, & will update cache if `override` is `true`.

##### use (path, fn, method = "GET")
Registers middleware for a route. `path` is a regular expression, and if not passed it defaults to `/.*`. `method` can be `all` if you want the middleware to be used for all HTTP methods.

## License
Copyright (c) 2017 Jason Mulligan
Licensed under the BSD-3 license.
