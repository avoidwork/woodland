# AGENTS.md - Woodland HTTP Framework

## Project Overview

Woodland is a lightweight, security-focused HTTP server framework for Node.js that extends EventEmitter. It provides middleware-based routing with built-in CORS, file serving, caching, and comprehensive logging.

**Key Statistics:**
- 311 tests passing
- 100% line coverage
- 97%+ branch and function coverage
- Minimal dependencies
- Express-compatible API

---

## Setup Commands

```bash
npm install          # Install dependencies
npm test             # Run tests
npm run coverage     # Run tests with coverage (target: 100%)
npm run benchmarks   # Run performance benchmarks
npm run benchmark comparison  # Compare against Express/Fastify
npm run lint         # Check linting (oxlint)
npm run fix          # Auto-fix linting issues
npm run build        # Build with rollup
```

---

## Development Workflow

1. Make changes to source files in `src/`
2. Run tests: `npm test` (ensure all pass)
3. Fix lint errors: `npm run fix`
4. Build: `npm run build`
5. Run coverage: `npm run coverage` (maintain 100% line coverage)
6. Commit changes (husky pre-commit hook runs fix + coverage + git add)

---

## Tooling Stack

| Tool | Purpose |
|------|---------|
| **oxlint** | Linting (with `no-console: error`, `no-unused-vars: error`) |
| **oxfmt** | Formatting |
| **node --test** | Test runner (Node.js built-in) |
| **husky** | Git hooks (pre-commit: fix + coverage + add) |
| **rollup** | Build bundler |
| **jsonschema** | Config validation (Draft-07) |
| **tiny-lru** | LRU caching |
| **tiny-etag** | ETag generation |

---

## Codebase Structure

### Source Files (`src/`)

| File | Purpose | Key Exports |
|------|---------|-------------|
| `woodland.js` | Main framework class | `Woodland` class, `woodland` factory |
| `config.js` | Configuration validation | `validateConfig`, `validateLogging`, `validateOrigins`, `resolveLoggingValue` |
| `response.js` | Response handlers | `json`, `send`, `redirect`, `error`, `stream`, `set`, `status`, `partialHeaders`, `escapeHtml`, `mime`, `getStatus`, `getStatusText`, `writeHead`, `pipeable`, `createErrorHandler`, `createJsonHandler`, `createRedirectHandler`, `createSendHandler`, `createSetHandler`, `createStatusHandler` |
| `request.js` | Request handlers | `cors`, `extractIP`, `params`, `parse`, `isValidIP` |
| `logger.js` | Logging utilities | `createLogger`, `log`, `clf`, `ms`, `timeOffset` |
| `middleware.js` | Middleware registry | `reduce`, `next`, `createMiddlewareRegistry` |
| `fileserver.js` | Static file serving | `serve`, `createFileServer`, `autoindex` |
| `constants.js` | HTTP constants | Methods, status codes, headers, patterns |
| `cli.js` | CLI entry point | Server runner |

### Other Directories

- `tests/unit/` - Unit tests (node-assert)
- `tests/integration/` - Integration tests (node-assert)
- `benchmarks/` - Performance benchmarks
- `docs/` - Technical documentation
- `tpl/` - HTML templates (autoindex)

---

## Architecture Patterns

### Single Class, Factories Everywhere

- **Only one class**: `Woodland` (extends `EventEmitter`)
- **Factory pattern**: `createLogger`, `createMiddlewareRegistry`, `createFileServer`
- Factories use closures for private state (not class fields)
- Factories return objects with bound methods for testability

### HTTP Method Shortcuts

All delegate to `use()`:
- `get`, `post`, `put`, `delete`, `patch`, `options`, `connect`, `trace`
- `always(path?, ...fn)` - Wildcard middleware for all methods

### Curried Response Handlers

```javascript
res.json = this.json(res);  // res.json(data, status, headers)
res.send = this.send(req, res);  // res.send(body, status, headers)
```

### Middleware Execution

- Executes via `process.nextTick` (async by default)
- Tests must `await` or use `done` callbacks
- `immediate: true` in `next()` bypasses nextTick for sync execution
- `always()` middleware ignored for route visibility
- Error handlers detected by 4-argument signature: `(err, req, res, next)`

---

## Key Implementation Details

### Woodland Class (`src/woodland.js`)

```javascript
const app = woodland({
  origins: [],          // CORS allowlist (empty = deny all)
  autoindex: false,     // Directory listing
  cacheSize: 1000,      // LRU cache size
  cacheTTL: 10000,      // Cache TTL (ms)
  etags: true,          // ETag generation
  time: false,          // X-Response-Time header
  silent: false,        // Disable server headers
  logging: {
    enabled: true,
    level: "info",
    format: "%h %l %u %t \"%r\" %>s %b"
  }
});
```

