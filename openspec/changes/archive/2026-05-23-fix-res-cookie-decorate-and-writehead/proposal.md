## Why

The response object in Woodland is missing cookie support (res.cookie and res.clearCookie) and the writeHead function does a direct header passthrough that can lose headers previously set via res.setHeader. These are fundamental HTTP response operations that users expect from a web framework.

## What Changes

- Add `res.cookie(name, value, opts)` to `#decorateResponse` — sets a cookie via `res.setHeader("set-cookie", ...)` with full options support (domain, path, maxAge, expires, secure, httpOnly, sameSite)
- Add `res.clearCookie(name, opts)` to `#decorateResponse` — clears a cookie by setting it expired
- Refactor `writeHead(res, headers)` in response.js — instead of passing headers directly to `res.writeHead()`, read existing headers from `res.getHeaders()` and merge with new headers to avoid losing previously-set headers

## Capabilities

### New Capabilities
- `cookie-handling`: Cookie serialization, setting (res.cookie), and clearing (res.clearCookie) on the response object
- `response-writing`: writeHead behavior to merge with existing response headers instead of overwriting

## Impact

- `src/response.js` — modify writeHead function signature/behavior, add cookie serialization
- `src/woodland.js` — add res.cookie and res.clearCookie to #decorateResponse
- `types/woodland.d.ts` — add TypeScript declarations for res.cookie and res.clearCookie
- All existing tests for writeHead need updating since the function no longer passes headers as a parameter directly
- No new dependencies (cookie serialization done with native Headers API, same as res.set)
