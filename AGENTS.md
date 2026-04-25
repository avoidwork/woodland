# Woodland Development Guidelines

## Project Overview

Woodland is a high-performance HTTP framework for Node.js. This document provides context for AI agents working on the codebase.

## Guiding Principles

### Security-First Design

1. **Default Deny**: All security features default to restrictive settings (e.g., empty CORS origins)
2. **Input Validation**: Validate and sanitize all user input (headers, paths, parameters)
3. **Output Encoding**: Escape all output to prevent XSS attacks
4. **Path Traversal Protection**: Use `resolve()` + `startsWith()` for file path validation
5. **Header Injection Prevention**: Type-check header values (string or number only)
6. **Prototype Pollution Protection**: Use `Object.hasOwn()` before accessing object properties
7. **Open Redirect Prevention**: Block protocol schemes and control characters in redirects
8. **Origin Sanitization**: Use `#isSafeOrigin()` to validate Origin headers before using in CORS responses (block control chars, enforce scheme, limit length)
9. **Error Message Containment**: By default, error responses only send HTTP status text, not internal messages or stack traces
10. **Body Size Limiting**: Middleware rejects requests exceeding `bodyLimit` with 413 to prevent DoS
11. **TRACE Disabled by Default**: TRACE method disabled by default (`disableTrace: true`) to prevent XST attacks — enable with `disableTrace: false` in config

### Code Quality Principles

