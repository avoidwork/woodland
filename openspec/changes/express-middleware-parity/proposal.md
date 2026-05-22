## Why

Woodland's middleware interface differs from Express.js in signature patterns, context object shapes, error handling conventions, and execution lifecycle. These differences prevent seamless integration with the broader Express ecosystem, blocking developers from directly using thousands of existing Express middleware packages within Woodland. By aligning Woodland's middleware interface with established Express.js patterns, we eliminate compatibility friction and unlock immediate access to a mature third-party ecosystem.

## What Changes

- Standardize middleware invocation signature to Express.js convention: `function(req, res, next)` with `next(error)` for error passing
- Implement Express-compatible error middleware signature: `function(err, req, res, next)` with 4-argument detection via `function.length`
- Ensure `next()` without arguments passes control to the next middleware in the chain
- Ensure `next(err)` triggers error middleware bubbling following Express semantics (skipping non-error handlers)
- Support `req.locals` object for middleware context propagation
- Add Express-compatible `req.route` and `req.path` properties
- Introduce `res.status().json/send/sendFile/redirect` fluent API matching Express chaining semantics
- Build and maintain a compatibility validation suite using representative Express middleware packages (helmet, cors, morgan, cookie-parser, express-fileupload)
- Maintain backward compatibility with existing Woodland middleware signatures in `src/middleware.js`

## Capabilities

### New Capabilities

- `express-middleware-compat`: Middleware signature and invocation alignment with Express.js `(req, res, next)` convention, error middleware detection via `function.length`, and error bubbling semantics
- `express-context-shape`: Request and response context object shaping to match Express properties and methods including `req.locals`, `req.route`, `req.path`, `res.status()`, `res.json()`, `res.sendFile()`, `res.redirect()`
- `express-middleware-suite`: Automated compatibility validation suite with representative Express middleware packages to verify cross-framework integration

### Modified Capabilities

<!-- No existing specs to modify -->

## Impact

- **Code**: `src/middleware.js` (next function and error handling), `src/request.js` (context properties), `src/response.js` (status, json, sendFile, redirect handlers), `src/woodland.js` (request decoration)
- **API**: Public request/response object contract changes — extends with Express-compatible shapes while preserving existing Woodland methods
- **Tests**: New test files in `tests/` for compatibility suite and Express middleware simulation tests
- **Types**: Updates to `types/woodland.d.ts` for Express-compatible signatures and interfaces
