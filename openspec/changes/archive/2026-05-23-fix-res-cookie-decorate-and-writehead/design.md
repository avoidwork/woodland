## Context

Woodland is a Node.js HTTP framework. The response object is decorated with convenience methods in `#decorateResponse()` (woodland.js). The `writeHead` utility in response.js currently passes a headers object directly to `res.writeHead()`, which replaces all existing headers set via `res.setHeader()` — this is a bug when headers are set incrementally (e.g., via res.header() or res.set()).

The framework is at version 22, uses ES modules, and has zero external cookie dependencies. It already uses the native `Headers` API for `res.set()`.

## Goals / Non-Goals

**Goals:**
- Add `res.cookie(name, value, opts)` that serializes a cookie and sets it via `res.setHeader("set-cookie", ...)` using the native Headers API
- Add `res.clearCookie(name, opts)` that expires a cookie by setting maxAge=0 and expires in the past
- Fix `writeHead` to merge passed headers into existing response headers instead of replacing them
- Maintain 100% test coverage with new functionality

**Non-Goals:**
- No new npm dependencies — use native Headers class for cookie serialization
- No cookie session storage or parsing (request.cookies)
- No cookie signing or encryption

## Decisions

### 1. Cookie serialization via native Headers API

**Decision**: Use `new Headers()` to build the Set-Cookie header string, then `res.setHeader()`.

**Rationale**: The project already uses `Headers` in `res.set()` (response.js:395). Cookie options like `domain`, `path`, `secure`, `httpOnly`, `sameSite` map naturally to the cookie attributes string. Using Headers avoids any external dependency.

**Alternatives considered**:
- Use `cookie` npm package — rejected: adds a new dependency for simple serialization already supported by native Headers
- Manual cookie string concatenation — rejected: inconsistent with rest of codebase, more error-prone

### 2. Cookie opts structure

**Decision**: Support the same options as Express's `res.cookie`: `domain`, `path`, `expires`, `httpOnly`, `maxAge`, `secure`, `sameSite`, `encode`. Accept either `maxAge` (ms from now) or `expires` (Date) for expiration.

**Rationale**: Express-compatible API reduces the learning curve. The `encode` option defaults to `true` (using `encodeURIComponent` for the value), matching Express's default `res.cookie` behavior.

### 3. writeHead merges with existing headers

**Decision**: Change `writeHead(res, headers)` to read headers from `res.getHeaders()` and merge: `{ ...res.getHeaders(), ...headers }`.

**Rationale**: This is the minimal fix. `res.getHeaders()` returns all headers already set on the response object, including those set via `res.setHeader()`/`res.header()`. Merging ensures cookie headers (and any others) set before `res.send()` is called are not lost.

**Alternatives considered**:
- Don't pass headers to writeHead at all — rejected: headers are needed for things like content-type override
- Create a separate internal headers tracking mechanism — rejected: over-engineered for a simple merge

### 4. #decorateResponse adds cookie methods directly

**Decision**: Add `res.cookie` and `res.clearCookie` as factory-created functions in `#decorateResponse`, following the existing pattern for `res.json`, `res.send`, etc.

**Rationale**: This keeps the decorator pattern consistent. No separate module needed for cookie logic.

## Risks / Trade-offs

- [Cookie header collision] If `res.set()` or `res.header()` is called with `set-cookie` as the key, it overwrites cookies set via `res.cookie()`. → **Mitigation**: Document that `res.cookie()` is the recommended way to set cookies; `set-cookie` is a multi-value header in HTTP but Node.js `res.setHeader` replaces on duplicate. This matches Express behavior.
- [Breaking change to writeHead] Internal callers pass a headers object to `writeHead(res, headers)`. The new behavior merges but maintains the same call signature. → **Mitigation**: No signature change, only behavior change. All internal callers should benefit from header preservation.
