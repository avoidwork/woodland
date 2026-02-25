<div align="center">
  <img src="https://avoidwork.github.io/woodland/logo.svg" width="150" alt="Woodland Logo" />

  # Woodland

  *High-performance HTTP framework for Node.js*

  [![npm version](https://badge.fury.io/js/woodland.svg)](https://badge.fury.io/js/woodland)
  [![Node.js Version](https://img.shields.io/node/v/woodland.svg)](https://nodejs.org/)
  [![License](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause)

</div>

## Overview

Woodland is a high-performance HTTP server framework for Node.js with a familiar Express.js-compatible API. It provides routing, middleware support, static file serving, CORS, and built-in security features while maintaining excellent performance.

## Installation

```bash
npm install woodland
```

## Features

- **⚡ Fast**: Optimized routing and request processing
- **🛤️ Routing**: Parameterized routes (`/users/:id`) and RegExp patterns
- **🔧 Middleware**: Express-compatible middleware system with `req, res, next`
- **📁 Static Files**: High-performance file serving with streaming
- **🌐 CORS**: Automatic CORS support with origin validation
- **🔒 Security**: IP validation, path traversal protection, XSS prevention
- **📊 Logging**: Common Log Format (CLF) support
- **✨ TypeScript**: Full type definitions included
- **📦 ETags**: Automatic ETag generation for caching
- **🔧 CLI**: Simple file server CLI tool

## Quick Start

### Basic Server

```javascript
import {createServer} from "node:http";
import {woodland} from "woodland";

const app = woodland({
  defaultHeaders: {
    "cache-control": "public, max-age=3600"
  }
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

createServer(app.route).listen(3000);
```

### Using the Class

```javascript
import {Woodland} from "woodland";

class MyAPI extends Woodland {
  constructor() {
    super({time: true});
    this.setupRoutes();
  }

  setupRoutes() {
    this.get("/api/health", this.healthCheck);
    this.post("/api/users", this.createUser);
  }

  healthCheck(req, res) {
    res.json({status: "healthy"});
  }

  createUser(req, res) {
    res.status(201).json({message: "User created"});
  }
}

const api = new MyAPI();
```

## Configuration

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

## Routing

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
```

### Advanced Routing

```javascript
// RegExp patterns
app.get("/api/v[1-3]/users", (req, res) => {
  res.json({version: req.url.match(/v(\d)/)[1]});
});

// Route with validation
app.get("/users/:id(\\d+)", (req, res) => {
  res.json({id: parseInt(req.params.id)});
});
```

## Middleware

```javascript
// Global middleware
app.always((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Route-specific middleware
app.get("/protected", authenticate, authorize, handler);

// Error handling
app.get("/api/users",
  authenticate,
  getUserHandler,
  (error, req, res, next) => {
    if (error) {
      console.error(error);
      res.error(500);
    } else {
      next();
    }
  }
);
```

## Static Files

```javascript
// Serve files from public directory
app.files("/static", "./public");

// Serve with custom options
app.get("/downloads/(.*)", (req, res) => {
  app.serve(req, res, req.params[0], "./downloads");
});
```

## CLI Usage

```bash
# Serve current directory
woodland

# Custom IP and port
woodland --ip=0.0.0.0 --port=3000

# Disable logging
woodland --logging=false
```

### CLI Options

| Option | Default | Description |
|--------|---------|-------------|
| `--ip` | `127.0.0.1` | Server IP address |
| `--port` | `8000` | Server port |
| `--logging` | `true` | Enable/disable request logging |

## API Reference

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
- `req.body` - Request body
- `req.cors` - Boolean indicating CORS request
- `req.host` - Request hostname
- `req.ip` - Client IP address (with IPv4/IPv6 validation)
- `req.params` - Route parameters
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

### Utility Functions

- `autoindex(title, files)` - Generate directory listing HTML
- `getStatus(req, res)` - Determine HTTP status code
- `mime(arg)` - Get MIME type for file extension
- `ms(arg, digits)` - Format time in milliseconds
- `next(req, res, middleware, immediate)` - Create next function for middleware chain
- `params(req, getParams)` - Extract URL parameters
- `parse(arg)` - Parse URL string or request
- `partialHeaders(req, res, size, status, headers, options)` - Handle range requests
- `pipeable(method, arg)` - Check if object is pipeable
- `reduce(uri, map, arg)` - Process middleware map
- `isValidIP(ip)` - Validate IP address (IPv4/IPv6)

## Testing

```bash
npm test
```

## License

Copyright (c) 2025 Jason Mulligan

Licensed under the **BSD-3-Clause** license.

---

<div align="center">
  <sub>Built with ❤️ by <a href="https://github.com/avoidwork">Jason Mulligan</a></sub>
</div>