<div align="center">
  <h1>Woodland</h1>
  <img src="https://avoidwork.github.io/woodland/logo.svg" width="150" alt="Woodland Logo" />
</div>

*High-performance HTTP framework for Node.js*

[![npm version](https://badge.fury.io/js/woodland.svg)](https://badge.fury.io/js/woodland)
[![Node.js Version](https://img.shields.io/node/v/woodland.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause)
[![Build Status](https://github.com/avoidwork/woodland/actions/workflows/ci.yml/badge.svg)](https://github.com/avoidwork/woodland/actions)
[![Test Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen.svg)](https://github.com/avoidwork/woodland)

---

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Routing](#routing)
- [Middleware](#middleware)
- [Static Files](#static-files)
- [CORS](#cors)
- [Error Handling](#error-handling)
- [Response Helpers](#response-helpers)
- [Event Handlers](#event-handlers)
- [Logging](#logging)
- [CLI Usage](#cli-usage)
- [API Reference](#api-reference)
- [Performance](#performance)
- [Testing](#testing)
- [TypeScript](#typescript)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [Support](#support)

## ⚡ Performance Leader

Outperforms raw Node.js by 15%, Express.js by 3%, and delivers 87% of Fastify's performance.

## 🚀 Features

- **⚡ Zero Overhead** - Framework features with performance gains, not costs
- **🔒 Security First** - Built-in CORS, ETags, and comprehensive security headers
- **🛤️ Smart Routing** - Parameter syntax (`/users/:id`) and RegExp support with caching
- **🔧 Express Compatible** - Familiar middleware with `req, res, next` pattern
- **📁 File Serving** - High-performance static file server with streaming
- **📘 TypeScript Ready** - Full TypeScript definitions included
- **📊 Production Logging** - Common Log Format with customizable levels
- **🚀 Modern Architecture** - ES6+ modules optimized for Node.js 17+

## 🔒 Security & OWASP Compliance

Woodland follows a **security-first design philosophy** with strong adherence to OWASP guidelines:

- **✅ Injection Prevention**: Comprehensive input validation, HTML escaping, and path traversal protection
- **✅ Secure Defaults**: CORS disabled by default, autoindex disabled, secure error handling
- **✅ Access Control**: Strict file access controls and allowlist-based CORS validation
- **✅ XSS Protection**: All user input properly escaped, security headers included
- **🛡️ Security Headers**: `X-Content-Type-Options: nosniff` set automatically, [`helmet`](https://helmetjs.github.io/) recommended for comprehensive headers
- **⚡ Rate Limiting**: Built for middleware compatibility - use [`express-rate-limit`](https://github.com/express-rate-limit/express-rate-limit) or similar
- **🔍 Comprehensive Testing**: 100+ dedicated security tests covering attack vectors and edge cases

**OWASP Top 10 Coverage**: Excellent protection against injection attacks, broken access control, security misconfigurations, and cross-site scripting. See [Technical Documentation](https://github.com/avoidwork/woodland/blob/master/docs/TECHNICAL_DOCUMENTATION.md#owasp-security-assessment) for complete assessment.

**💡 Quick Security Setup**: Add essential security middleware for production deployment:
```javascript
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Security headers
app.always(helmet());

// Rate limiting
app.always(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
}));
```

#/🚜## 🚀 Quick Start

See the [Quick Start](#quick-start) section below for complete examples.

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

### Logging Configuration

The `logging` option is an object with three sub-properties:

```javascript
const app = woodland({
  logging: {
    enabled: true,      // Disable logging when false (default: true)
    level: 'info',      // Minimum log level (emerg, alert, crit, error, warn, notice, info, debug)
    format: '%h %l %u %t "%r" %>s %b'  // Log format string (Common Log Format by default)
  }
});
```

**Log Format Tokens:**

| Token            | Description                         |
|------------------|-------------------------------------|
| `%h`             | Remote IP address                   |
| `%l`             | Remote log name (always `-`)        |
| `%u`             | Authenticated user name             |
| `%t`             | Request timestamp                   |
| `%r`             | Request line (METHOD PATH HTTP/1.1) |
| `%s`             | Final status code                   |
| `%b`             | Bytes sent                          |
| `%{Referer}i`    | Referer header                      |
| `%{User-agent}i` | User-Agent header                   |
| `%v`             | Server virtual host                 |

### Default Configuration

```javascript
const app = woodland({
  autoindex: false,        // Enable directory browsing
  cacheSize: 1000,        // Internal cache size
  cacheTTL: 10000,        // Cache TTL (10 seconds)
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
  origins: [],           // CORS origins (empty array denies all cross-origin requests)
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

// ❌ WRONG: Do NOT register error middleware with 'always'
// This will execute BEFORE route handlers, not after errors occur
app.always((error, req, res, next) => {
  if (error) {
    console.error(error);
    res.error(500);
  } else {
    next();
  }
});

// ✅ CORRECT: Register error middleware with specific routes LAST
app.get("/api/users", 
  authenticate,        // Normal middleware
  authorize,          // Normal middleware
  getUserHandler,     // Route handler
  (error, req, res, next) => {  // Error middleware - LAST
    if (error) {
      console.error(error);
      res.error(500);
    } else {
      next();
    }
  }
);

// ✅ CORRECT: Global error handling should be done with route patterns
app.use("/(.*)", (error, req, res, next) => {
  if (error) {
    console.error(`Global error for ${req.url}:`, error);
    res.error(500, "Internal Server Error");
  } else {
    next();
  }
});
```

**Important Notes:**
- **Error middleware** (functions with 4 parameters: `error, req, res, next`) should **never** be registered with `app.always()`
- Error middleware registered with `always` will execute **before** route handlers, making them ineffective for catching route errors
- **`.use()` without a method defaults to GET** - it behaves like `.get()`, not like `.always()`
- Always register error middleware **last** in the middleware chain for each route
- For global error handling, use `app.use("/(.*)", errorHandler)` as the **last route registration**

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
  const filepath = path.join("./downloads", filename);
  
  // Custom file serving logic
  app.serve(req, res, filename, "./downloads");
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

## 🌐 CORS

**Woodland handles CORS automatically when you configure origins.** Here's what you get for free:

```javascript
const app = woodland({
  origins: ["https://myapp.com", "https://api.myapp.com"],
  corsExpose: "x-total-count,x-page-count"
});

// Woodland automatically provides:
// ✅ Preflight OPTIONS route for all paths
// ✅ Access-Control-Allow-Origin header (set to request origin if allowed)
// ✅ Access-Control-Allow-Credentials: true
// ✅ Access-Control-Allow-Methods (based on registered routes)
// ✅ Access-Control-Allow-Headers (for OPTIONS requests)
// ✅ Access-Control-Expose-Headers (for non-OPTIONS requests)
// ✅ Timing-Allow-Origin header
// ✅ Origin validation and security
```

### What Woodland Does Automatically

1. **Preflight Route Registration**: When origins are configured, Woodland automatically registers an OPTIONS handler that responds with 204 No Content
2. **CORS Headers**: For valid cross-origin requests, automatically sets all required CORS headers
3. **Origin Validation**: Checks request origin against configured allowed origins
4. **Method Detection**: Access-Control-Allow-Methods reflects actual registered routes
5. **Security**: Empty origins array denies all CORS requests by default

### Manual CORS Control (When Needed)

```javascript
// Conditional CORS (disable automatic CORS, use manual)
const app = woodland({
  origins: [] // Empty = no automatic CORS
});

// Dynamic origin validation (replaces automatic validation)
app.always((req, res, next) => {
  const origin = req.headers.origin;
  
  // Custom logic for origin validation
  if (isValidOriginForUser(origin, req.user)) {
    res.header("access-control-allow-origin", origin);
  }
  
  next();
});

app.always((req, res, next) => {
  if (shouldAllowCORS(req)) {
    res.header("access-control-allow-origin", req.headers.origin);
    res.header("access-control-allow-credentials", "true");
  }
  next();
});

// Override automatic behavior for specific routes
app.options("/api/special", (req, res) => {
  res.header("access-control-allow-methods", "GET,POST"); // Restrict methods
  res.header("access-control-allow-headers", "content-type"); // Restrict headers
  res.header("access-control-max-age", "86400"); // Set cache duration
  res.send("");
});
```

**Most applications only need to configure `origins` and `corsExpose` - manual CORS handling is rarely necessary.**

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

| Placeholder      | Description                         |
|------------------|-------------------------------------|
| `%h`             | Remote IP address                   |
| `%l`             | Remote log name (always `-`)        |
| `%u`             | Authenticated user name (or `-`)    |
| `%t`             | Request timestamp                   |
| `%r`             | Request line (METHOD PATH HTTP/1.1) |
| `%s`             | Final status code                   |
| `%b`             | Bytes sent                          |
| `%{Referer}i`    | Referer header                      |
| `%{User-agent}i` | User-Agent header                   |

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

| Option      | Default     | Description                    |
|-------------|-------------|--------------------------------|
| `--ip`      | `127.0.0.1` | Server IP address              |
| `--port`    | `8000`      | Server port                    |
| `--logging` | `true`      | Enable/disable request logging |

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

- `always(path, ...middleware)` - All HTTP methods - executes before request HTTP method middleware
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

- `req.allow` - Comma-separated allowed HTTP methods for current URI
- `req.body` - Request body storage (starts as empty string)
- `req.cors` - Boolean indicating if CORS should be applied
- `req.corsHost` - Boolean indicating if origin header differs from host header (cross-origin detection)
- `req.host` - Request hostname from parsed URL
- `req.ip` - Client IP address (extracted from X-Forwarded-For or socket.remoteAddress)
- `req.params` - Route parameter values (object with extracted parameters)
- `req.parsed` - Parsed URL object (hostname, pathname, search, etc.)
- `req.valid` - Request validation status (false if CORS rejected or invalid method)
- `req.precise` - Timing object (if time option enabled)
- `req.range` - Range request options (start, end) for partial content
- `req.exit()` - Exit middleware chain immediately, skip remaining middleware

### Response Object Extensions

- `res.locals` - Object for per-request middleware data storage
- `res.error(status, body)` - Send error response (handles multiple calls safely)
- `res.header(key, value)` - Alias for setHeader (stored during decoration)
- `res.json(body, status, headers)` - Send JSON response with proper content-type
- `res.redirect(url, permanent)` - Send redirect (permanent by default with 308)
- `res.send(body, status, headers)` - Unified response sender (handles strings, streams, buffering)
- `res.set(headers)` - Batch header setter (supports objects, Maps, Headers) - faster than individual header calls
- `res.status(code)` - Set status code (chainable, returns res)

## ⚡ Performance

### Framework Performance Comparison

Woodland delivers excellent performance that outperforms both raw Node.js and Express.js, while achieving 87% of Fastify's performance.

| Platform | Ops/sec | Avg (ms) | Notes |
|---|-----------|----------|-------------|
| Fastify | 14,283 | 0.070 | Fastest |
| Woodland | 12,478 | 0.080 | Strong second |
| Express.js | 12,112 | 0.083 | Third place |
| Raw Node.js | 10,888 | 0.092 | Baseline |

**Why Woodland delivers competitive performance:**
- **vs Raw Node.js**: Optimized request/response pipeline that eliminates common inefficiencies (+15% faster)
- **vs Express.js**: Lightweight middleware system that outperforms while maintaining developer experience (+3% faster)
- **vs Fastify**: Balanced approach that trades some raw speed for enhanced usability
- Built-in JSON response optimization with smart serialization
- Efficient header management and intelligent caching strategies
- Developer-friendly architecture that doesn't sacrifice performance for convenience

### Benchmark Results

**Node.js 24.8.0** (1000 iterations, 100 warmup, 5 runs averaged)

| Operation            | Ops/sec | Avg (ms) |
|----------------------|---------|----------|
| 404 handling         | 16,570  | 0.060    |
| Parameterized routes | 14,971  | 0.067    |
| Error handling       | 14,859  | 0.067    |
| JSON response        | 14,422  | 0.069    |
| Simple GET           | 13,497  | 0.074    |
| Middleware chain     | 12,108  | 0.083    |
| Large response       | 814     | 1.228    |

### Performance Tips

1. **Choose Woodland over alternatives**: Woodland provides 15% better performance than raw Node.js and 3% better than Express.js for JSON responses
2. **Enable Route Caching**: Route caching provides significant performance improvement - allows() with cache: 4.8M ops/sec vs without: 300K ops/sec
3. **Optimize Route Order**: Place frequently accessed routes first in your application
4. **Use Parameter Routes**: Parameter routes perform competitively with static routes (~2.4M vs ~2.5M ops/sec)
5. **Enable ETags**: Reduces bandwidth for unchanged resources (333K ops/sec with ETags)
6. **Stream Large Files**: Use built-in streaming for files (330K ops/sec streaming performance)
7. **Minimize Middleware**: Only use necessary middleware - complex middleware reduces performance
8. **Leverage Built-in Utilities**: Use woodland's optimized utility functions (7.7M+ ops/sec for common operations)
9. **Configure Appropriate Caching**: Set proper cache headers and TTL values
10. **Use Proper HTTP Methods**: DELETE requests show best performance (15.7K ops/sec) for CRUD operations

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

Woodland maintains **100%** test coverage with comprehensive tests covering CLI, security, routing, middleware, file serving, caching, response helpers, and error handling.

```bash
npm test
```

### Test Results

**370 passing tests (4s average)**

| File      | Statements | Branches | Functions | Lines |
|-----------|------------|----------|-----------|-------|
| CLI       | 100%       | 100%     | 100%      | 100%  |
| Constants | 100%       | 100%     | 100%      | 100%  |
| Utility   | 100%       | 100%     | 100%      | 100%  |
| Woodland  | 100%       | 100%     | 100%      | 100%  |

### Test Categories

- **CLI Tests (100% coverage)** - Argument parsing, port/IP validation, server startup with HTTP verification, error handling, logging configuration, edge cases
- **Security Integration Tests** - Path traversal protection, IP security, CORS enforcement, autoindex security, security headers
- **Constants Tests** - HTTP methods, status codes, headers, content types, server info, export validation
- **Security Utility Functions** - File path validation, sanitization, HTML escaping, IPv4/IPv6 validation
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
// The 'routes' method builds middleware execution order as follows:
// 1. Always middleware (WILDCARD) - added first to the middleware array
// 2. Route-specific middleware - added after all always middleware

// ✅ Understanding the routes method behavior:
app.always(corsHandler);        // Added to WILDCARD middleware map
app.always(requestLogger);      // Added to WILDCARD middleware map  
app.post("/users", authenticate, createUser);  // Added to POST middleware map

// When routes("/users", "POST") is called, the middleware array becomes:
// [corsHandler, requestLogger, authenticate, createUser]
// with exit point set between requestLogger and authenticate

// ✅ Always middleware executes first regardless of registration order:
app.post("/api/users", validate, createUser);  // Route registered first
app.always(securityHeaders);   // Always middleware registered after
app.always(bodyParser);        // Another always middleware

// Execution order for POST /api/users:
// 1. securityHeaders (always middleware) 
// 2. bodyParser (always middleware)
// 3. validate (route middleware)
// 4. createUser (route handler)

// ❌ Common misconception - registration order between always/route doesn't matter:
// The routes method ALWAYS puts always middleware first in the execution chain
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

Copyright (c) 2026 Jason Mulligan

Licensed under the **BSD-3-Clause** license.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/avoidwork/woodland/issues)
- **Discussions**: [GitHub Discussions](https://github.com/avoidwork/woodland/discussions)

---

<div align="center">
  <sub>Built with ❤️ by <a href="https://github.com/avoidwork">Jason Mulligan</a></sub>
</div>
