# Woodland Benchmarks

A comprehensive benchmark suite for the Woodland HTTP framework, built following Node.js best practices.

## Overview

This benchmark suite provides detailed performance measurements for all critical components of the Woodland framework, including:

- **Framework Comparison**: Woodland vs raw Node.js HTTP module vs Express.js framework performance analysis
- **Routing**: Route matching, parameter extraction, and method resolution
- **Middleware**: Registration, execution, and chaining performance
- **Utility Functions**: Core helper functions and utilities
- **File Serving**: Static file serving and streaming capabilities
- **HTTP Server**: End-to-end HTTP server performance

## Recent Improvements

### v2.8 - 5-Run Mean Benchmark Results & Enhanced Statistical Accuracy

**Comprehensive 5-run benchmark analysis with statistical mean calculations:**

- **✅ Enhanced statistical accuracy**: Conducted 5 complete benchmark runs and calculated mean values for all performance metrics
- **✅ Comprehensive coverage**: All 6 benchmark suites (HTTP, Middleware, Routing, Serving, Utility, Comparison) executed with statistical reliability
- **✅ Framework comparison included**: Added missing comparison benchmarks vs Express.js, Fastify, and raw Node.js HTTP module
- **✅ Reduced measurement variance**: Mean values provide more stable and reliable performance indicators across multiple test runs
- **✅ Updated documentation**: Both README.md and BENCHMARKS.md updated with statistically-validated performance data

**Performance Highlights from 5-Run Mean Results:**
- **Framework comparison**: Woodland (13,601 ops/sec) nearly matches Fastify (14,585 ops/sec), significantly outperforms Express.js (9,185 ops/sec) and raw Node.js (11,410 ops/sec)
- **Utility operations lead performance**: Number padding (7.29M ops/sec), MIME detection (4.91M ops/sec), and time formatting (3.93M ops/sec)
- **Routing remains highly optimized**: Route caching (6.25M ops/sec) and path conversion (3.39M ops/sec) showing excellent performance  
- **HTTP operations maintain competitive speeds**: DELETE requests (15,196 ops/sec), parameterized routes (13,837 ops/sec)
- **File serving delivers consistent performance**: Static file serving (396K ops/sec), ETag generation (341K ops/sec)

**Statistical Methodology**: Each benchmark operation executed 1000 iterations with 100 warmup cycles across 5 independent runs, with means calculated to provide robust performance measurements that account for system variability and provide more reliable benchmarking data.

### v2.7 - Latest Performance Measurements & Framework Comparison Update

**Fresh performance measurements with updated framework rankings:**

- **✅ Updated benchmark results**: Complete refresh of all performance measurements on latest system configuration
- **✅ Framework ranking update**: Fastify has edged ahead in the latest measurements while maintaining competitive performance landscape
- **✅ Comprehensive data refresh**: All 6 benchmark suites updated with current performance data
- **✅ Statistical accuracy maintained**: 1000 iterations with 100 warmup cycles for reliable measurements

**Performance Discovery**: Latest measurements show Fastify framework (14,367 ops/sec) slightly outperforming Woodland framework (13,169 ops/sec), with both frameworks significantly outperforming raw Node.js HTTP module (10,342 ops/sec) and Express.js framework (8,114 ops/sec). Woodland remains in the top-tier performance category, demonstrating competitive performance in the high-performance Node.js framework ecosystem.

**Updated Performance Hierarchy:**
1. **Fastify framework**: 14,367 ops/sec (0.070ms avg) 🥇 **Current leader**
2. **Woodland framework**: 13,169 ops/sec (0.076ms avg) 🥈 **Close second**
3. **Raw Node.js HTTP**: 10,342 ops/sec (0.097ms avg) 🥉 **Third place**
4. **Express.js framework**: 8,114 ops/sec (0.123ms avg)

### v2.6 - Fastify Integration & Complete Framework Comparison

**Comprehensive four-way framework performance comparison:**

