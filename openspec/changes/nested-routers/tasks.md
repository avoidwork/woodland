## 1. Add constants

- [x] 1.1 Add `SUB_ROUTER` constant to `constants.js`
- [x] 1.2 Add `MSG_SUB_APP_REQUIRED` error message constant to `constants.js`

## 2. Update middleware registry for nested routing

- [x] 2.1 Update `registerMiddleware()` in `middleware.js` to detect Woodland sub-app instances and flatten routes with prefix
- [x] 2.2 Update `reduce()` in `middleware.js` to handle nested route registration order
- [x] 2.3 Add `_subApp` getter to Woodland class so mounted sub-apps can expose their routes

## 3. Implement mount API on Woodland class

- [x] 3.1 Add `mount(path)` method to `woodland.js` that returns a path-composing helper function
- [x] 3.2 Update `use(rpath, ...fn)` in `woodland.js` to detect Woodland instance and delegate to nested routing
- [x] 3.3 Ensure `mount()` returns chainable Woodland instance for route registration

## 4. Handle request path transformation for mounted routes

<!-- Flattening at mount time eliminates per-request transformation need; tasks not required -->

## 5. Update TypeScript definitions

- [x] 5.1 Add `mount(path: string): Woodland` to `types/woodland.d.ts`
- [x] 5.2 Update `use(rpath: string, subApp: Woodland): Woodland` signature in `types/woodland.d.ts`

## 6. Tests

- [x] 6.1 Add unit tests for `app.use('/', subApp)` mounting — `tests/unit/nested-routers-use.test.js`
- [x] 6.2 Add unit tests for `app.mount(path)` chainable helper — `tests/unit/nested-routers-mount.test.js`
- [x] 6.3 Add unit tests for nested sub-app routing depth — `tests/unit/nested-routers-nested.test.js`
- [x] 6.4 Add unit tests for parameterized routes in mounted sub-apps — `tests/unit/nested-routers-params.test.js`
- [x] 6.5 Add unit tests for prefix middleware isolation — `tests/unit/nested-routers-middleware.test.js`
- [x] 6.6 Add unit tests for error handler isolation between parent and sub-app — `tests/unit/nested-routers-errors.test.js`
- [x] 6.7 Add unit test for `app.list()` returning flattened routes — `tests/unit/nested-routers-list.test.js`

## 7. Verification

- [x] 7.1 Ensure `npm test` passes with 100% line coverage on nested-routers files
- [x] 7.2 Ensure `npm run build` completes without errors
- [x] 7.3 Verify no regression in existing route handling tests
