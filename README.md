<div align="center">
  <img src="https://avoidwork.github.io/woodland/logo.svg" width="150" alt="Woodland Logo" />
  
  # Woodland
  
  *High-performance HTTP framework*
  
  [![npm version](https://badge.fury.io/js/woodland.svg)](https://badge.fury.io/js/woodland)
  [![Node.js Version](https://img.shields.io/node/v/woodland.svg)](https://nodejs.org/)
  [![License](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause)
  [![Build Status](https://github.com/avoidwork/woodland/actions/workflows/ci.yml/badge.svg)](https://github.com/avoidwork/woodland/actions)
  [![Test Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen.svg)](https://github.com/avoidwork/woodland)
  
</div>

## 🚀 Features

- **🏆 Performance Leader**: **29% faster than raw Node.js, 63% faster than Express.js, 1.6% faster than Fastify** - proven by benchmarks
- **⚡ Zero Overhead**: Framework features with performance gains, not costs
- **🔒 Security First**: Built-in CORS, canonical path validation, and comprehensive security headers
- **🛤️ Smart Routing**: Parameter syntax (`/users/:id`) and RegExp support with caching
- **🔧 Express Compatible**: Familiar middleware with `req, res, next` pattern
- **📁 File Serving**: High-performance static file server with streaming and canonical path security
- **📘 TypeScript Ready**: Full TypeScript definitions included
- **📊 Production Logging**: Common Log Format with customizable levels
- **🚀 Modern Architecture**: ES6+ modules optimized for Node.js 17+

## 💡 Why Choose Woodland?

**Stop accepting framework overhead.** Most HTTP frameworks slow you down in exchange for convenience. Woodland breaks that trade-off.

🏆 **Proven Performance**: Comprehensive benchmarks show Woodland **outperforms raw Node.js by 29%, Express.js by 63%, and even Fastify by 1.6%**  
⚡ **Zero Compromise**: Get all the framework features you need with better performance than hand-coding  
🚀 **Battle-Tested**: 100% coverage across all metrics with 460 comprehensive tests, production-ready security, and enterprise-grade reliability  
🔧 **Developer Experience**: Express-compatible API means zero learning curve for your team  

**The Result?** Your applications run faster, your servers handle more traffic, and your infrastructure costs less.

## 📦 Installation

```bash
# npm
npm install woodland

# yarn
yarn add woodland

# pnpm
pnpm add woodland

# Global installation for CLI
npm install -g woodland
```

## 🚀 Quick Start

### Basic Server

```javascript
import {createServer} from "node:http";
import {woodland} from "woodland";

const app = woodland({
  defaultHeaders: {
    "cache-control": "public, max-age=3600",
    "content-type": "text/plain"
  },
  time: true
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/users/:id", (req, res) => {
  res.json({
    id: req.params.id,
    name: `User ${req.params.id}`
  });
});

createServer(app.route).listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
```

### Using the Class

```javascript
import {Woodland} from "woodland";

class MyAPI extends Woodland {
  constructor() {
    super({
      defaultHeaders: {
        "x-api-version": "1.0.0"
      },
      origins: ["https://myapp.com"]
    });
    
    this.setupRoutes();
  }
  
  setupRoutes() {
    this.get("/api/health", this.healthCheck);
    this.post("/api/users", this.createUser);
  }
  
  healthCheck(req, res) {
    res.json({status: "healthy", timestamp: new Date().toISOString()});
  }
  
  createUser(req, res) {
    // Handle user creation
    res.status(201).json({message: "User created"});
  }
}

const api = new MyAPI();
```

## 📖 Table of Contents

- [Configuration](#-configuration)
- [Routing](#-routing)
- [Middleware](#-middleware)
- [Static Files](#-static-files)
- [ETags & Caching](#-etags--caching)
- [CORS](#-cors)
- [Error Handling](#-error-handling)
- [Response Helpers](#-response-helpers)
- [Event Handlers](#-event-handlers)
- [Logging](#-logging)
- [CLI Usage](#-cli-usage)
- [API Reference](#-api-reference)
- [Performance](#-performance)
- [Testing](#-testing)
- [TypeScript](#-typescript)
- [Examples](#-examples)
- [Troubleshooting](#-troubleshooting)

## ⚙️ Configuration

### Default Configuration

```javascript
const app = woodland({
  autoindex: false,        // Enable directory browsing
  cacheSize: 1000,        // Internal cache size
  cacheTTL: 300000,       // Cache TTL (5 minutes)
  charset: "utf-8",       // Default charset
  corsExpose: "",         // CORS exposed headers
  defaultHeaders: {},     // Default response headers
  digit: 3,              // Timing precision digits
  etags: true,           // Enable ETag generation
  indexes: [             // Index file names
    "index.htm",
    "index.html"
  ],
  logging: {
    enabled: true,       // Enable logging
    format: "%h %l %u %t \"%r\" %>s %b", // Log format
    level: "info"        // Log level
  },
  origins: ["*"],        // CORS origins
  silent: false,         // Disable default headers
  time: false           // Enable response timing
});
```

### Advanced Configuration

```javascript
const app = woodland({
  // Security headers
  defaultHeaders: {
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "x-xss-protection": "1; mode=block",
    "strict-transport-security": "max-age=31536000; includeSubDomains"
  },
  
  // CORS configuration
  origins: [
    "https://myapp.com",
    "https://api.myapp.com"
  ],
  corsExpose: "x-custom-header,x-request-id",
  
  // Performance tuning
  cacheSize: 5000,
  cacheTTL: 600000, // 10 minutes
  
  // Detailed logging
  logging: {
    enabled: true,
    level: "debug",
    format: "%h %l %u %t \"%r\" %>s %b \"%{Referer}i\" \"%{User-Agent}i\""
  },
  
  // Enable features
  time: true,
  etags: true,
  autoindex: true
});
```

## 🛤️ Routing

### Basic Routes

```javascript
// HTTP methods
app.get("/users", getAllUsers);
app.post("/users", createUser);
app.put("/users/:id", updateUser);
app.delete("/users/:id", deleteUser);
app.patch("/users/:id", patchUser);
app.options("/users", optionsHandler);

// Route parameters
app.get("/users/:id", (req, res) => {
  const userId = req.params.id;
  res.json({id: userId});
});

// Multiple parameters
app.get("/users/:userId/posts/:postId", (req, res) => {
  const {userId, postId} = req.params;
  res.json({userId, postId});
});
```

### Advanced Routing

```javascript
// RegExp patterns
app.get("/api/v[1-3]/users", (req, res) => {
  res.json({version: req.url.match(/v(\d)/)[1]});
});

// Wildcard routes
app.get("/files/(.*)", (req, res) => {
  // Serve any file under /files/
});

// Route with validation
app.get("/users/:id(\\d+)", (req, res) => {
  // Only matches numeric IDs
  res.json({id: parseInt(req.params.id)});
});
```

### Route Groups

```javascript
// API v1 routes
const apiV1 = (req, res, next) => {
  req.version = "v1";
  next();
};

app.get("/api/v1/users", apiV1, getAllUsers);
app.post("/api/v1/users", apiV1, createUser);

// Protected routes
const authenticate = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.error(401);
  }
  // Verify token...
  next();
};

app.get("/admin/*", authenticate, adminHandler);
```

## 🔧 Middleware

### Basic Middleware

```javascript
// Global middleware
app.always((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Route-specific middleware
app.get("/protected", authenticate, authorize, handler);

// Error handling middleware
app.always((error, req, res, next) => {
  if (error) {
    console.error(error);
    res.error(500);
  } else {
    next();
  }
});
```

### Middleware Examples

```javascript
// Request logging
const requestLogger = (req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
  });
  next();
};

// Body parser
const bodyParser = async (req, res, next) => {
  if (req.method === "POST" || req.method === "PUT") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try {
        req.body = JSON.parse(body);
      } catch (e) {
        req.body = body;
      }
      next();
    });
  } else {
    next();
  }
};

// Rate limiting
const rateLimit = (() => {
  const requests = new Map();
  return (req, res, next) => {
    const ip = req.ip;
    const now = Date.now();
    const window = 60000; // 1 minute
    const limit = 100;
    
    if (!requests.has(ip)) {
      requests.set(ip, []);
    }
    
    const ipRequests = requests.get(ip);
    const recentRequests = ipRequests.filter(time => now - time < window);
    
    if (recentRequests.length >= limit) {
      return res.error(429);
    }
    
    recentRequests.push(now);
    requests.set(ip, recentRequests);
    next();
  };
})();
```

## 📁 Static Files

### Basic File Serving

```javascript
// Serve files from public directory
app.files("/static", "./public");

// Serve with custom options
app.get("/downloads/(.*)", (req, res) => {
  const filename = req.params[0];
  
  // Enhanced security: serve() uses canonical path validation
  // to prevent directory traversal attacks and symlink exploits
  app.serve(req, res, filename, "./downloads");
});
```

### Enhanced Security Features

Woodland's `serve()` method implements **canonical path validation** for robust security:

```javascript
// All file serving automatically includes:
// ✅ Canonical path resolution (resolve() + containment validation)
// ✅ Directory traversal protection (prevents ../../../etc/passwd)
// ✅ Symlink attack prevention (follows symlinks before validation)
// ✅ Cross-platform security (Windows, macOS, Linux)
// ✅ Comprehensive logging of security events

app.get("/secure-files/(.*)", (req, res) => {
  const filename = req.params[0];
  
  // Woodland automatically validates that the resolved path
  // stays within the base directory - no additional security needed
  app.serve(req, res, filename, "./secure-directory");
});
```

### Directory Browsing

```javascript
const app = woodland({
  autoindex: true,  // Enable directory browsing
  indexes: ["index.html", "index.htm", "default.html"]
});

app.files("/", "./public");
```

## 🏷️ ETags & Caching

### What are ETags?

**ETags (Entity Tags)** are HTTP response headers that provide efficient caching by uniquely identifying resource versions. When a file changes, its ETag changes, allowing browsers and CDNs to cache resources intelligently.

**Benefits:**
- **Reduce Bandwidth**: Skip transferring unchanged files (HTTP 304 responses)
- **Improve Performance**: Faster page loads with efficient caching
- **Save Server Resources**: Less processing for unchanged content
- **Automatic Management**: Woodland handles ETag generation automatically

### ETag Configuration

```javascript
const app = woodland({
  etags: true,  // Enable ETag generation (default: true)
  time: true    // Add response time headers
});

// ETags are automatically generated for:
// ✅ File serving (based on file stats: size, mtime, inode)
// ✅ Static content responses
// ✅ JSON responses
// ✅ All GET and HEAD requests
```

### How ETags Work

```mermaid
sequenceDiagram
    participant Client
    participant Woodland
    participant FileSystem
    
    Note over Client,FileSystem: First Request
    Client->>Woodland: GET /file.js
    Woodland->>FileSystem: Read file stats
    FileSystem->>Woodland: {size, mtime, inode}
    Woodland->>Woodland: Generate ETag: "123-456-789"
    Woodland->>Client: 200 OK + ETag: "123-456-789"
    
    Note over Client,FileSystem: Subsequent Request
    Client->>Woodland: GET /file.js<br/>If-None-Match: "123-456-789"
    Woodland->>FileSystem: Check file stats
    FileSystem->>Woodland: {size, mtime, inode} (unchanged)
    Woodland->>Woodland: ETag matches!
    Woodland->>Client: 304 Not Modified
```

### ETag Usage Examples

```javascript
// Automatic ETag generation for file serving
app.files("/static", "./public");
// Generates ETags like: "1024-1703123456789-98765"
//                       ^^^^  ^^^^^^^^^^^^^ ^^^^^
//                       size  modified-time inode

// Custom ETag handling
app.get("/api/data/:id", async (req, res) => {
  const data = await getData(req.params.id);
  
  // Woodland automatically generates ETag for JSON responses
  res.json(data);
  // ETag based on stringified content hash
});

// Conditional requests with ETags
app.get("/api/expensive-data", async (req, res) => {
  const ifNoneMatch = req.headers['if-none-match'];
  const data = await getExpensiveData();
  const currentETag = generateETag(data);
  
  if (ifNoneMatch === currentETag) {
    return res.status(304).send(); // Not Modified
  }
  
  res.set({'ETag': currentETag});
  res.json(data);
});
```

### ETag Performance Impact

```javascript
// Performance comparison (Woodland benchmarks)
Stream with ETags:    370,153 ops/sec  (0.0027ms avg)
ETag generation:      366,024 ops/sec  (0.0027ms avg)
Stream without ETags: ~340,000 ops/sec  (0.0029ms avg)

// ETags provide net performance gain through:
// ✅ Reduced bandwidth usage (304 responses)
// ✅ Faster subsequent requests
// ✅ Lower server processing for cached content
// ✅ Improved user experience
```

### Advanced ETag Configuration

```javascript
// Fine-tune ETag behavior
const app = woodland({
  etags: true,
  
  // Custom ETag generation hook
  onSend: (req, res, body, status, headers) => {
    if (status === 200 && req.method === 'GET') {
      // Custom ETag logic for specific content types
      if (headers['content-type']?.includes('application/json')) {
        headers.etag = `"custom-${hash(body)}"`;
      }
    }
    return [body, status, headers];
  }
});

// ETags work automatically with:
app.get("/cached-content", (req, res) => {
  res.json({data: "This will have an ETag"}); // ✅ Auto ETag
});

app.files("/assets", "./static"); // ✅ Auto ETags for all files
```

### ETag Best Practices

1. **Keep ETags Enabled**: Default `etags: true` provides automatic optimization
2. **Use with Cache Headers**: Combine ETags with `Cache-Control` for optimal caching
3. **Monitor 304 Responses**: Track cache hit rates in your analytics
4. **Test Conditional Requests**: Verify ETags work with your CDN/proxy setup

```javascript
// Optimal caching setup
const app = woodland({
  etags: true,
  defaultHeaders: {
    "Cache-Control": "public, max-age=3600", // 1 hour cache
    "Vary": "Accept-Encoding"
  }
});
```

## 🌐 CORS

### Basic CORS

```javascript
const app = woodland({
  origins: ["https://myapp.com", "https://api.myapp.com"],
  corsExpose: "x-total-count,x-page-count"
});
```

### Advanced CORS

```javascript
// Dynamic CORS
app.always((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    "https://myapp.com",
    "https://admin.myapp.com"
  ];
  
  if (allowedOrigins.includes(origin)) {
    res.header("access-control-allow-origin", origin);
  }
  
  next();
});

// Preflight handling
app.options("*", (req, res) => {
  res.header("access-control-allow-methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("access-control-allow-headers", "content-type,authorization");
  res.header("access-control-max-age", "86400");
  res.send("");
});
```

## ❌ Error Handling

### Built-in Error Handling

```javascript
app.get("/error", (req, res) => {
  res.error(500, "Internal Server Error");
});

app.get("/not-found", (req, res) => {
  res.error(404);
});

app.get("/custom-error", (req, res) => {
  res.error(400, "Bad Request", {
    "content-type": "application/json"
  });
});
```

### Custom Error Handler

```javascript
app.on("error", (req, res, err) => {
  console.error(`Error ${res.statusCode}: ${err}`);
  
  // Log to external service
  if (res.statusCode >= 500) {
    logError(err, req);
  }
});

// Global error catching
app.always((req, res, next) => {
  try {
    next();
  } catch (error) {
    res.error(500, error.message);
  }
});
```

## 📤 Response Helpers

### JSON Responses

```javascript
app.get("/users/:id", (req, res) => {
  const user = {id: req.params.id, name: "John Doe"};
  res.json(user);
});

app.post("/users", (req, res) => {
  const user = createUser(req.body);
  res.json(user, 201);
});
```

### Redirects

```javascript
app.get("/old-path", (req, res) => {
  res.redirect("/new-path");
});

app.get("/temporary", (req, res) => {
  res.redirect("/permanent", false); // Temporary redirect
});
```

### Custom Headers

```javascript
app.get("/api/data", (req, res) => {
  res.header("x-total-count", "100");
  res.header("x-page", "1");
  res.json({data: []});
});

app.get("/download", (req, res) => {
  res.set({
    "content-disposition": "attachment; filename=data.json",
    "content-type": "application/json"
  });
  res.send(JSON.stringify({data: "example"}));
});
```

## 🎯 Event Handlers

### Available Events

```javascript
// Connection established
app.on("connect", (req, res) => {
  console.log(`Connection from ${req.ip}`);
});

// Request finished
app.on("finish", (req, res) => {
  console.log(`Request completed: ${req.method} ${req.url}`);
});

// Error occurred
app.on("error", (req, res, err) => {
  console.error(`Error: ${err}`);
});

// File streaming
app.on("stream", (req, res) => {
  console.log(`Streaming file to ${req.ip}`);
});
```

### Event-Driven Analytics

```javascript
app.on("finish", (req, res) => {
  const metrics = {
    method: req.method,
    url: req.url,
    status: res.statusCode,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
    timestamp: new Date().toISOString()
  };
  
  // Send to analytics service
  analytics.track(metrics);
});
```

## 📊 Logging

### Log Levels

- `error`: Error messages
- `warn`: Warning messages  
- `info`: Informational messages
- `debug`: Debug messages

### Custom Logging

```javascript
const app = woodland({
  logging: {
    enabled: true,
    level: "debug",
    format: "%h %l %u %t \"%r\" %>s %b %D"
  }
});

// Manual logging
app.log("Custom message", "info");
app.log("Debug information", "debug");
```

### Log Format Placeholders

| Placeholder | Description |
|-------------|-------------|
| `%h` | Remote IP address |
| `%l` | Remote logname (always `-`) |
| `%u` | Remote user (always `-`) |
| `%t` | Timestamp |
| `%r` | First line of request |
| `%s` | Status code |
| `%b` | Response size |
| `%{Header}i` | Request header |
| `%{Header}o` | Response header |

## 💻 CLI Usage

### Basic Usage

```bash
# Serve current directory
woodland

# Custom IP and port
woodland --ip=0.0.0.0 --port=3000

# Disable logging
woodland --logging=false

# Serve specific directory
cd /path/to/files && woodland
```

The CLI achieves **100% test coverage** with comprehensive unit tests covering argument parsing, validation, server configuration, error handling scenarios, and actual HTTP request serving verification.

### CLI Options

| Option | Default | Description |
|--------|---------|-------------|
| `--ip` | `127.0.0.1` | Server IP address |
| `--port` | `8000` | Server port |
| `--logging` | `true` | Enable/disable request logging |

### Example Output

```bash
$ woodland --port=3000
id=woodland, hostname=localhost, ip=127.0.0.1, port=3000
127.0.0.1 - [18/Dec/2024:10:30:00 -0500] "GET / HTTP/1.1" 200 1327
127.0.0.1 - [18/Dec/2024:10:30:05 -0500] "GET /favicon.ico HTTP/1.1" 404 9
```

## 📚 API Reference

### Woodland Class

#### Constructor

```javascript
new Woodland(config)
```

#### HTTP Methods

- `get(path, ...middleware)` - GET requests
- `post(path, ...middleware)` - POST requests
- `put(path, ...middleware)` - PUT requests
- `delete(path, ...middleware)` - DELETE requests
- `patch(path, ...middleware)` - PATCH requests
- `options(path, ...middleware)` - OPTIONS requests
- `trace(path, ...middleware)` - TRACE requests
- `connect(path, ...middleware)` - CONNECT requests

#### Utility Methods

- `always(path, ...middleware)` - All HTTP methods
- `use(path, ...middleware, method)` - Generic middleware registration
- `files(root, folder)` - Static file serving
- `ignore(fn)` - Ignore middleware for `Allow` header
- `allowed(method, uri)` - Check if method is allowed
- `allows(uri)` - Get allowed methods string
- `list(method, type)` - List registered routes
- `log(message, level)` - Log a message

#### Lifecycle Hooks

- `onReady(req, res, body, status, headers)` - Before sending response
- `onSend(req, res, body, status, headers)` - Customize response
- `onDone(req, res, body, headers)` - Finalize response

### Request Object Extensions

- `req.allow` - Allowed methods for current path
- `req.body` - Request body (populate with middleware)
- `req.cors` - Boolean indicating CORS request
- `req.host` - Request hostname
- `req.ip` - Client IP address
- `req.params` - Route parameters
- `req.parsed` - Parsed URL object
- `req.valid` - Request validation status
- `req.exit()` - Exit middleware chain

### Response Object Extensions

- `res.locals` - Local variables object
- `res.error(status, body, headers)` - Send error response
- `res.header(key, value)` - Set response header
- `res.json(body, status, headers)` - Send JSON response
- `res.redirect(url, permanent)` - Send redirect response
- `res.send(body, status, headers)` - Send response
- `res.set(headers)` - Set multiple headers
- `res.status(code)` - Set status code

## ⚡ Performance

### 🏆 Framework Performance Showdown

**Revolutionary Discovery**: Woodland not only outperforms raw Node.js and Express.js—it even edges out Fastify, the fastest alternative framework.

```
Framework Comparison (JSON Response)
Woodland framework:       14,284 ops/sec  (0.070ms avg)  🥇 FASTEST
Fastify framework:        14,063 ops/sec  (0.071ms avg)  🥈 Very close second  
Raw Node.js HTTP module:  11,048 ops/sec  (0.091ms avg)  🥉 Third place
Express.js framework:      8,758 ops/sec  (0.114ms avg)

Performance improvement: +29% faster than raw Node.js, +63% faster than Express.js, +1.6% faster than Fastify
```

**Why Woodland outperforms all alternatives:**
- **vs Raw Node.js**: Optimized request/response pipeline that eliminates common inefficiencies
- **vs Express.js**: Lightweight middleware system without Express's overhead and legacy bloat  
- **vs Fastify**: Performance-first architecture with even more efficient JSON handling and routing
- Built-in JSON response optimization with smart serialization
- Efficient header management and intelligent caching strategies
- Performance-first architecture designed from the ground up for speed

### Benchmark Results

*Node.js 23.10.0 on Apple M4 Pro Mac Mini (1000 iterations, 100 warmup)*

```
Routing Operations
Route caching:      6,829,855 ops/sec  (0.0001ms avg)
Allowed methods:    3,983,365 ops/sec  (0.0003ms avg)
Path conversion:    3,711,112 ops/sec  (0.0003ms avg)
Parameter routes:   3,486,848 ops/sec  (0.0003ms avg)
Not found routes:   3,421,400 ops/sec  (0.0003ms avg)
Static routes:      2,969,527 ops/sec  (0.0003ms avg)
Route matching:     1,593,638 ops/sec  (0.0006ms avg)

Utility Operations
Number padding:     6,846,970 ops/sec  (0.0001ms avg)
MIME detection:     5,112,082 ops/sec  (0.0002ms avg)
Middleware chain:   3,944,882 ops/sec  (0.0003ms avg)
Timezone offset:    3,328,729 ops/sec  (0.0003ms avg)
Status determination: 3,235,754 ops/sec  (0.0003ms avg)
Content pipeability: 3,208,841 ops/sec  (0.0003ms avg)
URL parsing:        2,997,988 ops/sec  (0.0003ms avg)
Time formatting:    1,466,534 ops/sec  (0.0007ms avg)
Parameter extraction: 673,721 ops/sec  (0.0015ms avg)
Directory listing:  362,685 ops/sec    (0.0028ms avg)

File Serving Operations
Static file serving: 594,692 ops/sec   (0.0017ms avg)
Stream with ETags:  370,153 ops/sec    (0.0027ms avg)
ETag generation:    366,024 ops/sec    (0.0027ms avg)
Stream operations:  309,458 ops/sec    (0.0032ms avg)
HEAD requests:      65,888 ops/sec     (0.015ms avg)
Small files:        44,494 ops/sec     (0.022ms avg)
Large files:        42,534 ops/sec     (0.024ms avg)
Medium files:       37,551 ops/sec     (0.027ms avg)
Directory listing:  19,542 ops/sec     (0.051ms avg)
Directory autoindex: 18,165 ops/sec    (0.055ms avg)

HTTP Operations
Server startup:     116,140 ops/sec    (0.009ms avg)
DELETE requests:    16,039 ops/sec     (0.062ms avg)
Complex middleware: 14,638 ops/sec     (0.068ms avg)
404 handling:       14,583 ops/sec     (0.069ms avg)
Parameterized routes: 13,979 ops/sec   (0.072ms avg)
JSON response:      13,179 ops/sec     (0.076ms avg)
Error handling:     12,926 ops/sec     (0.077ms avg)
PUT requests:       12,875 ops/sec     (0.078ms avg)
Middleware chain:   11,435 ops/sec     (0.087ms avg)
Mixed workload:     10,974 ops/sec     (0.091ms avg)
POST requests:      10,528 ops/sec     (0.095ms avg)
Simple GET:         9,558 ops/sec      (0.105ms avg)
Large response:     913 ops/sec        (1.095ms avg)
```

### Performance Tips

1. **Choose Woodland over alternatives**: Woodland provides 28% better performance than raw Node.js and 53% better than Express.js for JSON responses
2. **Enable Route Caching**: Route caching provides 4x+ performance improvement (6.8M vs 1.6M ops/sec)
3. **Optimize Route Order**: Place frequently accessed routes first in your application
4. **Use Parameter Routes**: Parameter routes slightly outperform static routes (~3.5M vs ~3.0M ops/sec)
5. **Enable ETags**: Reduces bandwidth for unchanged resources (370K ops/sec with ETags)
6. **Stream Large Files**: Use built-in streaming for files (309K ops/sec streaming performance)
7. **Minimize Middleware**: Only use necessary middleware - complex middleware reduces performance
8. **Leverage Built-in Utilities**: Use woodland's optimized utility functions (6.8M+ ops/sec for common operations)
9. **Configure Appropriate Caching**: Set proper cache headers and TTL values
10. **Use Proper HTTP Methods**: DELETE requests show best performance (16.0K ops/sec) for CRUD operations

### Running Benchmarks

```bash
git clone https://github.com/avoidwork/woodland.git
cd woodland
npm install

# Run all benchmarks
npm run benchmark

# Run specific benchmark suites
node benchmark.js routing utility serving
node benchmark.js http middleware comparison

# Run with custom settings
node benchmark.js --iterations 2000 --warmup 200

# Run specific suite with custom settings
node benchmark.js utility -i 500 -w 50
```

**Available benchmark suites:**
- `comparison` - Framework vs raw Node.js HTTP module performance
- `http` - End-to-end HTTP server performance
- `middleware` - Middleware registration and execution
- `routing` - Route matching and resolution
- `serving` - File serving and streaming
- `utility` - Core utility functions

## 🧪 Testing

### Test Coverage

Woodland maintains **100%** coverage across all metrics with comprehensive testing across all features. The framework achieves perfect coverage with rigorous testing of all code paths including successful server startup, security validation, and comprehensive edge case testing.

```bash
npm test
```

### Test Results

```
460 passing (6s)
1 pending

--------------|---------|----------|---------|---------|-------------------
File          | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
--------------|---------|----------|---------|---------|-------------------
All files     |     100 |      100 |     100 |     100 |                   
 cli.js       |     100 |      100 |     100 |     100 |                   
 constants.js |     100 |      100 |     100 |     100 |                   
 utility.js   |     100 |      100 |     100 |     100 |                   
 woodland.js  |     100 |      100 |     100 |     100 |                   
--------------|---------|----------|---------|---------|-------------------
```

### Test Categories

- **CLI Tests (100% coverage)** - Argument parsing, port/IP validation, server startup with HTTP verification, error handling, logging configuration, edge cases
- **Security Integration Tests** - Path traversal protection, IP security, CORS enforcement, autoindex security, security headers
- **Constants Tests** - HTTP methods, status codes, headers, content types, server info, export validation
- **Security Utility Functions** - Canonical path validation, HTML escaping, IPv4/IPv6 validation, header sanitization
- **Utility Functions** - Autoindex generation, status resolution, MIME detection, parameter parsing, URL processing, timing utilities
- **Woodland Core Tests** - Constructor configuration, HTTP method handlers, middleware registration, routing, CORS handling
- **Stream Method Tests** - File headers, different file types, range requests, ETags, binary files
- **Range Request Tests** - String content, invalid ranges, streams, partial content delivery
- **Cache Functionality** - Route caching, allows caching, cache eviction, permissions caching
- **Serve Method Tests** - Text files, HTML files, binary files, 404 handling, directory redirection, index files, autoindex, nested paths, large files
- **Middleware Tests** - Execution order, error propagation, parameterized routes, exit functionality, wildcard middleware
- **Response Helper Tests** - JSON responses, redirects, header manipulation, status codes, error handling

### Writing Tests

```javascript
import {woodland} from "woodland";
import assert from "node:assert";

describe("My API", () => {
  let app;
  
  beforeEach(() => {
    app = woodland();
  });
  
  it("should respond to GET /", async () => {
    app.get("/", (req, res) => res.send("Hello"));
    
    const req = {method: "GET", url: "/", headers: {}};
    const res = {
      statusCode: 200,
      headers: {},
      setHeader: (k, v) => res.headers[k] = v,
      end: (body) => res.body = body
    };
    
    app.route(req, res);
    assert.equal(res.body, "Hello");
  });
});
```

## 📘 TypeScript

### Type Definitions

```typescript
import {Woodland, woodland} from "woodland";
import {IncomingMessage, ServerResponse} from "node:http";

// Using factory function
const app = woodland({
  defaultHeaders: {"content-type": "application/json"}
});

// Using class
class MyAPI extends Woodland {
  constructor() {
    super({time: true});
  }
}

// Custom middleware with types
interface CustomRequest extends IncomingMessage {
  user?: {id: string, name: string};
}

const authenticate = (
  req: CustomRequest,
  res: ServerResponse,
  next: () => void
): void => {
  req.user = {id: "123", name: "John"};
  next();
};
```

### Configuration Types

```typescript
interface WoodlandConfig {
  autoindex?: boolean;
  cacheSize?: number;
  cacheTTL?: number;
  charset?: string;
  corsExpose?: string;
  defaultHeaders?: Record<string, string>;
  digit?: number;
  etags?: boolean;
  indexes?: string[];
  logging?: {
    enabled?: boolean;
    format?: string;
    level?: string;
  };
  origins?: string[];
  silent?: boolean;
  time?: boolean;
}
```

## 🔍 Examples

### REST API

```javascript
import {createServer} from "node:http";
import {woodland} from "woodland";

const app = woodland({
  defaultHeaders: {"content-type": "application/json"},
  time: true
});

const users = new Map();

// Middleware
app.always(async (req, res, next) => {
  if (req.method === "POST" || req.method === "PUT") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try {
        req.body = JSON.parse(body);
      } catch (e) {
        return res.error(400, "Invalid JSON");
      }
      next();
    });
  } else {
    next();
  }
});

// Routes
app.get("/users", (req, res) => {
  res.json(Array.from(users.values()));
});

app.get("/users/:id", (req, res) => {
  const user = users.get(req.params.id);
  if (!user) {
    return res.error(404, "User not found");
  }
  res.json(user);
});

app.post("/users", (req, res) => {
  const {name, email} = req.body;
  if (!name || !email) {
    return res.error(400, "Name and email required");
  }
  
  const id = Date.now().toString();
  const user = {id, name, email};
  users.set(id, user);
  res.json(user, 201);
});

app.put("/users/:id", (req, res) => {
  const user = users.get(req.params.id);
  if (!user) {
    return res.error(404, "User not found");
  }
  
  Object.assign(user, req.body);
  res.json(user);
});

app.delete("/users/:id", (req, res) => {
  if (!users.has(req.params.id)) {
    return res.error(404, "User not found");
  }
  
  users.delete(req.params.id);
  res.status(204).send("");
});

createServer(app.route).listen(3000);
```

### File Upload API

```javascript
import {createServer} from "node:http";
import {woodland} from "woodland";
import {createWriteStream} from "node:fs";
import {pipeline} from "node:stream/promises";

const app = woodland();

app.post("/upload", async (req, res) => {
  try {
    const filename = req.headers["x-filename"] || "upload.bin";
    const writeStream = createWriteStream(`./uploads/${filename}`);
    
    await pipeline(req, writeStream);
    res.json({message: "Upload successful", filename});
  } catch (error) {
    res.error(500, "Upload failed");
  }
});

createServer(app.route).listen(3000);
```

### WebSocket Integration

```javascript
import {createServer} from "node:http";
import {WebSocketServer} from "ws";
import {woodland} from "woodland";

const app = woodland();
const server = createServer(app.route);
const wss = new WebSocketServer({server});

app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head><title>WebSocket Test</title></head>
      <body>
        <script>
          const ws = new WebSocket('ws://localhost:3000');
          ws.onmessage = e => console.log('Received:', e.data);
          ws.onopen = () => ws.send('Hello Server!');
        </script>
      </body>
    </html>
  `);
});

wss.on("connection", (ws) => {
  ws.send("Welcome to WebSocket server!");
  ws.on("message", (data) => {
    console.log("Received:", data.toString());
  });
});

server.listen(3000);
```

## 🔧 Troubleshooting

### Common Issues

#### CORS Errors

```javascript
// Problem: CORS blocked requests
// Solution: Configure origins properly
const app = woodland({
  origins: ["https://myapp.com", "http://localhost:3000"]
});
```

#### Route Not Found

```javascript
// Problem: Routes not matching
// Solution: Check route patterns
app.get("/users/:id", handler);        // ✅ Correct
app.get("/users/:id/", handler);       // ❌ Trailing slash
app.get("/users/([0-9]+)", handler);   // ✅ RegExp pattern
```

#### Middleware Order

```javascript
// Problem: Middleware not executing
// Solution: Register middleware before routes
app.always(bodyParser);  // ✅ Before routes
app.post("/users", createUser);

// Not this:
app.post("/users", createUser);
app.always(bodyParser);  // ❌ After routes
```

#### Memory Issues

```javascript
// Problem: High memory usage
// Solution: Tune cache settings
const app = woodland({
  cacheSize: 100,    // Reduce cache size
  cacheTTL: 60000   // Shorter TTL
});
```

### Debug Mode

```javascript
const app = woodland({
  logging: {
    enabled: true,
    level: "debug"
  }
});

// Enable debug logs
app.log("Debug message", "debug");
```

### Performance Issues

1. **Check middleware overhead**: Profile middleware execution
2. **Optimize route patterns**: Use specific patterns vs wildcards
3. **Enable caching**: Use ETags and cache headers
4. **Monitor memory**: Watch for memory leaks in long-running apps

## 📄 License

Copyright (c) 2025 Jason Mulligan

Licensed under the **BSD-3-Clause** license.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/avoidwork/woodland/issues)
- **Documentation**: [GitHub Wiki](https://github.com/avoidwork/woodland/wiki)
- **Discussions**: [GitHub Discussions](https://github.com/avoidwork/woodland/discussions)

---

<div align="center">
  <sub>Built with ❤️ by <a href="https://github.com/avoidwork">Jason Mulligan</a></sub>
</div>
