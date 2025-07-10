# Woodland Benchmarks

A comprehensive benchmark suite for the Woodland HTTP framework, built following Node.js best practices.

## Overview

This benchmark suite provides detailed performance measurements for all critical components of the Woodland framework, including:

- **Routing**: Route matching, parameter extraction, and method resolution
- **Middleware**: Registration, execution, and chaining performance
- **Utility Functions**: Core helper functions and utilities
- **File Serving**: Static file serving and streaming capabilities
- **HTTP Server**: End-to-end HTTP server performance

## Recent Improvements

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
# Run only routing benchmarks
node benchmark.js routing

# Run multiple specific benchmarks
node benchmark.js routing middleware utility

# Run with custom iteration counts
node benchmark.js -i 2000 -w 200

# Run specific benchmark with custom settings
node benchmark.js routing -i 500 -w 50
```

### Command Line Options

- `--iterations, -i <number>`: Number of iterations per benchmark (default: 1000)
- `--warmup, -w <number>`: Number of warmup iterations (default: 100)  
- `--help, -h`: Show help message

## Benchmark Suites

### 1. Routing Benchmarks (`benchmarks/routing.js`)

Tests the performance of core routing functions:

- `routes()` - Route resolution with and without caching
- `allows()` - Allowed methods determination with and without caching
- `allowed()` - Method permission checking with and without caching
- Parameter route matching vs static routes
- Non-existent route handling
- Path conversion (parameter routes to regex)

**Example Output:**
```
allows() - with cache: 6,635,920 ops/sec
path conversion: 3,839,966 ops/sec
allowed() - with cache: 3,626,552 ops/sec
parameter routes: 3,108,853 ops/sec
static routes: 3,508,316 ops/sec
routes() - with cache: 1,947,514 ops/sec
allows() - no cache: 390,721 ops/sec
routes() - no cache: 796,318 ops/sec
```

### 2. Middleware Benchmarks (`benchmarks/middleware.js`)

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
ignore middleware: 621,887 ops/sec
always middleware registration: 296,611 ops/sec
multiple handlers registration: 291,939 ops/sec
middleware registration: 272,344 ops/sec
specific method registration: 250,970 ops/sec
response helpers: 210,351 ops/sec
CORS handling: 169,067 ops/sec
parameter extraction: 136,105 ops/sec
error handling middleware: 129,066 ops/sec
request decoration: 101,338 ops/sec
complex middleware execution: 77,759 ops/sec
route list: 76,858 ops/sec
simple middleware execution: 72,650 ops/sec
```

### 3. Utility Benchmarks (`benchmarks/utility.js`)

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
pad() - number padding: 7,357,648 ops/sec
mime() - basic files: 3,955,102 ops/sec
ms() - time formatting: 3,449,715 ops/sec
timeOffset() - timezone: 3,396,208 ops/sec
parse() - URL strings: 2,992,175 ops/sec
parse() - edge cases: 3,193,633 ops/sec
next() - middleware chain: 3,660,630 ops/sec
pipeable() - content check: 3,022,993 ops/sec
autoindex() - directory listing: 375,023 ops/sec
params() - parameter extraction: 807,853 ops/sec
```

### 4. File Serving Benchmarks (`benchmarks/serving.js`)

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
files() - static serving: 520,618 ops/sec
etag() - generation: 415,462 ops/sec
stream() - with ETags: 359,182 ops/sec
stream() - different methods: 313,579 ops/sec
stream() - without ETags: 314,738 ops/sec
stream() - small file: 291,010 ops/sec
serve() - HEAD request: 76,642 ops/sec
serve() - small file: 48,815 ops/sec
serve() - medium file: 44,046 ops/sec
serve() - large file: 43,411 ops/sec
serve() - autoindex: 18,844 ops/sec
serve() - directory: 20,433 ops/sec
```

**Example Features:**
- Tests files from small (11 bytes) to extra large (100KB)
- Benchmarks different MIME types
- Tests range requests for partial content
- Measures directory listing performance