1. **DRY (Don't Repeat Yourself)**: Extract common logic into reusable functions
2. **YAGNI (You Aren't Gonna Need It)**: Avoid adding features without clear requirements
3. **SOLID Principles**:
   - Single Responsibility: Each module has one purpose
   - Open/Closed: Open for extension, closed for modification
   - Liskov Substitution: Subtypes must be substitutable for base types
   - Interface Segregation: Prefer small, focused interfaces
   - Dependency Inversion: Depend on abstractions, not concretions
4. **OWASP Compliance**: Follow OWASP Top 10 guidelines for web security
5. **No Magic Values**: All numeric literals and string literals must use constants

### Performance Principles

1. **Zero Overhead Security**: Security features must have minimal performance impact
2. **LRU Caching**: Cache expensive operations (routes, permissions, ETags)
3. **Iterator Pattern**: Use iterators for middleware chains to avoid array copies
4. **Batch Operations**: Group header operations to reduce function calls
5. **Event Loop Scheduling**: Use `process.nextTick()` for non-blocking operations

### Testing Principles

1. **100% Line Coverage**: All code paths must be tested
2. **Security Testing**: Dedicated tests for security features
3. **Edge Cases**: Test boundary conditions and error paths
4. **Integration Tests**: Verify component interactions
5. **No Flaky Tests**: All tests must be deterministic

### Documentation Principles

1. **Accuracy**: Documentation must match implementation exactly
2. **Completeness**: Document all public APIs with JSDoc
3. **Examples**: Provide working code examples
4. **Security Notes**: Highlight security considerations
5. **No Unverified Claims**: Remove performance claims without benchmarks

## Architecture

### Core Files

- **`src/woodland.js`**: Main HTTP server framework class extending EventEmitter
- **`src/middleware.js`**: Middleware registry and routing logic
- **`src/request.js`**: Request parsing, IP extraction, CORS handling
- **`src/response.js`**: Response handlers, MIME types, streaming
- **`src/fileserver.js`**: Static file serving with directory indexing
- **`src/logger.js`**: Logging utilities with configurable format/level
- **`src/config.js`**: Configuration validation using jsonschema
- **`src/constants.js`**: HTTP constants, status codes, headers
- **`src/cli.js`**: CLI entry point for running the framework

### Type Definitions

- **`types/woodland.d.ts`**: TypeScript definitions for the public API

### Testing

- **`tests/unit/`**: Unit tests for individual modules
- **`tests/integration/`**: Integration tests
- **`tests/test-files/`**: Test fixtures

### Benchmarks

- **`benchmarks/`**: Performance comparison tests

## Public API

### Factory Function

```javascript
import { woodland } from "woodland";
const app = woodland(config);
```

### Woodland Class Methods

#### Routing Methods (all return `Woodland` for chaining)

- `get(rpath, ...fn)` - GET route
- `post(rpath, ...fn)` - POST route
- `put(rpath, ...fn)` - PUT route
- `delete(rpath, ...fn)` - DELETE route
- `patch(rpath, ...fn)` - PATCH route
- `options(rpath, ...fn)` - OPTIONS route
- `connect(rpath, ...fn)` - CONNECT route
- `trace(rpath, ...fn)` - TRACE route (disabled by default, requires `disableTrace: false`)
- `always(rpath, ...fn)` - All methods (wildcard)

#### Middleware Methods

- `use(rpath, ...fn)` - Register middleware (last arg can be method string)
- `ignore(fn)` - Add function to ignored set
- `list(method, type)` - List routes (returns array or object)

#### File Serving

- `files(root, folder)` - Register file server middleware
- `serve(req, res, arg, folder)` - Serve file from disk (async)
- `stream(req, res, file)` - Stream file to response

#### Utilities

- `etag(method, ...args)` - Generate ETag for caching
- `route(req, res)` - Main request handler
- `routes(uri, method, override)` - Get route information
- `logger` - Logger instance (getter only)

### Configuration Options

All optional in constructor:

```typescript
{
  autoIndex?: boolean;      // Enable directory indexing (default: false)
  bodyLimit?: number;       // Max request body size in bytes (default: 10000000 = 10MB)
  cacheSize?: number;       // Cache size (default: 1000)
  cacheTTL?: number;        // Cache TTL in ms (default: 10000)
  charset?: string;         // Default charset (default: 'utf-8')
  corsExpose?: string;      // CORS expose headers (default: '')
  defaultHeaders?: Record<string, string>; // Default headers
  disableTrace?: boolean;   // Disable TRACE method (default: true, prevents XST)
  digit?: number;           // Timing precision (default: 3)
  etags?: boolean;          // Enable ETags (default: true)
  exposeErrorMessages?: boolean; // Expose internal error messages (default: false)
  indexes?: string[];       // Index files (default: ['index.htm','index.html'])
  logging?: object;         // Logging config
  origins?: string[];       // Allowed CORS origins (default: [])
  silent?: boolean;         // Silent mode (default: false)
  time?: boolean;           // Enable timing (default: false)
}
```

## Internals (Avoid Modifying Unless Necessary)

### Private Fields (using #)

- `#autoIndex`, `#bodyLimit`, `#charset`, `#corsExpose`, `#defaultHeaders`
- `#disableTrace`, `#digit`, `#etags`, `#exposeErrorMessages`, `#indexes`, `#logging`
- `#origins`, `#time`, `#cache`
- `#methods`, `#logger`, `#fileServer`, `#middleware`

### Private Methods

- `#allows()`, `#buildAllowedList()`
- `#decorate()`, `#addCorsHeaders()`
- `#isSafeOrigin()`, `#setCorsAllowAndExposeHeaders()`
- `#onDone()`, `#onReady()`, `#onSend()`
- `#handleAllowedRoute()`
- `#registerMethod()` - Register middleware for a given HTTP method
- `#setupBodyLimit()` - Body size limit middleware

## Code Style

- Use ES modules (import/export)
- Private fields with `#` prefix
- JSDoc comments for all public APIs
- Parameter tables in documentation with optional markers
- Follow existing patterns in tests
- **Use constants instead of magic strings or numbers** - Define all string literals and numeric values as constants in `constants.js`

### Constants Pattern

All numeric literals and string literals must use constants from `constants.js`:

**Numeric Constants:**
- `INT_0`, `INT_1`, `INT_2`, `INT_3`, `INT_4`, `INT_5`, `INT_8`, `INT_10`
- `INT_NEG_1` (for -1)
- `INT_60`, `INT_255`, `INT_1e3`, `INT_1e4`, `INT_1e6`
- `INT_8000`, `INT_65535`

**String Constants:**
- `EMPTY` (empty string)
- `SLASH`, `BACKSLASH`, `DOUBLE_SLASH`, `SLASH_BACKSLASH`
- `COLON`, `COMMA`, `HYPHEN`, `PERIOD`, `EQUAL`
- `FUNCTION`, `STRING`, `OBJECT`, `ARRAY`, `NUMBER`, `BOOLEAN`

**Examples:**
```javascript
// Good
if (count === INT_0) { ... }
for (let i = INT_0; i < length; i++) { ... }
if (typeof fn === FUNCTION) { ... }
const x = array[INT_0];

// Bad
if (count === 0) { ... }
for (let i = 0; i < length; i++) { ... }
if (typeof fn === "function") { ... }
const x = array[0];
```

**Regex with 'g' modifier should NOT be constants** - they maintain state and can cause issues when reused.

## Running Tests

```bash
npm test              # Full test suite with lint (100% line coverage)
npm run test:watch    # Watch mode
npm run coverage      # Generate coverage report
```

**Test Requirements:**
- All 335 tests must pass
- 100% line coverage required
- Run `npm test` before committing
- Run `npm run build` before pushing (generates dist files)

## Key Design Patterns

1. **Middleware Chain**: Uses iterator pattern with `next()` function
2. **Request Decoration**: Request/response objects decorated with utilities
3. **EventEmitter**: Extends EventEmitter for lifecycle events
4. **CORS Support**: Configurable origins with automatic header handling
5. **ETag Caching**: Optional ETag generation for cacheable methods
6. **File Serving**: Automatic MIME types, range requests, directory indexing
7. **Constants-First**: All literals defined as constants for maintainability

## Events

- `error` - Error occurred: `(req, res, error)`
- `connect` - Request connected: `(req, res)`
- `finish` - Response finished: `(req, res)`
- `stream` - File streaming started: `(req, res)`

## Request/Response Decorations

### Request Properties

- `req.corsHost`, `req.cors`, `req.parsed`, `req.allow`
- `req.ip`, `req.body`, `req.host`, `req.params`
- `req.valid`, `req.precise`

### Response Methods

- `res.error()`, `res.header()`, `res.json()`
- `res.redirect()`, `res.send()`, `res.set()`
- `res.status()`, `res.locals`
