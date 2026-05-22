## ADDED Requirements

### Requirement: Test suite imports real Express middleware packages

The test suite MUST install and load representative Express middleware packages from npm, including at minimum: `helmet`, `cors`, `morgan`, `cookie-parser`.

#### Scenario: Express middleware packages are installed as dependencies

- **WHEN** the test setup runs `npm install`
- **THEN** helmet, cors, morgan, cookie-parser packages are available as Node.js modules

#### Scenario: Middleware is loaded via require/import in tests

- **WHEN** a test needs to use an Express middleware package
- **THEN** it imports the package via `import helmet from 'helmet'` or `require('helmet')`

### Requirement: Test suite runs Express middleware against Woodland server

The test suite MUST create a Woodland server instance and pipe HTTP requests through it, with Express middleware mounted via Woodland's `app.use()` method.

#### Scenario: Helmet middleware runs on every request

- **WHEN** a Woodland server is configured with `app.use(helmet())`
- **AND** a client sends an HTTP GET request
- **THEN** security headers from Helmet (e.g., `X-DNS-Prefetch-Control`, `Strict-Transport-Security`) are present in the response

#### Scenario: CORS middleware runs and sets headers

- **WHEN** a Woodland server is configured with `app.use(cors({ origin: 'https://example.com' }))`
- **AND** a client sends an HTTP OPTIONS request with `Origin: https://example.com`
- **THEN** the `Access-Control-Allow-Origin` header is set to `'https://example.com'`

#### Scenario: Morgan middleware logs request

- **WHEN** a Woodland server is configured with `app.use(morgan('dev'))`
- **AND** a client sends an HTTP GET request
- **THEN** the request method, path, status code, and response time are logged to the configured output stream

### Requirement: Error middleware pattern works with Express middleware

The test suite MUST verify that Express middleware which accepts error handlers (4-argument functions) works correctly when errors are thrown or passed via `next(err)`.

#### Scenario: Error thrown in middleware bubbles to error handler

- **WHEN** an Express middleware calls `'use strict'; throw new Error('test error')`
- **AND** an error handler is registered: `app.use((err, req, res, next) => { res.status(500).json({ error: err.message }) })`
- **THEN** the error handler is invoked and the client receives a 500 response with JSON body

#### Scenario: next(err) in Express middleware bubbles error

- **WHEN** an Express middleware calls `next(new Error('test error'))`
- **AND** an error handler is registered
- **THEN** the error handler is invoked and the client receives a 500 response

### Requirement: Middleware modifies req/res correctly in Woodland

The test suite MUST verify that Express middleware that mutate the request or response objects works correctly in Woodland's request/response context.

#### Scenario: cookie-parser sets parsed cookies

- **WHEN** `app.use(require('cookie-parser')())` is mounted
- **AND** a request includes a `Cookie` header
- **THEN** `req.cookies` is populated with the parsed cookie values

#### Scenario: Middleware sets res.locals accessible later

- **WHEN** Express middleware sets `res.locals.key = 'value'`
- **AND** a downstream route handler accesses `res.locals.key`
- **THEN** the downstream handler reads `'value'`

### Requirement: Test suite runs in CI and fails on compatibility breaks

The test suite MUST be integrated into the CI pipeline via `npm test` and MUST fail if any Express middleware fails to operate correctly in Woodland.

#### Scenario: CI runs compatibility tests

- **WHEN** `npm test` is executed in CI
- **THEN** the Express middleware integration tests are included in the test run

#### Scenario: Compatibility break causes CI failure

- **WHEN** a middleware integration test does not pass
- **THEN** `npm test` exits with a non-zero status code
