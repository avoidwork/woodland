<img src="https://avoidwork.github.io/woodland/logo.svg" width="108" />

# woodland

[![build status](https://secure.travis-ci.org/avoidwork/woodland.svg)](http://travis-ci.org/avoidwork/woodland)

Lightweight HTTP/HTTPS router with virtual hosts. Sets an accurate `Allow` header based on routes. Routes can use parameter syntax, i.e. `/users/:id`, or `RegExp` syntax. Route parameters are not sanitized. If 2+ routes with parameters match a request the first route will be used to extract parameters.

`CORS` (Cross Origin Resource Sharing) is automatically handled, and indicated with `cors` Boolean on the `response` Object for middleware.

Route validation is also built in! Requests that try to "bust out" of a website's folder is blocked.

All HTTP methods are supported.

## Example

```javascript
"use strict";

const http = require("http"),
	router = require("woodland")({defaultHeaders: {"Cache-Control": "no-cache", "Content-Type": "text/plain"}});

router.use("/", (req, res) => res.end("Hello World!"));
router.use("/:user", (req, res) => res.end("Hello " + req.params.user + "!"));
http.createServer(router.route).listen(8000);
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

##### woodland ({cacheSize: 1000, defaultHeaders: {}, defaultHost: "localhost", hosts: ["localhost"], seed: random})
Returns a woodland router.

##### allowed (method, uri, host, override = false)
Calls `routes()` and returns a `Boolean` to indicate if `method` is allowed for `uri`.

##### allows (uri, host, override = false)
Returns a `String` for the `Allow` header. Caches value, & will update cache if `override` is `true`.

##### blacklist (fn)
Blacklists `fn` for calculating the return of `allows()`.

##### decorate (req, res)
Decorates `allow`, `body`, `ip`, `params`, `parsed`, `query`, & `host` on `req` and `header()` & `locals{}` on `res`.

##### hash (arg)
Returns a murmur3hash of `arg`.

##### host (arg)
Determines the `host` for `arg`.

##### list (method = "get")
Returns an `Array` of routes for the specified method.

##### route (req, res)
Function for `http.createServer()` or `https.createServer()`.

##### routes (uri, host, method, override = false)
Returns an `Array` of middleware for the request. Caches value, & will update cache if `override` is `true`.

##### setHost (arg)
Registers a virtual host with the woodland.

##### use (path, fn, method = "GET", host = "all")
Registers middleware for a route. `path` is a regular expression, and if not passed it defaults to `/.*`. `method` can be `all` if you want the middleware to be used for all HTTP methods.

## License
Copyright (c) 2017 Jason Mulligan
Licensed under the BSD-3 license.
