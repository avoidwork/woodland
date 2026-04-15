# Woodland API Reference

API documentation for `src/woodland.js` - the core HTTP server framework.

---

## Table of Contents

- [Factory Function](#factory-function)
- [Woodland Class](#woodland-class)
  - [Constructor](#constructor)
  - [HTTP Method Routes](#http-method-routes)
  - [Middleware Methods](#middleware-methods)
  - [File Serving Methods](#file-serving-methods)
  - [Utility Methods](#utility-methods)
  - [EventEmitter Methods](#eventemitter-methods)
  - [Properties](#properties)

---

## Factory Function

### `woodland(arg)`

Creates a new Woodland instance. Binds the `route` method to the instance.

| Parameter | Type | Default | Optional | Description |
|-----------|------|---------|----------|-------------|
| `arg` | `Object` | `{}` | **Yes** | Configuration object |

**Returns:** `Woodland` - New Woodland instance

---

## Woodland Class

Extends `EventEmitter`. Main framework class for creating HTTP servers.

### Constructor

```javascript
new Woodland(config = {})
```

Creates a new Woodland instance with optional configuration.

| Parameter | Type | Default | Optional | Description |
|-----------|------|---------|----------|-------------|
| `config` | `Object` | `{}` | **Yes** | Configuration object |

#### Config Options

| Option | Type | Default | Optional | Description |
|--------|------|---------|----------|-------------|
| `autoIndex` | `boolean` | `false` | **Yes** | Enable automatic directory indexing |
| `cacheSize` | `number` | `1000` | **Yes** | Size of internal cache |
| `cacheTTL` | `number` | `10000` | **Yes** | Cache TTL in milliseconds |
| `charset` | `string` | `'utf-8'` | **Yes** | Default charset |
| `corsExpose` | `string` | `''` | **Yes** | CORS expose headers |
| `defaultHeaders` | `Object` | `{}` | **Yes** | Default headers to set |
| `digit` | `number` | `3` | **Yes** | Digit precision for timing |
| `etags` | `boolean` | `true` | **Yes** | Enable ETags |
| `indexes` | `Array<string>` | `['index.htm','index.html']` | **Yes** | Index files to look for |
| `logging` | `Object` | `{}` | **Yes** | Logging configuration |
| `origins` | `Array<string>` | `[]` | **Yes** | Allowed CORS origins |
| `silent` | `boolean` | `false` | **Yes** | Silent mode (disables server headers) |
| `time` | `boolean` | `false` | **Yes** | Enable response time tracking |

---

### HTTP Method Routes

All route methods accept middleware functions and optionally a method type as the last argument. All return `Woodland` instance for chaining.

#### `always(...fn)`

Registers wildcard middleware for all HTTP methods.

| Parameter | Type | Optional | Description |
|-----------|------|----------|-------------|
| `...fn` | `Function` | No | Middleware function(s) |

**Returns:** `Woodland` - Returns self for chaining

#### `connect(rpath, ...fn)`

Registers CONNECT method middleware.

| Parameter | Type | Optional | Description |
|-----------|------|----------|-------------|
| `rpath` | `string` | **Yes** | Route path |
| `...fn` | `Function` | No | Middleware function(s) |

**Returns:** `Woodland` - Returns self for chaining

#### `delete(rpath, ...fn)`

Registers DELETE method middleware.

| Parameter | Type | Optional | Description |
|-----------|------|----------|-------------|
| `rpath` | `string` | **Yes** | Route path |
| `...fn` | `Function` | No | Middleware function(s) |

**Returns:** `Woodland` - Returns self for chaining

#### `get(rpath, ...fn)`

Registers GET method middleware.

| Parameter | Type | Optional | Description |
|-----------|------|----------|-------------|
| `rpath` | `string` | **Yes** | Route path |
| `...fn` | `Function` | No | Middleware function(s) |

**Returns:** `Woodland` - Returns self for chaining

#### `options(rpath, ...fn)`

Registers OPTIONS method middleware.

| Parameter | Type | Optional | Description |
|-----------|------|----------|-------------|
| `rpath` | `string` | **Yes** | Route path |
| `...fn` | `Function` | No | Middleware function(s) |

**Returns:** `Woodland` - Returns self for chaining

#### `patch(rpath, ...fn)`

Registers PATCH method middleware.

| Parameter | Type | Optional | Description |
|-----------|------|----------|-------------|
| `rpath` | `string` | **Yes** | Route path |
| `...fn` | `Function` | No | Middleware function(s) |

**Returns:** `Woodland` - Returns self for chaining

#### `post(rpath, ...fn)`

Registers POST method middleware.

| Parameter | Type | Optional | Description |
|-----------|------|----------|-------------|
| `rpath` | `string` | **Yes** | Route path |
| `...fn` | `Function` | No | Middleware function(s) |

**Returns:** `Woodland` - Returns self for chaining

#### `put(rpath, ...fn)`

Registers PUT method middleware.

| Parameter | Type | Optional | Description |
|-----------|------|----------|-------------|
| `rpath` | `string` | **Yes** | Route path |
| `...fn` | `Function` | No | Middleware function(s) |

**Returns:** `Woodland` - Returns self for chaining

#### `trace(rpath, ...fn)`

Registers TRACE method middleware.

| Parameter | Type | Optional | Description |
|-----------|------|----------|-------------|
| `rpath` | `string` | **Yes** | Route path |
| `...fn` | `Function` | No | Middleware function(s) |

**Returns:** `Woodland` - Returns self for chaining

---

### Middleware Methods

#### `ignore(fn)`

Adds a middleware function to the ignored set. Ignored functions are excluded from route visibility counts.

| Parameter | Type | Optional | Description |
|-----------|------|----------|-------------|
| `fn` | `Function` | No | Function to ignore |

**Returns:** `Woodland` - Returns self for chaining

#### `use(rpath, ...fn)`

Registers middleware for a route.

| Parameter | Type | Default | Optional | Description |
|-----------|------|---------|----------|-------------|
| `rpath` | `string\|Function` | No | No | Route path or middleware function |
| `...fn` | `Function` | No | No | Middleware function(s), last argument can be HTTP method string |

**Returns:** `Woodland` - Returns self for chaining

**Notes:**
- If `rpath` is a function, it is treated as middleware without a specific path
- The last argument in `fn` array can be a string specifying the HTTP method (defaults to 'GET')
- Middleware can be chained for multiple handlers on the same route

---

### File Serving Methods

#### `files(root, folder)`

Registers file server middleware for serving static files.

| Parameter | Type | Default | Optional | Description |
|-----------|------|---------|----------|-------------|
| `root` | `string` | `'/'` | **Yes** | Root path to mount the file server |
| `folder` | `string` | `process.cwd()` | **Yes** | Folder to serve files from |

**Returns:** `Woodland` - Returns self for chaining

#### `serve(req, res, arg, folder)`

Serves a file from disk directly.

| Parameter | Type | Default | Optional | Description |
|-----------|------|---------|----------|-------------|
| `req` | `Object` | No | No | HTTP request object |
| `res` | `Object` | No | No | HTTP response object |
| `arg` | `string` | No | No | File path to serve |
| `folder` | `string` | `process.cwd()` | **Yes** | Folder to serve from |

**Returns:** `Promise` - Promise that resolves when done

#### `stream(req, res, file)`

Streams a file to the response with proper headers and range support.

| Parameter | Type | Default | Optional | Description |
|-----------|------|---------|----------|-------------|
| `req` | `Object` | No | No | HTTP request object |
| `res` | `Object` | No | No | HTTP response object |
| `file` | `Object` | `{ charset: '', etag: '', path: '', stats: { mtime: Date, size: 0 } }` | **Yes** | File descriptor object |

**File Object Properties:**

| Property | Type | Optional | Description |
|----------|------|----------|-------------|
| `file.path` | `string` | No | File path |
| `file.etag` | `string` | No | File ETag |
| `file.charset` | `string` | No | File charset |
| `file.stats` | `Object` | No | File statistics |
| `file.stats.size` | `number` | No | File size in bytes |
| `file.stats.mtime` | `Date` | No | File modification time |

---

### Utility Methods

#### `etag(method, ...args)`

Generates an ETag for response caching based on method and values with prototype pollution protection.

| Parameter | Type | Optional | Description |
|-----------|------|----------|-------------|
| `method` | `string` | No | HTTP method (must be GET, HEAD, or OPTIONS) |
| `...args` | `*` | No | Values to hash into the ETag |

**Returns:** `string` - ETag string or empty string if method is not hashable or ETags are disabled

**Security:** Objects without own `toString` property are rejected to prevent prototype pollution. Objects are stringified with `JSON.stringify()` and joined with hyphens

#### `#remove404Headers(res)`

Removes security headers from 404 response.

| Parameter | Type | Optional | Description |
|-----------|------|----------|-------------|
| `res` | `Object` | No | HTTP response object |

**Note:** Private method that removes `ALLOW` and `ACCESS_CONTROL_ALLOW_METHODS` headers

#### `list(method, type)`

Lists registered middleware routes for a specific HTTP method.

| Parameter | Type | Default | Optional | Description |
|-----------|------|---------|----------|-------------|
| `method` | `string` | `'get'` | **Yes** | HTTP method to list routes for |
| `type` | `string` | `'array'` | **Yes** | Return type: `'array'` or `'object'` |

**Returns:** `Array\|Object` - List of route paths (array of strings or object mapping paths to handlers)

#### `routes(uri, method, override)`

Gets route information for a specific URI and method.

| Parameter | Type | Default | Optional | Description |
|-----------|------|---------|----------|-------------|
| `uri` | `string` | No | No | URI to check |
| `method` | `string` | No | No | HTTP method |
| `override` | `boolean` | `false` | **Yes** | Override cached route information |

**Returns:** `Object` - Route information object containing:
- `middleware`: Array of middleware handlers
- `params`: Boolean indicating if parameters were found
- `getParams`: RegExp for extracting parameters
- `visible`: Count of visible middleware
- `exit`: Exit index

**Security:** Validates `getParams` exists before parameter extraction

#### `route(req, res)`

Routes an HTTP request to the appropriate middleware. This is the main request handler.

| Parameter | Type | Optional | Description |
|-----------|------|----------|-------------|
| `req` | `Object` | No | HTTP request object |
| `res` | `Object` | No | HTTP response object |

**Notes:**
- Decorates request and response objects with framework utilities and security validation
- Validates CORS requests with simplified security logic
- Emits `connect` event if listeners are registered
- Emits `finish` event when response completes
- Logs routing information

---

### EventEmitter Methods

As an `EventEmitter` subclass, Woodland supports all standard EventEmitter methods:

| Method | Description |
|--------|-------------|
| `on(event, listener)` | Add event listener |
| `once(event, listener)` | Add one-time event listener |
| `off(event, listener)` | Remove event listener |
| `removeAllListeners(event)` | Remove all listeners for event |
| `emit(event, ...args)` | Emit event with arguments |
| `listeners(event)` | Get listeners for event |
| `listenerCount(event)` | Get count of listeners for event |

**Supported Events:**

| Event | Description | Listener Arguments |
|-------|-------------|-------------------|
| `error` | Error occurred | `(req, res, error)` |
| `connect` | Request connected | `(req, res)` |
| `finish` | Response finished | `(req, res)` |
| `stream` | File streaming started | `(req, res)` |

---

### Properties

#### `logger`

**Type:** `Object`

Returns the logger instance with methods: `log`, `clf`, `logRoute`, `logMiddleware`, `logDecoration`, `logError`, `logServe`.

**Getter only** - Read-only property.

---

## Request Object Decorations

The `route()` method decorates request objects with the following properties including security validations:

| Property | Type | Description |
|----------|------|-------------|
| `req.corsHost` | `boolean` | True if origin header exists and differs from host header |
| `req.cors` | `boolean` | True if CORS is allowed for this request |
| `req.parsed` | `URL` | Parsed URL object |
| `req.allow` | `string` | Comma-separated list of allowed methods |
| `req.ip` | `string` | Client IP address |
| `req.body` | `string` | Request body (initialized as empty string) |
| `req.host` | `string` | Request hostname |
| `req.params` | `Object` | URL parameters (populated if route has params) |
| `req.valid` | `boolean` | Request validity status |
| `req.precise` | `Object` | Timing object (if `time` config is enabled) |

---

## Response Object Decorations

The `route()` method decorates response objects with the following methods including security header validation:

| Method | Description |
|--------|-------------|
| `res.error(status, body)` | Error response handler with security validation |
| `res.header(name, value)` | Set response header (alias for `setHeader`) |
| `res.json(arg, status, headers)` | Send JSON response |
| `res.redirect(uri, perm)` | Redirect response with URI validation and security checks |
| `res.send(body, status, headers)` | Send response body with security headers |
| `res.set(arg)` | Set multiple headers with type validation |
| `res.status(arg)` | Set HTTP status code |
| `res.locals` | `Object` - Local variables for the request |