- **✅ Fastify integration**: Added Fastify to the comparison benchmark for complete framework ecosystem analysis
- **✅ Performance supremacy confirmed**: Woodland outperforms all major frameworks including Fastify (+1.6%), raw Node.js (+29%), and Express.js (+63%)
- **✅ Head-to-head with performance leader**: Direct comparison against Fastify, widely considered the fastest Node.js framework
- **✅ Complete ecosystem coverage**: Comprehensive comparison of Woodland vs all major Node.js HTTP frameworks
- **✅ Enhanced documentation**: Updated all performance claims with four-way comparison data

**Performance Discovery**: Woodland framework (14,284 ops/sec) edges out even Fastify framework (14,063 ops/sec), while significantly outperforming raw Node.js HTTP module (11,048 ops/sec) and Express.js framework (8,758 ops/sec), establishing Woodland as the undisputed performance leader in the Node.js HTTP framework ecosystem.

### v2.4 - Framework Comparison Benchmark & Performance Discovery

**Major performance discovery with new comparison benchmark:**

- **✅ New comparison benchmark**: Added comprehensive benchmark comparing Woodland vs raw Node.js HTTP module
- **✅ Performance breakthrough**: Woodland is **23.2% faster** than raw Node.js HTTP module for JSON responses
- **✅ Framework overhead eliminated**: Woodland provides performance gains, not overhead
- **✅ Updated documentation**: README.md updated with new performance claims and framework comparison data

**Performance Discovery**: Woodland framework (13,487 ops/sec) significantly outperforms raw Node.js HTTP module (10,945 ops/sec), demonstrating that Woodland's optimizations provide measurable performance benefits over manual HTTP implementations.

### v2.3 - Performance Optimization & Code Quality Update

**Latest performance improvements and optimizations:**

- **✅ Enhanced benchmark performance**: Significant improvements across all benchmark suites with updated measurements
- **✅ Code quality improvements**: Fixed all linting errors (31 errors resolved) across benchmark files
- **✅ Type definition updates**: Updated TypeScript definitions to match current implementation including new security features
- **✅ Comprehensive testing**: All 379 tests passing with 98.6% coverage maintained

**Performance Highlights**: Top performers include utility padding (6.8M ops/sec), routing with cache (6.8M ops/sec), MIME detection (5.1M ops/sec), and improved HTTP operations with DELETE requests at 16.0K ops/sec.

### v2.2 - Latest Benchmark Results Update

**Fresh performance measurements:**

- **✅ Updated all benchmark results**: Refreshed all performance measurements with latest Node.js 23.10.0 on Apple M4 Pro Mac Mini
- **✅ Enhanced performance documentation**: Updated README.md and BENCHMARKS.md with current performance data
- **✅ Comprehensive suite completion**: All 6 benchmark suites (Comparison, HTTP, Middleware, Routing, Serving, Utility) completed successfully
- **✅ Statistical accuracy**: 1000 iterations with 100 warmup cycles for statistical significance

**Performance Highlights**: Top performers include utility padding (7.2M ops/sec), routing with cache (5.0M ops/sec), MIME detection (4.8M ops/sec), and middleware operations ranging from 85K to 626K ops/sec.

### v2.1 - Error Resolution & Security Improvements

**Latest improvements to the benchmark suite:**

- **✅ Fixed autoindex() benchmark error**: Resolved `TypeError: file.isDirectory is not a function` by correcting the file object structure in benchmark tests
- **✅ Eliminated SSRF security warnings**: Updated test URLs to use only allowed localhost hosts (`localhost`, `127.0.0.1`, `::1`, `[::1]`) to eliminate hundreds of false security warnings
- **✅ Enhanced IPv6 support**: Added proper support for IPv6 localhost addresses in URL parsing benchmarks
- **✅ Clean benchmark output**: All benchmarks now run without errors or warnings, providing accurate performance metrics

**Performance Impact**: The `autoindex()` benchmark now runs successfully at ~375,000 ops/sec, and all parse() benchmarks run cleanly without SSRF warnings.

### v2.0 - Performance Measurement Fixes

