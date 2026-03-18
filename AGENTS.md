# AGENTS.md

## Setup commands

- Install deps: `npm install`
- Build: `npm run build`
- Run tests: `npm test`
- Run tests with coverage: `npm run coverage`
- Run benchmarks: `npm run benchmarks`
- Fix lint errors: `npm run fix`
- Check lint only: `npm run lint`
- Documentation is in `./docs`

## Development workflow

1. Make changes to source files
2. Run tests: `npm test` (ensure all tests pass)
3. Fix lint errors: `npm run fix`
4. Build: `npm run build`
5. Run coverage: `npm run coverage` (target 100% line coverage)

## Tooling

- **Linting**: oxlint (with `no-console: error` and `no-unused-vars: error` rules)
- **Formatting**: oxfmt
- **Testing**: Node.js built-in test runner (`node --test`)
- **Git hooks**: husky (runs `npm run fix && npm run coverage && git add -A` on pre-commit)
- **Build**: rollup
- **Validation**: jsonschema (JSON Schema Draft-07 for config validation)

## Code style

- Use JSDoc standard for creating docblocks of functions and classes
- Always use camelCase for function names
- Always use upper-case snake_case for constants
- Create integration tests in `tests/integration` that use node-assert
- Create unit tests in `tests/unit` that use node-assert
- Use node.js community "Best Practices"
- Fix lint errors by running `npm run fix`
- Adhere to DRY, KISS, YAGNI, & SOLID principles
- Adhere to OWASP security guidance

## Codebase structure

| File | Purpose | Exports |
|------|---------|---------|
| `src/woodland.js` | Main framework (only class) | `Woodland` class, `woodland` factory |
| `src/config.js` | Configuration validation | `validateConfig`, `validateLogging`, `validateOrigins`, `mergeEnvLogging` |
| `src/response.js` | Response handlers | `mime`, `getStatusText`, `error`, `json`, `redirect`, `send`, `set`, `status`, `stream`, `noop`, `escapeHtml`, `partialHeaders`, `pipeable`, `writeHead`, `mimeExtensions` |
| `src/request.js` | Request handlers | `cors`, `corsHost`, `corsRequest`, `extractIP`, `decorate`, `logClose`, `params`, `parse`, `extractPath`, `isValidIP` |
| `src/logger.js` | Logging | `createLogger`, `log`, `clfm`, `extractIP`, `logRoute`, `logMiddleware`, `logDecoration`, `logError`, `logServe`, `ms`, `timeOffset` |
| `src/middleware.js` | Middleware registry | `reduce`, `getStatus`, `next`, `computeRoutes`, `listRoutes`, `checkAllowed`, `createMiddlewareRegistry`, `registerMiddleware` |
| `src/fileserver.js` | File server | `serve`, `register`, `createFileServer`, `autoindex` |
| `src/constants.js` | Constants & patterns | All framework constants (HTTP methods, headers, status codes, etc.) |
| `src/cli.js` | CLI entry point | CLI server runner |
| `tpl/autoindex.html` | Directory listing template | HTML template for autoindex |

**Note:** Integration tests are optional when unit tests provide comprehensive coverage of all exported functions.

## Architecture patterns

### Single class, factories everywhere
- **Only one class exists**: `Woodland` in `woodland.js` (extends `EventEmitter`)
- **Factory pattern for everything else**: `createLogger`, `createMiddlewareRegistry`, `createFileServer`
- Factories use closures for private state instead of class fields
- Factories return objects with bound methods for testability

### HTTP method shortcuts
All HTTP method shortcuts delegate to `use()`:
- `get`, `post`, `put`, `delete`, `patch`, `options`, `connect`, `trace`
- `always` - wildcard middleware for all methods

### Curried response handlers
Response handlers support currying when bound to `res`:
```javascript
res.json = this.json(res); // Returns function that can be called later: res.json(data, status, headers)
res.send = this.send(req, res); // Returns function: res.send(body, status, headers)
```

### Middleware execution
- Middleware executes via `process.nextTick` (async by default)
- Tests need to await or use `done` callbacks
- `immediate: true` in `next()` bypasses nextTick for sync execution
- `always()` middleware is automatically ignored for route visibility calculations

### CORS behavior
- `req.cors` is `true` when origin host differs from request host AND origin is allowed
- `req.corsHost` is `true` when origin header exists and host differs
- CORS check only runs when origin header is present

## Performance patterns

- Cache regex patterns at module level or in constants.js
- Use `Object.create(null)` for null-prototype objects (faster property access)
- Use `for` loops instead of `for..of` in hot paths
- Cache environment variable reads in constructor (not module level) to support test overrides
- Avoid optional chaining in hot paths
- Use `Set` for O(1) lookups instead of array `.includes()`
- Pre-allocate arrays when size is known
- Batch property assignments and header sets
- Use spread operator `[...array]` instead of `structuredClone` for simple arrays

## Environment variables

- `WOODLAND_LOG_ENABLED` - Enable/disable logging ("true"/"false" or omitted for default)
- `WOODLAND_LOG_FORMAT` - Custom log format string
- `WOODLAND_LOG_LEVEL` - Log level (debug, info, warn, error, etc.)

