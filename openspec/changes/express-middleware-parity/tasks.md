## 1. Setup and Constants

- [x] 1.1 Add constants for Express middleware detection: `ERROR_HANDLER_LENGTH = 4`, `REGULAR_HANDLER_LENGTH = 3`, `COMPAT_HANDLER_LENGTH = 2` to `src/constants.js`
- [x] 1.2 Verify existing `ERROR_HANDLER_LENGTH` constant value and reconcile with new Express-compatible value

## 2. Middleware Next Function Refactoring

- [x] 2.1 Refactor `next()` in `src/middleware.js` to detect handler type via `function.length`: 4=error handler, 3=regular Express handler, 1-2=backward compat handler
- [x] 2.2 Update `handleError()` to skip non-error handlers using `function.length` instead of `arr.length !== ERROR_HANDLER_LENGTH`
- [x] 2.3 Update `handleMiddleware()` to invoke regular handlers with `(req, res, nextFn)` signature regardless of declared parameter count
- [x] 2.4 Implement `next()` idempotency: no-op when response already sent, warning when error next called after response sent
- [ ] 2.5 Update the error propagation flow in `#onDone()` / `#handleAllowedRoute()` to pass the next function correctly through Express-style middleware chains

## 3. Request Context Shaping

- [x] 3.1 Initialize `req.locals = Object.create(null)` during request decoration in `#decorate()` method
- [ ] 3.2 Set `req.route` object with `path` and `methods` properties during route matching in `#handleAllowedRoute()` or `routes()`
- [x] 3.3 Set `req.path` property from `req.parsed.pathname` during request decoration, stripping query string

## 4. Response Method Augmentation

- [x] 4.1 Add `res.status(code)` method to response object that sets `statusCode` and returns `res` for chaining, delegating to existing `status()` in `response.js`
- [x] 4.2 Add `res.json(data)` method that sets Content-Type and stringifies data, delegating to existing `json()` in `response.js`
- [x] 4.3 Add `res.redirect(uri, perm)` method that delegates to existing `redirect()` in `response.js`
- [x] 4.4 Add `res.sendFile(path)` method that streams a file using `createReadStream` and existing `stream()` logic from `response.js`
- [ ] 4.5 Update types in `types/woodland.d.ts` with new method signatures for `res.status()`, `res.json()`, `res.redirect()`, `res.sendFile()`

## 5. Route Information Population

- [x] 5.1 Populate `req.route.methods` with an array of registered HTTP methods for matched routes
- [x] 5.2 Ensure `req.route.path` reflects the original route path (before regex extraction)
- [x] 5.3 Wire route information from middleware registry into the request object during `#handleAllowedRoute()`

## 6. Unit Tests for Middleware Compatibility

- [x] 6.1 Write unit tests for `next()` function: regular handler invokes `(req, res, next)`, error handler invokes `(err, req, res, next)`, error bubbling skips non-error handlers
- [x] 6.2 Write unit tests for `function.length` detection: 4-arg is error, 3-arg/2-arg/1-arg is regular
- [x] 6.3 Write unit tests for `next()` idempotency: `next()` after response sent is no-op, `next(err)` after response sent does not throw
- [x] 6.4 Write unit tests for `req.locals`: initialization, per-request isolation, read/write through middleware chain
- [x] 6.5 Write unit tests for `req.route` and `req.path`: path extraction, methods array population
- [x] 6.6 Write unit tests for `res.status()` chaining, `res.json()` content-type and body, `res.redirect()` headers, `res.sendFile()` streaming

## 7. Integration Tests with Real Express Middleware

- [x] 7.1 Add `helmet`, `cors`, `morgan`, `cookie-parser` as devDependencies in `package.json`
- [ ] 7.2 Write integration test: Helmet middleware sets security headers on Woodland responses
- [ ] 7.3 Write integration test: cors middleware sets Access-Control-Allow-Origin and handles OPTIONS
- [ ] 7.4 Write integration test: cookie-parser parses Cookie header and populates `req.cookies`
- [ ] 7.5 Write integration test: morgan middleware logs request to console stream
- [ ] 7.6 Write integration test: Express middleware error throwing bubbles to 4-arg error handler
- [ ] 7.7 Write integration test: Express middleware `next(err)` propagates error past non-error handlers

## 8. Type Definitions Update

- [x] 8.1 Update `types/woodland.d.ts` to include `req.locals`, `req.route`, `req.path`, `req.cookies` properties
- [x] 8.2 Update `types/woodland.d.ts` to include `res.status()`, `res.json()`, `res.redirect()`, `res.sendFile()` method signatures
- [x] 8.3 Update `types/woodland.d.ts` to define middleware types with Express-compatible signatures

## 9. Final Validation

- [x] 9.1 Run `npm test` and verify all 335+ tests pass with 100% line coverage maintained
- [x] 9.2 Run `npm run build` to verify dist files generate successfully
- [x] 9.3 Verify no regressions in existing Woodland middleware behavior (file server, CORS config, body parsing)
