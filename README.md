<img src="https://avoidwork.github.io/woodland/logo.svg" width="108" />

# woodland

[![build status](https://secure.travis-ci.org/avoidwork/woodland.svg)](http://travis-ci.org/avoidwork/woodland)

Lightweight HTTP/HTTP2 router with automatic `Allow` & `CORS` headers. Routes can use parameter syntax, i.e. `/users/:id`, or `RegExp` syntax. Route parameters are not sanitized. If 2+ routes with parameters match a request the first route will be used to extract parameters. All HTTP methods are supported.

`CORS` (Cross Origin Resource Sharing) is automatically handled, and indicated with `cors` Boolean on the `request` Object for middleware.

Middleware arguments can be `req, res, next` or `error, req, res, next`. If no `Error` handling middleware is registered woodland will handle it.

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

router.get("/", (req, res) => res.send("Hello World!"));
router.get("/:user", (req, res) => res.send(`Hello ${req.params.user}!`));

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

router.get("/", (req, res) => res.send("Hello World!"));
router.get("/:user", (req, res) => res.send(`Hello ${req.params.user}!`));

http2.createSecureServer({
	key: fs.readFileSync("./ssl/localhost.key"),
	cert: fs.readFileSync("./ssl/localhost.crt")
}).on("stream", router.route).listen(8443);

```

## Helpers
`res` is decorated with helper functions to simplify responding.

##### res.error (status[, body, headers])
Sends an error response.

##### res.json (body, [status = 200, headers])
Sends a JSON response.

##### res.redirect (uri[, perm = false])
Sends a redirection response.

##### res.send (body, [status = 200, headers = {}])
Sends a response. `Range` header is ignored on `stream` responses.

##### res.status (arg)
Sets the response `statusCode` property & status.

## Event Handlers
##### onconnect (req, res)
Executes after the connection has been decorated, but before the middleware executes.

##### onerror (req, res, err)
Executes if the request cannot be routed, default handler sends a basic text response.

##### onsend (req, res, body, status, headers) [async]
Executes before the response has been sent; arguments are by reference such that they can be mutated.

*Must* return **body**!

##### onfinish (req, res)
Executes after the response has been sent.

## API
##### woodland ({cacheSize: 1000, cacheTTL: 0, defaultHeaders: {}, http2: false, dtrace: false, origins: ["*"]})
Returns a woodland router.

##### allowed (method, uri, override = false)
Calls `routes()` and returns a `Boolean` to indicate if `method` is allowed for `uri`.

##### allows (uri, override = false)
Returns a `String` for the `Allow` header. Caches value, & will update cache if `override` is `true`.

##### always (path, fn)
Registers middleware for a route for all HTTP methods; runs first. `path` is a regular expression (as a string), and if not passed it defaults to `/.*`.

Execute `blacklist(fn)` if you do not want the middleware included for calculating the `Allow` header.

##### blacklist (fn)
Blacklists `fn` for calculating the return of `allows()`.

##### decorate (req, res)
Decorates `allow, body, cors, host, ip, params, & parsed` on `req` and `error(status[, body, headers]), header(key, value), json(body[, status, headers]), locals{} & redirect(url[, perm = false])` on `res`.

##### list (method = "get", type = "array")
Returns an `Array` or `Object` of routes for the specified method.

##### route (req, res)
Function for `http.createServer()` or `https.createServer()`.

##### routes (uri, method, override = false)
Returns an `Array` of middleware for the request. Caches value, & will update cache if `override` is `true`.

##### use ([path = "/.*",] ...fn[, method = "GET"])
Registers middleware for a route. `path` is a regular expression (as a string), and if not passed it defaults to `/.*`. See `always()` if you want the middleware to be used for all HTTP methods.

All HTTP methods are available on the prototype (partial application of the third argument), e.g. `get([path,] ...fn)` & `options([path,] ...fn)`.

## DTrace
DTrace probes are in a set of core functions, which can be enabled by setting `dtrace: true` for factory options, and watched with `dtrace.sh`; not recommended for production.

## License
Copyright (c) 2019 Jason Mulligan
Licensed under the BSD-3 license.
