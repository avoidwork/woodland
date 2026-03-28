# Woodland API Reference

Complete API documentation for the Woodland HTTP framework.

**Version:** 21.0.10

---

## Table of Contents

- [Factory Functions](#factory-functions)
- [Woodland Class](#woodland-class)
- [Configuration](#configuration)
- [Routing Methods](#routing-methods)
- [Middleware Methods](#middleware-methods)
- [Response Methods](#response-methods)
- [Request Properties](#request-properties)
- [Utility Methods](#utility-methods)
- [Event Emitters](#event-emitters)
- [Logger API](#logger-api)
- [Exports](#exports)

---

## Factory Functions

### `woodland(config?)`

Creates a new Woodland instance.

**Parameters:**
- `config` (Object, optional) - Configuration object

**Returns:** `Woodland` instance with bound `route` method

**Example:**
```javascript
import { woodland } from "woodland";

const app = woodland({
  origins: ["https://myapp.com"],
  autoIndex: true,
  time: true
});
```

---

## Woodland Class

Extends `EventEmitter`. Provides HTTP server functionality with middleware routing.

**Implementation Notes:**
- Uses ES2022 private fields (`#`) for all internal state
- Only 1 public getter exposed: `logger` (returns frozen object)
- All configuration and internal state is private
- File server uses closure-based config injection

### Constructor

```javascript
new Woodland(config)
```

**Parameters:**
- `config` (Object) - Configuration object (see [Configuration](#configuration))

---

## Configuration

### Public Getters

The following read-only property is available via public getter:

| Property | Type | Description |
|----------|------|-------------|
| `logger` | `Object` | Frozen logger object |

**Note:** All other configuration and internal state is private and inaccessible from outside the class.

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `autoIndex` | `boolean` | `false` | Enable automatic directory indexing |
| `cacheSize` | `number` | `1000` | Size of LRU cache for routes |
| `cacheTTL` | `number` | `10000` | Cache TTL in milliseconds |
| `charset` | `string` | `"utf-8"` | Default character set |
| `corsExpose` | `string` | `""` | Headers to expose via CORS |
| `defaultHeaders` | `Object` | `{}` | Additional default headers |
| `digit` | `number` | `3` | Digit precision for timing |
| `etags` | `boolean` | `true` | Enable ETag generation |
| `indexes` | `Array<string>` | `["index.htm", "index.html"]` | Index files for directories |
| `logging` | `Object` | `{}` | Logging configuration |
| `origins` | `Array<string>` | `[]` | Allowed CORS origins (empty = deny all) |
| `silent` | `boolean` | `false` | Disable server headers |
| `time` | `boolean` | `false` | Enable X-Response-Time header |

### Logging Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Enable logging |
| `level` | `string` | `"info"` | Log level (see below) |
| `format` | `string` | `"%h %l %u %t \"%r\" %>s %b"` | Log format string |

**Log Levels:**
- `emerg` (0) - System is unusable
- `alert` (1) - Action must be taken immediately
- `crit` (2) - Critical conditions
- `error` (3) - Error conditions
- `warn` (4) - Warning conditions
- `notice` (5) - Normal but significant
- `info` (6) - Informational (default)
- `debug` (7) - Debug-level messages

**Format Specifiers:**
- `%h` - Remote host IP
- `%l` - Remote logname (always `-`)
- `%u` - Remote user (always `-`)
- `%t` - Time stamp
- `%r` - First line of request
- `%>s` - Final status code
- `%b` - Response size in bytes
- `%{Referer}i` - Referer header
- `%{User-agent}i` - User agent header

---

## Routing Methods

All routing methods return `Woodland` instance for chaining.

### Method-Specific Routes

```javascript
app.get([path], ...handlers)      // GET
app.post([path], ...handlers)     // POST
app.put([path], ...handlers)      // PUT
app.delete([path], ...handlers)   // DELETE
app.patch([path], ...handlers)    // PATCH
app.options([path], ...handlers)  // OPTIONS
app.connect([path], ...handlers)  // CONNECT
app.trace([path], ...handlers)    // TRACE
```

**Parameters:**
- `path` (string, optional) - Route path or RegExp pattern
- `...handlers` (Function) - One or more middleware handlers

**Example:**
```javascript
// Route-specific middleware
app.get("/users/:id", (req, res) => {
  res.json({ id: req.params.id });
});

app.post("/users", validate, createUser);

// Global middleware (when path is omitted)
app.get(logRequest, respond);
```

### `always(...handlers)`

Registers wildcard middleware for all HTTP methods. This middleware executes **before** HTTP method route handlers.

**Parameters:**
- `...handlers` (Function) - Middleware function(s)

**Returns:** `Woodland` instance

**Example:**
```javascript
app.always((req, res, next) => {
  req.startTime = Date.now();
  next();
});
```

### `use(rpath, ...fn)`

Registers middleware for a route.

**Parameters:**
- `rpath` (string|Function) - Route path or middleware function
- `...fn` (Function) - Middleware function(s)

**Returns:** `Woodland` instance

**Example:**
```javascript
// Route-specific middleware
app.use("/api", auth, (req, res, next) => {
  res.header("x-api", "true");
  next();
});

// Global middleware (when path is function)
app.use((req, res, next) => next());
```

---

## Middleware Methods

### `ignore(fn)`

Adds a function to the ignored set (excluded from route visibility).

**Parameters:**
- `fn` (Function) - Function to ignore

**Returns:** `Woodland` instance

**Example:**
```javascript
const logging = (req, res, next) => next();
app.ignore(logging);
app.always(logging);
```

### `list(method?, type?)`

Lists middleware routes.

**Parameters:**
- `method` (string, optional) - HTTP method (default: `"GET"`)
- `type` (string, optional) - Return type: `"array"` or `"object"` (default: `"array"`)

**Returns:** `Array` or `Object` of routes

**Example:**
```javascript
const routes = app.list("GET", "array");
// ["/", "/users", "/users/:id"]

const routesObj = app.list("POST", "object");
// { "/users": [handler1, handler2] }
```

### `routes(uri, method, override?)`

Gets route information.

**Parameters:**
- `uri` (string) - URI to check
- `method` (string) - HTTP method
- `override` (boolean, optional) - Override cache (default: `false`)

**Returns:** `Object` - Route information with `middleware` and `getParams` properties

**Example:**
```javascript
const info = app.routes("/users/:id", "GET");
// { middleware: [Array], getParams: RegExp, params: true }
```

---

## Response Methods

Response methods are available on the `res` object in handlers.

### `res.json(data, status?, headers?)`

Sends JSON response.

**Parameters:**
- `data` (any) - Data to serialize
- `status` (number, optional) - HTTP status code (default: `200`)
- `headers` (Object, optional) - Additional headers

**Returns:** `void`

**Example:**
```javascript
res.json({ message: "Hello" });
res.json({ error: "Not found" }, 404);
```

### `res.send(body?, status?, headers?)`

Sends text or stream response.

**Parameters:**
- `body` (string|Buffer|Stream, optional) - Response body (default: `""`)
- `status` (number, optional) - HTTP status code
- `headers` (Object, optional) - Additional headers

**Returns:** `void`

**Example:**
```javascript
res.send("Hello World");
res.send("<html>...</html>", 200, { "Content-Type": "text/html" });
```

### `res.redirect(uri, permanent?)`

Redirects to a URL.

**Parameters:**
- `uri` (string) - Redirect URL
- `permanent` (boolean, optional) - Permanent redirect (default: `true`)
  - `true` = 308 Permanent Redirect
  - `false` = 307 Temporary Redirect

**Returns:** `void`

**Example:**
```javascript
res.redirect("/new-path");
res.redirect("/temp", false);
```

### `res.error(status, message?)`

Sends error response.

**Parameters:**
- `status` (number) - HTTP status code
- `message` (string|Error, optional) - Error message

**Returns:** `void`

**Example:**
```javascript
res.error(404);
res.error(500, "Internal Server Error");
res.error(403, new Error("Forbidden"));
```

### `res.set(headers)`

Sets multiple headers.

**Parameters:**
- `headers` (Object|Map|Headers) - Headers to set

**Returns:** `void`

**Example:**
```javascript
res.set({ "X-Custom": "value", "X-Another": "123" });
res.set(new Map([["X-One", "1"]]));
```

### `res.header(name, value)`

Sets a single header (native Node.js access).

**Parameters:**
- `name` (string) - Header name
- `value` (string) - Header value

**Returns:** `void`

**Example:**
```javascript
res.header("X-Custom", "value");
```

### `res.status(code)`

Sets HTTP status code.

**Parameters:**
- `code` (number) - HTTP status code

**Returns:** `void`

**Example:**
```javascript
res.status(201);
```

---

## Request Properties

Decorated request properties available in handlers.

### `req.method`

HTTP method (string).

### `req.parsed`

Parsed URL object with properties:
- `pathname` - URL path
- `search` - Query string
- `hostname` - Host name
- `port` - Port number
- `href` - Full URL

### `req.ip`

Client IP address (extracted from `X-Forwarded-For` or connection).

### `req.params`

URL parameters object (populated when route matches).

### `req.allow`

Allowed methods string for the route.

### `req.cors`

Boolean indicating if CORS is enabled for this request.

### `req.corsHost`

Boolean indicating if origin header exists and differs from host.

### `req.body`

Request body object (initialized as `{}`).

### `req.host`

Hostname from request.

### `req.valid`

Request validation flag (false if CORS rejected or method not allowed).

### `req.precise`

Precise timer instance (when `time: true` in config).

### `req.exit`

Iterator for exiting middleware chain early.

---

## Utility Methods

### `etag(method, ...values)`

Generates ETag for response caching.

**Parameters:**
- `method` (string) - HTTP method
- `...values` (any) - Values to hash

**Returns:** `string` - ETag string or empty string

**Example:**
```javascript
const etag = app.etag("GET", data, timestamp);
res.header("ETag", etag);
```

### `files(root?, folder?)`

Registers file server middleware.

**Parameters:**
- `root` (string, optional) - Root path (default: `"/"`)
- `folder` (string, optional) - Folder to serve (default: `process.cwd()`)

**Returns:** `Woodland` instance for chaining

**Example:**
```javascript
app.files("/static", "./public");
app.files("/", "./www");
```

### `serve(req, res, path, folder?)`

Serves a file from disk.

**Parameters:**
- `req` (Object) - HTTP request object
- `res` (Object) - HTTP response object
- `path` (string) - File path
- `folder` (string, optional) - Folder to serve from

**Returns:** `Promise`

### `stream(req, res, file)`

Streams a file to response.

**Parameters:**
- `req` (Object) - HTTP request object
- `res` (Object) - HTTP response object
- `file` (Object) - File descriptor:
  - `path` (string) - File path
  - `etag` (string) - File ETag
  - `charset` (string) - File charset
  - `stats` (Object) - File statistics:
    - `size` (number) - File size
    - `mtime` (Date) - Modification time

**Returns:** `void`

### `route(req, res)`

Main request handler. Routes requests to appropriate middleware.

**Parameters:**
- `req` (Object) - HTTP request object
- `res` (Object) - HTTP response object

**Returns:** `void`

**Example:**
```javascript
import { createServer } from "node:http";

const app = woodland();
createServer(app.route).listen(3000);
```

---

## Event Emitters

Woodland extends `EventEmitter` and emits the following events:

### `connect`

Emitted when a connection is established.

**Listeners:** `(req, res) => void`

### `finish`

Emitted when response finishes.

**Listeners:** `(req, res) => void`

### `error`

Emitted when an error occurs.

**Listeners:** `(req, res, err) => void`

### `stream`

Emitted when streaming a file.

**Listeners:** `(req, res) => void`

---

## Logger API

Access via `app.logger` (frozen object).

### `logger.log(message, level?)`

Logs a message.

**Parameters:**
- `message` (string) - Log message
- `level` (number, optional) - Log level (default: `DEBUG`)

### `logger.logError(path, method, ip)`

Logs an error.

**Parameters:**
- `path` (string) - Request path
- `method` (string) - HTTP method
- `ip` (string) - Client IP

### `logger.logRoute(path, method, ip)`

Logs a route access.

**Parameters:**
- `path` (string) - Request path
- `method` (string) - HTTP method
- `ip` (string) - Client IP

### `logger.logMiddleware(path, handler)`

Logs middleware registration.

**Parameters:**
- `path` (string) - Route path
- `handler` (Function) - Middleware handler

### `logger.logServe(req, message)`

Logs file serving.

**Parameters:**
- `req` (Object) - HTTP request object
- `message` (string) - Log message

### `logger.clf(req, res)`

Generates Common Log Format string.

**Parameters:**
- `req` (Object) - HTTP request object
- `res` (Object) - HTTP response object

**Returns:** `string` - CLF log string

---

## Exports

```javascript
// Main factory
import { woodland } from "woodland";

// Class for inheritance
import { Woodland } from "woodland";

// Utility functions
import { createLogger, isValidIP, escapeHtml } from "woodland";
```

---

*Last updated: March 2026*