## Security considerations

- Validate all IP addresses before use (use `isValidIP` from request.js)
- Block path traversal attempts in file serving (resolve() + startsWith check)
- Deny CORS by default (empty origins array)
- Escape HTML in autoindex to prevent XSS (escapeHtml function)
- Don't expose sensitive information in error responses
- Ensure resolved file paths stay within allowed directories

## Test count

- 509 tests passing
- 100% line coverage target

## Key implementation details

### Config validation (`config.js`)
- Uses jsonschema library with Draft-07 schema
- `validateConfig` merges validated config with DEFAULTS for missing properties
- `validateLogging` checks config → env vars → defaults priority chain
- Invalid log levels fall back to `INFO` (not thrown as error)

### Logger (`logger.js`)
- `createLogger` returns object with bound methods via closures
- `clfm` generates common log format with `timeOffset` for timezone
- `timeOffset` convention: positive input (minutes) returns negative string (e.g., 300 → "-0500")
- `ms` - formats nanoseconds to milliseconds with configurable precision
- Log levels: emerg, alert, crit, error, warn, notice, info, debug (0-7, lower = more severe)

### Request handlers (`request.js`)
- `cors` - returns true if origins array non-empty AND (wildcard OR origin in list)
- `corsHost` - true if origin header exists and hostname differs from request host
- `corsRequest` - returns function that sends 204 No Content
- `extractIP` - checks x-forwarded-for first, then connection.remoteAddress, then socket.remoteAddress
- `params` - extracts URL parameters using regex named groups, uses `coerce()` to convert numeric strings, applies `escapeHtml()` for XSS prevention
- `parse` - parses URL string or request object into URL object with security fallback
- `extractPath` - converts `/:param` to regex `/(?<param>[^/]+)` for route matching

### Response handlers (`response.js`)
- `error` - removes "allow" header on 404, removes CORS headers if `req.cors` is true
- `json` - always sets `Content-Type: application/json; charset=utf-8`
- `redirect` - 308 for permanent, 307 for temporary
- `send` - handles streams (pipeable) and ranged requests
- `set` - accepts Object, Map, or Headers; converts to Headers for iteration
- `status` - simple statusCode setter
- `stream` - handles GET, HEAD, OPTIONS methods for file serving
- `escapeHtml` - escapes HTML special characters (`&<>"'`) for XSS prevention
- `partialHeaders` - handles HTTP range requests, sets `content-range` and `content-length` headers
- `pipeable` - checks if object is stream-like (has `on` method and not HEAD method)
- `writeHead` - writes response headers using `writeHead()` method
- `mimeExtensions` - MIME type database keyed by file extension

### Request handlers (`request.js`)
- `cors` - returns true if origins array non-empty AND (wildcard OR origin in list)
- `corsHost` - true if origin header exists and hostname differs from request host
- `corsRequest` - returns function that sends 204 No Content
- `extractIP` - checks x-forwarded-for first, then connection.remoteAddress, then socket.remoteAddress

### Middleware registry (`middleware.js`)
- `createMiddlewareRegistry` returns object with: `ignore`, `allowed`, `routes`, `register`, `list`
- `createMiddlewareRegistry(methods, cache)` - takes only methods array and cache, creates internal `middleware` Map and `ignored` Set
- `allowed(method, uri, override)` - checks if a method is allowed for a URI (method comes BEFORE uri)
- `routes(uri, method, override)` - returns route information (uri comes BEFORE method)
- Cache key format: `${method}${DELIMITER}${uri}` (e.g., `"GET|/test"`)
- `computeRoutes` caches results in Map with key `${method}${DELIMITER}${uri}`
- `next` - creates iterator-based middleware executor with error handler detection (ERROR_HANDLER_LENGTH = 4)
- `getStatus` - determines 404/405/500 based on `req.allow` and method
- HEAD routes cannot be registered directly; GET routes implicitly allow HEAD

### Middleware state management
- `this.middleware` on Woodland instance is the registry object (not a Map)
- `this.middleware.ignore(fn)` - adds function to internal ignored Set
- `this.middleware.allowed(method, uri, override)` - returns boolean
- `this.middleware.routes(uri, method, override)` - returns route info object
- `this.middleware.register(path, ...fns, method)` - registers middleware
- `this.middleware.list(method, type)` - lists routes for a method

### File server (`fileserver.js`)
- `serve` - resolves path, checks path traversal (startsWith), handles directories
- Directories redirect to add trailing slash, or serve autoindex if enabled
- Looks for index files (index.htm, index.html) before autoindex
- `createFileServer` returns object with `register` and `serve` methods
- `autoindex` - generates HTML directory listing using `escapeHtml` for XSS prevention

### Constants (`constants.js`)
- HTTP methods: GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD, CONNECT, TRACE
- Status codes: INT_200, INT_204, INT_206, INT_304, INT_307, INT_308, INT_400, INT_403, INT_404, INT_405, INT_416, INT_500
- Headers: CONTENT_TYPE, CONTENT_LENGTH, CACHE_CONTROL, ETAG, LOCATION, ALLOW, etc.
- Patterns: TOKEN_N, TIME_MS, KEY_BYTES, etc. for regex generation

