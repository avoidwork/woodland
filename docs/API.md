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

#### `use(path, ...handlers)`

Register middleware for a specific route pattern. Can accept path + handlers or just handlers (matches all paths).

```javascript
// Route-specific middleware
app.use("/api/*", authMiddleware, apiHandler);

// Global middleware (no path)
app.use(globalMiddleware);
```

**Parameters:**

| Parameter  | Type               | Description                          |
| ---------- | ------------------ | ------------------------------------ |
| `path`     | `string\|Function` | Route pattern or middleware function |
| `handlers` | `Function[]`       | Middleware/handler functions         |

**Returns:** `Woodland` instance (chainable)

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

---

### Response Helpers

These methods are attached to the `res` object during request decoration.

#### `res.send(body, status, headers)`

Send a response body.

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

#### `res.json(body, status, headers)`

Send a JSON response.

```javascript
res.json({ message: "Hello" });
res.json({ error: "Not found" }, 404);
```

| Parameter | Type            | Default                                               | Description      |
| --------- | --------------- | ----------------------------------------------------- | ---------------- |
| `body`    | `Object\|Array` | Required                                              | JSON data        |
| `status`  | `number`        | `200`                                                 | HTTP status code |
| `headers` | `Object`        | `{"content-type": "application/json; charset=utf-8"}` | Response headers |

#### `res.error(status, body)`

Send an error response.

```javascript
res.error(404);
res.error(500, "Internal Server Error");
res.error(new Error("Something went wrong"));
```

| Parameter | Type            | Default     | Description                   |
| --------- | --------------- | ----------- | ----------------------------- |
| `status`  | `number`        | `500`       | HTTP status code              |
| `body`    | `string\|Error` | Status text | Error message or Error object |

#### `res.redirect(url, permanent)`

Redirect to a different URL.

```javascript
res.redirect("/new-location"); // Permanent (308)
res.redirect("/temp", false); // Temporary (307)
```

| Parameter   | Type      | Default  | Description                 |
| ----------- | --------- | -------- | --------------------------- |
| `url`       | `string`  | Required | Redirect URL                |
| `permanent` | `boolean` | `true`   | `true` = 308, `false` = 307 |

#### `res.header(name, value)`

Set a response header.

```javascript
res.header("x-custom", "value");
```

| Parameter | Type     | Description  |
| --------- | -------- | ------------ |
| `name`    | `string` | Header name  |
| `value`   | `string` | Header value |

#### `res.set(headers)`

Set multiple response headers.

```javascript
res.set({ "x-one": "1", "x-two": "2" });
res.set(new Headers([["x-custom", "value"]]));
```

| Parameter | Type                   | Description    |
| --------- | ---------------------- | -------------- |
| `headers` | `Object\|Map\|Headers` | Headers to set |

#### `res.status(code)`

Set the HTTP status code.

```javascript
res.status(201).json({ created: true });
```

| Parameter | Type     | Description      |
| --------- | -------- | ---------------- |
| `code`    | `number` | HTTP status code |

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

#### `allows(uri, override)`

Get allowed methods for a URI.

```javascript
const methods = app.allows("/users"); // "GET,HEAD,OPTIONS"
```

| Parameter  | Type      | Default  | Description       |
| ---------- | --------- | -------- | ----------------- |
| `uri`      | `string`  | Required | Request URI       |
| `override` | `boolean` | `false`  | Skip cache lookup |

**Returns:** `string` (comma-separated methods)

#### `list(method, type)`

List registered routes.

```javascript
const routes = app.list("get", "array"); // ["/", "/users", ...]
const routes = app.list("post", "object"); // {"/users": middleware}
```

| Parameter | Type     | Default   | Description             |
| --------- | -------- | --------- | ----------------------- |
| `method`  | `string` | `"get"`   | HTTP method             |
| `type`    | `string` | `"array"` | `"array"` or `"object"` |

**Returns:** `Array` or `Object`

#### `path(arg)`

Convert a route path with parameters to a regex pattern.

```javascript
const pattern = app.path("/users/:id"); // "/users/([^/]+)"
```

| Parameter | Type     | Description                           |
| --------- | -------- | ------------------------------------- |
| `arg`     | `string` | Route path with `:param` placeholders |

