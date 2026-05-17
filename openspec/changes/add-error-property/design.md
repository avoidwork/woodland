---
description: Technical design for adding the 'error' property to Woodland and wiring it through the middleware chain.
---

# design.md

## Context

- The `Woodland` class lives in `src/woodland.js` and uses private fields (e.g., `#error`)
- The `#decorate` method sets `req.app` to a minimal stub: `{ get: (key) => (key === "trust proxy" ? false : undefined) }` at line 349
- The `next` function in `src/middleware.js` handles middleware execution and error handling via `handleError` and `handleMiddleware`
- Error handlers are identified by having `ERROR_HANDLER_LENGTH` (4) arguments

## Changes

### 1. Add `#error` private field to `Woodland` class

Add a new private field:
```javascript
#error;
```

Initialize it in the constructor:
```javascript
this.#error = null;
```

Add a getter-only property:
```javascript
get error() {
    return this.#error;
}
```

The property will accept either `null` or a function. Since this is a getter/setter pattern, users can assign a function to `app.error`.

### 2. Update `#decorate` to set `req.app = this`

Replace the current inline object at line 349:
```javascript
// Before
req.app = { get: (key) => (key === "trust proxy" ? false : undefined) };

// After
req.app = this;
```

This makes the full Woodland instance accessible via `req.app`, including the `error` property.

### 3. Update `execute` in `middleware.js` to call `req.app.error`

In the `next` function, when an error occurs (the `execute` function is called with an error, or `handleError` is called), check if `req.app.error` exists and is a function before handling the error. If it exists, call it with the error and request/response context:

```javascript
const execute = (err) => {
    if (err !== void 0) {
        // Check for global error handler on the app instance
        if (typeof req.app?.error === FUNCTION) {
            req.app.error(err, req, res, execute);
        } else {
            handleError(err, execute);
        }
    } else {
        handleMiddleware(execute);
    }
};
```

This checks `req.app.error` before falling back to the existing error middleware chain (`handleError`).

## Design Decisions

1. **Setter vs. Private Field**: The `error` property uses a getter/setter so it can be freely assigned by users. The private `#error` field stores the value.

2. **`req.app = this`**: Giving full access to the Woodland instance via `req.app` is the cleanest approach since it provides the `error` reference without additional indirection. This aligns with Express's `req.app` convention.

3. **Error handler signature**: The global error handler uses the same signature as error middleware: `(err, req, res, next)`, making it consistent with the framework's error handling model.

4. **Priority**: The global `req.app.error` is checked before the error middleware chain, giving users a single override point for all unhandled errors.

## Security

- The `error` property must be a function or `null` — no security concerns with type acceptance
- No new attack surface is introduced
