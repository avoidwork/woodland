# Woodland Benchmarks

A comprehensive benchmark suite for the Woodland HTTP framework.

## Overview

This benchmark suite measures performance across all major components of the Woodland framework:

- **Framework Comparison**: Woodland vs raw Node.js HTTP module vs Express.js vs Fastify
- **Routing**: Route matching, parameter extraction, and method resolution
- **Middleware**: Registration, execution, and chaining performance
- **Utility Functions**: Core helpers (parsing, MIME detection, time formatting)
- **File Serving**: Static file serving and streaming capabilities
- **HTTP Server**: End-to-end request/response performance

## Running Benchmarks

### All Benchmarks

```bash
npm run benchmarks
```

### Specific Benchmark Suites

```bash
# Framework comparison (Woodland vs Node.js vs Express vs Fastify)
node benchmark.js comparison

# Routing benchmarks
node benchmark.js routing

# Middleware benchmarks
node benchmark.js middleware

# Utility function benchmarks
node benchmark.js utility

# File serving benchmarks
node benchmark.js serving

# HTTP server benchmarks
node benchmark.js http
```

### Command Line Options

```bash
# Custom iterations and warmup
node benchmark.js -i 2000 -w 200

# Multiple specific benchmarks
node benchmark.js comparison routing middleware
```

**Options:**
- `--iterations, -i <number>`: Iterations per benchmark (default: 1000)
- `--warmup, -w <number>`: Warmup iterations (default: 100)
- `--help, -h`: Show help

## Benchmark Results

### Framework Comparison (5-Run Average)

Averaged across 5 runs on Windows 11 with Node.js:

| Framework | Mean (ms) | Ops/sec |
|-----------|-----------|---------|
| Fastify | 0.1137ms | 8795.35 |
| **Woodland** | **0.1824ms** | **5482.28** |
| Node.js HTTP | 0.1992ms | 5030.95 |
| Express | 0.1998ms | 5005.61 |

**Key Findings:**
- Woodland is **9.2% faster** than raw Node.js HTTP module
- Woodland is **9.5% faster** than Express.js
- Woodland achieves **62.3%** of Fastify's performance
- All frameworks tested with identical JSON response scenarios

**Test Configuration:**
- Woodland configured with optimizations disabled (etags: false, logging: disabled)
- All frameworks serve identical payload: `{message, timestamp, success}`
- Tests use random available ports on `127.0.0.1`

### Routing Benchmarks

Tests core route resolution functions from `src/woodland.js`:

- `routes(uri, method, override)` - Route matching with regex
- `allows(uri, override)` - Determine allowed HTTP methods
- `allowed(method, uri, override)` - Check if method is allowed

**Performance Characteristics:**
- Cached operations: 1.3M - 4.8M ops/sec
- Non-cached operations: 280K - 960K ops/sec
- Parameter routes vs static routes: similar performance
- Cache hits provide ~5x speedup

### Middleware Benchmarks

Tests middleware registry from `src/middleware.js`:

**Registration Performance:**
- `use()` method registration: 270K - 320K ops/sec
- Method-specific (`get()`, `post()`, etc.): 290K ops/sec
- `always()` wildcard registration: 296K ops/sec
- Multiple handlers: 316K ops/sec

**Execution Performance:**
- Simple middleware chain: 29K ops/sec
- Complex middleware stack: 80K ops/sec
- Error handling: 118K ops/sec
- CORS handling: 120K ops/sec
- Parameter extraction: 147K ops/sec
- `next()` function (middleware progression): 3.9M ops/sec

### Utility Benchmarks

Tests utility functions from `src/request.js`, `src/response.js`, `src/logger.js`:

**URL Parsing:**
- `parse()` - URL strings: 3.0M ops/sec
- `parse()` - request objects: 2.2M ops/sec
- Edge cases: 3.5M ops/sec

**MIME Detection:**
- Basic files: 5.1M ops/sec
- Complex files: 3.9M ops/sec

**Time Formatting:**
- `ms()` - time formatting: 1.5M ops/sec
- `timeOffset()` - timezone: 3.3M ops/sec