## Iteration 2 Optimizations

**Performance improvements:**
- **woodland.js**: Cached `METHODS` array at module level to avoid repeated spread operations in `allows()`
- **woodland.js**: Simplified `allows()` by removing redundant `Array.from()` - now uses spread operator
- **logger.js**: Changed `validLevels` from array to `Set` for O(1) lookup in `createLogger()`
- **fileserver.js**: Simplified `autoindex()` by removing redundant `replaceCallback` variable

**Results:**
- 507 tests passing
- Coverage: 99.25% line (pre-existing gaps)
- Code reduced by ~5 lines

## Iteration 3 Optimizations

**Performance improvements:**
- **config.js**: Extracted `resolveLoggingValue()` helper to eliminate duplicated logic in `validateLogging()` and `mergeEnvLogging()`
- **config.js**: Changed `VALID_LOG_LEVELS` from array to module-level constant to avoid recreation
- **config.js**: Simplified ternary chains in both logging functions for better readability
- **constants.js**: Replaced `Array.from(Array(12).values())` with `Array.from({length: 12})` in MONTHS generation

**Results:**
- 507 tests passing
- Coverage: 99.24% line (no regressions)
- Code reduced by ~15 lines, improved DRY compliance

## Iteration 4 Optimizations

**Performance improvements:**
- **woodland.js**: Replaced `for...of` loop in `decorate()` with indexed `for` loop per performance patterns
- **woodland.js**: Cached `defaultHeaders` in local variable before loop iteration
- **woodland.js**: Optimized `allows()` to only create `Set` when list has items
- **middleware.js**: Cached `nodeMethods` array as module-level constant `NODE_METHODS`
- **response.js**: Simplified `partialHeaders()` by removing redundant comments and consolidating early returns

**Results:**
- 507 tests passing
- Coverage: 99.24% line (no regressions)
- Code reduced by ~10 lines, improved hot path performance

## Iteration 5 Optimizations

**Performance improvements:**
- **request.js**: Cached `origin` variable in `cors()` to avoid repeated `req.headers.origin` access
- **request.js**: Cached `headerCount` in `decorate()` to avoid repeated `defaultHeaders.length` access
- **response.js**: Consolidated early return checks in `partialHeaders()` by removing redundant blank lines
- **response.js**: Simplified body type check in `send()` - reordered conditions for better short-circuit evaluation
- **woodland.js**: Cached `headerCount` in `decorate()` to avoid repeated `defaultHeaders.length` access

**Results:**
- 507 tests passing
- Coverage: 99.24% line (no regressions)
- Code reduced by ~5 lines, improved hot path performance

## Iteration 6 Optimizations

**Performance improvements:**
- **middleware.js**: Changed `map.size === 0` to `!map.size` for shorter boolean check
- **logger.js**: Condensed return object in `log()` function to single line
- **fileserver.js**: Cached `app.indexes` in local variable before loop iteration

**Results:**
- 507 tests passing
- Coverage: 99.24% line (no regressions)
- Code reduced by ~3 lines

## Iteration 7 Optimizations

**Performance improvements:**
- **config.js**: Changed `VALID_LOG_LEVELS` from array to `Set` for O(1) lookup
- **config.js**: Simplified ternary chain in `validateLogging()` using nullish coalescing
- **config.js**: Simplified ternary chain in `mergeEnvLogging()` using nullish coalescing

**Results:**
- 507 tests passing
- Coverage: 99.24% line (no regressions)
- Code reduced by ~8 lines, improved DRY compliance

## Iteration 8 Optimizations

**Performance improvements:**
- **response.js**: Replaced `for...of` with indexed `for` loop in `mimeExtensions` initialization
- **woodland.js**: Simplified timing initialization in `decorate()` using ternary
- **woodland.js**: Cached `origin` variable before CORS headers check

**Results:**
- 507 tests passing
- Coverage: 99.24% line (no regressions)
- Code reduced by ~5 lines, consistent with `for` loop pattern

## Iteration 9 Optimizations

**Performance improvements:**
- **fileserver.js**: Changed `endsWith(SLASH) === false` to `!endsWith(SLASH)` for shorter check
- **fileserver.js**: Changed `result.length === INT_0` to `!result.length` for shorter check
- **fileserver.js**: Removed unused `INT_0` import

**Results:**
- 507 tests passing
- Coverage: 99.24% line (no regressions)
- Code reduced by ~3 lines

## Iteration 10 Optimizations

**Performance improvements:**
- **response.js**: Replaced `for...of` with indexed `for` loop in `set()` function
- **middleware.js**: Replaced `Array.from(methodMap.keys())` with spread operator `[...methodMap.keys()]`

**Results:**
- 507 tests passing
- Coverage: 99.24% line (no regressions)
- Code reduced by ~4 lines, consistent with `for` loop pattern
