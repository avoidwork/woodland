<img src="https://avoidwork.github.io/woodland/logo.svg" width="108" />

# woodland

Lightweight HTTP router with automatic headers. Routes can use parameter syntax, i.e. `/users/:id`, or `RegExp` syntax. Route parameters are not sanitized. If 2+ routes with parameters match a request the first route will be used to extract parameters. All HTTP methods are supported.

`CORS` (Cross Origin Resource Sharing) is automatically handled, and indicated with `cors` Boolean on the `request` Object for middleware.

Middleware arguments can be `req, res, next` or `error, req, res, next`. If no `Error` handling middleware is registered woodland will handle it.

```javascript
import {createServer} from "node:http";
import {woodland} from "woodland";

const router = woodland({
  defaultHeaders: {
    "cache-control": "public, max-age=3600",
    "content-type": "text/plain"
  },
  time: true
});

router.get("/", (req, res) => res.send("Custom greeting at '/:user', try it out!"));
router.get("/:user", (req, res) => res.send(`Hello ${req.params.user}!`));
createServer(router.route).listen(8000);
```

## API
##### woodland ({...})
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

##### onsend (req, res, body, status, headers)
**Override** to customize response `body`, `status`, or `headers`. Must return `[body, status, headers]`!

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

## Benchmark
Please benchmark `woodland` on your target hardware to understand the overhead which is expected to be 25%, e.g. if `http` can handle 50k req/s, then `woodland` should handle 40k req/s.

The performance delta is primarily caused by the native [URL](https://nodejs.org/dist/latest-v18.x/docs/api/url.html) class.

1. Clone repository from [GitHub](https://github.com/avoidwork/woodland).
1. Install dependencies with `npm` or `yarn`.
1. Execute `benchmark` script with `npm` or `yarn`.

Results with node.js 18.8.0 & an Apple Mac mini M1:

```console
> node benchmark.js

http
┌─────────┬──────┬──────┬───────┬───────┬─────────┬─────────┬───────┐
│ Stat    │ 2.5% │ 50%  │ 97.5% │ 99%   │ Avg     │ Stdev   │ Max   │
├─────────┼──────┼──────┼───────┼───────┼─────────┼─────────┼───────┤
│ Latency │ 4 ms │ 8 ms │ 12 ms │ 13 ms │ 7.24 ms │ 2.62 ms │ 67 ms │
└─────────┴──────┴──────┴───────┴───────┴─────────┴─────────┴───────┘
┌───────────┬─────────┬─────────┬────────┬────────┬──────────┬─────────┬─────────┐
│ Stat      │ 1%      │ 2.5%    │ 50%    │ 97.5%  │ Avg      │ Stdev   │ Min     │
├───────────┼─────────┼─────────┼────────┼────────┼──────────┼─────────┼─────────┤
│ Req/Sec   │ 105471  │ 105471  │ 133119 │ 137855 │ 129167.2 │ 9321.57 │ 105414  │
├───────────┼─────────┼─────────┼────────┼────────┼──────────┼─────────┼─────────┤
│ Bytes/Sec │ 21.4 MB │ 21.4 MB │ 27 MB  │ 28 MB  │ 26.2 MB  │ 1.89 MB │ 21.4 MB │
└───────────┴─────────┴─────────┴────────┴────────┴──────────┴─────────┴─────────┘

woodland
┌─────────┬──────┬───────┬───────┬───────┬──────────┬─────────┬────────┐
│ Stat    │ 2.5% │ 50%   │ 97.5% │ 99%   │ Avg      │ Stdev   │ Max    │
├─────────┼──────┼───────┼───────┼───────┼──────────┼─────────┼────────┤
│ Latency │ 7 ms │ 14 ms │ 16 ms │ 18 ms │ 11.28 ms │ 4.28 ms │ 103 ms │
└─────────┴──────┴───────┴───────┴───────┴──────────┴─────────┴────────┘
┌───────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┐
│ Stat      │ 1%      │ 2.5%    │ 50%     │ 97.5%   │ Avg     │ Stdev   │ Min     │
├───────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│ Req/Sec   │ 74623   │ 74623   │ 85951   │ 87167   │ 84836.8 │ 2908.08 │ 74593   │
├───────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│ Bytes/Sec │ 15.7 MB │ 15.7 MB │ 18.1 MB │ 18.4 MB │ 17.9 MB │ 613 kB  │ 15.7 MB │
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
  "seed": 42,
  "sendError": false,
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
Woodland defaults to [Common Log Format](https://en.wikipedia.org/wiki/Common_Log_Format) but supports [Common Log Format with Virtual Host](https://httpd.apache.org/docs/trunk/mod/mod_log_config.html), & [NCSA extended/combined log format](https://httpd.apache.org/docs/trunk/mod/mod_log_config.html) with an `info` level by default. You can change the `stdout` output by changing `logging.format` with valid placeholders.

You can disable woodland's logging by configuration with `{logging: {enabled: false}}`.

## Testing Code Coverage
Run the `coverage` script with `npm` or `yarn`. Coverage test gaps are `Error` handling edge cases within `serve()` & `use()`.

```console
---------------|---------|----------|---------|---------|-------------------------------------------------------------------------------------
File           | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
---------------|---------|----------|---------|---------|-------------------------------------------------------------------------------------
All files      |   91.67 |    72.61 |   95.38 |   91.92 |                                                                                    
 woodland      |     100 |      100 |     100 |     100 |                                                                                    
  index.js     |     100 |      100 |     100 |     100 |                                                                                    
 woodland/lib  |   91.54 |    72.61 |   95.31 |   91.79 |                                                                                    
  constants.js |     100 |      100 |     100 |     100 |                                                                                    
  utility.js   |   92.44 |    71.32 |     100 |   92.31 | 34,161-163,178-179,181,185,203                                                     
  woodland.js  |   91.01 |    73.28 |   92.86 |   91.42 | 142,154-155,173-174,229-230,235,244,275-279,294,301,411,425,434-435,442,448,478,482
---------------|---------|----------|---------|---------|-------------------------------------------------------------------------------------
```

## License
Copyright (c) 2021 Jason Mulligan

Licensed under the BSD-3 license.