**Other Utilities:**
- `autoindex()` - directory listing: 360K ops/sec
- `getStatus()` - status determination: 3.2M ops/sec
- `params()` - parameter extraction: 670K ops/sec
- `reduce()` - route reduction: 2.3M ops/sec
- `pipeable()` - content check: 3.2M ops/sec
- `writeHead()` - header writing: 2.1M ops/sec
- `isValidIP()` - IP validation: benchmarked

### File Serving Benchmarks

Tests `src/fileserver.js` functionality:

**Serve Operations:**
- Small files: 44K ops/sec
- Medium files: 37K ops/sec
- Large files: 42K ops/sec
- Different MIME types: 41K ops/sec
- Range requests: 38K ops/sec
- HEAD requests: 65K ops/sec
- OPTIONS requests: 64K ops/sec
- Not found: 60K ops/sec
- Directory redirect: 81K ops/sec
- Directory (autoindex): 18K ops/sec

**Stream Operations:**
- With ETags: 370K ops/sec
- Without ETags: 298K ops/sec
- Small files: 309K ops/sec

**Other:**
- `files()` method setup: 594K ops/sec
- `etag()` generation: 366K ops/sec

### HTTP Server Benchmarks

Tests end-to-end request handling with actual HTTP traffic:

**Request Performance:**
- Server startup: 116K ops/sec
- DELETE requests: 16K ops/sec
- Complex middleware: 14.6K ops/sec
- 404 handling: 14.6K ops/sec
- Nested parameterized routes: 14.4K ops/sec
- Parameterized routes: 14K ops/sec
- JSON response: 13.2K ops/sec
- Error handling: 12.9K ops/sec
- PUT requests: 12.9K ops/sec
- Middleware chain: 11.4K ops/sec
- Mixed workload: 11K ops/sec
- POST requests: 10.5K ops/sec
- Simple GET: 9.6K ops/sec
- Large response (1000 items): 913 ops/sec

**Architecture Notes:**
- Uses shared test server for resource efficiency
- Measures individual request performance (not load testing)
- Tests from `benchmarks/http.js` use built `dist/woodland.js`

## Test Methodology

### Warmup Phase
- 100 warmup iterations before measurement
- Stabilizes JIT compilation and caching

### Measurement Phase
- 1000 iterations per benchmark
- Captures timing with `perf_hooks` API
- Calculates mean, median, min, max, standard deviation

### Statistical Analysis
Results report:
- **Mean**: Average execution time (ms)
- **Median**: Middle value (50th percentile)
- **Min/Max**: Fastest and slowest runs
- **Std Dev**: Consistency indicator
- **Ops/sec**: Operations per second (higher = better)
- **Total**: Total execution time for all iterations

### Test Environment Considerations
- Run on stable system (minimal background processes)
- Multiple runs recommended for consistency
- Results vary by hardware, Node.js version, and OS
- Cached vs non-cached scenarios tested separately

## Benchmark Architecture

### Framework Comparison (`benchmarks/comparison.js`)

Tests four frameworks with identical JSON endpoints:

```javascript
// Raw Node.js HTTP
createServer((req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.writeHead(200);
  res.end(JSON.stringify(data));
});

// Woodland
app.get("/", (req, res) => res.json(data));

// Express
app.get("/", (req, res) => res.json(data));

// Fastify
app.get("/", async () => data);
```

All servers started on random ports, tested via `fetch()`.

### HTTP Server (`benchmarks/http.js`)

Creates test app with routes:
- Simple endpoints (`/`, `/ping`, `/health`)
- Parameterized routes (`/users/:id`, `/users/:id/posts/:postId`)
- CRUD operations (POST, PUT, DELETE)
- Middleware chains (`/api/*`, `/api/protected/*`)
- Error handling (`/error`, `/not-found`)
- Large responses (`/large` - 1000 items)
- Mixed workload (`/mixed`)
- Static files (`/static/*`)

### Routing (`benchmarks/routing.js`)

