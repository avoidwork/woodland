<div align="center">
  <img src="https://avoidwork.github.io/woodland/logo.svg" width="150" alt="Woodland Logo" />
  
  # Woodland
  
  *High-performance HTTP framework for Node.js. Express-compatible, 15% faster than raw Node.js.*
  
  [![npm version](https://badge.fury.io/js/woodland.svg)](https://badge.fury.io/js/woodland)
  [![Node.js Version](https://img.shields.io/node/v/woodland.svg)](https://nodejs.org/)
  [![License](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause)
  [![Build Status](https://github.com/avoidwork/woodland/actions/workflows/ci.yml/badge.svg)](https://github.com/avoidwork/woodland/actions)
  [![Test Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen.svg)](https://github.com/avoidwork/woodland)
  
</div>

## 🚀 Quick Start

```bash
npm install woodland
```

```javascript
import {createServer} from "node:http";
import {woodland} from "woodland";

const app = woodland();

app.get("/", (req, res) => res.send("Hello World!"));
app.get("/users/:id", (req, res) => res.json({id: req.params.id}));

createServer(app.route).listen(3000, () => console.log("http://localhost:3000"));
```

## 🏆 Why Woodland?

| Framework   | ops/sec  | vs Raw Node.js |
|-------------|----------|----------------|
| Fastify     | 14,283   | +31%           |
| **Woodland**| **12,478** | **+15%**     |
| Express.js  | 12,112   | +11%           |
| Raw Node.js | 10,888   | baseline       |

*Platform: M4 Pro, Node.js 24.8.0, 1000 iterations, 5-run average*

**Benefits:**
- ✅ 15% faster than raw Node.js - Optimized pipeline, not overhead
- ✅ Express-compatible - Zero learning curve, drop-in middleware
- ✅ Zero config - Works out of the box, tune when you need to
- ✅ Production-ready - 100% test coverage, battle-tested security
- ✅ TypeScript first - Full type definitions included

## 💡 Common Patterns

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
  const user = {...req.body, id};
  users.set(id, user);
  res.json(user, 201);
});
```

### CORS
```javascript
const app = woodland({
  origins: ["https://myapp.com", "http://localhost:3000"]
});
// Woodland handles preflight OPTIONS automatically
```

### Static Files
```javascript
const app = woodland({autoindex: true});
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

## ⚙️ Configuration

```javascript
const app = woodland({
  origins: [],              // CORS allowlist (empty = deny all)
  autoindex: false,         // Directory browsing
  etags: true,              // ETag support
  cacheSize: 1000,          // Route cache size
  cacheTTL: 10000,          // Cache TTL in ms
  logging: {
    enabled: true,
    level: "info",          // error, warn, info, debug
    format: "%h %t \"%r\" %>s %b"
  },                          // Or use env vars: WOODLAND_LOG_LEVEL, WOODLAND_LOG_FORMAT
  time: false,              // X-Response-Time header
  silent: false             // Disable default headers
});
```

**Environment Variables:**
```bash
export WOODLAND_LOG_LEVEL=debug
export WOODLAND_LOG_FORMAT="%h %t \"%r\" %>s %b"
export WOODLAND_LOG_ENABLED=true
```

## 🔒 Security

**Automatic Protection:**
- ✅ Injection prevention - Input validation, HTML escaping
- ✅ Path traversal protection - Secure file access
- ✅ CORS enforcement - Origin validation
- ✅ Secure defaults - Safe error handling

**Production Setup:**
```javascript
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

app.always(helmet());
app.always(rateLimit({windowMs: 15 * 60 * 1000, max: 100}));
```

## 📤 Response Helpers

```javascript
// JSON
res.json({data: "value"});
res.json({data: "value"}, 201); // Custom status

// Text
res.send("Hello World");

// Redirect
res.redirect("/new-url");
res.redirect("/new-url", false); // Temporary (307)

// Headers
res.header("x-custom", "value");
res.set({"x-one": "1", "x-two": "2"});

// Error
res.error(404);
res.error(500, "Server Error");
```

## 🎯 Event Handlers

```javascript
app.on("connect", (req, res) => {
  console.log(`Connection from ${req.ip}`);
});

app.on("finish", (req, res) => {
  analytics.track({method: req.method, status: res.statusCode});
});

app.on("error", (req, res, err) => {
  console.error(`Error ${res.statusCode}:`, err);
});
```

## 📖 Documentation

- **[API Reference](docs/API.md)** - Complete method documentation
- **[Technical Documentation](docs/TECHNICAL_DOCUMENTATION.md)** - Architecture, OWASP security, internals
- **[Code Style Guide](docs/CODE_STYLE_GUIDE.md)** - Conventions and best practices

## 🧪 Testing

```bash
npm test              # Run tests (100% coverage)
npm run benchmarks    # Performance benchmarks
```

**Test Coverage:**
```
--------------|---------|----------|---------|---------|-------------------
File          | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
--------------|---------|----------|---------|---------|-------------------
All files     |     100 |      100 |     100 |     100 |                   
 src          |     100 |      100 |     100 |     100 |                   
--------------|---------|----------|---------|---------|-------------------
```

## 💻 CLI

```bash
# Install globally
npm install -g woodland

# Serve directory (default: http://127.0.0.1:8000)
woodland

# Custom port
woodland --port=3000
```

## 📦 Class API (for larger apps)

```javascript
import {Woodland} from "woodland";

class API extends Woodland {
  constructor() {
    super({origins: ["https://myapp.com"]});
    this.setupRoutes();
  }
  
  setupRoutes() {
    this.get("/health", this.healthCheck);
    this.get("/users", this.getUsers);
  }
  
  healthCheck(req, res) {
    res.json({status: "ok"});
  }
  
  getUsers(req, res) { /* ... */ }
}

const api = new API();
```

## 🔧 Troubleshooting

**CORS blocked?**
```javascript
const app = woodland({origins: ["https://myapp.com"]});
```

**Route not matching?**
```javascript
// Check trailing slashes - be consistent
app.get("/users/:id", handler); // ✅
```

**High memory?**
```javascript
const app = woodland({cacheSize: 100, cacheTTL: 60000});
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
