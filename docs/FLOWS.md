# Woodland Framework - Connection Flow

This document traces the architecture and data flows throughout the Woodland HTTP framework.

---

## Initialization Flow

```
woodland(config)
    │
    ▼
new Woodland(config) ───→ validateConfig() ─→ defaults + schema
    │
    ├── validateLogging() ─→ env(WOODLAND_LOG_*) > config > default
    │
    ├── #buildFinalHeaders() ─→ [{SERVER, X-Powered-By}]
    │
    ├── #createLogger() ─→ log(), clf(), logRoute(), logError()
    │
    ├── #createFileServer() ─→ serve(), register()
    │
    ├── #setupMiddleware()
    │   ├── if etags enabled: this.get(etags.middleware).ignore(etags.middleware)
    │   └── if origins set: this.options(corsRequest()).ignore(corsRequest())
    │
    ├── #setupErrorHandling() ─→ on('error') → logger.logError()
    │
    ├── #setupBodyLimit() ─→ always() → 413 on oversized body
    │
    └── #middleware = createMiddlewareRegistry(methods, cache)
        ├── ignore(fn)
        ├── allowed(m, u, o) → checkAllowed()
        ├── routes(u, m, o) → computeRoutes()
        ├── register(p, ...fns) → registerMiddleware()
        └── list(m, t) → listRoutes()
```

---

## Middleware Registration Flow

```
app.get(path, ...fn) / app.post(path, ...fn)
    │
    ▼
#registerMethod(method, ...args) ─→ use(pathOrFn, ...fn, method)
    │
    ▼
#middleware.register(rpath, ...fn)
    │
    ├── rpath is Function ─→ rpath = `/.+`, fn = [rpath, ...fn]
    │
    ├── method = fn[last]?.toUpperCase() (popped if string) → defaults to GET
    │
    ├── validateMethod(method) ─→ must be in NODE_METHODS, not HEAD
    │
    ├── rpath has /:param ─→ extractPath() → regex capture groups
    │   └── else → no params flag
    │
    ├── validateRoutePattern() ─→ ReDoS check via quantifier scan
    │
    └── middleware.set(method, Map{
            rpath: {
                handlers: [...existing, ...fn],  // deduplicated append
                params: boolean,
                regex: RegExp("^" + lrpath + "$")
            }
        })
```

### Always (wildcard) middleware

```
app.always(...args)
    │
    ├── for each arg: middleware.ignore(arg)
    │
    └── use(...args, WILDCARD) → registerMiddleware(method="*")
```

### File serving middleware

```
app.files(root, folder)
    │
    └── #fileServer.register(root, folder, this.use.bind(this))
        │
        ▼
        register(config, root, folder, useMiddleware)
            │
            └── useMiddleware(ROOT_PATTERN, (req, res) => {
                    pathname = decodeURIComponent(req.parsed.pathname)
                    relativePath = extract from pathname (strip mount root)
                    serve(config, req, res, relativePath, folder)
                })
```

---

## Request Handling Flow

