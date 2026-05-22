## ADDED Requirements

### Requirement: Middleware invokes regular handlers with (req, res, next) signature

When middleware is registered with a 3-argument function (detectable via `function.length === 3`), the middleware chain MUST invoke it with `(req, res, next)` where `next` is the chain-advancement function.

#### Scenario: Regular middleware receives next function

- **WHEN** a middleware function with 3 parameters is registered via `app.get('/path', (req, res, next) => { ... })`
- **THEN** the middleware receives `(req, res, next)` where `next` is a function

#### Scenario: Regular middleware invokes next to advance chain

- **WHEN** middleware calls `next()` without arguments
- **THEN** the next middleware in the chain is invoked with `(req, res, next)`

### Requirement: Middleware invokes error handlers with (err, req, res, next) signature

When a registered middleware function has 4 parameters (detectable via `function.length === 4`), the middleware chain MUST invoke it with `(err, req, res, next)` only when an error is being propagated.

#### Scenario: Error middleware receives error as first argument

- **WHEN** middleware with 4 parameters is registered: `(err, req, res, next) => { ... }`
- **AND** an error is propagated through the chain
- **THEN** the error middleware is invoked as `fn(error, req, res, next)` with the error as the first argument

#### Scenario: Error middleware is skipped during normal flow

- **WHEN** no error is passed (`next()` called without arguments)
- **THEN** error middleware (4-argument functions) MUST be skipped and not invoked

### Requirement: next(err) triggers error bubbling past non-error handlers

When `next(err)` is called with an Error object (or any non-undefined value), the middleware chain MUST skip all non-error handlers (functions with `length !== 4`) until it finds an error handler or exhausts the chain.

#### Scenario: Error bubbles to error handler

- **WHEN** a middleware calls `next(new Error('fail'))`
- **THEN** all non-error middleware between the caller and the nearest error handler are skipped
- **THEN** the error handler is invoked with `(new Error('fail'), req, res, next)`

#### Scenario: No error handler found delegates to default error response

- **WHEN** an error is propagated and no error handler (4-argument function) exists in the chain
- **THEN** the framework returns a 500 status response with the error message

### Requirement: next() is idempotent after response is sent

When `next()` is called after the response has already been sent, the call MUST be a no-op without throwing an error.

#### Scenario: next() after res.send is no-op

- **WHEN** middleware calls `res.send('done')` followed by `next()`
- **THEN** no error is thrown and no additional response is sent

#### Scenario: next(err) after res.send logs warning

- **WHEN** middleware calls `res.send('done')` followed by `next(new Error('late'))`
- **THEN** the framework does not throw but allows error propagation to proceed without modifying the already-sent response

### Requirement: Backward-compatible handling of 1 and 2 argument middleware

When a middleware function has `function.length` of 1 or 2, it MUST still be invoked with `(req, res, next)` to maintain compatibility with existing Woodland middleware that uses fewer parameters.

#### Scenario: Single-argument middleware receives request

- **WHEN** middleware is registered as `(req) => { ... }`
- **THEN** the middleware is invoked with `(req, res, next)` regardless of declared parameter count

#### Scenario: Two-argument middleware receives request and response

- **WHEN** middleware is registered as `(req, res) => { ... }`
- **THEN** the middleware is invoked with `(req, res, next)` regardless of declared parameter count
