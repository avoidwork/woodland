<div align="center">
  <img src="https://avoidwork.github.io/woodland/logo.svg" width="150" alt="Woodland Logo" />

# Woodland

High-performance HTTP framework for Node.js. Express-compatible, optimized for speed.

</div>

[![npm version](https://badge.fury.io/js/woodland.svg)](https://badge.fury.io/js/woodland)
[![Node.js Version](https://img.shields.io/node/v/woodland.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause)
[![Build Status](https://github.com/avoidwork/woodland/actions/workflows/ci.yml/badge.svg)](https://github.com/avoidwork/woodland/actions)
[![Test Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen.svg)](https://github.com/avoidwork/woodland)

## Quick Start

```bash
npm install woodland
```

### ECMAScript Modules (ESM)

```javascript
import { createServer } from "node:http";
import { woodland } from "woodland";

const app = woodland();

app.get("/", (req, res) => res.send("Hello World!"));
app.get("/users/:id", (req, res) => res.json({ id: req.params.id }));

createServer(app.route).listen(3000, () => console.log("Server running at http://localhost:3000"));
```

### CommonJS

```javascript
const { createServer } = require("node:http");
const { woodland } = require("woodland");

const app = woodland();

app.get("/", (req, res) => res.send("Hello World!"));
app.get("/users/:id", (req, res) => res.json({ id: req.params.id }));

createServer(app.route).listen(3000, () => console.log("Server running at http://localhost:3000"));
```

## Why Woodland?

**Benefits:**

- **Zero learning curve** - Express-compatible middleware and routing patterns
- **Production-ready** - 100% test coverage, battle-tested security
- **TypeScript first** - Full type definitions included
- **Zero config** - Works out of the box, tune when you need to
- **Lightweight** - Minimal dependencies, no bloat
- **Dual module support** - Works with CommonJS and ECMAScript Modules (ESM)

## Common Patterns

### REST API

```javascript
const users = new Map();

app.get("/users", (req, res) => res.json(Array.from(users.values())));
app.get("/users/:id", (req, res) => {
  const user = users.get(req.params.id);
  user ? res.json(user) : res.error(404);
});
app.post("/users", (req, res) => {
  const id = Date.now().toString();
  const user = { ...req.body, id };
  users.set(id, user);
  res.json(user, 201);
});
```

### CORS

```javascript
const app = woodland({
  origins: ["https://myapp.com", "http://localhost:3000"],
});
// Woodland handles preflight OPTIONS automatically
```

### Static Files

```javascript
const app = woodland({ autoindex: true });
app.files("/static", "./public");
```

### Middleware

```javascript
// Global middleware
app.always((req, res, next) => {
  req.startTime = Date.now();
  next();
});

// Route-specific middleware
app.get("/protected", authenticate, handler);

// Error handler (register last)
app.use("/(.*)", (error, req, res, next) => {
  console.error(error);
  res.error(500);
});
```

### Routing

```javascript
// Parameters
app.get("/users/:id", handler);
app.get("/users/:userId/posts/:postId", handler);

// RegExp patterns
app.get("/files/:path(.*)", handler);

// Wildcards
app.get("/api/*", apiMiddleware);
```

## Configuration

```javascript
const app = woodland({
  origins: [], // CORS allowlist (empty = deny all)
  autoindex: false, // Directory browsing
  etags: true, // ETag support
  cacheSize: 1000, // Route cache size
  cacheTTL: 10000, // Cache TTL in ms
  charset: "utf-8", // Default charset
  corsExpose: "", // CORS expose headers
  defaultHeaders: {}, // Additional default headers
  digit: 3, // Timing digit precision
  indexes: ["index.htm", "index.html"], // Index files
  logging: {
    enabled: true,
    level: "info", // debug, info, warn, error, crit, alert, emerg, notice
    format: "%h %l %u %t \"%r\" %>s %b",
  },
  silent: false, // Disable server headers
  time: false, // X-Response-Time header
});
```

**Environment Variables:**

```bash
export WOODLAND_LOG_LEVEL=debug
export WOODLAND_LOG_FORMAT="%h %t \"%r\" %>s %b"
export WOODLAND_LOG_ENABLED=true
```

## Response Helpers

```javascript
// JSON
res.json({ data: "value" });
res.json({ data: "value" }, 201); // Custom status

// Text
res.send("Hello World");

// Redirect
res.redirect("/new-url");
res.redirect("/new-url", false); // Temporary (307)

// Headers
res.header("x-custom", "value");
res.set({ "x-one": "1", "x-two": "2" });

// Error
res.error(404);
res.error(500, "Server Error");

// Status
res.status(201);
```

## Request Properties

```javascript
app.get("/users/:id", (req, res) => {
  req.ip;         // Client IP address
  req.method;     // HTTP method
  req.parsed;     // URL object
  req.params;     // URL parameters { id: "123" }
  req.allow;      // Allowed methods string
  req.cors;       // CORS enabled for this request
  req.corsHost;   // Origin host differs
  req.body;       // Request body (parsed by middleware)
  req.headers;    // Request headers
  req.host;       // Hostname
});
```

## Event Handlers

```javascript
app.on("connect", (req, res) => {
  console.log(`Connection from ${req.ip}`);
});

app.on("finish", (req, res) => {
  analytics.track({ method: req.method, status: res.statusCode });
});

app.on("error", (req, res, err) => {
  console.error(`Error ${res.statusCode}:`, err);
});

app.on("stream", (req, res) => {
  console.log(`Streaming file`);
});
```

## HTTP Methods

```javascript
app.get(path, ...handlers);      // GET
app.post(path, ...handlers);     // POST
app.put(path, ...handlers);      // PUT
app.delete(path, ...handlers);   // DELETE
app.patch(path, ...handlers);    // PATCH
app.options(path, ...handlers);  // OPTIONS
app.connect(path, ...handlers);  // CONNECT
app.trace(path, ...handlers);    // TRACE
app.always(...handlers);         // Wildcard (all methods)
```

## Class API (for larger apps)

```javascript
import { Woodland } from "woodland";

class API extends Woodland {
  constructor() {
    super({ origins: ["https://myapp.com"] });
    this.setupRoutes();
  }

  setupRoutes() {
    this.get("/health", this.healthCheck);
    this.get("/users", this.getUsers);
  }

  healthCheck(req, res) {
    res.json({ status: "ok" });
  }

  getUsers(req, res) {
    // ...
  }
}

const api = new API();
```

## Middleware Registry

```javascript
// Check if a method is allowed for a URI
const allowed = app.allowed("GET", "/users"); // true

// Get allowed methods for a URI
const methods = app.allows("/users"); // "GET, OPTIONS"

// List routes for a method
const routes = app.list("get", "array"); // ["/", "/users", ...]
const routesObj = app.list("get", "object"); // { "/": [...], "/users": [...] }

// Get route information
const info = app.routes("/users/:id", "GET");
```

## File Server

```javascript
// Serve files from a directory
app.files("/static", "./public");

// Serve a specific file
await app.serve(req, res, "/path/to/file.txt", "./public");

// Stream a file
app.stream(req, res, {
  path: "./public/file.txt",
  etag: "abc123",
  charset: "utf-8",
  stats: { size: 1024, mtime: new Date() }
});
```

## Logger

```javascript
// Access logger
app.logger.log("Custom log message");
app.logger.logError("/path", "GET", "127.0.0.1");
app.logger.logRoute("/path", "GET", "127.0.0.1");
app.logger.logMiddleware("/path", handler);

// Common Log Format
app.logger.clf(req, res); // "127.0.0.1 - - [date] \"GET / HTTP/1.1\" 200 1234"

// Time formatting
app.logger.ms(1234567); // "1.234 ms"
```

## CLI

```bash
# Install globally
npm install -g woodland

# Serve directory (default: http://127.0.0.1:8000)
woodland

# Custom port
woodland --port=3000

# Custom IP
woodland --ip=0.0.0.0

# Enable file serving
woodland --files

# Verbose logging
woodland --verbose
```

## Testing

```bash
npm test              # Run tests (100% coverage)
npm run coverage      # Generate coverage report
npm run benchmark     # Performance benchmarks
npm run lint          # Check linting
npm run fix           # Fix linting issues
```

## Documentation

- [API Reference](docs/API.md) - Complete method documentation
- [Technical Documentation](docs/TECHNICAL_DOCUMENTATION.md) - Architecture, OWASP security, internals
- [Code Style Guide](docs/CODE_STYLE_GUIDE.md) - Conventions and best practices
- [Benchmarks](docs/BENCHMARKS.md) - Performance testing results

## Security

**Automatic Protection:**

- Injection prevention - Input validation, HTML escaping
- Path traversal protection - Secure file access
- CORS enforcement - Origin validation
- Secure defaults - Safe error handling

**Production Setup:**

```javascript
import helmet from "helmet";
import rateLimit from "express-rate-limit";

app.always(helmet());
app.always(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
```

## Troubleshooting

**CORS blocked?**

```javascript
const app = woodland({ origins: ["https://myapp.com"] });
```

**Route not matching?**

```javascript
// Check trailing slashes - be consistent
app.get("/users/:id", handler); // ✅
```

**High memory?**

```javascript
const app = woodland({ cacheSize: 100, cacheTTL: 60000 });
```

## License

Copyright (c) 2026 Jason Mulligan

Licensed under the **BSD-3-Clause** license.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass (`npm test`)
5. Submit a pull request

## Support

- **Issues**: [GitHub Issues](https://github.com/avoidwork/woodland/issues)
- **Documentation**: [GitHub Wiki](https://github.com/avoidwork/woodland/tree/master/docs)
- **Discussions**: [GitHub Discussions](https://github.com/avoidwork/woodland/discussions)