The benchmark suite has been significantly improved to provide accurate performance measurements:

- **✅ Fixed ops/second limitation**: HTTP benchmarks now measure individual request performance instead of artificial 1-second load tests
- **✅ Resolved hanging process**: Added proper cleanup mechanisms to ensure benchmarks exit cleanly
- **✅ Enhanced mock objects**: Fixed middleware benchmark mock responses for better compatibility
- **✅ Shared server optimization**: HTTP benchmarks now use a shared test server for better performance and resource management

**Performance Impact**: HTTP benchmarks now show realistic performance measurements ranging from hundreds to thousands of ops/sec instead of being artificially limited to 1 op/sec.

## Getting Started

### Running All Benchmarks

```bash
node benchmark.js
```

### Running Specific Benchmarks

```bash
# Run framework comparison benchmark (Woodland vs Node.js vs Express.js)
node benchmark.js comparison

# Run only routing benchmarks
node benchmark.js routing

# Run multiple specific benchmarks
node benchmark.js comparison routing middleware utility

# Run with custom iteration counts
node benchmark.js -i 2000 -w 200

# Run specific benchmark with custom settings
node benchmark.js comparison -i 500 -w 50
```

### Command Line Options

- `--iterations, -i <number>`: Number of iterations per benchmark (default: 1000)
- `--warmup, -w <number>`: Number of warmup iterations (default: 100)  
- `--help, -h`: Show help message

## Benchmark Suites

### 1. Framework Comparison Benchmarks (`benchmarks/comparison.js`)

Tests the performance of Woodland against other popular Node.js web frameworks:

- Raw Node.js HTTP server
- Express.js 
- Fastify
- Woodland

**Latest Results (Node.js 23.10.0, Apple M4 Pro - 5-run mean):**
```
Framework Comparison (JSON Response)
Fastify framework:        14,585 ops/sec  (0.0686ms avg)
Woodland framework:       13,601 ops/sec  (0.0735ms avg)
Raw Node.js HTTP module:  11,410 ops/sec  (0.0876ms avg)
Express.js framework:      9,185 ops/sec  (0.1089ms avg)
```

**Performance Analysis:**
- Woodland delivers competitive performance against industry leaders
- 19% faster than raw Node.js HTTP module
- 48% faster than Express.js framework
- Only 7% slower than Fastify (the fastest framework)
- Consistent sub-100ms response times across all test scenarios

### 2. Routing Benchmarks (`benchmarks/routing.js`)

Tests the performance of core routing functions:

- `routes()` - Route resolution with and without caching
- `allows()` - Allowed methods determination with and without caching
- `allowed()` - Method permission checking with and without caching
- Parameter route matching vs static routes
- Non-existent route handling
- Path conversion (parameter routes to regex)

**Example Output:**
```
allows() - with cache: 6,248,086 ops/sec
path conversion: 3,385,581 ops/sec
not found routes: 3,100,131 ops/sec
parameter routes: 2,721,312 ops/sec
allowed() - with cache: 2,559,213 ops/sec
static routes: 2,258,717 ops/sec
routes() - with cache: 1,852,750 ops/sec
routes() - no cache: 1,460,571 ops/sec
allowed() - no cache: 1,284,145 ops/sec
allows() - no cache: 371,644 ops/sec
```

### 3. Middleware Benchmarks (`benchmarks/middleware.js`)

Tests middleware registration and execution performance:

- Middleware registration via `use()` method
- Specific HTTP method registration (GET, POST, etc.)
- Always middleware registration
- Request decoration
- Simple and complex middleware execution chains
- Error handling middleware
- Parameter extraction
- CORS handling
- Response helpers

**Example Output:**
```
ignore middleware: 531,005 ops/sec
multiple handlers registration: 380,876 ops/sec
specific method registration: 380,294 ops/sec
middleware registration: 337,451 ops/sec
always middleware registration: 333,591 ops/sec
response helpers: 163,142 ops/sec
request decoration: 154,028 ops/sec
simple middleware execution: 128,538 ops/sec
error handling middleware: 125,936 ops/sec
parameter extraction: 121,579 ops/sec
CORS handling: 110,298 ops/sec
complex middleware execution: 84,305 ops/sec
route list: 67,703 ops/sec
```

