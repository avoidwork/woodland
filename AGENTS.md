# Woodland Development Guidelines

Rules and principles for agents working on **this** project.

---

## 1. Core Rules

### 1.0 Document Conventions

When updating this document, append new information or sections. Do NOT delete or overwrite existing content unless explicitly directed. Always ask before making structural changes. When in doubt, keep it.

### 1.1 Forbidden Patterns

The following are **strictly prohibited**:

- Hardcoded secrets, API keys, or credentials.
- `eval()`, `exec()`, `vm.runInNewContext()` at any level.
- `require()` with dynamic/user-controlled module paths.
- `*` imports (`import * as x from "x"`).
- Bypassing the auth middleware.

### 1.2 Security Rules

Follow the [OWASP Top 10](https://owasp.org/www-project-top-10/) for every piece of code written:

- **Default Deny**: All security features default to restrictive settings (e.g., empty CORS origins)
- **Input Validation**: Validate and sanitize all user input (headers, paths, parameters)
- **Output Encoding**: Escape all output to prevent XSS attacks
- **Path Traversal Protection**: Use `resolve()` + `startsWith()` for file path validation
- **Header Injection Prevention**: Type-check header values (string or number only)
- **Prototype Pollution Protection**: Use `Object.hasOwn()` before accessing object properties
- **Open Redirect Prevention**: Block protocol schemes and control characters in redirects
- **Origin Sanitization**: Use `#isSafeOrigin()` to validate Origin headers before using in CORS responses (block control chars, enforce scheme, limit length)
- **Error Message Containment**: By default, error responses only send HTTP status text, not internal messages or stack traces
- **Body Size Limiting**: Middleware rejects requests exceeding `bodyLimit` with 413 to prevent DoS
- **TRACE Disabled by Default**: TRACE method disabled by default (`disableTrace: true`) to prevent XST attacks — enable with `disableTrace: false` in config

### 1.3 Git Operations

- **Never rebase under any circumstance without explicit agreement from the user.** Never assume your decision is correct.
- Never force push.

### 1.4 Core Principles

- **DRY**: Extract repeated logic into functions, classes, or utilities. Reuse common logic throughout the codebase. No copy-paste code blocks greater than three lines.
- **KISS**: Prefer simple, readable code over clever solutions.
- **YAGNI**: Do NOT build features, abstractions, or configurations not required by the current spec. No generic "future-proof" wrappers. Ad-hoc solutions are acceptable as long as they serve a present requirement.
- **Single Responsibility**: Each module, class, and function must have one reason to change.
- **Open/Closed**: Extend via composition — not by modifying existing logic.
- **Dependency Inversion**: Depend on abstractions for external services. Inject implementations.
- **No Magic Values**: All numeric literals and string literals must use constants from `constants.js`.

---

## 2. Project Context

Woodland is a high-performance HTTP framework for Node.js. This document provides context for AI agents working on the codebase.

### 2.0 Expected Project Layout

```
.
├── src/                    # Core framework source files
│   ├── woodland.js         # Main HTTP server framework class extending EventEmitter
│   ├── middleware.js       # Middleware registry and routing logic
│   ├── request.js          # Request parsing, IP extraction, CORS handling
│   ├── response.js         # Response handlers, MIME types, streaming
│   ├── fileserver.js       # Static file serving with directory indexing
│   ├── logger.js           # Logging utilities with configurable format/level
│   ├── config.js           # Configuration validation using jsonschema
│   ├── constants.js        # HTTP constants, status codes, headers
│   └── cli.js              # CLI entry point for running the framework
├── types/                  # TypeScript definitions for the public API
│   └── woodland.d.ts
├── tests/                  # Test files
│   ├── unit/               # Unit tests for individual modules
│   ├── integration/        # Integration tests
│   └── test-files/         # Test fixtures
├── benchmarks/             # Performance comparison tests
└── package.json
```

### 2.1 Quick Commands

| Command          | Purpose                        |
|------------------|--------------------------------|
| `npm test`       | Full test suite with lint (100% line coverage) |
| `npm run test:watch` | Watch mode                 |
| `npm run coverage`   | Generate coverage report   |
| `npm run build`    | Generate dist files        |

---

## 3. JavaScript/TypeScript Conventions

### 3.1 Language & Tooling

- **JavaScript**: ES modules (import/export)
- **Package manager**: npm
- **Type checking**: TypeScript definitions in `types/woodland.d.ts`
- **Testing**: Node.js built-in test runner via npm scripts
- **Linting**: Lint enforced via `npm test`

### 3.2 Style

- Use ES modules (import/export)
- Private class fields with `#` prefix
- JSDoc comments for all public APIs
- Parameter tables in documentation with optional markers
- Follow existing patterns in tests
- **Use constants instead of magic strings or numbers** — define all string literals and numeric values as constants in `constants.js`

### 3.3 Constants Pattern

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

**Regex with 'g' modifier should NOT be constants** — they maintain state and can cause issues when reused.

---

## 4. Framework Conventions

### 4.1 Factory Function

```javascript
import { woodland } from "woodland";
const app = woodland(config);
```

### 4.2 Routing Methods (all return `Woodland` for chaining)

- `get(rpath, ...fn)` - GET route
- `post(rpath, ...fn)` - POST route
- `put(rpath, ...fn)` - PUT route
- `delete(rpath, ...fn)` - DELETE route
- `patch(rpath, ...fn)` - PATCH route
- `options(rpath, ...fn)` - OPTIONS route
- `connect(rpath, ...fn)` - CONNECT route
- `trace(rpath, ...fn)` - TRACE route (disabled by default, requires `disableTrace: false`)
- `always(rpath, ...fn)` - All methods (wildcard)

### 4.3 Middleware Method

- `use(rpath, ...fn)` - Register middleware (last arg can be method string)

### 4.4 File Serving

- `files(root, folder)` - Register file server middleware
- `serve(req, res, arg, folder)` - Serve file from disk (async)
- `stream(req, res, file)` - Stream file to response

### 4.5 Configuration

All optional in constructor:

- `autoIndex?: boolean` — Enable directory indexing (default: false)
- `bodyLimit?: number` — Max request body size in bytes (default: 10000000 = 10MB)
- `cacheSize?: number` — Cache size (default: 1000)
- `cacheTTL?: number` — Cache TTL in ms (default: 10000)
- `charset?: string` — Default charset (default: 'utf-8')
- `corsExpose?: string` — CORS expose headers (default: '')
- `defaultHeaders?: Record<string, string>` — Default headers
- `disableTrace?: boolean` — Disable TRACE method (default: true, prevents XST)
- `digit?: number` — Timing precision (default: 3)
- `etags?: boolean` — Enable ETags (default: true)
- `exposeErrorMessages?: boolean` — Expose internal error messages (default: false)
- `indexes?: string[]` — Index files (default: ['index.htm','index.html'])
- `logging?: object` — Logging config
- `origins?: string[]` — Allowed CORS origins (default: [])
- `silent?: boolean` — Silent mode (default: false)
- `time?: boolean` — Enable timing (default: false)

---

## 5. Git Conventions

### 5.1 Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new static file serving feature
fix: correct CORS header handling for edge cases
docs: update AGENTS.md with new structure
test: add tests for path traversal protection
chore: update dependencies
```

### 5.2 Branching

- Main branch is `master`.
- Feature branches: `feat/<short-desc>` or `fix/<short-desc>`.
- Never commit directly to `master`. Always create a feature branch first, then open a PR targeting `master`.

### 5.3 Build Requirements

- Run `npm test` before committing (all 335 tests must pass, 100% line coverage required).
- Run `npm run build` before pushing (generates dist files).

---

## 6. Operational Rules

### 6.1 Performance Principles

- **Zero Overhead Security**: Security features must have minimal performance impact
- **LRU Caching**: Cache expensive operations (routes, permissions, ETags)
- **Iterator Pattern**: Use iterators for middleware chains to avoid array copies
- **Batch Operations**: Group header operations to reduce function calls
- **Event Loop Scheduling**: Use `process.nextTick()` for non-blocking operations

### 6.2 Key Design Patterns

1. **Middleware Chain**: Uses iterator pattern with `next()` function
2. **Request Decoration**: Request/response objects decorated with utilities
3. **EventEmitter**: Extends EventEmitter for lifecycle events
4. **CORS Support**: Configurable origins with automatic header handling
5. **ETag Caching**: Optional ETag generation for cacheable methods
6. **File Serving**: Automatic MIME types, range requests, directory indexing
7. **Constants-First**: All literals defined as constants for maintainability

### 6.3 Events

- `error` — Error occurred: `(req, res, error)`
- `connect` — Request connected: `(req, res)`
- `finish` — Response finished: `(req, res)`
- `stream` — File streaming started: `(req, res)`

### 6.4 Request/Response Decorations

#### Request Properties

- `req.corsHost`, `req.cors`, `req.parsed`, `req.allow`
- `req.ip`, `req.body`, `req.host`, `req.params`
- `req.valid`, `req.precise`

#### Response Methods

- `res.error()`, `res.header()`, `res.json()`
- `res.redirect()`, `res.send()`, `res.set()`
- `res.status()`, `res.locals`

### 6.5 Coverage

The test suite enforces **100% line coverage**. Every new function or class needs test coverage. No exceptions.

```bash
npm run coverage   # Generate coverage report
npm test           # Full test suite with lint (100% line coverage)
```

### 6.6 Utility Methods

- `ignore(fn)` — Add function to ignored set
- `list(method, type)` — List routes (returns array or object)
- `etag(method, ...args)` — Generate ETag for caching
- `route(req, res)` — Main request handler
- `routes(uri, method, override)` — Get route information
- `logger` — Logger instance (getter only)

---

## 7. Session Learnings

Discovery notes about the codebase.

### 7.1 Internals (Avoid Modifying Unless Necessary)

The following private fields and methods are part of the internal implementation and should be avoided unless necessary:

**Private Fields (using #):**
- `#autoIndex`, `#bodyLimit`, `#charset`, `#corsExpose`, `#defaultHeaders`
- `#disableTrace`, `#digit`, `#etags`, `#exposeErrorMessages`, `#indexes`, `#logging`
- `#origins`, `#time`, `#cache`
- `#methods`, `#logger`, `#fileServer`, `#middleware`

**Private Methods:**
- `#allows()`, `#buildAllowedList()`
- `#decorate()`, `#addCorsHeaders()`
- `#isSafeOrigin()`, `#setCorsAllowAndExposeHeaders()`
- `#onDone()`, `#onReady()`, `#onSend()`
- `#handleAllowedRoute()`
- `#registerMethod()` — Register middleware for a given HTTP method
- `#setupBodyLimit()` — Body size limit middleware

---

## 8. Checklist Before Marking a TODO Complete

- [ ] All code follows existing conventions (ES modules, private fields with `#`, JSDoc).
- [ ] Constants from `constants.js` used instead of magic values.
- [ ] Unit tests written and passing.
- [ ] 100% code coverage maintained (enforced by `npm test`).
- [ ] No hardcoded secrets or credentials introduced.
- [ ] Security principles followed (OWASP compliance, default deny, input validation).
- [ ] `npm test` passes before committing.
- [ ] `npm run build` passes before pushing.
