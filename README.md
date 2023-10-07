<img src="https://avoidwork.github.io/woodland/logo.svg" width="108" />

# Woodland

Lightweight HTTP framework with automatic headers. Routes can use parameter syntax, i.e. `/users/:id`, or `RegExp` syntax. Route parameters are not sanitized. If 2+ routes with parameters match a request the first route will be used to extract parameters. All HTTP methods are supported.

`CORS` (Cross Origin Resource Sharing) is automatically handled, and indicated with `cors` Boolean on the `request` Object for middleware.

Middleware arguments can be `req, res, next` or `error, req, res, next`. If no `Error` handling middleware is registered woodland will handle it.

## Using the factory

```javascript
import {createServer} from "node:http";
import {woodland} from "woodland";

const app = woodland({
  defaultHeaders: {
    "cache-control": "public, max-age=3600",
    "content-type": "text/plain"
  },
  time: true
});

app.get("/", (req, res) => res.send("Custom greeting at '/:user', try it out!"));
app.get("/:user", (req, res) => res.send(`Hello ${req.params.user}!`));
createServer(app.route).listen(8000);
```

## Using the Class

```javascript
import {Woodland} from "woodland";
class MyFramework extends Woodland {};
```

## Testing

Woodland has 100% code coverage with its tests; the missing 0.21% is ignored file system error handlers that aren't worth testing - they're present!

```console
--------------|---------|----------|---------|---------|-------------------------------
File          | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
--------------|---------|----------|---------|---------|-------------------------------
All files     |   99.79 |    75.67 |   98.63 |     100 |                                                                                                                                                                                
 woodland.cjs |   99.79 |    75.67 |   98.63 |     100 | ...288-298,327-349,358-359,...
--------------|---------|----------|---------|---------|-------------------------------
```

## API
### constructor ({...})
Returns a woodland router. Enable directory browsing & traversal with `autoindex`. Create an automatic `x-response-time` response header with `time` & `digit`. Customize `etag` response header with `seed`.

See configuration options below.

### allowed (method, uri, override = false)
Calls `routes()` and returns a `Boolean` to indicate if `method` is allowed for `uri`.

### allows (uri, override = false)
Returns a `String` for the `Allow` header. Caches value, & will update cache if `override` is `true`.

### always (path, fn)
Registers middleware for a route for all HTTP methods; runs first. `path` is a regular expression (as a string), and if not passed it defaults to `/.*`.

Execute `ignore(fn)` if you do not want the middleware included for calculating the `Allow` header.

### ignore (fn)
Ignores `fn` for calculating the return of `allows()`.

### decorate (req, res)
Decorates `allow, body, cors, host, ip, params, & parsed` on `req` and `error(status[, body, headers]), header(key, value), json(body[, status, headers]), locals{} & redirect(url[, perm = false])` on `res`.

### etag (...args)
Returns a String to be used as an ETag response header value.

### list (method = "get", type = "array")
Returns an `Array` or `Object` of routes for the specified method.

### log (msg = "", level = "debug")
Logs to `stdout` or `stderr` depending on the `level`, & what the minimum log level is set to.

### onsend (req, res, body, status, headers)
**Override** to customize response `body`, `status`, or `headers`. Must return `[body, status, headers]`!

### route (req, res)
Function for `http.createServer()` or `https.createServer()`.

### routes (uri, method, override = false)
Returns an `Array` of middleware for the request. Caches value, & will update cache if `override` is `true`.

### serve (req, res, localFilePath, folderPath, indexes = this.indexes)
Serve static files on disk. Use a route parameter or remove `folderPath` from `req.parsed.pathname` to create `localFilePath`.

#### Without `autoindex`
```javascript
router.use("/files/:file", (req, res) => router.serve(req, res, req.params.file, path.join(__dirname, "files")));
```

#### With `autoindex`
```javascript
router.use("/files(/.*)?", (req, res) => router.serve(req, res, req.parsed.pathname.replace(/^\/files\/?/, ""), join(__dirname, "files")));
```

### use ([path = "/.*",] ...fn[, method = "GET"])
Registers middleware for a route. `path` is a regular expression (as a string), and if not passed it defaults to `/.*`. See `always()` if you want the middleware to be used for all HTTP methods.

All HTTP methods are available on the prototype (partial application of the third argument), e.g. `get([path,] ...fn)` & `options([path,] ...fn)`.

## Benchmark
Please benchmark `woodland` on your target hardware to understand the overhead which is expected to be 25%, e.g. if `http` can handle 50k req/s, then `woodland` should handle 40k req/s.