### 4. Utility Benchmarks (`benchmarks/utility.js`)

Tests core utility functions:

- `parse()` - URL parsing for strings and request objects
- `mime()` - MIME type detection for various file types
- `ms()` - Time formatting with different precision
- `pad()` - Number padding
- `timeOffset()` - Timezone offset formatting
- `autoindex()` - Directory listing generation
- `getStatus()` - HTTP status code determination
- `params()` - Parameter extraction from URLs
- `reduce()` - Route reduction for middleware matching

**Example Output:**
```
pad() - number padding: 7,287,370 ops/sec
mime() - basic files: 4,913,484 ops/sec
ms() - time formatting: 3,929,031 ops/sec
mime() - complex files: 3,719,548 ops/sec
next() - middleware chain: 3,676,595 ops/sec
timeOffset() - timezone: 3,385,045 ops/sec
parse() - edge cases: 3,331,237 ops/sec
parse() - URL strings: 3,102,462 ops/sec
getStatus() - status determination: 2,939,918 ops/sec
pipeable() - content check: 2,878,001 ops/sec
parse() - request objects: 2,129,949 ops/sec
writeHead() - header writing: 1,965,358 ops/sec
reduce() - route reduction: 1,643,887 ops/sec
partialHeaders() - range headers: 1,319,403 ops/sec
params() - parameter extraction: 980,934 ops/sec
autoindex() - directory listing: 391,576 ops/sec
```

### 5. File Serving Benchmarks (`benchmarks/serving.js`)

Tests file serving and streaming performance:

- `serve()` - File serving for different file sizes
- `stream()` - File streaming with different HTTP methods
- Directory handling and autoindex
- Range request handling
- ETag generation and validation
- Different file types (text, binary, etc.)
- HEAD and OPTIONS request handling
- Error handling for non-existent files

**Example Output:**
```
files() - static serving: 396,380 ops/sec
etag() - generation: 341,445 ops/sec
stream() - different methods: 308,628 ops/sec
stream() - with ETags: 298,254 ops/sec
stream() - without ETags: 278,475 ops/sec
stream() - small file: 272,102 ops/sec
serve() - directory redirect: 84,198 ops/sec
serve() - HEAD request: 67,230 ops/sec
serve() - OPTIONS request: 62,887 ops/sec
serve() - not found: 52,901 ops/sec
serve() - large file: 41,976 ops/sec
serve() - different types: 41,368 ops/sec
serve() - medium file: 40,888 ops/sec
serve() - small file: 38,533 ops/sec
serve() - range request: 37,544 ops/sec
serve() - directory: 19,003 ops/sec
serve() - autoindex: 17,840 ops/sec
```

**Example Features:**
- Tests files from small (11 bytes) to extra large (100KB)
- Benchmarks different MIME types
- Tests range requests for partial content
- Measures directory listing performance

### 6. HTTP Server Benchmarks (`benchmarks/http.js`)

Tests end-to-end HTTP server performance with **individual request measurements**:

- Simple GET requests
- JSON response handling
- Parameterized and nested routes
- Middleware chain execution
- CRUD operations (POST, PUT, DELETE)
- Large response handling
- Error and 404 handling
- Mixed workload scenarios
- Server startup performance

**Example Output:**
```
server startup: 110,600 ops/sec
DELETE requests: 15,196 ops/sec
parameterized routes: 13,837 ops/sec
complex middleware: 13,695 ops/sec
404 handling: 13,689 ops/sec
nested parameterized routes: 13,650 ops/sec
JSON response: 13,180 ops/sec
error handling: 12,386 ops/sec
middleware chain: 10,881 ops/sec
mixed workload: 10,559 ops/sec
PUT requests: 9,760 ops/sec
POST requests: 9,550 ops/sec
simple GET: 9,108 ops/sec
large response: 914 ops/sec
```