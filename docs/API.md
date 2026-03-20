# Woodland API Reference

Complete API documentation for the Woodland HTTP server framework.

## Table of Contents

- [Factory Function](#factory-function)
- [Woodland Class](#woodland-class)
  - [Constructor](#constructor)
  - [HTTP Methods](#http-methods)
  - [Middleware](#middleware)
  - [Response Helpers](#response-helpers)
  - [Request Properties](#request-properties)
  - [Utility Methods](#utility-methods)
  - [Event Hooks](#event-hooks)
  - [File Serving](#file-serving)
  - [Internal Modules](#internal-modules)

---

## Factory Function

### `woodland(config)`

Creates a new Woodland instance with the route method bound.

```javascript
import { woodland } from "woodland";

const app = woodland({
  origins: ["https://myapp.com"],
  etags: true,
  logging: { enabled: true, level: "info" },
});
```

**Parameters:**

| Option            | Type       | Default                       | Description                                                      |
| ----------------- | ---------- | ----------------------------- | ---------------------------------------------------------------- |
| `autoindex`       | `boolean`  | `false`                       | Enable automatic directory indexing                              |
| `cacheSize`       | `number`   | `1000`                        | Size of LRU cache for routes                                     |
| `cacheTTL`        | `number`   | `10000`                       | Cache TTL in milliseconds                                        |
| `charset`         | `string`   | `"utf-8"`                     | Default character encoding                                       |
| `corsExpose`      | `string`   | `""`                          | CORS headers to expose to client                                 |
| `defaultHeaders`  | `Object`   | `{}`                          | Default response headers                                         |
| `digit`           | `number`   | `3`                           | Timing precision (decimal places)                                |
| `etags`           | `boolean`  | `true`                        | Enable ETag generation                                           |
| `indexes`         | `string[]` | `["index.htm", "index.html"]` | Index file names                                                 |
| `logging.enabled` | `boolean`  | `true`                        | Enable request logging (env: `WOODLAND_LOG_ENABLED`)             |
| `logging.format`  | `string`   | `"%h %l %u %t \"%r\" %>s %b"` | Log format (Common Log Format) (env: `WOODLAND_LOG_FORMAT`)      |
| `logging.level`   | `string`   | `"info"`                      | Log level (error, warn, info, debug) (env: `WOODLAND_LOG_LEVEL`) |
| `origins`         | `string[]` | `[]`                          | Allowed CORS origins (empty = deny all)                          |
| `silent`          | `boolean`  | `false`                       | Disable default headers (Server, X-Powered-By)                   |
| `time`            | `boolean`  | `false`                       | Enable X-Response-Time header                                    |

**Returns:** `Woodland` instance

---

## Woodland Class

Extends `EventEmitter` with HTTP routing capabilities.

### Constructor

```javascript
import { Woodland } from "woodland";

class MyAPI extends Woodland {
  constructor() {
    super({ origins: ["https://myapp.com"] });
  }
}
```

---

### Environment Variables

Logging configuration can be overridden via environment variables. Configuration priority: explicit config > environment variables > defaults.

| Environment Variable   | Type      | Default                       | Description                            |
| ---------------------- | --------- | ----------------------------- | -------------------------------------- |
| `WOODLAND_LOG_ENABLED` | `boolean` | `true`                        | Enable/disable request logging         |
| `WOODLAND_LOG_FORMAT`  | `string`  | `"%h %l %u %t \"%r\" %>s %b"` | Log format pattern (Common Log Format) |
| `WOODLAND_LOG_LEVEL`   | `string`  | `"info"`                      | Log level (error, warn, info, debug)   |

**Example:**

```bash
# Shell
export WOODLAND_LOG_LEVEL=debug
export WOODLAND_LOG_FORMAT="%h %t \"%r\" %>s"

# Node.js
process.env.WOODLAND_LOG_LEVEL = "warn";
const app = woodland();
```

---

### HTTP Methods

Register route handlers for specific HTTP methods. All methods accept a path pattern followed by handler functions.

```javascript
app.get("/users", getAllUsers);
app.post("/users", createUser);
app.put("/users/:id", updateUser);
app.delete("/users/:id", deleteUser);
```

#### `get(path, ...handlers)`

#### `post(path, ...handlers)`

#### `put(path, ...handlers)`

#### `delete(path, ...handlers)`

#### `patch(path, ...handlers)`

#### `options(path, ...handlers)`

#### `trace(path, ...handlers)`

#### `connect(path, ...handlers)`

**Parameters:**

| Parameter  | Type         | Description                                            |
| ---------- | ------------ | ------------------------------------------------------ |
| `path`     | `string`     | Route pattern (supports `:param` and `(.*)` wildcards) |
| `handlers` | `Function[]` | Middleware/handler functions                           |

**Handler Signature:**

```javascript
// Normal middleware
(req, res, next) => {
  // Process request
  next(); // Pass to next handler
};

// Error middleware (4 parameters)
(error, req, res, next) => {
  // Handle error
  next(error); // Pass error along
};

// Route handler
(req, res) => {
  res.send("Response");
};
```

**Returns:** `Woodland` instance (chainable)

---

### Middleware

#### `always(...handlers)`

Register middleware that runs for ALL HTTP methods on every request. Automatically ignored for route visibility calculations (does not affect `req.allow`), simplifying developer implementations by removing the need to manually call `ignore()`.

```javascript
app.always((req, res, next) => {
  req.startTime = Date.now();
  next();
});
```

**Parameters:**

| Parameter  | Type         | Description          |
| ---------- | ------------ | -------------------- |
| `handlers` | `Function[]` | Middleware functions |

**Returns:** `Woodland` instance (chainable)

**Notes:**

- Middleware registered via `always()` is automatically added to the ignored set
- Does not contribute to `req.allow` header calculations
- Executes on every request regardless of HTTP method or route match
- Internally calls `ignore()` for each handler before registering with `use()`

#### `use(rpath, ...fn)`

Register middleware for a specific route pattern. Can accept path + handlers or just handlers (matches all paths).

```javascript
// Route-specific middleware
app.use("/api/*", authMiddleware, apiHandler);

// Global middleware (no path)
app.use(globalMiddleware);
```

**Parameters:**

| Parameter | Type               | Description                          |
| --------- | ------------------ | ------------------------------------ |
| `rpath`   | `string\|Function` | Route pattern or middleware function |
| `fn`      | `Function[]`       | Middleware/handler functions         |

**Returns:** `Woodland` instance (chainable)

**Notes:**

- If first argument is a function, it's treated as global middleware (path becomes `/.*)`
- Last argument can be an HTTP method string (defaults to "GET")
- Logs "use" event with route and method information

#### `ignore(fn)`

Mark a middleware function as ignored in route visibility calculations. Used internally for ETag and CORS middleware.

```javascript
app.ignore(etagMiddleware);
```

**Parameters:**

| Parameter | Type       | Description                   |
| --------- | ---------- | ----------------------------- |
| `fn`      | `Function` | Middleware function to ignore |

**Returns:** `Woodland` instance (chainable)

**Notes:**

- Ignored middleware doesn't contribute to `req.allow` header
- Used internally for automatically registered middleware
- Logs "ignore" event with function name

---

### Response Helpers

These methods are attached to the `res` object during request decoration.

#### `res.send(body, status, headers)`

Send a response body. Handles strings, Buffers, and streams.

```javascript
res.send("Hello World");
res.send("Created", 201);
res.send("Data", 200, { "x-custom": "value" });
```

| Parameter | Type                     | Default        | Description      |
| --------- | ------------------------ | -------------- | ---------------- |
| `body`    | `string\|Buffer\|Stream` | `""`           | Response body    |
| `status`  | `number`                 | Current status | HTTP status code |
| `headers` | `Object`                 | `{}`           | Response headers |

#### `res.json(arg, status, headers)`

Send a JSON response. Automatically stringifies the data.

```javascript
res.json({ message: "Hello" });
res.json({ error: "Not found" }, 404);
```

| Parameter | Type            | Default                                               | Description      |
| --------- | --------------- | ----------------------------------------------------- | ---------------- |
| `arg`     | `Object\|Array` | Required                                              | JSON data        |
| `status`  | `number`        | `200`                                                 | HTTP status code |
| `headers` | `Object`        | `{"content-type": "application/json; charset=utf-8"}` | Response headers |

#### `res.error(status, body)`

Send an error response. Triggers error event and sends error message.

```javascript
res.error(404);
res.error(500, "Internal Server Error");
res.error(403, new Error("Forbidden"));
```

| Parameter | Type            | Default     | Description                   |
| --------- | --------------- | ----------- | ----------------------------- |
| `status`  | `number`        | `500`       | HTTP status code              |
| `body`    | `string\|Error` | Status text | Error message or Error object |

#### `res.redirect(uri, permanent)`

Redirect to a different URL. Uses 308 for permanent, 307 for temporary.

```javascript
res.redirect("/new-location"); // Permanent (308)
res.redirect("/temp", false); // Temporary (307)
```

| Parameter   | Type      | Default  | Description                 |
| ----------- | --------- | -------- | --------------------------- |
| `uri`       | `string`  | Required | Redirect URL                |
| `permanent` | `boolean` | `true`   | `true` = 308, `false` = 307 |

#### `res.header(name, value)`

Set a response header. Alias for `res.setHeader()`.

```javascript
res.header("x-custom", "value");
```

| Parameter | Type     | Description  |
| --------- | -------- | ------------ |
| `name`    | `string` | Header name  |
| `value`   | `string` | Header value |

#### `res.set(arg)`

Set multiple response headers. Accepts Object, Map, or Headers.

```javascript
res.set({ "x-one": "1", "x-two": "2" });
res.set(new Headers([["x-custom", "value"]]));
```

| Parameter | Type                   | Description    |
| --------- | ---------------------- | -------------- |
| `arg`     | `Object\|Map\|Headers` | Headers to set |

#### `res.status(arg)`

Set the HTTP status code. Returns `res` for chaining.

```javascript
res.status(201).json({ created: true });
```

| Parameter | Type     | Description      |
| --------- | -------- | ---------------- |
| `arg`     | `number` | HTTP status code |

**Returns:** `res` (chainable)

---

### Request Properties

These properties are added to the `req` object during decoration.

| Property       | Type       | Description                                     |
| -------------- | ---------- | ----------------------------------------------- |
| `req.allow`    | `string`   | Comma-separated allowed methods for the path    |
| `req.body`     | `string`   | Request body (populated by middleware)          |
| `req.cors`     | `boolean`  | Is this a CORS request?                         |
| `req.corsHost` | `boolean`  | Does the origin differ from the host?           |
| `req.host`     | `string`   | Hostname from the request                       |
| `req.ip`       | `string`   | Client IP address (respects X-Forwarded-For)    |
| `req.method`   | `string`   | HTTP method                                     |
| `req.params`   | `Object`   | Route parameters (e.g., `/:id` → `{id: "123"}`) |
| `req.parsed`   | `URL`      | Parsed URL object                               |
| `req.valid`    | `boolean`  | Request validation status                       |
| `req.url`      | `string`   | Original request URL                            |
| `req.exit()`   | `Function` | Exit middleware chain immediately               |

---

### Utility Methods

#### `allowed(method, uri, override)`

Check if a method is allowed for a URI.

```javascript
if (app.allowed("GET", "/users")) {
  // Method is allowed
}
```

| Parameter  | Type      | Default  | Description       |
| ---------- | --------- | -------- | ----------------- |
| `method`   | `string`  | Required | HTTP method       |
| `uri`      | `string`  | Required | Request URI       |
| `override` | `boolean` | `false`  | Skip cache lookup |

**Returns:** `boolean`

**Notes:**

- Checks if middleware is registered for the method and URI
- Ignores middleware marked with `ignore()`
- Uses internal cache for performance

#### `allows(uri, override)`

Get allowed methods for a URI. Automatically adds HEAD (if GET exists) and OPTIONS.

```javascript
const methods = app.allows("/users"); // "GET,HEAD,OPTIONS"
```

| Parameter  | Type      | Default  | Description       |
| ---------- | --------- | -------- | ----------------- |
| `uri`      | `string`  | Required | Request URI       |
| `override` | `boolean` | `false`  | Skip cache lookup |

**Returns:** `string` (comma-separated methods, sorted)

**Notes:**

- Returns wildcard methods if `always()` middleware registered
- Automatically adds HEAD if GET is allowed
- Automatically adds OPTIONS if not present
- Logs "allows" event with route information

#### `list(method, type)`

List registered routes for a specific HTTP method.

```javascript
const routes = app.list("get", "array"); // ["/", "/users", ...]
const routes = app.list("post", "object"); // {"/users": middleware}
```

| Parameter | Type     | Default   | Description             |
| --------- | -------- | --------- | ----------------------- |
| `method`  | `string` | `"get"`   | HTTP method (lowercase) |
| `type`    | `string` | `"array"` | `"array"` or `"object"` |

**Returns:** `Array` or `Object`

**Notes:**

- Method is converted to lowercase for lookup
- Returns array of route paths or object mapping paths to handlers
- Does not include `always()` middleware routes

#### `path(arg)`

Convert a route path with parameters to a regex pattern.

```javascript
const pattern = app.path("/users/:id"); // "/users/([^/]+)"
```

| Parameter | Type     | Description                           |
| --------- | -------- | ------------------------------------- |
| `arg`     | `string` | Route path with `:param` placeholders |

**Returns:** `string` (regex pattern)

**Notes:**

- Converts `:param` to named capture group `(?<param>[^/]+)`
- Used internally for route parameter extraction

#### `ip(req)`

Extract the client IP address from a request.

```javascript
const ip = app.ip(req);
```

| Parameter | Type     | Description         |
| --------- | -------- | ------------------- |
| `req`     | `Object` | HTTP request object |

**Returns:** `string` (IP address)

**Notes:**

- Respects `X-Forwarded-For` header
- Validates IP addresses for security
- Falls back to connection.remoteAddress or socket.remoteAddress
- Returns `127.0.0.1` if no IP found

#### `routes(uri, method, override)`

Get route information for a URI and method. Returns internal route data structure.

```javascript
const route = app.routes("/users", "get");
```

| Parameter | Type      | Default  | Description             |
| --------- | --------- | -------- | ----------------------- |
| `uri`     | `string`  | Required | Request URI             |
| `method`  | `string`  | Required | HTTP method             |
| `override`| `boolean` | `false`  | Skip cache lookup       |

**Returns:** `Object` (route information with middleware array, params, etc.)

**Route Object Properties:**

| Property     | Type      | Description                          |
| ------------ | --------- | ------------------------------------ |
| `middleware` | `Array`   | Array of middleware functions        |
| `params`     | `boolean` | Whether route parameters were found  |
| `getParams`  | `RegExp`  | RegExp with named capture groups     |
| `visible`    | `number`  | Count of non-ignored middleware      |
| `exit`       | `number`  | Index where exit middleware starts   |

#### `decorate(req, res)`

Decorate request and response objects with additional properties and methods. Called automatically by `route()`.

| Parameter | Type     | Description          |
| --------- | -------- | -------------------- |
| `req`     | `Object` | HTTP request object  |
| `res`     | `Object` | HTTP response object |

---

### Event Hooks

Woodland extends `EventEmitter` and emits events during request processing.

#### Events

| Event       | Parameters        | Description                    |
| ----------- | ----------------- | ------------------------------ |
| `"connect"` | `(req, res)`      | New connection received        |
| `"finish"`  | `(req, res)`      | Request completed              |
| `"error"`   | `(req, res, err)` | Error occurred                 |
| `"stream"`  | `(req, res)`      | File streaming started         |

```javascript
app.on("connect", (req, res) => {
  console.log(`Connection from ${req.ip}`);
});

app.on("finish", (req, res) => {
  analytics.track({ method: req.method, status: res.statusCode });
});

app.on("error", (req, res, err) => {
  console.error(`Error ${res.statusCode}:`, err);
});
```

**Notes:**

- `"error"` event logs the error via `logger.logError()`
- `"finish"` event is attached to `res.on("finish")`
- `"stream"` event is emitted when file streaming starts

#### Lifecycle Hooks

Override these methods to customize response handling:

```javascript
app.onReady(req, res, body, status, headers);
// Called before sending response
// Returns [body, status, headers]

app.onSend(req, res, body, status, headers);
// Called to modify response data
// Returns [body, status, headers]

app.onDone(req, res, body, headers);
// Called to finalize response (sets headers and ends response)
```

**Notes:**

- `onReady()` adds X-Response-Time header if `time: true` in config
- `onSend()` is a no-op by default (can be overridden for custom logic)
- `onDone()` sets Content-Length if not already set and writes headers

---

### File Serving

#### `files(root, folder)`

Mount a static file server. Registers middleware for serving files.

```javascript
app.files("/static", "./public");
app.files("/", "./www");
```

| Parameter | Type     | Default         | Description                 |
| --------- | -------- | --------------- | --------------------------- |
| `root`    | `string` | `"/"`           | URL root path               |
| `folder`  | `string` | `process.cwd()` | File system folder to serve |

**Returns:** `Woodland` instance (chainable)

**Features:**

- Directory listing (when `autoindex: true`)
- ETag support (when `etags: true`)
- Range requests for partial content
- Index file detection (`index.htm`, `index.html`)
- Path traversal protection

#### `serve(req, res, arg, folder)`

Serve a file or directory. Called internally by `files()`.

```javascript
await app.serve(req, res, "path/to/file", "./public");
```

| Parameter | Type     | Default         | Description                  |
| --------- | -------- | --------------- | ---------------------------- |
| `req`     | `Object` | Required        | HTTP request object          |
| `res`     | `Object` | Required        | HTTP response object         |
| `arg`     | `string` | Required        | File path relative to folder |
| `folder`  | `string` | `process.cwd()` | Base directory               |

**Returns:** `Promise<void>`

**Notes:**

- Resolves path and checks for path traversal attacks
- Returns 403 if path is outside allowed directory
- Returns 404 if file/directory not found
- Redirects directories to add trailing slash
- Serves index files or autoindex HTML

#### `stream(req, res, file)`

Stream a file to the response with appropriate headers. Called internally by `serve()`.

```javascript
app.stream(req, res, {
  charset: "utf-8",
  etag: '"abc123"',
  path: "/path/to/file",
  stats: { mtime: new Date(), size: 1234 },
});
```

| Parameter | Type     | Description             |
| --------- | -------- | ----------------------- |
| `req`     | `Object` | HTTP request object     |
| `res`     | `Object` | HTTP response object    |
| `file`    | `Object` | File information object |

**File Object Properties:**

| Property  | Type     | Description                      |
| --------- | -------- | -------------------------------- |
| `charset` | `string` | Character encoding               |
| `etag`    | `string` | ETag value                       |
| `path`    | `string` | File system path                 |
| `stats`   | `Object` | File statistics (from `fs.stat`) |
| `stats.size`   | `number` | File size in bytes       |
| `stats.mtime`  | `Date`   | File modification time   |

**Notes:**

- Handles GET, HEAD, and OPTIONS methods
- Supports range requests for partial content
- Emits "stream" event when started
- Sets Content-Type, Content-Length, Last-Modified headers

#### `etag(method, ...args)`

Generate an ETag for the given arguments. Returns empty string for non-cacheable methods.

```javascript
const etag = app.etag("GET", inode, size, mtime);
```

| Parameter | Type     | Description                   |
| --------- | -------- | ----------------------------- |
| `method`  | `string` | HTTP method                   |
| `args`    | `any[]`  | Arguments for ETag generation |

**Returns:** `string` (ETag value or empty string)

**Notes:**

- Returns empty string for methods other than GET, HEAD, OPTIONS
- Returns empty string if etags are disabled in config
- Uses `tiny-etag` library for ETag generation

---

## Route Patterns

### Parameters

```javascript
app.get("/users/:id", handler); // Single parameter
app.get("/users/:userId/posts/:postId", handler); // Multiple parameters
```

### Wildcards

```javascript
app.get("/api/*", handler); // Match all paths under /api/
app.get("/files/:path(.*)", handler); // RegExp capture group
```

### Route Order

Routes are matched in registration order. More specific routes should be registered first:

```javascript
// ✅ Correct order
app.get("/users/new", showNewForm); // Specific route first
app.get("/users/:id", getUserById); // Parameter route second

// ❌ Wrong order - /users/new never matches
app.get("/users/:id", getUserById);
app.get("/users/new", showNewForm);
```

---

## Error Handling

### Error Middleware

Error middleware has 4 parameters and must be registered **last** for each route:

```javascript
app.get(
  "/users",
  authenticate, // Normal middleware
  getUsers, // Route handler
  (error, req, res, next) => {
    // Error middleware - LAST
    console.error(error);
    res.error(500);
  },
);
```

### Global Error Handler

```javascript
app.use("/(.*)", (error, req, res, next) => {
  console.error(`[${res.statusCode}] ${req.url}:`, error);
  res.error(res.statusCode, "Internal Server Error");
});
```

---

## CORS

### Configuration

```javascript
const app = woodland({
  origins: ["https://myapp.com", "http://localhost:3000"],
  corsExpose: "x-total-count,x-page-count",
});
```

### Automatic Behavior

- Preflight OPTIONS requests handled automatically
- `Access-Control-Allow-Origin` header set based on configured origins
- `Access-Control-Allow-Methods` based on registered routes
- `Access-Control-Allow-Credentials: true` when credentials used
- Origin validation (denies unknown origins)

### Disable CORS

```javascript
const app = woodland({ origins: [] }); // Empty array = deny all
```

---

## Logging

### Configuration

```javascript
const app = woodland({
  logging: {
    enabled: true,
    level: "info",
    format: '%h %t "%r" %>s %b',
  },
});
```

### Format Tokens

| Token        | Description                    |
| ------------ | ------------------------------ |
| `%h`         | Remote IP address              |
| `%l`         | Remote logname (always `-`)    |
| `%u`         | Remote user (if authenticated) |
| `%t`         | Timestamp                      |
| `%r`         | Request line                   |
| `%>s`        | Status code                    |
| `%b`         | Response size in bytes         |
| `%{Header}i` | Request header value           |
| `%{Header}o` | Response header value          |
| `%v`         | Server hostname                |

---

## Internal Modules

The framework is organized into the following internal modules:

### `src/woodland.js` (612 lines)

Main framework file exporting the `Woodland` class and `woodland` factory function.

**Key Methods:**

- `constructor(config)` - Initialize with config validation
- `route(req, res)` - Route requests to middleware
- `decorate(req, res)` - Decorate request/response objects
- `allowed(method, uri, override)` - Check if method is allowed
- `allows(uri, override)` - Get allowed methods for URI
- `use(rpath, ...fn)` - Register middleware
- `always(...handlers)` - Register global middleware
- `get/post/put/delete/patch/options/connect/trace(...args)` - HTTP method shortcuts
- `ignore(fn)` - Mark middleware as ignored
- `list(method, type)` - List registered routes
- `routes(uri, method, override)` - Get route information
- `files(root, folder)` - Mount static file server
- `serve(req, res, arg, folder)` - Serve files
- `stream(req, res, file)` - Stream files to response
- `etag(method, ...args)` - Generate ETag
- `onReady/onSend/onDone()` - Lifecycle hooks

### `src/constants.js` (236 lines)

All HTTP constants, status codes, headers, and configuration values.

### `src/middleware.js` (279 lines)

Middleware registry and chain management:
- `createMiddlewareRegistry(methods, cache)` - Create middleware registry
- `registerMiddleware(middleware, ignored, methods, cache, rpath, ...fn)` - Register middleware
- `computeRoutes(middleware, ignored, uri, method, cache, override)` - Compute route info
- `reduce(uri, map, arg)` - Middleware matching utility
- `listRoutes(middleware, method, type)` - List routes
- `checkAllowed(middleware, ignored, cache, method, uri, override)` - Check method allowed
- `next(req, res, middleware, immediate)` - Middleware iterator

### `src/response.js` (402 lines)

Response handler creation and utilities:
- `error(req, res, status)` - Error response handler
- `json(res, arg, status, headers)` - JSON response handler
- `redirect(res, uri, perm)` - Redirect handler
- `send(req, res, body, status, headers, onReady, onDone)` - Send response handler
- `set(res, arg)` - Set headers handler
- `status(res, arg)` - Status code handler
- `stream(req, res, file, emitStream, createReadStream, etags)` - File streaming handler
- `writeHead(res, headers)` - Write response headers
- `getStatus(req, res)` - Determine status code
- `getStatusText(status)` - Get status text
- `mime(arg)` - Get MIME type for extension
- `pipeable(method, arg)` - Check if object is pipeable
- `partialHeaders(req, res, size, status, headers, options)` - Handle range requests
- `escapeHtml(str)` - Escape HTML for XSS prevention

### `src/request.js` (270 lines)

Request handling utilities:
- `cors(req, origins)` - CORS origin validation
- `corsHost(req)` - Cross-origin host detection
- `corsRequest()` - CORS preflight handler (returns 204)
- `extractIP(req)` - Extract client IP from request
- `isValidIP(ip)` - IP address validation (IPv4/IPv6)
- `parse(arg)` - URL parsing with security fallback
- `params(req, getParams)` - URL parameter extraction with XSS prevention
- `extractPath(path)` - Route pattern to regex conversion

### `src/logger.js` (231 lines)

Logging system:
- `createLogger(config)` - Create logger instance
- `log(msg, logLevel, enabled, actualLevel)` - Output log message
- `clf(req, res, format)` - Common Log Format formatting
- `logRoute(uri, method, ip, logFn)` - Route logging
- `logMiddleware(route, method, logFn)` - Middleware logging
- `logDecoration(uri, method, ip, logFn)` - Decoration logging
- `logError(uri, method, ip, logFn)` - Error logging
- `logServe(req, message, logFn)` - File serving logging
- `ms(arg, digits)` - Format nanoseconds to milliseconds
- `timeOffset(arg)` - Format timezone offset

### `src/config.js` (190 lines)

Configuration validation:
- `validateConfig(config)` - Validate constructor config with jsonschema
- `validateLogging(logging)` - Validate logging config
- `validateOrigins(origins)` - Validate CORS origins
- `resolveLoggingValue(configValue, envValue, defaultValue)` - Resolve config priority
- `mergeEnvLogging(logging)` - Merge environment variables

### `src/fileserver.js` (164 lines)

Static file serving:
- `createFileServer(app)` - Create file server instance
- `serve(app, req, res, arg, folder)` - Serve files and directories
- `register(app, root, folder, useMiddleware)` - Mount file routes
- `autoindex(title, files)` - Generate HTML directory listing

### `src/cli.js` (59 lines)

CLI entry point for serving static files.

---

## TypeScript Usage

Full TypeScript definitions are included:

```typescript
import { woodland, Woodland } from "woodland";
import { IncomingMessage, ServerResponse } from "node:http";

const app = woodland({
  origins: ["https://myapp.com"],
});

app.get("/users/:id", (req, res) => {
  const id: string = req.params.id;
  res.json({ id });
});

class MyAPI extends Woodland {
  constructor() {
    super({ origins: ["https://myapp.com"] });
  }

  setupRoutes() {
    this.get("/health", (req: IncomingMessage, res: ServerResponse) => {
      res.json({ status: "ok" });
    });
  }
}
```

---

## CLI

The `woodland` CLI allows you to quickly serve static files without writing code.

### Installation

```bash
npm install -g woodland
```

### Usage

```bash
# Serve current directory (default: http://127.0.0.1:8000)
woodland

# Custom port
woodland --port=3000

# Custom IP and port
woodland --ip=0.0.0.0 --port=3000

# Disable logging
woodland --logging=false
```

### CLI Options

| Option      | Default     | Type      | Description                            |
| ----------- | ----------- | --------- | -------------------------------------- |
| `--ip`      | `127.0.0.1` | `string`  | Server IP address (must be valid IPv4) |
| `--port`    | `8000`      | `number`  | Server port (0-65535)                  |
| `--logging` | `true`      | `boolean` | Enable/disable request logging         |

### Validation

- **Port**: Must be an integer between 0 and 65535
- **IP**: Must be a valid IPv4 address

### Default Configuration

The CLI creates a Woodland instance with these defaults:

```javascript
woodland({
  autoindex: true, // Directory listing enabled
  defaultHeaders: {
    "cache-control": "no-cache",
    "content-type": "text/plain; charset=utf-8",
  },
  logging: {
    enabled: true,
  },
  time: true, // X-Response-Time header enabled
});
```

### Example Output

```bash
$ woodland --port=3000
id=woodland, ip=127.0.0.1, port=3000
127.0.0.1 - [14/Mar/2026:10:30:00 -0500] "GET / HTTP/1.1" 200 1327
127.0.0.1 - [14/Mar/2026:10:30:05 -0500] "GET /style.css HTTP/1.1" 200 542
```

### Programmatic Usage

```javascript
import { createServer } from "node:http";
import { woodland } from "woodland";

const app = woodland({
  autoindex: true,
  logging: { enabled: true },
});

app.files(); // Serve current directory

createServer(app.route).listen(3000, "127.0.0.1", () => {
  console.log("Server running at http://127.0.0.1:3000");
});
```
