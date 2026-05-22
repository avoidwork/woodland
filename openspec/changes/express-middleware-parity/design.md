## Context

Woodland uses an iterator-based middleware chain in `src/middleware.js:next()` that pushes middleware functions into an array via `reduce()`, then iterates using `Iterator.next()`. The current `next()` function accepts `(err, nextFn)` and uses `ERROR_HANDLER_LENGTH` to detect error handlers by checking `obj.value.length !== ERROR_HANDLER_LENGTH`.

**Current middleware registration** (`src/middleware.js:272-312`) pushes handlers into `current.handlers` per route. Regular middleware is invoked as `value(req, res, nextFn)` at line 103. Error middleware is invoked as `obj.value(err, req, res, nextFn)` at line 86.

**Current request decoration** (`src/`) does not include `req.locals`, `req.route`, or `req.path`. Response methods are exposed as standalone functions in `response.js` rather than instance methods on `res`.

## Goals / Non-Goals

**Goals:**
- Express.js-compatible middleware signature: `function(req, res, next)` detected via `function.length === 3`
- Express.js-compatible error middleware: `function(err, req, res, next)` detected via `function.length === 4`
- Error bubbling: `next(err)` skips non-error handlers and finds error middleware
- `req.locals` object for per-request shared data between middleware
- `req.route` and `req.path` properties for route context
- `res.status()`, `res.json()`, `res.sendFile()`, `res.redirect()` as chained methods
- Comprehensive compatibility validation suite

**Non-Goals:**
- Migrating existing Woodland internals to Express patterns (only external contract changes)
- Supporting Express-specific plugins (Express Router, Express static without changes)
- Full Express API surface — only middleware-relevant properties
- Breaking existing Woodland middleware that uses non-standard signatures

## Decisions

### Decision 1: Error handler detection via `function.length` (not `ERROR_HANDLER_LENGTH`)

**Choice:** Use `fn.length === 4` to detect Express-style error middleware, `fn.length === 3` for regular middleware, `fn.length <= 2` for compatibility mode.

**Rationale:** Express.js uses `function.length` to distinguish error middleware from regular middleware. This is the standard way the ecosystem detects error handlers. Woodland's current `ERROR_HANDLER_LENGTH` constant is internal and not compatible with third-party middleware expectations.

**Alternatives considered:**
- Keep `ERROR_HANDLER_LENGTH` — rejects Express middleware that uses standard 4-arg error handlers
- String-based detection (e.g., checking first parameter name) — fragile, not ecosystem-standard

### Decision 2: `req.locals` as a plain object on the request instance

**Choice:** Initialize `req.locals = Object.create(null)` when constructing the request object in `woodland.js:route()`. Middleware can attach data: `req.locals.user = user`.

**Rationale:** Express middleware like `passport`, `csurf`, and others rely on `req.locals` for shared state. Using `Object.create(null)` avoids prototype pollution and matches Express behavior.

**Alternatives considered:**
- Module-level context store — breaks per-request isolation
- `req.context` — naming inconsistency with Express

### Decision 3: Decorate `res` with Express methods via descriptor or wrapper

**Choice:** Add `res.status()`, `res.json()`, `res.redirect()`, `res.sendFile()` as methods directly on the response object. These delegate to existing handler functions in `response.js` (status, json, redirect, stream).

**Rationale:** `res.status().json(data)` chaining is deeply embedded in Express middleware expectations. Adding them as methods preserves the fluent API. Delegation to existing functions avoids code duplication.

**Alternatives considered:**
- Wrapper response object — complex, may break third-party code that inspects `res` properties

### Decision 4: `next()` always available as the third argument, even after `res` is sent

**Choice:** `next(err)` after response is already sent should emit a warning but not throw. `next()` after response sent is a no-op.

**Rationale:** Express does not throw in these cases. Throwing would break existing Express middleware that call `next()` for flow control in conditional branches.

**Alternatives considered:**
- Throw when calling `next()` after response sent — strict mode, but rejects valid Express middleware

### Decision 5: Compatibility validation suite runs against real Express middleware

**Choice:** Use `npm install` to fetch real Express middleware packages (helmet, cors, morgan, cookie-parser) and run them in a Woodland server context as integration tests.

**Rationale:** Unit mocks cannot capture real middleware behavior differences. Installing real middleware ensures the compatibility contract is actually met.

**Alternatives considered:**
- Custom middleware stubs — insufficient validation, misses edge cases
- Running middleware in a full Express server and comparing responses — complex, adds deployment variable

## Risks / Trade-offs

[Risk] Third-party Express middleware may call methods we don't implement

**Mitigation:** Document the compatibility surface. Implement a `notImplemented()` stub on `res` that logs a warning when called, so developers get actionable errors instead of silent failures.

[Risk] Changes to `next()` error handling in `middleware.js` could affect existing routes

**Mitigation:** The new `next()` function will be wired behind a feature flag or version boundary. During migration, both the old internal flow and new Express-compatible flow coexist. The `handleMiddleware` and `handleError` paths are updated to use `function.length` detection.

[Risk] `req.locals` initialization adds per-request memory overhead

**Mitigation:** `Object.create(null)` is a zero-overhead allocation on modern V8. Memory impact is negligible. Benchmarks can validate.

[Risk] `res.sendFile()` conflicts with existing Woodland file serving

**Mitigation:** Implement `res.sendFile(path)` as a simple wrapper around the existing `stream()` function in `response.js`. It does not replace the file server middleware — it is an additional convenience method.

## Migration Plan

1. Add `function.length` detection to `next()` in `middleware.js` — new middleware registered with Express signatures will be detected correctly
2. Wire `req.locals` initialization in request construction
3. Add `res.status()`, `res.json()`, `res.redirect()`, `res.sendFile()` methods
4. Set `req.route` and `req.path` during routing
5. Build compatibility validation suite with real Express middleware
6. Update `types/woodland.d.ts` with Express-compatible interfaces
7. All changes are additive — no breaking changes to existing Woodland internal behavior
