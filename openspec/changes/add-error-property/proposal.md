---
description: Add an 'error' property to the Woodland class that allows users to set a global error handler function. Updated to set 'req.app = this' in '#decorate' so 'req.app.error' can be accessed from middleware.
---

# proposal.md

## Why

Currently, the Woodland framework does not provide a way to set a global error handler at the application level. Error handling is limited to per-route error middleware (4-argument functions). Users cannot intercept unhandled errors globally via a simple assignment.

## What Changes

1. Add an `error` property to the `Woodland` class that defaults to `null` with type `null | function`.
2. Update the `#decorate` method to set `req.app = this` instead of the current inline app stub, so the app instance is accessible from the request object.
3. Update the `execute` function in `middleware.js` to check for `req.app.error` and call it if it's not null before falling back to existing error handling behavior.

## Impact

- **Modified**: `src/woodland.js` — add `#error` private field, public getter/setter, update `#decorate` to assign `req.app = this`
- **Modified**: `src/middleware.js` — update `execute` in the `next` function to call `req.app.error` when an error occurs

## Benefits

- Users can set a global error handler: `app.error = (err, req, res, next) => { ... }`
- Consistent with the existing `res.error()` pattern
- Enables centralized error logging, reporting, or custom error responses