The performance delta is primarily caused by the native [URL](https://nodejs.org/dist/latest-v18.x/docs/api/url.html) class.

1. Clone repository from [GitHub](https://github.com/avoidwork/woodland).
1. Install dependencies with `npm` or `yarn`.
1. Execute `benchmark` script with `npm` or `yarn`.

Results with node.js 20.5.1 & an Intel i9-12900HX (mobile) on Windows 11.

```console
> node benchmark.js

http
┌─────────┬──────┬──────┬───────┬───────┬──────────┬─────────┬───────┐
│ Stat    │ 2.5% │ 50%  │ 97.5% │ 99%   │ Avg      │ Stdev   │ Max   │
├─────────┼──────┼──────┼───────┼───────┼──────────┼─────────┼───────┤
│ Latency │ 1 ms │ 8 ms │ 40 ms │ 43 ms │ 10.36 ms │ 9.53 ms │ 88 ms │
└─────────┴──────┴──────┴───────┴───────┴──────────┴─────────┴───────┘
┌───────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┐
│ Stat      │ 1%      │ 2.5%    │ 50%     │ 97.5%   │ Avg     │ Stdev   │ Min     │
├───────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│ Req/Sec   │ 76095   │ 76095   │ 93119   │ 93951   │ 92091.2 │ 2968.25 │ 76077   │
├───────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│ Bytes/Sec │ 15.5 MB │ 15.5 MB │ 18.9 MB │ 19.1 MB │ 18.7 MB │ 601 kB  │ 15.4 MB │
└───────────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┘

woodland
┌─────────┬──────┬───────┬───────┬───────┬─────────┬──────────┬────────┐
│ Stat    │ 2.5% │ 50%   │ 97.5% │ 99%   │ Avg     │ Stdev    │ Max    │
├─────────┼──────┼───────┼───────┼───────┼─────────┼──────────┼────────┤
│ Latency │ 4 ms │ 12 ms │ 75 ms │ 92 ms │ 15.9 ms │ 16.37 ms │ 148 ms │
└─────────┴──────┴───────┴───────┴───────┴─────────┴──────────┴────────┘
┌───────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┐
│ Stat      │ 1%      │ 2.5%    │ 50%     │ 97.5%   │ Avg     │ Stdev   │ Min     │
├───────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│ Req/Sec   │ 56095   │ 56095   │ 60639   │ 64575   │ 60994.4 │ 2367.56 │ 56076   │
├───────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│ Bytes/Sec │ 11.8 MB │ 11.8 MB │ 12.8 MB │ 13.6 MB │ 12.9 MB │ 499 kB  │ 11.8 MB │
└───────────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┘

```

## Command Line Interface (CLI)
When woodland is installed as a global module you can serve the contents of a folder by executing `woodland` in a shell. Optional parameters are `--ip=127.0.0.1` & `--port=8000`.

## Configuration

```json
{
  "autoindex": false,
  "cacheSize": 1000,
  "cacheTTL": 300000,
  "charset": "utf-8",
  "corsExpose": "",
  "defaultHeaders": {},
  "digit": 3,
  "etags": true,
  "indexes": [
    "index.htm",
    "index.html"
  ],
  "logging": {
    "enabled": true,
    "format": "%h %l %u %t \"%r\" %>s %b",
    "level": "info"
  },
  "origins": [
    "*"
  ],
  "time": false
}
```

## Event Handlers
Event Emitter syntax for the following events:

```javascript
router.on("connect", (req, res) => res.header("x-custom-header", "abc-def"));
```

### connect (req, res)
Executes after the connection has been decorated, but before the middleware executes.

### error (req, res, err)
Executes after the response has been sent.

### finish (req, res)
Executes after the response has been sent.

## Helpers
`req` & `res` are decorated with helper functions to simplify responding.

### res.error(status[, body, headers])
Sends an error response.

### res.header(key, value)
Shorthand of `res.setHeader()`.

### res.json(body, [status = 200, headers])
Sends a JSON response.

### res.last(req, res, next)
Last middleware of the route for the HTTP method as a way to "skip" to the middleware which sends a response.

### res.redirect(uri[, perm = false])
Sends a redirection response.

### res.send(body, [status = 200, headers = {}])
Sends a response. `Range` header is ignored on `stream` responses.

### res.status(arg)
Sets the response `statusCode` property.

## Logging
Woodland defaults to [Common Log Format](https://en.wikipedia.org/wiki/Common_Log_Format) but supports [Common Log Format with Virtual Host](https://httpd.apache.org/docs/trunk/mod/mod_log_config.html), & [NCSA extended/combined log format](https://httpd.apache.org/docs/trunk/mod/mod_log_config.html) with an `info` level by default. You can change the `stdout` output by changing `logging.format` with valid placeholders.

You can disable woodland's logging by configuration with `{logging: {enabled: false}}`.

## License
Copyright (c) 2023 Jason Mulligan

Licensed under the BSD-3 license.
