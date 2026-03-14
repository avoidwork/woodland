<div align="center">
  <img src="https://avoidwork.github.io/woodland/logo.svg" width="150" alt="Woodland Logo" />
  
  # Woodland
  
  *The high-performance HTTP framework that's faster than hand-coded Node.js*
  
  [![npm version](https://badge.fury.io/js/woodland.svg)](https://badge.fury.io/js/woodland)
  [![Node.js Version](https://img.shields.io/node/v/woodland.svg)](https://nodejs.org/)
  [![License](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause)
  [![Build Status](https://github.com/avoidwork/woodland/actions/workflows/ci.yml/badge.svg)](https://github.com/avoidwork/woodland/actions)
  [![Test Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen.svg)](https://github.com/avoidwork/woodland)
  
</div>

## 🚀 Quick Start

Get a server running in **30 seconds**:

```javascript
import {createServer} from "node:http";
import {woodland} from "woodland";

const app = woodland();

app.get("/", (req, res) => res.send("Hello World!"));
app.get("/users/:id", (req, res) => res.json({id: req.params.id}));

createServer(app.route).listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
```

That's it! You get routing, JSON responses, parameters, and more - **out of the box**.

## 🏆 Why Woodland?

Most HTTP frameworks slow you down. Woodland speeds you up.

| Feature | Woodland | Express.js | Raw Node.js |
|---------|----------|------------|------------|
| **Performance** | 12,478 ops/sec | 12,112 ops/sec | 10,888 ops/sec |
| **Learning Curve** | Express-compatible | Gentle | Steep |
| **Built-in Features** | CORS, ETags, Logging | Limited | None |
| **TypeScript** | ✅ First-class | ✅ | ❌ |

### Benefits for Developers

✅ **15% faster than raw Node.js** - Optimized pipeline, not overhead  
✅ **Express-compatible** - Zero learning curve, drop-in middleware  
✅ **Zero config** - Works out of the box, tune when you need to  
✅ **Production-ready** - 100% test coverage, battle-tested security  
✅ **TypeScript first** - Full type definitions included

### What You Get

🔥 **Smart Routing**: Parameter routes (`:id`), RegExp patterns, wildcards  
🛡️ **Security Built-in**: CORS, ETags, secure defaults, injection protection  
📦 **Static Files**: High-performance serving with streaming  
🔧 **Middleware**: Express-compatible `req, res, next` pattern  
📊 **Production Logging**: Common Log Format, customizable levels  
🚀 **Modern JS**: ES6+ modules for Node.js 17+

## 🔒 Security & OWASP Compliance

Security isn't optional. Woodland provides it out of the box.

**Automatic Protection:**
- ✅ **Injection Prevention**: Input validation, HTML escaping, path traversal protection  
- ✅ **Secure Defaults**: CORS disabled by default, safe error handling  
- ✅ **XSS Protection**: All user input escaped, security headers included  
- ✅ **Access Control**: Strict file access, allowlist-based CORS validation  

**Production Setup** (add these once):
```javascript
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

app.always(helmet()); // Security headers
app.always(rateLimit({windowMs: 15 * 60 * 1000, max: 100})); // Rate limiting
```

For complete OWASP Top 10 coverage and security architecture, see the [Technical Documentation](https://github.com/avoidwork/woodland/blob/master/docs/TECHNICAL_DOCUMENTATION.md#owasp-security-assessment).

## 💡 Common Patterns

### REST API with Body Parsing
```javascript
const app = woodland({defaultHeaders: {"content-type": "application/json"}});

// Body parser middleware
app.always(async (req, res, next) => {
  if (req.method === "POST" || req.method === "PUT") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      req.body = JSON.parse(body || "{}");
      next();
    });
  } else {
    next();
  }
});

// CRUD routes
const users = new Map();

app.get("/users", (req, res) => res.json(Array.from(users.values())));
app.get("/users/:id", (req, res) => {
  const user = users.get(req.params.id);
  user ? res.json(user) : res.error(404);
});
app.post("/users", (req, res) => {
  const id = Date.now().toString();
  const user = {...req.body, id};
  users.set(id, user);
  res.json(user, 201);
});
```

### CORS Setup for Frontend
```javascript
// Allow specific origins
const app = woodland({
  origins: ["https://myapp.com", "http://localhost:3000"],
  corsExpose: "x-total-count,x-page-count" // Expose custom headers
});

// Woodland automatically handles:
// - Preflight OPTIONS requests  
// - Access-Control-Allow-Origin headers
// - Access-Control-Allow-Methods based on your routes
// - Origin validation and security
```

### Static File Server
```javascript
// Directory listing + file serving
const app = woodland({autoindex: true});

app.files("/", "./public"); // Serve /public folder at /
```

### Error Handling
```javascript
const app = woodland();

// Global error handler (register last)
app.use("/(.*)", (error, req, res, next) => {
  console.error(error);
  res.error(500, "Internal Server Error");
});

app.get("/users/:id", (req, res, next) => {
  const user = findUser(req.params.id);
  if (!user) {
    return res.error(404, "User not found");
  }
  res.json(user);
});
```

### Using the Class (for larger apps)
```javascript
import {Woodland} from "woodland";

class API extends Woodland {
  constructor() {
    super({
      defaultHeaders: {"x-api-version": "1.0.0"},
      origins: ["https://myapp.com"]
    });
    
    this.setupRoutes();
  }
  
  setupRoutes() {
    this.get("/health", this.healthCheck);
    this.get("/users", this.getUsers);
    this.post("/users", this.createUser);
  }
  
  healthCheck(req, res) {
    res.json({status: "ok", timestamp: new Date().toISOString()});
  }
  
  getUsers(req, res) { /* ... */ }
  createUser(req, res) { /* ... */ }
}

const api = new API();
```

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

## 📖 Documentation

- **[Quick Start](#-quick-start)** - Get running in 30 seconds
- **[Common Patterns](#-common-patterns)** - Real-world examples
- **[Configuration](#-configuration)** - Options and customization
- **[Routing](#-routing)** - Routes, parameters, and patterns
- **[Middleware](#-middleware)** - Global and route-specific middleware
- **[CORS](#-cors)** - Cross-origin resource sharing
- **[Static Files](#-static-files)** - File serving and directory listing
- **[Error Handling](#-error-handling)** - Error responses and global handlers
- **[CLI](#-cli-usage)** - Command-line server
- **[API Reference](#-api-reference)** - Complete method documentation
- **[Performance](#-performance)** - Benchmarks and optimization
- **[TypeScript](#-typescript)** - Type definitions and usage
- **[Examples](#-examples)** - Complete working examples
- **[Troubleshooting](#-troubleshooting)** - Common issues and solutions
- **[Technical Documentation](https://github.com/avoidwork/woodland/wiki/technical-documentation)** - Deep dive into architecture

## ⚙️ Configuration

**Most apps need zero config**, but you can customize everything:

### Minimal Setup
```javascript
const app = woodland(); // Defaults that work
```

### Production Setup
```javascript
const app = woodland({
  origins: ["https://myapp.com"],       // CORS allowlist
  defaultHeaders: {                     // Security headers
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY"
  },
  logging: {                            // Production logging
    enabled: true,
    level: "info",
    format: "%h %t \"%r\" %>s %b"
  },
  cacheSize: 5000,                      // Performance tuning
  cacheTTL: 600000,
  time: true                            // Response timing
});
```

### All Options
```javascript
const app = woodland({
  autoindex: false,           // Directory browsing (false = safe)
  cacheSize: 1000,            // Route cache size
  cacheTTL: 10000,            // Cache TTL in ms
  charset: "utf-8",           // Default charset
  corsExpose: "",             // Exposed CORS headers
  defaultHeaders: {},         // Default response headers
  digit: 3,                   // Timing precision
  etags: true,                // Enable ETags
  indexes: ["index.html"],    // Index files
  logging: {
    enabled: true,
    format: "%h %l %u %t \"%r\" %>s %b",
    level: "info"
  },
  origins: [],                // CORS origins (empty = deny all)
  silent: false,              // Disable default headers
  time: false                 // X-Response-Time header
});
```

## 🛤️ Routing

### Basic Routes
```javascript
app.get("/users", getAllUsers);
app.post("/users", createUser);
app.put("/users/:id", updateUser);       // Parameter routes
app.delete("/users/:id", deleteUser);
app.get("/files/:path(.*)", serveFile);  // RegExp patterns
```

### Parameter Routes
```javascript
// Single parameter
app.get("/users/:id", (req, res) => {
  res.json({id: req.params.id});
});

// Multiple parameters
app.get("/users/:userId/posts/:postId", (req, res) => {
  res.json({userId: req.params.userId, postId: req.params.postId});
});

// Typed parameters (numeric only)
app.get("/users/:id(\\d+)", (req, res) => {
  // Only matches /users/123, not /users/abc
  res.json({id: parseInt(req.params.id)});
});
```

### Route Groups & Middleware
```javascript
// Authentication middleware
const authenticate = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) return res.error(401);
  req.user = verifyToken(token);
  next();
};

// Protect routes
app.get("/admin/*", authenticate, adminHandler);
app.post("/api/users", authenticate, createUser);
```

## 🔧 Middleware

Woodland uses the familiar `req, res, next` pattern. Register global middleware with `always()`, route-specific middleware by adding handlers to routes.

### Global Middleware
```javascript
// Runs on every request
app.always((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Multiple middleware execute in registration order
app.always(loggingMiddleware);
app.always(authMiddleware);
app.always(bodyParser);
```

### Route-Specific Middleware
```javascript
// Middleware only runs for specific routes
app.get("/protected", authenticate, authorize, handler);
app.post("/api/*", validateUser, createResource);
```

### Error Handling Middleware
Error middleware (4 parameters: `error, req, res, next`) must be registered **last** for each route:

```javascript
// ✅ Correct: Error handler registered last
app.get("/users", 
  authenticate,        // Normal middleware
  getUsers,           // Route handler
  (error, req, res, next) => {  // Error middleware - LAST
    console.error(error);
    res.error(500);
  }
);

// Global error handler
app.use("/(.*)", (error, req, res, next) => {
  if (error) {
    console.error(`Error for ${req.url}:`, error);
    res.error(500, "Internal Server Error");
  } else {
    next();
  }
});

// ❌ Don't use app.always() for error middleware
// app.always((error, req, res, next) => { ... }) // Wrong!
```

### Common Middleware Examples

**Body Parser:**
```javascript
app.always(async (req, res, next) => {
  if (!["POST", "PUT", "PATCH"].includes(req.method)) {
    return next();
  }
  
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
});
```

**Rate Limiter:**
```javascript
const rateLimit = (() => {
  const requests = new Map();
  
  return (req, res, next) => {
    const ip = req.ip;
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    const maxRequests = 100;
    
    if (!requests.has(ip)) {
      requests.set(ip, []);
    }
    
    const recent = requests.get(ip).filter(t => now - t < windowMs);
    
    if (recent.length >= maxRequests) {
      return res.error(429);
    }
    
    recent.push(now);
    requests.set(ip, recent);
    next();
  };
})();

app.always(rateLimit);
```

**Request Logging:**
```javascript
app.always((req, res, next) => {
  const start = Date.now();
  
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
  });
  
  next();
});
```

## 📁 Static Files

### Directory Serving
```javascript
// Serve public folder at /static
app.files("/static", "./public");

// Directory listing enabled
const app = woodland({autoindex: true});
app.files("/", "./public");

// Custom index files
const app = woodland({
  autoindex: true,
  indexes: ["index.html", "index.htm", "default.html"]
});
```

### Custom File Handling
```javascript
// Download endpoint
app.get("/downloads/(.*)", (req, res) => {
  const filename = req.params[0];
  const filepath = path.join("./downloads", filename);
  
  app.serve(req, res, filename, "./downloads");
});
```

## 🌐 CORS

**Most apps only need to configure origins - Woodland handles the rest.**

### Simple Setup
```javascript
const app = woodland({
  origins: ["https://myapp.com", "http://localhost:3000"],
  corsExpose: "x-total-count" // Expose custom headers to client
});

// Woodland automatically provides:
// ✅ Preflight OPTIONS requests
// ✅ Access-Control-Allow-Origin headers  
// ✅ Access-Control-Allow-Methods based on your routes
// ✅ Access-Control-Allow-Credentials: true
// ✅ Origin validation (denies unknown origins)
```

### Advanced CORS
```javascript
// Conditional CORS (manual control)
const app = woodland({origins: []}); // Disable automatic CORS

// Dynamic origin validation
app.always((req, res, next) => {
  const origin = req.headers.origin;
  
  if (isValidOrigin(origin, req.user)) {
    res.header("access-control-allow-origin", origin);
    res.header("access-control-allow-credentials", "true");
  }
  
  next();
});
```

## ❌ Error Handling

### Built-in Error Responses
```javascript
app.get("/error", (req, res) => {
  res.error(500, "Server Error");
});

app.get("/not-found", (req, res) => {
  res.error(404); // 404 Not Found
});

app.get("/bad-request", (req, res) => {
  res.error(400, "Invalid input", {
    "content-type": "application/json"
  });
});
```

### Global Error Handler
```javascript
// Register last, catches all errors
app.use("/(.*)", (error, req, res, next) => {
  console.error(`[${res.statusCode}] ${req.url}:`, error);
  
  if (res.statusCode >= 500) {
    logError(error, req); // External logging
  }
  
  res.error(res.statusCode, "Internal Server Error");
});
```

### Event-Based Error Logging
```javascript
app.on("error", (req, res, err) => {
  console.error(`Error ${res.statusCode} on ${req.url}:`, err);
});
```

## 📤 Response Helpers

### JSON Responses
```javascript
app.get("/users/:id", (req, res) => {
  res.json({id: req.params.id, name: "John"});
});

app.post("/users", (req, res) => {
  const user = createUser(req.body);
  res.json(user, 201); // Custom status
});
```

### Redirects
```javascript
// Permanent redirect
app.get("/old", (req, res) => {
  res.redirect("/new");
});

// Temporary redirect
app.get("/temp", (req, res) => {
  res.redirect("/target", false); // false = temporary
});
```

### Custom Headers
```javascript
// Single header
app.get("/api", (req, res) => {
  res.header("x-total-count", "100");
  res.json({data: []});
});

// Multiple headers
app.get("/download", (req, res) => {
  res.set({
    "content-disposition": "attachment; filename=data.json",
    "content-type": "application/json"
  });
  res.send(JSON.stringify({data: "example"}));
});
```

## 🎯 Event Handlers

```javascript
// Log all connections
app.on("connect", (req, res) => {
  console.log(`Connection from ${req.ip}`);
});

// Analytics after each request
app.on("finish", (req, res) => {
  analytics.track({
    method: req.method,
    url: req.url,
    status: res.statusCode,
    ip: req.ip
  });
});

// Centralized error logging
app.on("error", (req, res, err) => {
  console.error(`[${res.statusCode}] ${req.url}:`, err);
  if (res.statusCode >= 500) {
    logErrorToService(err, req);
  }
});
```

## 📊 Logging

### Configuration
```javascript
const app = woodland({
  logging: {
    enabled: true,
    level: "debug",  // error, warn, info, debug
    format: "%h %t \"%r\" %>s %b"
  }
});
```

### Log Format
| Placeholder | Description |
|-------------|-------------|
| `%h`        | Remote IP   |
| `%t`        | Timestamp   |
| `%r`        | Request line|
| `%s`        | Status code |
| `%b`        | Response size|
| `%{Header}i`| Request header|
| `%{Header}o`| Response header|

### Manual Logging
```javascript
app.log("Custom message", "info");
app.log("Debug info", "debug");
```

## 💻 CLI Usage

Serve files quickly without writing code:

```bash
# Install globally
npm install -g woodland

# Serve current directory (default: http://127.0.0.1:8000)
woodland

# Custom port and IP
woodland --ip=0.0.0.0 --port=3000

# Disable logging
woodland --logging=false
```

### CLI Options

| Option | Default | Description |
|---|---|--|
| `--ip` | `127.0.0.1` | Server IP address |
| `--port` | `8000` | Server port |
| `--logging` | `true` | Enable/disable logging |

The CLI achieves **100% test coverage** with comprehensive unit tests covering argument parsing, validation, server configuration, error handling, and actual HTTP request serving.

### Example Output

```bash
$ woodland --port=3000
id=woodland, hostname=localhost, ip=127.0.0.1, port=3000
127.0.0.1 - [18/Dec/2024:10:30:00 -0500] "GET / HTTP/1.1" 200 1327
127.0.0.1 - [18/Dec/2024:10:30:05 -0500] "GET /favicon.ico HTTP/1.1" 404 9
```

## 📚 API Reference

### Factory Function
```javascript
import {woodland} from "woodland";

const app = woodland(options);
```

### Class (for inheritance)
```javascript
import {Woodland} from "woodland";

class MyAPI extends Woodland {
  constructor() {
    super(options);
  }
}
```

### HTTP Methods

| Method | Description |
|--------|------------|
| `app.get(path, ...handlers)` | GET route |
| `app.post(path, ...handlers)` | POST route |
| `app.put(path, ...handlers)` | PUT route |
| `app.delete(path, ...handlers)` | DELETE route |
| `app.patch(path, ...handlers)` | PATCH route |
| `app.options(path, ...handlers)` | OPTIONS route |
| `app.trace(path, ...handlers)` | TRACE route |
| `app.connect(path, ...handlers)` | CONNECT route |
| `app.use(path, ...handlers)` | Generic middleware |

### Middleware

| Method | Description |
|--|--|
| `app.always(path, ...handlers)` | Global middleware (all requests) |
| `app.files(path, folder)` | Static file server |
| `app.ignore(fn)` | Ignore route patterns |

### Event Handlers

| Event | Description |
|---|--|
| `app.on("connect", handler)` | New connection |
| `app.on("finish", handler)` | Request completed |
| `app.on("error", handler)` | Error occurred |
| `app.on("stream", handler)` | File streaming |

### Request Object (extensions)

| Property | Description |
|--|--|
| `req.allow` | Allowed methods for path |
| `req.body` | Request body (set by middleware) |
| `req.cors` | Is this a CORS request? |
| `req.host` | Hostname from request |
| `req.ip` | Client IP address |
| `req.params` | Route parameters |
| `req.parsed` | Parsed URL object |
| `req.valid` | Request validation status |
| `req.exit()` | Exit middleware chain |

### Response Object (extensions)

| Method | Description |
|------|--|
| `res.error(status, body, headers)` | Send error |
| `res.header(key, value)` | Set header |
| `res.json(body, status, headers)` | Send JSON |
| `res.redirect(url, permanent)` | Redirect |
| `res.send(body, status, headers)` | Send response |
| `res.set(headers)` | Set multiple headers |
| `res.status(code)` | Set status code |

### Lifecycle Hooks

| Hook | Description |
|--|--|
| `onReady(req, res, body)` | Before sending response |
| `onSend(req, res, body)` | Customize response |
| `onDone(req, res, body)` | Finalize response |

## ⚡ Performance

### Benchmark Results

Platform: Apple Mac Mini M4 Pro, Node.js 24.8.0 (1000 iterations, 5-run average)

| Framework | ops/sec | avg latency | Rank |
|--|--|--|--|
| Fastify | 14,283 | 0.070ms | 🥇 |
| **Woodland** | **12,478** | **0.080ms** | **🥈** |
| Express.js | 12,112 | 0.083ms | 🥉 |
| Raw Node.js | 10,888 | 0.092ms | |

**Woodland is 15% faster than raw Node.js, 3% faster than Express.js, 87% of Fastify's performance**

### Why Woodland is Fast

- Optimized request/response pipeline (vs raw Node.js)
- Lightweight middleware system (vs Express.js)  
- Built-in JSON optimization and efficient header management
- Route caching with intelligent lookup (4.8M ops/sec cached)

### Performance Tips

1. **Use cached routes**: Route caching provides 16x improvement
2. **Minimize middleware**: Only use what you need
3. **Enable ETags**: Reduce bandwidth for unchanged resources
4. **Stream large files**: Built-in streaming (330K ops/sec)
5. **Order routes strategically**: Frequently used routes first

### Running Benchmarks

```bash
git clone https://github.com/avoidwork/woodland.git
cd woodland
npm install

# Run all benchmarks
npm run benchmark

# Specific suites
node benchmark.js routing utility serving
node benchmark.js --iterations 2000 --warmup 200
```

## 🧪 Testing

### Run Tests

Woodland maintains **100%** statement coverage with comprehensive testing across all features. The CLI module achieves **100% coverage** with rigorous testing of all code paths including successful server startup, and the utility module achieves **100% line coverage** with comprehensive edge case testing.

```bash
npm test
```

### Test Results

```
386 passing (6s)

--------------|---------|----------|---------|---------|-------------------
File          | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
--------------|---------|----------|---------|---------|-------------------
All files     |     100 |      100 |     100 |     100 |                   
 src/cli.js   |     100 |      100 |     100 |     100 |                   
 src/constants.js |     100 |      100 |     100 |     100 |                   
 src/utility.js |     100 |      100 |     100 |     100 |                   
 src/woodland.js |     100 |      100 |     100 |     100 |                   
--------------|---------|----------|---------|---------|-------------------
```

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

Woodland includes full TypeScript definitions:

```typescript
import {Woodland, woodland} from "woodland";
import {IncomingMessage, ServerResponse} from "node:http";

// Using factory function
const app = woodland({
  defaultHeaders: {"content-type": "application/json"}
});

// Using class with custom types
interface UserRequest extends IncomingMessage {
  user?: {id: string; name: string};
}

const authenticate = (
  req: UserRequest,
  res: ServerResponse,
  next: () => void
): void => {
  req.user = {id: "123", name: "John"};
  next();
};

app.get("/protected", authenticate, (req, res) => {
  const user = (req as UserRequest).user;
  res.json(user);
});
```

## 🛠️ Troubleshooting

### CORS Issues
```javascript
// Problem: CORS blocked
// Solution: Configure origins
const app = woodland({
  origins: ["https://myapp.com", "http://localhost:3000"]
});
```

### Routes Not Matching
```javascript
// Problem: Route not matching
// Solution: Check trailing slashes
app.get("/users/:id", handler);     // ✅
app.get("/users/:id/", handler);    // ❌ Trailing slash
```

### High Memory Usage
```javascript
// Problem: High memory
// Solution: Tune cache
const app = woodland({
  cacheSize: 100,    // Reduce cache
  cacheTTL: 60000    // Shorter TTL
});
```

### Debug Mode
```javascript
const app = woodland({
  logging: {level: "debug"}
});

app.log("Debug info", "debug");
```

## 📄 License

Copyright (c) 2026 Jason Mulligan

Licensed under the **BSD-3-Clause** license.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass (`npm test`)
5. Submit a pull request

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/avoidwork/woodland/issues)
- **Documentation**: [GitHub Wiki](https://github.com/avoidwork/woodland/wiki)
- **Discussions**: [GitHub Discussions](https://github.com/avoidwork/woodland/discussions)

---

<div align="center">
  <sub>Built with ❤️ by <a href="https://github.com/avoidwork">Jason Mulligan</a></sub>
</div>