Tests route matching across:
- Static routes (`/`, `/api/users`, `/admin/dashboard`)
- Parameter routes (`/users/123`, `/posts/456/comments/789`)
- Nested routes (`/api/v1/resource/123/nested/456`)
- Not found routes (`/not-found-route`)
- Cached vs non-cached lookups

### Middleware (`benchmarks/middleware.js`)

Tests registration and execution:
- Fresh app instances per benchmark
- Mock request/response objects
- Various middleware patterns (simple, complex, error handlers)
- CORS, parameter extraction, response helpers

### Serving (`benchmarks/serving.js`)

Tests file serving from `tests/test-files/`:
- Small (11 bytes) to large (100KB) files
- Different MIME types (text, binary, archives)
- HEAD, OPTIONS, range requests
- Directory handling and autoindex
- ETag generation and validation

### Utility (`benchmarks/utility.js`)

Tests source functions directly (not exported from dist):
- `parse()`, `params()`, `isValidIP()` from `request.js`
- `mime()`, `getStatus()`, `writeHead()` from `response.js`
- `next()`, `reduce()` from `middleware.js`
- `ms()`, `timeOffset()` from `logger.js`
- `autoIndex()` from `fileserver.js`

## Recent Changes

### v2.8 - Updated 5-Run Benchmark Analysis

- Statistical accuracy improved with 5-run averages
- Framework comparison accuracy verified
- Performance leadership confirmed: Fastify > Woodland > Express ≈ Node.js
- Woodland delivers 62% of Fastify's performance with superior developer experience

### v2.4 - Framework Comparison Added

- New `comparison.js` benchmark suite
- Direct comparison: Woodland vs Node.js vs Express vs Fastify
- Confirmed Woodland outperforms raw Node.js and Express

### v2.3 - Performance & Code Quality

- Fixed 31 linting errors in benchmark files
- Updated TypeScript definitions
- All tests passing

### v2.0 - Measurement Fixes

- HTTP benchmarks now measure individual requests (not 1-second load tests)
- Proper cleanup prevents hanging processes
- Shared server optimization reduces resource usage
- Realistic measurements: hundreds to thousands ops/sec

## Troubleshooting

### Common Issues

**Port Conflicts:** HTTP benchmarks use random ports (`port: 0`)

**File Access:** Ensure `tests/test-files/` directory exists with test files

**Memory Usage:** Large benchmarks may require sufficient RAM

**Timing Variance:** Results vary between runs; use multiple runs for accuracy

### Recent Fixes

1. **autoindex() TypeError:** Fixed by passing file objects (not strings)
2. **SSRF Warnings:** Test URLs use only localhost hosts
3. **IPv6 Support:** Added `::1` and `[::1]` formats
4. **Clean Output:** No errors, warnings, or security alerts

### Performance Tips

- Disable logging for accurate measurements
- Use fresh app instances per benchmark
- Proper cleanup prevents resource leaks
- Realistic test data (varied URIs, file types)
- Shared servers for efficiency

## Contributing

When adding benchmarks:

1. Follow existing patterns in benchmark files
2. Test cached and non-cached scenarios
3. Use realistic test data
4. Include JSDoc documentation
5. Test with various iteration counts
6. Ensure proper resource cleanup
7. Verify clean exit (no hanging process)

## Example Usage

```javascript
import { runBenchmark } from "./benchmark.js";

const customBenchmark = () => {
  return someFunction();
};

const results = await runBenchmark("Custom Test", customBenchmark, {
  iterations: 1000,
  warmup: 100,
});

console.log(`Performance: ${results.opsPerSecond} ops/sec`);
```

## Summary

The Woodland benchmark suite provides comprehensive performance measurements across all framework components. Key takeaways:

- **Woodland outperforms raw Node.js HTTP by ~9%** and **Express by ~9.5%**
- **Fastify leads** with ~60% higher throughput than Woodland
- **Routing and utilities** are highly optimized (millions of ops/sec)
- **HTTP requests** benchmark realistically (thousands of ops/sec)
- **File serving** performs well across all file sizes and types

Results are averaged across multiple runs for statistical accuracy, with proper warmup and cleanup ensuring reliable measurements.