**Important:**
- Logging delegated to `this.logger.log()` (no `app.log()` method)
- CLI uses `app.logger.log()` for startup messages
- HEAD routes cannot be registered directly (GET implies HEAD)

### Request Decorations (`src/request.js`)

After `decorate(req, res)`:

| Property | Description |
|----------|-------------|
| `req.parsed` | URL object (pathname, search, hostname) |
| `req.allow` | Allowed methods string (e.g., "GET, OPTIONS") |
| `req.cors` | `true` if origin allowed and differs from host |
| `req.corsHost` | `true` if origin header exists and host differs |
| `req.ip` | Client IP (from X-Forwarded-For or connection) |
| `req.params` | URL parameters array |
| `req.body` | Request body (initialized as `{}`) |
| `req.valid` | Request validation flag |

**Exported utilities:**
- `isValidIP(ip)` - Validate IPv4/IPv6
- `extractIP(req)` - Extract IP from request
- `params(req, regex)` - Extract URL params with XSS prevention
- `parse(url)` - Parse URL with security fallback

### Response Handlers (`src/response.js`)

| Method | Usage | Notes |
|--------|-------|-------|
| `res.json(data, status, headers)` | JSON response | Always sets `Content-Type: application/json` |
| `res.send(body, status, headers)` | Text/stream | Handles streams and ranged requests |
| `res.redirect(url, permanent)` | Redirect | 308 permanent, 307 temporary |
| `res.error(status, message)` | Error | Removes CORS headers if `req.cors` |
| `res.set(headers)` | Set headers | Accepts Object, Map, or Headers |
| `res.status(code)` | Set status | Simple setter |
| `res.header(name, value)` | Native header | Direct Node.js access |

**Utilities:**
- `escapeHtml(str)` - XSS prevention (escapes `&<>"'`)
- `mime(path)` - Get MIME type from path
- `getStatus(method, req)` - Determine 404/405/500
- `getStatusText(code)` - Get status text from `STATUS_CODES`
- `pipeable(req, body)` - Check if body is pipeable (excludes HEAD/DELETE)

### Middleware Registry (`src/middleware.js`)

```javascript
// Middleware registry methods
app.middleware.register(path, ...fn, method)
app.middleware.allowed(method, uri, override)
app.middleware.routes(uri, method, override)
app.middleware.ignore(fn)
app.middleware.list(method, type)  // "array" or "object"
```

**Cache key format:** `${method}${DELIMITER}${uri}` (e.g., `"GET|/test"`)

### File Server (`src/fileserver.js`)

```javascript
// Serve static files
app.files("/static", "./public");

// Manual serving
await app.serve(req, res, "/path/to/file", "./public");
```

**Security:**
- Path traversal blocked (resolved path must stay within folder)
- Directories redirect to add trailing slash, or serve autoindex
- Index files: `index.htm`, `index.html`

### Config Validation (`src/config.js`)

```javascript
// Validation functions
const config = validateConfig({ origins: ["https://app.com"] });
const logging = validateLogging({ level: "debug" });
const origins = validateOrigins(["https://app.com", "*"]);
```

**Important:**
- `validateLogging()` handles environment variable merging (WOODLAND_LOG_*)
- `resolveLoggingValue()` implements priority: config > env > default
- `validateConfig()` uses jsonschema for Draft-07 validation

---

### Logger (`src/logger.js`)

```javascript
// Create logger
const logger = createLogger({ enabled: true, level: "debug" });

// Usage
logger.log("type=woodland, message=started", LOG_INFO);
logger.clf(req, res);  // Common Log Format
logger.ms(1234567);    // "1.234 ms"
logger.timeOffset(300); // "-0500" (timezone)
```

**Log levels:** emerg (0), alert (1), crit (2), error (3), warn (4), notice (5), info (6), debug (7)

---

## Security Considerations

### Built-in Protections

1. **Path Traversal**: Resolved paths validated against allowed directories
2. **CORS**: Default deny (empty origins array), explicit allowlist required
3. **XSS Prevention**: `escapeHtml()` for all user output
4. **IP Validation**: `isValidIP()` before use
5. **Error Handling**: No sensitive data exposure in error responses

### Production Hardening

```javascript
import helmet from "helmet";
import rateLimit from "express-rate-limit";

app.always(helmet());
app.always(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
```

