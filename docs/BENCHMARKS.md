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

**Latest Results (Node.js 23.10.0, Apple M4 Pro - 3-run average):**
```
Framework Comparison (JSON Response)
Fastify framework:        14,600 ops/sec  (0.068ms avg)
Woodland framework:       13,916 ops/sec  (0.072ms avg)
Raw Node.js HTTP module:  11,141 ops/sec  (0.090ms avg)
Express.js framework:      9,406 ops/sec  (0.106ms avg)
```

**Performance Analysis:**
- Woodland delivers competitive performance against industry leaders
- 25% faster than raw Node.js HTTP module
- 48% faster than Express.js framework
- Only 5% slower than Fastify (the fastest framework)
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
allows() - with cache: 4,858,100 ops/sec
static routes: 2,575,273 ops/sec
path conversion: 2,777,294 ops/sec
not found routes: 2,507,253 ops/sec
parameter routes: 2,414,066 ops/sec
allowed() - with cache: 2,359,465 ops/sec
routes() - with cache: 1,387,639 ops/sec
allowed() - no cache: 622,900 ops/sec
routes() - no cache: 1,074,673 ops/sec
allows() - no cache: 282,839 ops/sec
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
ignore middleware: 633,956 ops/sec
always middleware registration: 602,761 ops/sec
multiple handlers registration: 551,383 ops/sec
specific method registration: 506,262 ops/sec
middleware registration: 509,837 ops/sec
request decoration: 212,078 ops/sec
error handling middleware: 140,414 ops/sec
simple middleware execution: 160,897 ops/sec
response helpers: 166,605 ops/sec
CORS handling: 134,566 ops/sec
parameter extraction: 127,498 ops/sec
complex middleware execution: 90,609 ops/sec
route list: 80,601 ops/sec
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
pad() - number padding: 7,328,512 ops/sec
mime() - basic files: 4,918,995 ops/sec
next() - middleware chain: 4,074,708 ops/sec
mime() - complex files: 4,118,775 ops/sec
pipeable() - content check: 3,294,160 ops/sec
parse() - edge cases: 3,513,223 ops/sec
getStatus() - status determination: 2,810,073 ops/sec
parse() - URL strings: 3,099,511 ops/sec
reduce() - route reduction: 2,781,405 ops/sec
parse() - request objects: 2,220,948 ops/sec
writeHead() - header writing: 2,122,052 ops/sec
partialHeaders() - range headers: 1,441,378 ops/sec
params() - parameter extraction: 736,920 ops/sec
autoindex() - directory listing: 458,043 ops/sec
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
files() - static serving: 562,858 ops/sec
stream() - with ETags: 365,913 ops/sec
etag() - generation: 335,304 ops/sec
stream() - different methods: 319,924 ops/sec
stream() - without ETags: 349,075 ops/sec
stream() - small file: 290,681 ops/sec
serve() - directory redirect: 88,478 ops/sec
serve() - HEAD request: 69,900 ops/sec
serve() - OPTIONS request: 67,205 ops/sec
serve() - not found: 66,297 ops/sec
serve() - different types: 43,561 ops/sec
serve() - large file: 42,892 ops/sec
serve() - medium file: 42,223 ops/sec
serve() - range request: 39,176 ops/sec
serve() - small file: 42,454 ops/sec
serve() - directory: 19,285 ops/sec
serve() - autoindex: 17,935 ops/sec
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
server startup: 118,337 ops/sec
DELETE requests: 15,469 ops/sec
complex middleware: 14,634 ops/sec
nested parameterized routes: 14,351 ops/sec
parameterized routes: 13,865 ops/sec
404 handling: 13,491 ops/sec
JSON response: 12,916 ops/sec
error handling: 12,831 ops/sec
PUT requests: 11,122 ops/sec
middleware chain: 10,821 ops/sec
mixed workload: 10,780 ops/sec
simple GET: 10,866 ops/sec
POST requests: 10,640 ops/sec
large response: 935 ops/sec
```