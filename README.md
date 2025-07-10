<div align="center">
  <img src="https://avoidwork.github.io/woodland/logo.svg" width="150" alt="Woodland Logo" />
  
  # Woodland
  
  *Lightweight HTTP framework with automatic headers*
  
  [![npm version](https://badge.fury.io/js/woodland.svg)](https://badge.fury.io/js/woodland)
  [![Node.js Version](https://img.shields.io/node/v/woodland.svg)](https://nodejs.org/)
  [![License](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause)
  [![Build Status](https://github.com/avoidwork/woodland/actions/workflows/ci.yml/badge.svg)](https://github.com/avoidwork/woodland/actions)
  
</div>

## 🚀 Features

- **Lightweight & Fast**: Minimal overhead with <15% performance impact
- **Automatic Headers**: Built-in CORS, ETags, and security headers
- **Flexible Routing**: Parameter syntax (`/users/:id`) and RegExp support
- **Middleware Support**: Express-style middleware with `req, res, next` pattern
- **Static File Serving**: Built-in file server with directory browsing
- **TypeScript Support**: Full TypeScript definitions included
- **Comprehensive Logging**: Common Log Format with customizable levels
- **Modern Node.js**: ES6+ modules with Node.js 17+ support

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

# Serve specific directory
cd /path/to/files && woodland
```

### CLI Options

| Option | Default | Description |
|--------|---------|-------------|
| `--ip` | `127.0.0.1` | Server IP address |
| `--port` | `8000` | Server port |

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

### Benchmark Results

*Node.js 20.x on Apple M2 MacBook Pro (1000 iterations, 100 warmup)*

```
Routing Operations
Route caching:      5,145,912 ops/sec  (0.0002ms avg)
Static routes:      2,639,073 ops/sec  (0.0004ms avg)
Parameter routes:   2,619,845 ops/sec  (0.0004ms avg)
Path conversion:    2,602,405 ops/sec  (0.0004ms avg)
Not found routes:   2,417,877 ops/sec  (0.0004ms avg)

Utility Operations
Number padding:     7,478,201 ops/sec  (0.0001ms avg)
MIME detection:     5,032,561 ops/sec  (0.0002ms avg)
Timezone offset:    3,914,522 ops/sec  (0.0003ms avg)
Status determination: 2,972,440 ops/sec  (0.0003ms avg)
Middleware chain:   946,746 ops/sec   (0.0011ms avg)

File Serving Operations
Small files:        41,272 ops/sec  (0.024ms avg)
Medium files:       43,517 ops/sec  (0.023ms avg)
Large files:        42,839 ops/sec  (0.023ms avg)
HEAD requests:      73,885 ops/sec  (0.014ms avg)
Directory listing:  19,971 ops/sec  (0.050ms avg)
Static file serving: 573,354 ops/sec  (0.0017ms avg)

HTTP Operations
URL parsing:        1,431,545 ops/sec  (0.0007ms avg)
Parameter extraction: 842,269 ops/sec  (0.0012ms avg)
Range headers:      970,166 ops/sec   (0.0010ms avg)
Content pipeability: 2,655,930 ops/sec  (0.0004ms avg)
Header writing:     566,052 ops/sec   (0.0018ms avg)
```

### Performance Tips

1. **Enable ETags**: Reduces bandwidth for unchanged resources
2. **Use Caching**: Configure appropriate cache headers
3. **Minimize Middleware**: Only use necessary middleware
4. **Stream Large Files**: Use built-in streaming for large files
5. **Optimize Routes**: Place frequent routes first

### Running Benchmarks

```bash
git clone https://github.com/avoidwork/woodland.git
cd woodland
npm install
npm run benchmark
```

## 🧪 Testing

### Test Coverage

Woodland maintains **99.79%** code coverage across all features:

```bash
npm test
```

### Test Results

```
utility: 44 passing
Woodland: 70 passing
Total: 114 passing (41ms)
```

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
