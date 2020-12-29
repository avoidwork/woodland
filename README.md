<img src="https://avoidwork.github.io/woodland/logo.svg" width="108" />

# woodland

[![build status](https://secure.travis-ci.org/avoidwork/woodland.svg)](http://travis-ci.org/avoidwork/woodland)

Lightweight HTTP router with automatic headers. Routes can use parameter syntax, i.e. `/users/:id`, or `RegExp` syntax. Route parameters are not sanitized. If 2+ routes with parameters match a request the first route will be used to extract parameters. All HTTP methods are supported.

`CORS` (Cross Origin Resource Sharing) is automatically handled, and indicated with `cors` Boolean on the `request` Object for middleware.

Middleware arguments can be `req, res, next` or `error, req, res, next`. If no `Error` handling middleware is registered woodland will handle it.

## Example
HTTP middleware have the same signature, such that `req` represents the request & `res` represents the response.

Switching between protocols is done with a boolean.

#### HTTP
```javascript
"use strict";

const http = require("http"),
	router = require("woodland")({
		defaultHeaders: {"Cache-Control": "no-cache", "Content-Type": "text/plain"}
	});

router.get("/", "Hello World!");
router.get("/:user", (req, res) => res.send(`Hello ${req.params.user}!`));

http.createServer(router.route).listen(8000);
```

## Helpers
`req` & `res` are decorated with helper functions to simplify responding.

##### res.error (status[, body, headers])
Sends an error response.

##### res.header (key, value)
Shorthand of `res.setHeader()`.

##### res.json (body, [status = 200, headers])
Sends a JSON response.

##### res.last (req, res, next)
Last middleware of the route for the HTTP method as a way to "skip" to the middleware which sends a response.

##### res.redirect (uri[, perm = false])
Sends a redirection response.

##### res.send (body, [status = 200, headers = {}])
Sends a response. `Range` header is ignored on `stream` responses.

##### res.status (arg)
Sets the response `statusCode` property & status.

## Event Handlers
Event Emitter syntax for the following events:

```javascript
router.on("connect", (req, res) => res.header("x-custom-header", "abc-def"));
```

##### connect (req, res)
Executes after the connection has been decorated, but before the middleware executes.

##### error (req, res, err)
Executes if the request cannot be routed, default handler sends a basic text response.

##### finish (req, res)
Executes after the response has been sent.

##### send (req, res, body, status, headers)
Executes before the response has been sent; arguments are by reference such that they can be mutated.

## API
##### woodland ({autoindex: false, cacheSize: 1000, cacheTTL: 300000, charset = "utf-8", defaultHeaders: {}, digit = 3, etags = true, indexes = ["index.htm", "index.html"], origins: ["*"], seed = 42, time = false})
Returns a woodland router. Enable directory browsing & traversal with `autoindex`. Create an automatic `x-response-time` response header with `time` & `digit`. Customize `etag` response header with `seed`.

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

##### etag (...args)
Returns a String to be used as an ETag response header value.

##### list (method = "get", type = "array")
Returns an `Array` or `Object` of routes for the specified method.

##### route (req, res)
Function for `http.createServer()` or `https.createServer()`.

##### routes (uri, method, override = false)
Returns an `Array` of middleware for the request. Caches value, & will update cache if `override` is `true`.

##### serve (req, res, localFilePath, folderPath, indexes = this.indexes)
Serve static files on disk. Use a route parameter or remove `folderPath` from `req.parsed.pathname` to create `localFilePath`.

###### Without `autoindex`
```javascript
router.use("/files/:file", (req, res) => router.serve(req, res, req.params.file, path.join(__dirname, "files")));
```

###### With `autoindex`
```javascript
router.use("/files(/.*)?", (req, res) => router.serve(req, res, req.parsed.pathname.replace(/^\/files\/?/, ""), join(__dirname, "files")));
```

##### use ([path = "/.*",] ...fn[, method = "GET"])
Registers middleware for a route. `path` is a regular expression (as a string), and if not passed it defaults to `/.*`. See `always()` if you want the middleware to be used for all HTTP methods.

All HTTP methods are available on the prototype (partial application of the third argument), e.g. `get([path,] ...fn)` & `options([path,] ...fn)`.

## License
Copyright (c) 2020 Jason Mulligan
Licensed under the BSD-3 license.
