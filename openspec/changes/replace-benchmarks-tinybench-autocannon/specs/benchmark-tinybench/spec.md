## ADDED Requirements

### Requirement: tinybench utility benchmarks

The benchmark suite SHALL use tinybench to measure the performance of low-level utility functions in Woodland. Benchmarks SHALL import source directly from `src/` since these functions are not exported from the main module.

#### Scenario: URL parse benchmarks

- **WHEN** running utility benchmarks
- **THEN** `parse()` is benchmarked with string URIs, request objects, and edge cases (empty string, malformed URI, special characters)

#### Scenario: MIME detection benchmarks

- **WHEN** running utility benchmarks
- **THEN** `mime()` is benchmarked with basic file extensions and complex file extensions (up to 20 variants including nested dots)

#### Scenario: Time formatting benchmarks

- **WHEN** running utility benchmarks
- **THEN** `ms()` and `timeOffset()` are benchmarked with various timestamp values

#### Scenario: Directory listing benchmarks

- **WHEN** running utility benchmarks
- **THEN** `autoIndex()` is benchmarked with mock directory contents

#### Scenario: Status determination benchmarks

- **WHEN** running utility benchmarks
- **THEN** `getStatus()` is benchmarked with various HTTP status codes and request methods

#### Scenario: Parameter extraction benchmarks

- **WHEN** running utility benchmarks
- **THEN** `params()` is benchmarked with parameterized route segments

#### Scenario: Range header benchmarks

- **WHEN** running utility benchmarks
- **THEN** `partialHeaders()` and `writeHead()` are benchmarked with valid and invalid range header values

#### Scenario: Middleware utility benchmarks

- **WHEN** running utility benchmarks
- **THEN** `pipeable()`, `next()`, and `reduce()` are benchmarked with mock request/response objects and route lists

#### Scenario: IP validation benchmarks

- **WHEN** running utility benchmarks
- **THEN** `isValidIP()` is benchmarked with valid IPv4, valid IPv6, and invalid IP strings

### Requirement: tinybench middleware benchmarks

The benchmark suite SHALL use tinybench to measure middleware registration and execution performance. Benchmarks SHALL create fresh app instances per benchmark and use mock request/response objects.

#### Scenario: Middleware registration benchmarks

- **WHEN** running middleware benchmarks
- **THEN** `use()`, method-specific routing (`get`, `post`, `put`, `delete`, `patch`, `options`, `always`), and `list()` are benchmarked for registration speed

#### Scenario: Middleware execution benchmarks

- **WHEN** running middleware benchmarks
- **THEN** simple middleware, complex middleware stacks (4 layers deep), error handling middleware, and parameter extraction middleware are benchmarked for execution speed

#### Scenario: CORS handling benchmarks

- **WHEN** running middleware benchmarks
- **THEN** CORS header application is benchmarked with allowed origins and preflight responses

#### Scenario: Response helper benchmarks

- **WHEN** running middleware benchmarks
- **THEN** `res.json()`, `res.send()`, and `res.redirect()` are benchmarked with mock response objects

### Requirement: tinybench routing benchmarks

The benchmark suite SHALL use tinybench to measure route resolution performance. Benchmarks SHALL use a single app instance with cached and uncached route lookups.

#### Scenario: Cached route lookups

- **WHEN** running routing benchmarks
- **THEN** `app.routes()` is benchmarked with cached URI lookups against a route table with 30+ routes

#### Scenario: Uncached route lookups

- **WHEN** running routing benchmarks
- **THEN** `app.routes()` with cache override is benchmarked for cache-miss performance

#### Scenario: Parameterized route benchmarks

- **WHEN** running routing benchmarks
- **THEN** routes with path parameters (e.g., `/api/:version/resource/:id`) are benchmarked

#### Scenario: Static route benchmarks

- **WHEN** running routing benchmarks
- **THEN** exact-match static routes are benchmarked

#### Scenario: Not-found route benchmarks

- **WHEN** running routing benchmarks
- **THEN** non-existent URIs against the route table are benchmarked

### Requirement: tinybench serving benchmarks

The benchmark suite SHALL use tinybench to measure static file serving performance. Benchmarks SHALL use mock request/response objects.

#### Scenario: Serve benchmarks

- **WHEN** running serving benchmarks
- **THEN** `serve()` is benchmarked with small, medium, and large files across GET, HEAD, and OPTIONS methods

#### Scenario: Stream benchmarks

- **WHEN** running serving benchmarks
- **THEN** `stream()` is benchmarked with ETags enabled/disabled and conditional requests (If-None-Match)

#### Scenario: File server registration benchmarks

- **WHEN** running serving benchmarks
- **THEN** `files()` registration and `etag()` generation are benchmarked

#### Scenario: Edge case benchmarks

- **WHEN** running serving benchmarks
- **THEN** not-found, directory listing, directory redirect, autoindex, and range requests are benchmarked
