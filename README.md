<div align="center">
  <img src="https://avoidwork.github.io/woodland/logo.svg" width="150" alt="Woodland Logo" />

# Woodland

Secure HTTP framework for Node.js. Express-compatible with built-in security, no performance tradeoff.

[![npm version](https://badge.fury.io/js/woodland.svg)](https://badge.fury.io/js/woodland)
[![Node.js Version](https://img.shields.io/badge/node.js-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause)
[![Test Coverage](https://img.shields.io/badge/coverage-100%25%20line-brightgreen.svg)](https://github.com/avoidwork/woodland)

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
- **No performance tradeoff** - Security features add minimal overhead
- **Lightweight** - Minimal dependencies (6 packages)
- **Dual module support** - CommonJS and ESM
- **Production ready** - Event emitters for custom monitoring, examples for graceful shutdown

**Built-in Security Features:**

- **CORS enforcement** - Default deny-all, explicit allowlist required
- **Path traversal protection** - Resolved paths validated against allowed directories
- **XSS prevention** - Automatic HTML escaping for user output
- **IP validation** - Protects against header spoofing
- **X-Content-Type-Options** - Automatic `nosniff` header
- **Secure error handling** - No sensitive data exposure

## Common Patterns

### REST API with Error Handling

```javascript
const users = new Map();

app.get("/users", (req, res) => {
	try {
		const list = Array.from(users.values());
		res.json(list);
	} catch (error) {
		res.error(500, error.message);
	}
});

app.get("/users/:id", (req, res) => {
	try {
		const user = users.get(req.params.id);
		if (!user) {
			return res.error(404, "User not found");
		}
		res.json(user);
	} catch (error) {
		res.error(500, error.message);
	}
});

app.post("/users", async (req, res) => {
	try {
		const id = Date.now().toString();
		const user = { ...req.body, id };
		users.set(id, user);
		res.status(201).json(user);
	} catch (error) {
		res.error(400, error.message);
	}
});
```

### Health Check Endpoint

```javascript
app.get("/health", (req, res) => {
	res.json({
		status: "healthy",
		timestamp: new Date().toISOString(),
		uptime: process.uptime(),
	});
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

// Error handler (register last with 4 params)
app.use((error, req, res, next) => {
	console.error(error);
	res.error(500, error.message);
});
```

## Configuration

```javascript
const app = woodland({
	origins: process.env.ALLOWED_ORIGINS?.split(",") || [],
	autoIndex: process.env.AUTO_INDEX === "true",
	etags: true,
	cacheSize: 1000,
	cacheTTL: 10000,
	charset: "utf-8",
	logging: {
		enabled: true,
		level: process.env.LOG_LEVEL || "info",
	},
	time: true,
	silent: process.env.NODE_ENV === "production",
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

## Graceful Shutdown

```javascript
import { createServer } from "node:http";
import { woodland } from "woodland";

const app = woodland();
const server = createServer(app.route);

const gracefulShutdown = (signal) => {
	console.log(`Received ${signal}, shutting down gracefully...`);

	server.close(() => {
		console.log("Server closed");
		process.exit(0);
	});

	// Force shutdown after 30s
	setTimeout(() => {
		console.error("Forced shutdown");
		process.exit(1);
	}, 30000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

server.listen(3000);
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
npm test              # Run tests (334 tests, 100% line, 99.37% function, 95.90% branch coverage)
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

Woodland delivers **enterprise-grade security without sacrificing performance**. Security features add minimal overhead.

| Framework | Security Approach | Mean Response Time |
|-----------|------------------|-------------------|
| Fastify | Requires plugins | 0.1491ms |
| **Woodland** | **Built-in** | **0.1866ms** |
| Express | Requires middleware | 0.1956ms |

## Security

Woodland implements multiple layers of protection:

1. **CORS Validation** - Default deny-all policy
2. **Path Traversal Protection** - Resolved paths validated
3. **Input Validation** - IP addresses validated, URLs parsed securely
4. **Output Encoding** - HTML escaping automatic
5. **Secure Error Handling** - No internal paths exposed
6. **Header Injection Prevention** - Type validation for headers
7. **Prototype Pollution Protection** - Safe ETag generation

**Production Setup:**

```javascript
import helmet from "helmet";
import rateLimit from "express-rate-limit";

app.always(helmet());
app.always(
	rateLimit({
		windowMs: 15 * 60 * 1000,  // 15 minutes
		max: 100,                   // Limit each IP to 100 requests
		standardHeaders: true,
		legacyHeaders: false,
	}),
);
```

**Security Warning:**
> ⚠️ **Production Deployment**: Always use a reverse proxy (nginx, Cloudflare) in production for SSL/TLS termination, DDoS protection, and additional security layers.

## License

Copyright (c) 2026 Jason Mulligan

Licensed under the **BSD-3-Clause** license.

## Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) first.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

- **Issues**: [GitHub Issues](https://github.com/avoidwork/woodland/issues)
- **Discussions**: [GitHub Discussions](https://github.com/avoidwork/woodland/discussions)
- **Email**: jason@mulligan.me