```
app.route(req, res)  ──← called by Node.js http.Server
    │
    ▼
#decorate(req, res) ─→ enriches both objects
    │
    ├── timing = precise().start() (if enabled)
    ├── parsed = parse(req) → new URL(host + url)
    ├── clientIP = extractIP(req) → X-Forwarded-For or socket
    │
    ├── req.corsHost = corsHost(req)
    ├── req.cors = cors(req, origins)
    ├── req.parsed = parsed
    ├── req.ip = clientIP
    ├── req.body = EMPTY
    ├── req.host = parsed.hostname
    ├── req.params = {}
    ├── req.valid = true
    ├── req.app = this
    │
    ├── allowString = #allows(parsed.pathname)
    │   └── compute allowed methods for URI → cache
    │
    ├── batch headers: [ALLOW, X-Content-Type-Options, ...default]
    │
    ├── req.allow = allowString
    ├── req.precise = timing (if timing enabled)
    │
    ├── if (req.cors) ─→ #addCorsHeaders(req, headersBatch)
    │   ├── validateOrigin → #isSafeOrigin()
    │   ├── set Access-Control-Allow-Origin
    │   └── #setCorsAllowAndExposeHeaders()
    │
    └── #decorateResponse(res, req, headersBatch)
        ├── res.locals = {}
        ├── res.error = createErrorHandler(req, res, this, exposeErrorMessages) ─→ error(), emit("error")
        ├── res.header = res.setHeader
        ├── res.json = createJsonHandler() ─→ json(), res.send()
        ├── res.redirect = createRedirectHandler() ─→ redirect(),
        │                          isSafeRedirectUri(), send()
        ├── res.send = createSendHandler() ─→ send(),
        │                    #onReady(), #onDone()
        ├── res.set = createSetHandler() ─→ set()
        ├── res.status = createStatusHandler() ─→ status()
    ├── res.cookie = createCookieHandler() ─→ serializeCookie(), getHeader()+setHeader() (array append)
    ├── res.clearCookie = createClearCookieHandler() ─→ serializeCookie(name, "", { maxAge: 0, expires: new Date(0) }), getHeader()+setHeader()
        └── on('close') → logger.clf()
```

### Routing decision

```
emit('connect') (if listeners)

res.on('finish') → emit('finish') (if listeners)

logger.logRoute()

if (!req.cors && req.corsHost) ──→ req.valid = false
    └── res.error(403, new Error(STATUS_CODES[403]))

else if (req.allow.includes(method)) ─→ #handleAllowedRoute()
    │
    ▼
else ──→ req.valid = false
    └── res.error(404/405, STATUS_CODE)
```

---

## Allowed Route Handling

```
#handleAllowedRoute(req, res, method)
    │
    ▼
#middleware.routes(uri, method) → computeRoutes()
    │
    ├── cache hit → return cached result
    │
    └── cache miss → build result
        ├── reduce(uri, middleware.get(WILDCARD), result)
        ├── reduce(uri, middleware.get(method), result)
        ├── count non-ignored visible middleware
        └── cache.set(key, result)

    ├── result.params → params(req, result.getParams)
    │   └── regex.exec(pathname) → named groups
    │       └── coerce() + escapeHtml() per param
    │
    └── middleware.slice(exitIndex)[Symbol.iterator]()
        └── req.exit = next(req, res, iterator, true)

next(req, res, middleware[Symbol.iterator]())()
    │
    ▼
next() function ───→ execute() ─→ handles middleware chain
    │
    ├── on error:
    │   ├── if req.app.error is function → call global handler
    │   ├── skip non-error handlers in chain
    │   └── find error handler (length === 4) → call with (err)
    │       └── no handler → res.error(500)
    │
    └── on success:
        ├── value is Function → value(req, res, nextFn)
        └── value is not Function → res.send(value)
```

### Execution timing

```
immediate=true → call execute() directly
immediate=false → process.nextTick(() => execute(err))
```

---

## Response Flow

### res.send(body, status, headers) → send()

```
├── onReady(req, res, body, status, headers)
│   ├── timing: #onReady → set X-Response-Time header (if enabled)
│   └── return [body, status, headers]
│
└── onSend(req, res, body, status, headers)
    ├── status 404 → remove ALLOW & CORS-Allow-Methods headers
    └── return [body, status, headers]
```

