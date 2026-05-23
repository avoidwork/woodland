## Why

Woodland currently only supports a flat route tree — all routes are registered directly on the app instance. As applications grow, this leads to monolithic files with dozens of routes, making code harder to maintain, reason about, and test. Many developers need to break up app concerns into modular, hierarchical route trees (e.g., a `/api` namespace with its own auth middleware, separate from a `/web` namespace). This is a common pattern adopted by Express, Koa, Fastify, and other Node.js HTTP frameworks.

## What Changes

- Add `app.use(path, subApp)` ability to mount another Woodland instance at a given prefix
- Each mounted sub-app resolves its own routes relative to the mount path (e.g., mounting at `/api` with a `get('/users', handler)` route resolves to `/api/users`)
- Mount middleware at a path prefix, so it only runs for requests matching that prefix
- Return chainable `Woodland` from `use()` when a sub-app is mounted
- Add `app.mount(path)` convenience method on Woodland for composing routers

## Capabilities

### New Capabilities
- `nested-routers`: Support mounting sub-apps and path-prefixed middleware
- `route-composition`: Utility methods for organizing routes into composable tree structures

### Modified Capabilities
<!-- None - no existing spec-level behavior changes -->

## Impact

- **Affected code:** `woodland.js` (new `mount` method, updated `use`), `middleware.js` (path prefix resolution during route registration and route matching), `constants.js` (new constants if needed), `types/woodland.d.ts` (new type definitions)
- **API surface:** New public API — `app.mount(path)` and `app.use(path, subApp)` — fully backward compatible, zero breaking changes
- **Dependencies:** No new external dependencies
- **Performance:** Minimal overhead — prefix prepending is a one-time operation at mount time, not per-request
