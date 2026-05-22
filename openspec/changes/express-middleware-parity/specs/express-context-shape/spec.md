## ADDED Requirements

### Requirement: req.locals object is available for middleware context propagation

Every request object MUST have a `locals` property initialized as a plain object (`Object.create(null)`). Middleware MAY attach arbitrary data to `req.locals` and all subsequent middleware in the chain MUST be able to read it.

#### Scenario: req.locals is initialized on every request

- **WHEN** a request is received by the framework
- **THEN** `req.locals` is defined and is a plain object

#### Scenario: Middleware can write to req.locals

- **WHEN** middleware sets `req.locals.user = { id: 1 }`
- **THEN** subsequent middleware can read `req.locals.user` and get `{ id: 1 }`

#### Scenario: req.locals is isolated per request

- **WHEN** two concurrent requests each modify `req.locals`
- **THEN** modifications on one request do not affect `req.locals` on the other request

### Requirement: req.route property provides route information

The `req.route` property MUST expose the matched route's path and methods array when a route is matched.

#### Scenario: req.route is set when a route matches

- **WHEN** a request matches a registered route like `app.get('/users/:id', handler)`
- **THEN** `req.route.path` equals `'/users/:id'`

#### Scenario: req.route.methods contains registered HTTP methods

- **WHEN** a route is registered with `app.get('/path', fn).post('/path', fn)`
- **THEN** `req.route.methods` includes `'get'` and `'post'`

### Requirement: req.path provides the path name of the request

The `req.path` property MUST contain the pathname of the request URL (excluding query string).

#### Scenario: req.path reflects the request pathname

- **WHEN** a request is made to `/users/123?name=john`
- **THEN** `req.path` equals `'/users/123'`

### Requirement: res.status(code) sets status and returns res for chaining

The `res.status(code)` method MUST set `res.statusCode` to the provided code and return `res` for method chaining.

#### Scenario: res.status sets the status code

- **WHEN** middleware calls `res.status(404)`
- **THEN** `res.statusCode` equals `404`

#### Scenario: res.status returns res for chaining

- **WHEN** middleware calls `res.status(200).send('ok')`
- **THEN** the status is 200 and the body is 'ok'

### Requirement: res.json(data) sends JSON response

The `res.json(data)` method MUST set the `Content-Type` header to `application/json` with `charset=utf-8` and send the stringified JSON body.

#### Scenario: res.json sends JSON content type and body

- **WHEN** middleware calls `res.json({ key: 'value' })`
- **THEN** `res.getHeader('Content-Type')` equals `'application/json; charset=utf-8'`
- **THEN** the body is `'{"key":"value"}'`

#### Scenario: res.json accepts null value

- **WHEN** middleware calls `res.json(null)`
- **THEN** the body is `'null'`

### Requirement: res.redirect(uri, perm) redirects with proper headers

The `res.redirect(uri, perm)` method MUST set the `Location` header and use status code 308 for permanent redirects or 307 for temporary redirects.

#### Scenario: res.redirect sets Location header and status

- **WHEN** middleware calls `res.redirect('/new-path')`
- **THEN** `res.getHeader('Location')` equals `'/new-path'`
- **THEN** `res.statusCode` equals `307`

#### Scenario: res.redirect with perm flag uses 308

- **WHEN** middleware calls `res.redirect('/old-path', true)`
- **THEN** `res.statusCode` equals `308`

### Requirement: res.sendFile(path) streams a file to the response

The `res.sendFile(path)` method MUST stream the file at `path` to the response with appropriate content-type, content-length, and last-modified headers.

#### Scenario: res.sendFile streams file with correct headers

- **WHEN** middleware calls `res.sendFile('/static/image.png')`
- **THEN** the `Content-Type` header is set to the correct MIME type for `.png`
- **THEN** the `Content-Length` header reflects the file size
- **THEN** a `Last-Modified` header is set from the file's mtime

#### Scenario: res.sendFile returns 404 for missing file

- **WHEN** middleware calls `res.sendFile('/nonexistent.txt')`
- **THEN** the framework returns a 404 status
