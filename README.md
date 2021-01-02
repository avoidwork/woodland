<img src="https://avoidwork.github.io/woodland/logo.svg" width="108" />

# woodland

[![build status](https://secure.travis-ci.org/avoidwork/woodland.svg)](http://travis-ci.org/avoidwork/woodland)

Lightweight HTTP router with automatic headers. Routes can use parameter syntax, i.e. `/users/:id`, or `RegExp` syntax. Route parameters are not sanitized. If 2+ routes with parameters match a request the first route will be used to extract parameters. All HTTP methods are supported.

`CORS` (Cross Origin Resource Sharing) is automatically handled, and indicated with `cors` Boolean on the `request` Object for middleware.

Middleware arguments can be `req, res, next` or `error, req, res, next`. If no `Error` handling middleware is registered woodland will handle it.

## Benchmark
Please benchmark `woodland` on your target hardware to understand the overhead; expected to be 15-20%, e.g. if `http` can handle 50k req/s, then `woodland` should handle >= 40k req/s.

1. Clone repository from [GitHub](https://github.com/avoidwork/woodland).
1. Install dependencies with `npm` or `yarn`.
1. Execute `benchmark` script with `npm` or `yarn`.

## Command Line Interface (CLI)
When woodland is installed as a global module you can serve the contents of a folder by executing `woodland` in a shell. Optional parameters are `--ip=0.0.0.0` & `--port=8000`.

## Example
HTTP middleware have the same signature, such that `req` represents the request & `res` represents the response.

Switching between protocols is done with a boolean.

#### HTTP
```javascript
"use strict";

const http = require("http"),
	router = require("woodland")({defaultHeaders: {"cache-control": "public, max-age=3600", "content-type": "text/plain"}, time: true});

router.get("/", (req, res) => res.send("Custom greeting at '/:user', try it out!"));
router.get("/:user", (req, res) => res.send(`Hello ${req.params.user}!`));

http.createServer(router.route).listen(8000);
```

## API
##### woodland ([{...}])
Returns a woodland router. Enable directory browsing & traversal with `autoindex`. Create an automatic `x-response-time` response header with `time` & `digit`. Customize `etag` response header with `seed`.

See configuration options below.

##### allowed (method, uri, override = false)
Calls `routes()` and returns a `Boolean` to indicate if `method` is allowed for `uri`.

##### allows (uri, override = false)
Returns a `String` for the `Allow` header. Caches value, & will update cache if `override` is `true`.

##### always (path, fn)
Registers middleware for a route for all HTTP methods; runs first. `path` is a regular expression (as a string), and if not passed it defaults to `/.*`.

Execute `ignore(fn)` if you do not want the middleware included for calculating the `Allow` header.

##### ignore (fn)
Ignores `fn` for calculating the return of `allows()`.

##### decorate (req, res)
Decorates `allow, body, cors, host, ip, params, & parsed` on `req` and `error(status[, body, headers]), header(key, value), json(body[, status, headers]), locals{} & redirect(url[, perm = false])` on `res`.

##### etag (...args)
Returns a String to be used as an ETag response header value.

##### list (method = "get", type = "array")
Returns an `Array` or `Object` of routes for the specified method.

##### log (msg = "", level = "debug")
Logs to `stdout` or `stderr` depending on the `level`, & what the minimum log level is set to.

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

## Configuration

```json
{
  "autoindex": false,
  "cacheSize": 1000,
  "cacheTTL": 300000,
  "charset": "utf-8",
  "defaultHeaders": {},
  "digit": 3,
  "etags": true,
  "indexes": [
    "index.htm",
    "index.html"
  ],
  "logging": {
    "enabled": true,
    "format": "%v %l %u %t \"%r\" %>s %b \"%{Referer}i\" \"%{User-agent}i\"",
    "level": "info"
  },
  "origins": [
    "*"
  ],
  "seed": 42,
  "time": false
}
```

## Event Handlers
Event Emitter syntax for the following events:

```javascript
router.on("connect", (req, res) => res.header("x-custom-header", "abc-def"));
```

##### connect (req, res)
Executes after the connection has been decorated, but before the middleware executes.

##### error (req, res, err)
Executes after the response has been sent.

##### finish (req, res)
Executes after the response has been sent.

##### send (req, res, body, status, headers)
Executes before the response has been sent; arguments are by reference such that they can be mutated.

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

## Logging
Woodland uses the [Combined Log Format](https://httpd.apache.org/docs/trunk/logs.html#accesslog), an extension of [Common Log Format](https://en.wikipedia.org/wiki/Common_Log_Format), with an `info` level by default. You can change the `stdout` & `stderr` output by supplying a custom `logging.format` string with valid placeholders.

You can disable woodland's logging by configuration with `{logging: {enabled: false}}`. 

## Testing Code Coverage
Run the `nyc` script with `npm` or `yarn`. Coverage test gaps are `Error` handling edge cases within `serve()` & `use()`.

```console
---------------|---------|----------|---------|---------|-----------------------------------------------------------------------------
File           | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
---------------|---------|----------|---------|---------|-----------------------------------------------------------------------------
All files      |   92.27 |    72.68 |   96.88 |   92.52 |                                                                            
 woodland      |     100 |      100 |     100 |     100 |                                                                            
  index.js     |     100 |      100 |     100 |     100 |                                                                            
 woodland/lib  |   92.16 |    72.68 |   96.83 |   92.41 |                                                                            
  autoindex.js |     100 |        0 |     100 |     100 | 7                                                                          
  constants.js |     100 |      100 |     100 |     100 |                                                                            
  mime.js      |     100 |    33.33 |     100 |     100 | 15-18                                                                      
  utility.js   |   91.35 |    76.32 |     100 |   91.26 | 22,139-141,156-157,159,163,181                                             
  woodland.js  |   91.93 |    72.06 |   95.45 |   92.34 | 159,171-172,190-191,247-248,257,288-292,307,420,434,443-444,451,457,487,491
---------------|---------|----------|---------|---------|-----------------------------------------------------------------------------
```

## License
Copyright (c) 2021 Jason Mulligan

Licensed under the BSD-3 license.