```
├── isPipeable (has .on method, not HEAD) ?
│   ├── rangeHeader === void 0 || req.range !== void 0 → writeHead + body.pipe(res)
│   │   └── error on 'error' event → res.error(500) or end()
│   └── rangeHeader set && !req.range → res.error(416)
│
└── not pipeable:
    ├── has range header
    │   ├── partialHeaders() → Content-Range header
    │   │   ├── parseRangeHeader(rangeHeader, size)
    │   │   │   ├── bytes=start-end
    │   │   │   │   ├── start empty, end empty → null (invalid)
    │   │   │   │   ├── start empty, end present → start = size - end, end = size - 1
    │   │   │   │   ├── start present, end empty → end = size - 1
    │   │   │   │   └── both present → parse start, end
    │   │   │   └── validates: start >= 0, end < size, start <= end
    │   │   └── req.range set → onDone(rangeBuffer)
    │   │       └── else → res.error(416)
    │
    └── no range → statusCode set → onDone(body, headers)
        │
        ▼
#onDone(req, res, body, headers)
    ├── no Content-Length → set it
    ├── writeHead(res, headers) → res.writeHead(status, code, { ...res.getHeaders(), ...headers })
    └── res.end(body, charset)
```

### Convenience response methods

| Method | Flow |
|--------|------|
| `res.json(obj)` | `send(JSON.stringify(obj), 200, {Content-Type: json})` |
| `res.redirect(uri, perm)` | `isSafeRedirectUri() → send("", 308/307, {Location})` |
| `res.status(code)` | `res.statusCode = code` |
| `res.set(headers)` | `set(res, headers) → setHeader() per entry` |
| `res.cookie(name, value, opts)` | `serializeCookie(name, value, opts) → getHeader("set-cookie")+setHeader() (array append)` |
| `res.clearCookie(name, opts)` | `serializeCookie(name, "", { maxAge: 0, expires: new Date(0), ...opts }) → getHeader("set-cookie")+setHeader() (array append)` |

### Error response

```
res.error(inputStatus, body) ─→ createErrorHandler(req, res, emitter, exposeErrorMessages)
    ├── error(req, res, status) → res.statusCode = status
    ├── emit("error", req, res, err)
    │   └→ logger.logError() → ERROR level console
    ├── if (req.headers) delete req.headers.range
    └── send(message) → res.send(message)
        └┬─ exposeErrorMessages ? err.message || STATUS_TEXT : STATUS_TEXT
```

---

## File Serving Flow

```
app.serve(req, res, arg, folder)
    │
    ▼
serve(config, req, res, arg, folder)
    │
    ├── fp = resolve(folder, arg)
    ├── resolvedFolder = resolve(folder)
    ├── realFp = realpath(fp)
    ├── realFolder = realpath(resolvedFolder)
    │
    ├── path traversal check:
    │   isRoot OR (realFp === realFolder OR realFp startsWith realFolder + path-separator)
    │       └── avoids prefix collisions (e.g. /var/www vs /var/www2)
    │       └── fails → res.error(403, "Path traverses outside")
    │
    ├── realFp is file?
    │   ├── stream(req, res, {charset, etag, path, stats})
    │   │   ├── Content-Length: size
    │   │   ├── Content-Type: mime + charset
    │   │   ├── Last-Modified: mtime
    │   │   ├── ETag (if etags enabled)
    │   │   ├── GET → range handling → partialHeaders()
    │   │   │   ├── parseRangeHeader(rangeHeader, size)
    │   │   │   │   ├── bytes=start-end
    │   │   │   │   ├── start empty, end empty → null (invalid)
    │   │   │   │   ├── start empty, end present → start = size - end, end = size - 1
    │   │   │   │   ├── start present, end empty → end = size - 1
    │   │   │   │   └── both present → parse start, end
    │   │   │   └── validates: start >= 0, end < size, start <= end
    │   │   └── createReadStream(file.path, options)
    │   │   ├── HEAD → send("")
    │   │   └── OPTIONS → remove CL → send("")
    │   │
    │   └── emit('stream') event
    │
    └── realFp is directory?
        ├── no trailing slash → redirect(url + "/")
        ├── index file:
        │   ├── loop config.indexes → stat(indexFile) → stream()
        │   └── no index + autoIndex:
        │       └── autoIndex(title, files) → send(html)
        │   autoIndex() replaces ${FILES} and ${TITLE} in template
        │   renderFileItem() per entry → <li><a href>
        │   └── no index + !autoIndex → res.error(404)
```

