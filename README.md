<div align="center">
  <img src="https://avoidwork.github.io/woodland/logo.svg" width="150" alt="Woodland Logo" />

# Woodland

High-performance HTTP framework for Node.js. Express-compatible with built-in security, no performance tradeoff.

[![npm version](https://badge.fury.io/js/woodland.svg)](https://badge.fury.io/js/woodland)
[![Node.js Version](https://img.shields.io/node/v/woodland.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause)
[![Test Coverage](https://img.shields.io/badge/coverage-98.84%25-brightgreen.svg)](https://github.com/avoidwork/woodland)

</div>

## Quick Start

```bash
npm install woodland
```

### ESM

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

**Security-First Design:**

- **Zero learning curve** - Express-compatible patterns
- **Built-in security** - CORS, path traversal, XSS prevention (no additional packages)
- **Secure by default** - CORS deny-all, path traversal blocked, HTML escaping automatic
- **TypeScript first** - Full type definitions included
- **No performance tradeoff** - Security features add ~0.02ms overhead per request
- **Lightweight** - Minimal dependencies (6 packages)
- **Dual module support** - CommonJS and ESM

**Built-in Security Features:**

- **CORS enforcement** - Default deny-all, explicit allowlist required
- **Path traversal protection** - Resolved paths validated against allowed directories
- **XSS prevention** - Automatic HTML escaping for user output
- **IP validation** - Protects against header spoofing
- **X-Content-Type-Options** - Automatic `nosniff` header
- **Secure error handling** - No sensitive data exposure

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
const app = woodland({ autoIndex: true });
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

// Error handler (register last, 4 params)
app.use("/(.*)", (error, req, res, next) => {
  console.error(error);
  res.error(500);
});
```

## Configuration

```javascript
const app = woodland({
  origins: [], // CORS allowlist (empty = deny all)
  autoIndex: false, // Directory browsing
  etags: true, // ETag support
  cacheSize: 1000, // Route cache size
  cacheTTL: 10000, // Cache TTL in ms
  charset: "utf-8", // Default charset
  logging: {
    enabled: true,
    level: "info",
  },
  time: false, // X-Response-Time header
  silent: false, // Disable server headers
});
```

## Response Helpers

```javascript
res.json({ data: "value" });
res.send("Hello World");
res.redirect("/new-url");
res.header("x-custom", "value");
res.status(201);
res.error(404);
```

## Request Properties

```javascript
req.ip;         // Client IP address
req.params;     // URL parameters { id: "123" }
req.parsed;     // URL object
req.allow;      // Allowed methods
req.cors;       // CORS enabled
req.body;       // Request body
req.host;       // Hostname
req.valid;      // Request validity
```

## Event Handlers

```javascript
app.on("connect", (req, res) => console.log(`Connection from ${req.ip}`));
app.on("finish", (req, res) => analytics.track({ method: req.method, status: res.statusCode }));
app.on("error", (req, res, err) => console.error(`Error ${res.statusCode}:`, err));
app.on("stream", (req, res) => console.log(`Streaming file`));
```

## CLI

```bash
# Serve directory (default: http://127.0.0.1:8000)
npx woodland

# Custom port
npx woodland --port=3000

# Custom IP
npx woodland --ip=0.0.0.0
```

## Testing

```bash
npm test              # Run tests (98.84% coverage)
npm run coverage      # Generate coverage report
npm run benchmark     # Performance benchmarks
npm run lint          # Check linting
```

## Documentation

- [API Reference](docs/API.md) - Complete method documentation
- [Technical Documentation](docs/TECHNICAL_DOCUMENTATION.md) - Architecture, OWASP security, internals
- [Code Style Guide](docs/CODE_STYLE_GUIDE.md) - Conventions and best practices
- [Benchmarks](docs/BENCHMARKS.md) - Performance testing results

## Performance

Woodland delivers **enterprise-grade security without sacrificing performance**. Security features add minimal overhead (~0.02ms per request).

| Framework | Security Approach | Mean Response Time |
|-----------|------------------|-------------------|
| **Woodland** | **Built-in** | **0.1866ms** |
| Express | Requires middleware | 0.1956ms |
| Fastify | Requires plugins | 0.1491ms |

## Security

Woodland implements multiple layers of protection:

1. **CORS Validation** - Default deny-all policy
2. **Path Traversal Protection** - Resolved paths validated
3. **Input Validation** - IP addresses validated, URLs parsed securely
4. **Output Encoding** - HTML escaping automatic
5. **Secure Error Handling** - No internal paths exposed

**Production Setup:**

```javascript
import helmet from "helmet";
import rateLimit from "express-rate-limit";

app.always(helmet());
app.always(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
```

## License

Copyright (c) 2026 Jason Mulligan

Licensed under the **BSD-3-Clause** license.

## Support

- **Issues**: [GitHub Issues](https://github.com/avoidwork/woodland/issues)
- **Discussions**: [GitHub Discussions](https://github.com/avoidwork/woodland/discussions)
