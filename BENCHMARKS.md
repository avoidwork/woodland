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

### v2.0 - Performance Measurement Fixes (Latest)

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
routes() - with cache: 62,664.49 ops/sec
routes() - no cache: 1,972.39 ops/sec
allows() - with cache: 648,508.43 ops/sec
allows() - no cache: 54,174.12 ops/sec
path conversion: 282,326.37 ops/sec
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
middleware registration: 3,777.15 ops/sec
specific method registration: 45,026.79 ops/sec
simple middleware execution: 9,836.13 ops/sec
complex middleware execution: 2,715.24 ops/sec
error handling middleware: 27,241.28 ops/sec
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
mime() - complex files: 800,000.00 ops/sec
mime() - basic files: 571,428.57 ops/sec
ms() - time formatting: 545,256.27 ops/sec
pad() - number padding: 292,740.05 ops/sec
parse() - URL strings: 175,192.71 ops/sec
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
files() - static serving: 150,943.40 ops/sec
stream() - with ETags: 82,474.23 ops/sec
serve() - small file: 6,653.76 ops/sec
etag() - generation: 146,348.60 ops/sec
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
simple GET: 1,246.24 ops/sec
JSON response: 1,533.06 ops/sec
parameterized routes: 329.04 ops/sec
nested parameterized routes: 1,636.10 ops/sec
middleware chain: 2,723.87 ops/sec
complex middleware: 4,048.58 ops/sec
POST requests: 2,925.76 ops/sec
PUT requests: 3,117.29 ops/sec
DELETE requests: 5,224.22 ops/sec
large response: 599.25 ops/sec
error handling: 2,548.04 ops/sec
404 handling: 5,121.64 ops/sec
mixed workload: 2,506.00 ops/sec
server startup: 27,939.98 ops/sec
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

1. **Process Hanging**: Fixed by implementing proper cleanup mechanisms for HTTP server benchmarks
2. **Artificial Performance Limits**: Resolved by changing HTTP benchmarks from load testing to individual request measurements
3. **Mock Object Compatibility**: Enhanced mock response objects for better framework compatibility
4. **Resource Leaks**: Added automatic cleanup functions to prevent server instances from remaining open

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