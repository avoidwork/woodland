## ADDED Requirements

### Requirement: Framework comparison benchmarks

The benchmark suite SHALL use autocannon to compare Woodland against Express.js, Fastify, and raw Node.js HTTP server. Each framework runs on its own port. Benchmarks SHALL only run comparison lanes if the respective framework is installed as an optional devDependency.

#### Scenario: Simple JSON comparison

- **WHEN** a single endpoint returning JSON is requested on all servers
- **THEN** autocannon reports throughput (requests/sec) and latency percentiles (p50, p95, p99) for each framework

#### Scenario: Framework availability detection

- **WHEN** Express.js or Fastify are not installed
- **THEN** the comparison benchmark skips the respective framework lane and reports only the available frameworks

#### Scenario: Fair comparison configuration

- **WHEN** servers are compared
- **THEN** all frameworks run with logging and timing features disabled to ensure comparable conditions

### Requirement: End-to-end HTTP benchmarks

The benchmark suite SHALL use autocannon to measure end-to-end HTTP performance of a full Woodland server with varied routing patterns. The server is started with `createServer()` wrapping `app.route` and serves on a random port.

#### Scenario: Simple GET endpoint

- **WHEN** autocannon targets the simple GET route
- **THEN** throughput and latency metrics are reported

#### Scenario: Parameterized route benchmarks

- **WHEN** autocannon targets routes with path parameters
- **THEN** throughput and latency metrics are reported for parameterized and nested parameterized routes

#### Scenario: Middleware chain benchmarks

- **WHEN** autocannon targets routes with middleware chains
- **THEN** throughput and latency are measured for simple and complex (multi-layer) middleware stacks

#### Scenario: CRUD operation benchmarks

- **WHEN** autocannon targets GET, POST, PUT, and DELETE routes
- **THEN** throughput and latency metrics are reported per HTTP method

#### Scenario: Error handling benchmarks

- **WHEN** autocannon targets routes that return error responses
- **THEN** throughput and latency are measured for error handling and 404 responses

#### Scenario: Large response benchmarks

- **WHEN** autocannon targets routes returning large JSON payloads
- **THEN** throughput and latency metrics are reported

#### Scenario: Mixed workload benchmarks

- **WHEN** autocannon targets the app with varied routes in a single run
- **THEN** aggregate throughput and latency percentiles are reported

#### Scenario: Server startup benchmarks

- **WHEN** the Woodland server is started and ready
- **THEN** the time from `app.listen()` to the first successful response is reported