### 5. HTTP Server Benchmarks (`benchmarks/http.js`)

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
server startup: 111,613 ops/sec
DELETE requests: 15,800 ops/sec
404 handling: 15,181 ops/sec
JSON response: 13,633 ops/sec
complex middleware: 13,912 ops/sec
PUT requests: 12,736 ops/sec
middleware chain: 11,226 ops/sec
mixed workload: 11,268 ops/sec
POST requests: 10,276 ops/sec
simple GET: 9,683 ops/sec
error handling: 13,261 ops/sec
nested parameterized routes: 14,233 ops/sec
parameterized routes: 14,154 ops/sec
large response: 913 ops/sec
```

**Architecture Notes:**
- Uses a shared test server for efficient resource management
- Measures individual HTTP request performance, not load testing
- Automatically cleans up server resources after benchmark completion
- Realistic request/response cycles with actual HTTP traffic

## Architecture

### Node.js Best Practices

The benchmark suite follows Node.js best practices:

1. **Built-in Performance APIs**: Uses `perf_hooks` for accurate timing
2. **Proper Warmup**: Runs warmup iterations before measuring
3. **Statistical Analysis**: Calculates mean, median, min, max, and standard deviation
4. **Realistic Scenarios**: Uses real-world route patterns and request types
5. **Isolated Testing**: Each benchmark runs in isolation to avoid interference
6. **Error Handling**: Graceful error handling with detailed error reporting
7. **Production Code**: Benchmarks test the built distribution version (`dist/woodland.js`) for realistic performance measurements
8. **Resource Management**: Proper cleanup mechanisms prevent resource leaks and hanging processes

### Benchmark Process

1. **Warmup Phase**: Runs specified number of warmup iterations to stabilize performance
2. **Measurement Phase**: Runs actual benchmark iterations with precise timing
3. **Statistical Analysis**: Calculates comprehensive performance statistics
4. **Cleanup Phase**: Ensures all resources are properly freed after completion
5. **Results Reporting**: Formats and displays results with operations per second

### Output Format

Each benchmark reports:
- **Mean**: Average execution time in milliseconds
- **Median**: Middle value execution time
- **Min/Max**: Fastest and slowest execution times
- **Std Dev**: Standard deviation showing consistency
- **Ops/sec**: Operations per second (higher is better)
- **Total**: Total execution time for all iterations

## Best Practices for Benchmarking

### Running Benchmarks

1. **Stable Environment**: Run benchmarks on a stable system with minimal background processes
2. **Multiple Runs**: Run benchmarks multiple times to verify consistency
3. **Warm System**: Ensure the system is warmed up before running benchmarks
4. **Appropriate Iterations**: Use enough iterations for statistical significance (default 1000)
5. **Realistic Workloads**: The benchmarks simulate realistic usage patterns

### Interpreting Results

1. **Operations per Second**: Higher values indicate better performance
2. **Standard Deviation**: Lower values indicate more consistent performance
3. **Caching Effects**: Compare cached vs non-cached performance
4. **Relative Performance**: Compare between different approaches or configurations
5. **Performance Ranges**: Expect different performance characteristics:
   - Utility functions: 100,000+ ops/sec
   - Middleware operations: 1,000-100,000 ops/sec
   - HTTP requests: 100-10,000 ops/sec (depends on complexity)

### Using Results

1. **Performance Optimization**: Identify bottlenecks and areas for improvement
2. **Regression Testing**: Ensure performance doesn't degrade over time
3. **Configuration Tuning**: Optimize cache sizes and other parameters
4. **Scaling Decisions**: Understand performance characteristics under load

## Troubleshooting

### Common Issues

1. **Port Conflicts**: HTTP benchmarks use random ports to avoid conflicts
2. **File System Access**: Ensure proper permissions for file serving benchmarks
3. **Memory Usage**: Large benchmarks may require sufficient available memory
4. **Timing Accuracy**: Results may vary between runs due to system conditions

### Recent Fixes

1. **autoindex() TypeError**: Fixed by passing proper file objects instead of strings to autoindex benchmark
2. **SSRF Security Warnings**: Eliminated by updating test URLs to use only localhost hosts and adding IPv6 support
3. **Clean Output**: All benchmarks now run without errors, warnings, or security alerts
4. **IPv6 Compatibility**: Added support for both `::1` and `[::1]` IPv6 localhost formats
5. **Enhanced Security**: Updated allowed hosts list to prevent false positive security warnings while maintaining SSRF protection

### Performance Tips

1. **Disable Logging**: Benchmarks disable logging for accurate measurements
2. **Fresh Instances**: Each benchmark uses fresh app instances
3. **Proper Cleanup**: Resources are cleaned up after each benchmark
4. **Realistic Test Data**: Uses varied and realistic test data
5. **Shared Resources**: HTTP benchmarks use shared test servers for efficiency

## Contributing

When adding new benchmarks:

1. Follow the existing pattern in benchmark files
2. Include both cached and non-cached scenarios where applicable
3. Use realistic test data and scenarios
4. Include proper JSDoc documentation
5. Test with various iteration counts
6. Ensure proper cleanup of resources
7. Add cleanup functions for benchmarks that create persistent resources
8. Test that benchmarks exit cleanly without hanging

## Example Usage

```javascript
// Custom benchmark usage
import {runBenchmark} from './benchmark.js';

const customBenchmark = () => {
    // Your code to benchmark
    return someFunction();
};

const results = await runBenchmark('Custom Test', customBenchmark, {
    iterations: 1000,
    warmup: 100
});

console.log(`Performance: ${results.opsPerSecond} ops/sec`);
```

This benchmark suite provides comprehensive performance insights for the Woodland framework, helping developers understand performance characteristics and optimize their applications accordingly. The recent improvements ensure accurate measurements and reliable benchmark execution. 
