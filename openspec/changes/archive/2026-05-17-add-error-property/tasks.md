---
description: Implementation tasks for adding the 'error' property to Woodland
---

# tasks.md

## 1. Add `#error` private field to Woodland class

- [x] 1.1 Add `#error;` private field declaration after existing private fields in `src/woodland.js`
- [x] 1.2 Initialize `this.#error = null;` in the constructor
- [x] 1.3 Add getter `get error() { return this.#error; }` and setter `set error(fn) { this.#error = typeof fn === FUNCTION ? fn : null; }` at the end of the class before the closing brace

## 2. Update `#decorate` to set `req.app = this`

- [x] 2.1 In `src/woodland.js`, replace the existing `req.app` assignment in `#decorate` (line 349):
    ```
    req.app = { get: (key) => (key === "trust proxy" ? false : undefined) };
    ```
    with:
    ```
    req.app = this;
    ```

## 3. Update `execute` in middleware.js to call `req.app.error`

- [x] 3.1 In `src/middleware.js`, update the `execute` function inside `next()`:
    ```javascript
    const execute = (err) => {
        if (err !== void 0) {
            if (typeof req.app?.error === FUNCTION) {
                req.app.error(err, req, res);
                return;
            }
            handleError(err, execute);
        } else {
            handleMiddleware(execute);
        }
    };
    ```

## 4. Update TypeScript definitions

- [x] 4.1 In `types/woodland.d.ts`, add the `error` property to the Woodland class interface with type `((err: Error, req: import("./woodland").Request, res: import("./woodland").Response) => void) | undefined`

## 5. Update existing tests and add new tests

- [x] 5.1 Update any unit tests that reference `req.app` to expect the Woodland instance instead of the stub object
- [x] 5.2 Add test for `app.error = null` (default state)
- [x] 5.3 Add test for setting `app.error` to a function and verifying it is called on error
- [x] 5.4 Add test for error handler being called before error middleware chain
- [x] 5.5 Add test for error handler not being called when it equals null/default
- [x] 5.6 Ensure 100% line coverage is maintained

## 6. Build and run tests

- [x] 6.1 Run `npm test` and ensure all tests pass with 100% coverage
- [x] 6.2 Run `npm run build` and ensure build succeeds
