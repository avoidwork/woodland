## ADDED Requirements

### Requirement: Mount a sub-app at a path prefix
The system SHALL allow mounting a Woodland instance at a given path prefix so that all of its routes are resolved relative to that prefix.

#### Scenario: Mount sub-app at prefix
- **WHEN** a Woodland instance is passed as the second argument to `app.use('/api', subApp)`
- **THEN** all routes registered on `subApp` are resolved with the `/api` prefix in the parent app's middleware store

#### Scenario: Mounted sub-app route resolves correctly
- **WHEN** `subApp.get('/users', handler)` is registered and `subApp` is mounted at `/api`
- **THEN** a GET request to `/api/users` invokes `handler`

#### Scenario: Sub-app error handlers remain isolated
- **WHEN** a sub-app has its own error handler and an error is thrown in a sub-app route
- **THEN** the sub-app's error handler processes the error without affecting the parent app's error handlers

### Requirement: Return chainable Woodland from mount helper
The system SHALL return the Woodland instance from `mount()` calls so that route registration can be chained.

#### Scenario: Mount returns chainable instance
- **WHEN** `const api = app.mount('/api')` is called
- **THEN** `api.get('/users', handler)` succeeds and returns the same `api` instance

#### Scenario: Mount helper prepends prefix to route paths
- **WHEN** `app.mount('/api').get('/users', handler)` is called
- **THEN** the route registers as `/api/users` in the parent app

### Requirement: Support nested sub-app mounting
The system SHALL support mounting a sub-app that itself has mounted child apps, with all routes resolved through the full mount chain.

#### Scenario: Nested sub-app routes resolve through chains
- **WHEN** `subApp` contains a mounted child `childApp` at `/v1` and `subApp` is mounted at `/api`
- **THEN** `childApp.get('/data', handler)` resolves to `/api/v1/data` in the parent

#### Scenario: Deep nesting preserves middleware ordering
- **WHEN** multiple nested mounts each register middleware
- **THEN** middleware executes in mount-order: parent prefix middleware before child prefix middleware before route handler

### Requirement: Nested routers work with parameterized routes
The system SHALL correctly resolve parameterized routes in nested and mounted contexts.

#### Scenario: Parameterized routes in sub-apps resolve correctly
- **WHEN** `subApp.get('/items/:id', handler)` is registered and `subApp` is mounted at `/api`
- **THEN** a GET request to `/api/items/42` invokes `handler` with `req.params.id === '42'`

#### Scenario: Mixed parameterized and static routes coexist
- **WHEN** a mounted sub-app has both static and parameterized routes
- **THEN** both route types resolve correctly without interference

### Requirement: Mount middleware at path prefix
The system SHALL allow mounting middleware functions at a path prefix so they execute only for requests matching that prefix.

#### Scenario: Prefix middleware executes for matching paths
- **WHEN** middleware is registered at `/api` via `app.use('/api', authMiddleware)`
- **THEN** `authMiddleware` executes for GET/POST requests to `/api/users` but not for `/web/home`

#### Scenario: Multiple prefix middlewares layer correctly
- **WHEN** multiple `use()` calls register middleware at different prefixes
- **THEN** each middleware fires only for requests matching its prefix

## REMOVED Requirements

<!-- None — no existing requirements are removed -->
