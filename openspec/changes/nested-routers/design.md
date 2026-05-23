## Context

Woodland is a compact Node.js HTTP framework with a flat route tree. All routes are registered directly on the app instance via `app.get()`, `app.post()`, `app.use()`, etc. The middleware registry in `middleware.js` stores routes keyed by HTTP method and path in a `Map`. Route matching uses regex compiled from the registered paths. As applications grow, this flat structure makes it difficult to organize code by domain or feature.

## Goals / Non-Goals

**Goals:**
- Allow mounting a Woodland sub-app at a path prefix so all its routes are resolved relative to that prefix
- Provide a `mount(path)` helper that returns a composable router function for chaining route registrations under a shared prefix
- Support nested sub-apps (mounting a sub-app that itself has mounted children)
- Keep sub-apps fully self-contained: their own middleware, error handlers, and events remain isolated

**Non-Goals:**
- Template rendering or view engines
- Route parameter inheritance across mount boundaries
- Advanced route resolution algorithms (keep existing regex-based matching)
- Breaking any existing API — all changes are additive

## Decisions

### Decision 1: Mount via `use(path, subApp)` — no new method needed for sub-app mounting
Instead of creating a separate `mount()` method exclusively for sub-apps, we leverage the existing `use()` method. When `use(path, subApp)` is called with a Woodland instance as the second argument, the sub-app's routes are flattened into the parent with the path prefix. The `mount(path)` convenience method returns a path-composing helper for route registration chaining.

**Rationale:** This avoids API duplication and matches Express's established pattern. It also keeps the public surface minimal.

### Decision 2: Route flattening at mount time vs. prefix transformation at request time
At mount time, the sub-app's registered routes are duplicated into the parent's middleware store with the prefix prepended (e.g., sub-app route `/users` mounted at `/api` becomes `/api/users` in the parent store).

**Rationale:** Flattening at mount time avoids per-request string manipulation overhead and keeps the existing regex-based route matching unchanged. It also preserves route ordering in a single flat middleware array.

### Decision 3: Sub-apps share no state with parent
Each sub-app instance is fully independent. Routes, middleware, error handlers, and events are scoped to the sub-app. The parent only sees the sub-app's routes at their resolved paths.

**Rationale:** This keeps sub-apps truly modular and testable. It also avoids the complexity of state sharing or lifecycle coordination between parent and child.

### Decision 4: Route metadata preserved in flattened routes
When flattening routes, the original handler functions are reused (no cloning). Each handler retains its parameter markers and error-handler status.

**Rationale:** Reusing handlers avoids unnecessary function allocation and keeps the memory overhead low. Parameter extraction still works because the full resolved path is used in the regex.

## Risks / Trade-offs

[Risk: Flattening duplicates route references in the parent middleware store]
→ Mitigation: We only store references to the same handler functions. Route count scales linearly with total registered routes across all mounts. Memory impact is negligible for typical applications.

[Risk: Nested nesting depth is unlimited and could cause deep prefix chains]
→ Mitigation: Document a reasonable nesting limit (e.g., 5 levels). The existing LRU cache handles deep prefix keys efficiently.

[Risk: Error handlers in sub-apps may not propagate to parent]
→ Mitigation: This is by design (isolation). Document clearly that sub-apps own their error handling. If cross-app error propagation is needed, use parent-level error middleware.

[Risk: `#inspect` or `list()` API changes — existing output changes]
→ Mitigation: `list()` and `routes()` return flattened routes (which they already do for other internal routes like `/favicon.ico`). No semantic change to return shape.