**Returns:** `string` (regex pattern)

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
- Falls back to connection IP

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

| Event       | Parameters        | Description             |
| ----------- | ----------------- | ----------------------- |
| `"connect"` | `(req, res)`      | New connection received |
| `"finish"`  | `(req, res)`      | Request completed       |
| `"error"`   | `(req, res, err)` | Error occurred          |
| `"stream"`  | `(req, res)`      | File streaming started  |

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

#### Lifecycle Hooks

Override these methods to customize response handling:

```javascript
app.onReady(req, res, body, status, headers);
// Called before sending response
// Return [body, status, headers]

app.onSend(req, res, body, status, headers);
// Called to modify response data
// Return [body, status, headers]

app.onDone(req, res, body, headers);
// Called to finalize response
```

---

### File Serving

#### `files(root, folder)`

Mount a static file server.

```javascript
app.files("/static", "./public");
app.files("/", "./www");
```

| Parameter | Type     | Default         | Description                 |
| --------- | -------- | --------------- | --------------------------- |
| `root`    | `string` | `"/"`           | URL root path               |
| `folder`  | `string` | `process.cwd()` | File system folder to serve |

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

#### `etag(method, ...args)`

Generate an ETag for the given arguments.

```javascript
const etag = app.etag("GET", inode, size, mtime);
```

| Parameter | Type     | Description                   |
| --------- | -------- | ----------------------------- |
| `method`  | `string` | HTTP method                   |
| `args`    | `any[]`  | Arguments for ETag generation |

**Returns:** `string` (ETag value or empty string)

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

### `src/woodland.js` (603 lines)

Main framework file exporting the `Woodland` class and `woodland` factory function.

### `src/request.js` (235 lines)

Request handling utilities:
- `isValidIP()` - IP address validation
- `extractPath()` - Route pattern conversion to regex
- `params()` - URL parameter extraction with XSS prevention
- `parse()` - URL parsing with security fallback
- `extractIP()` - IP extraction from request
- `createCorsHandler()` - CORS handler creation
- `cors()` - CORS validation
- `corsHost()` - Origin host detection
- `decorate()` - Request/response decoration
- `logClose()` - Close event logging
- `logDecoration()` - Decoration logging

### `src/constants.js` (219 lines)

All HTTP constants, status codes, headers, and configuration values.

### `src/middleware.js` (234 lines)

Middleware registry and chain management:
- `createMiddlewareRegistry()` - Create middleware registry
- `reduce()` - Middleware matching utility
- `getStatus()` - Status code determination
- `next()` - Middleware iterator

### `src/response.js` (216 lines)

Response handler creation:
- `createResponseHandler()` - Create all response handlers
- `createErrorHandler()` - Error response handler
- `createJsonHandler()` - JSON response handler
- `createRedirectHandler()` - Redirect handler
- `createSendHandler()` - Send response handler
- `createSetHandler()` - Set headers handler
- `createStatusHandler()` - Status code handler
- `stream()` - File streaming handler

### `src/request.js` (321 lines)

Request handling utilities:
- `isValidIP()` - IP address validation (IPv4/IPv6)
- `cors()` - CORS origin validation
- `corsHost()` - Cross-origin host detection
- `corsRequest()` - CORS preflight handler
- `extractIP()` - Extract client IP from request
- `decorate()` - Request/response decoration
- `logClose()` - Request close logging
- `params()` - URL parameter extraction
- `parse()` - URL parsing
- `extractPath()` - Route pattern to regex conversion

### `src/fileserver.js` (80 lines)

Static file serving:
- `createFileServer()` - Create file server instance
- `serve()` - Serve files and directories
- `register()` - Mount file routes

### `src/logger.js` (137 lines)

Logging system:
- `createLogger()` - Create logger instance
- Common Log Format (CLF) formatting via `clf()` method
- Structured logging for routing, middleware, errors

### `src/config.js` (130 lines)

Configuration validation:
- `validateConfig()` - Validate constructor config
- `validateLogging()` - Validate logging config
- `validateOrigins()` - Validate CORS origins
- `mergeEnvLogging()` - Merge environment variables

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