### Environment Variables

```bash
WOODLAND_LOG_ENABLED=true|false
WOODLAND_LOG_FORMAT="<format string>"
WOODLAND_LOG_LEVEL=debug|info|warn|error|...
```

---

## Performance Patterns

### Optimization Guidelines

- Cache regex patterns at module level
- Use `Object.create(null)` for null-prototype objects
- Use `for` loops instead of `for..of` in hot paths
- Cache env var reads in constructor (not module level)
- Avoid optional chaining in hot paths
- Use `Set` for O(1) lookups instead of `.includes()`
- Pre-allocate arrays when size is known
- Batch property assignments and header sets
- Use spread `[...array]` instead of `structuredClone`

### Benchmark Results (Mean of 5 runs)

| Framework | Mean (ms) | Ops/sec |
|-----------|-----------|---------|
| Fastify | 0.0863ms | 11,698 |
| **Woodland** | **0.0929ms** | **10,860** |
| Node.js HTTP | 0.1092ms | 9,180 |
| Express | 0.1043ms | 9,591 |

**Additional Performance Metrics:**

| Category | Metric | Result |
|----------|--------|--------|
| **Routing** | Method validation (`allows()`) | 3.7M ops/sec |
| | Route resolution (`routes()`) | 922K ops/sec |
| **Middleware** | Registration | 20K+ ops/sec |
| | Simple execution | 29K ops/sec |
| **HTTP Server** | JSON responses | 7,266 ops/sec |
| | CRUD operations | 6-7K ops/sec |
| **File Serving** | Small files (< 1KB) | 44K ops/sec |
| | Streaming with ETags | 370K ops/sec |
| **Capacity** | Single instance (JSON API) | 4,000-7,000 RPS |
| | Cluster (10 instances) | 50,000-70,000 RPS |

---

## Testing Guidelines

### Test Structure

- **Unit tests**: `tests/unit/` - Test individual functions
- **Integration tests**: `tests/integration/` - Test full request cycles
- **Benchmarks**: `benchmarks/` - Performance testing

### Test Patterns

```javascript
import { describe, it } from "node:test";
import assert from "node:assert";

describe("module", () => {
  it("should do something", async () => {
    const result = await someFunction();
    assert.strictEqual(result, expected);
  });
});
```

### Mocking Requirements

For benchmark tests, mock responses must include:
- `send()`, `json()`, `end()`, `pipe()`, `on()`, `emit()` methods
- `socket.server._connectionKey` property for CORS/IP extraction
- Stream bodies must be destroyed to prevent EMFILE errors

### Coverage Targets

- 100% line coverage (required)
- Ongoing work: 100% branch and function coverage

---

## Common Tasks

### Adding a New Route

```javascript
// src/woodland.js or app setup
app.get("/api/users/:id", (req, res) => {
  const userId = req.params.id;
  res.json({ id: userId });
});
```

### Creating Middleware

```javascript
// Regular middleware (3 params)
app.always((req, res, next) => {
  req.startTime = Date.now();
  next();
});

// Error handler (4 params - detected automatically)
app.use("/(.*)", (err, req, res, next) => {
  console.error(err);
  res.error(500, err.message);
});
```

### Configuring CORS

```javascript
const app = woodland({
  origins: ["https://app.example.com", "https://api.example.com"],
  corsExpose: "x-custom-header,x-request-id"
});
// Woodland automatically handles preflight OPTIONS requests
```

### Serving Static Files

```javascript
const app = woodland({ autoindex: true });
app.files("/static", "./public");
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| CORS blocked | Add origins to config: `origins: ["https://myapp.com"]` |
| Route not matching | Check trailing slashes, use consistent patterns |
| EMFILE errors | Destroy file streams in mock responses |
| Import errors | Check actual exports in `src/*.js` files |
| Lint errors | Run `npm run fix` |
| Test failures | Check mock response includes all required methods |

---

## Git Workflow

- **Main branch**: `main`
- **Feature branches**: Create from main
- **Pre-commit hook**: Runs `npm run fix && npm run coverage && git add -A`
- **Commits**: Only when explicitly requested
- **Never**: Force push to main, skip hooks, or amend pushed commits

---

## Documentation References

- [API Reference](docs/API.md) - Complete method documentation
- [Technical Documentation](docs/TECHNICAL_DOCUMENTATION.md) - Architecture, OWASP security, internals
- [Code Style Guide](docs/CODE_STYLE_GUIDE.md) - Conventions and best practices
- [Benchmarks](docs/BENCHMARKS.md) - Performance testing results