---

## CORS Flow

```
#addCorsHeaders(req, headersBatch)
    │
    ├── #isSafeOrigin(origin)
    │   ├── origin exists & is string
    │   ├── origin.length <= 255
    │   ├── no control characters
    │   └── starts with http:// or https://
    │
    ├── originAllowed = isSafe && origins.has(origin)
    │   ├── Access-Control-Allow-Origin: origin
    │   ├── Timing-Allow-Origin: origin
    │   ├── Access-Control-Allow-Credentials: true
    │   └── Access-Control-Allow-Methods: req.allow
    │
    └── wildcard origins.has("*")
        ├── Access-Control-Allow-Origin: *
        └── Access-Control-Allow-Methods: req.allow

#setCorsAllowAndExposeHeaders(headersBatch, req, corsHeaders)
    ├── OPTIONS → Access-Control-Allow-Headers
    └── other → Access-Control-Expose-Headers

#setupMiddleware() ─→ CORS preflight
    ├── origins.size > 0 → options(corsRequest())
    └── corsRequest() → (req, res) => res.status(204).send("")
```

---

## Event Emitter Flow

```
Woodland extends EventEmitter
    │
    ├── 'error' ─→ (req, res, error) → logger.logError()
    ├── 'connect' ─→ (req, res) → after decoration, before routing
    ├── 'finish' ─→ (req, res) → on res 'finish' event
    └── 'stream' ─→ (req, res) → on file stream start
```

---

## Utility Flows

```
etag(method, ...args) ─→
    ├── only GET/HEAD/OPTIONS if etags enabled
    ├── stringify non-string args
    └── tiny-etag cache.create(hash)

#allows(uri, override) ─→ determine Allow header
    ├── check each registered method via middleware.allowed()
    └── #buildAllowedList() ─→ add implicit HEAD & OPTIONS

parse(req) →
    ├── URL(`${proto}${host}${url}`)
    │   └── host = headers.host || socket._connectionKey.replace(/.*::/, EMPTY) || 8000
    └── fallback: URL(`http://localhost${arg.url || "/"}`)

extractIP(req) →
    ├── X-Forwarded-For: first valid IP (IPv4/IPv6)
    └── fallback: req.connection.remoteAddress / req.socket / localhost

params(req, getParams) → regex.exec(pathname) → coerce + escapeHtml
```

---

## Config Module

```
validateConfig(config)
    ├── jsonschema Validator against CONFIG_SCHEMA
    └── fill defaults for missing keys

validateLogging(logging)
    ├── enabled = WOODLAND_LOG_ENABLED ?? config.enabled ?? true
    │   └── truthy check: env !== "false" ? true : config !== false ? true : true
    ├── format = WOODLAND_LOG_FORMAT ?? config.format ?? LOG_FORMAT constant
    ├── level = WOODLAND_LOG_LEVEL ?? config.level ?? INFO
    └── validate level against VALID_LOG_LEVELS (defaults to INFO if invalid)

validateOrigins(origins)
    ├── WILDCARD always allowed
    └── must parse as URL + origin matches
```

---

## Logger Module

```
createLogger(config)
    ├── log(msg, level) → process.nextTick(console[method](msg))
    │   └── consoleMethod = logLevel > ERROR ? console.log : console.error
    ├── clf(req, res) → Common Log Format string
    │   ├── [day/Mon/year:HH:MM:SS +HHMM]
    │   ├── GET /path?q=1 HTTP/1.1
    │   ├── status code, content length
    │   ├── referer, user-agent
    └── logRoute, logMiddleware, logError, logServe
```

### CLF Template Replacements

| Token | Value |
|-------|-------|
| %v | host |
| %h | IP |
| %l | logname |
| %u | username |
| %t | date |
| %r | request line |
| %s | status |
| %b | content-length |
| %{Referer} | referer |
| %{User-Agent} | user-agent |
