# Code Style Guide

**Framework Version:** 21.0.0

## Table of Contents

1. [General Principles](#general-principles)
2. [File Organization](#file-organization)
3. [Naming Conventions](#naming-conventions)
4. [Code Structure](#code-structure)
5. [Documentation Standards](#documentation-standards)
6. [Security Practices](#security-practices)
7. [Testing Guidelines](#testing-guidelines)
8. [Performance Considerations](#performance-considerations)
9. [Error Handling](#error-handling)
10. [Modern JavaScript Features](#modern-javascript-features)
11. [Project-Specific Conventions](#project-specific-conventions)

---

## General Principles

### Code Philosophy

- **Clarity over cleverness**: Write code that is easy to understand and maintain
- **Consistency**: Follow established patterns throughout the codebase
- **Security first**: Always consider security implications
- **Performance awareness**: Write efficient code without premature optimization
- **Documentation**: Code should be self-documenting with appropriate JSDoc comments
- **Pragmatic formatting**: Prioritize readability over strict line length limits for logging and complex expressions

### Formatting

- Use **tabs for indentation, not spaces**
- Maximum line length: **120 characters** (longer lines are acceptable for logging and complex expressions)
- Use **semicolons** consistently
- **No trailing commas** in multiline objects and arrays
- Use **double quotes** for import statements and **single quotes** for other strings when possible

```javascript
// Good
import { createServer } from "node:http";
import { woodland } from "woodland";

const config = {
	autoIndex: false,
	cacheSize: 1000,
	charset: "utf-8",
};

// Acceptable - Long lines for logging
this.log(
	`type=route, uri=${req.parsed.pathname}, method=${req.method}, ip=${req.ip}, message="${MSG_ROUTING}"`,
);

// Bad - Using spaces instead of tabs
const config = {
  autoIndex: false,
  cacheSize: 1000,
  charset: "utf-8", // Also bad - trailing comma
};
```

---

## File Organization

### Directory Structure

```
src/
├── woodland.js           # Main framework (616 lines) - Woodland class & factory
├── constants.js          # All constants & regex patterns (227 lines)
├── middleware.js         # Middleware registry (279 lines)
├── response.js           # Response handlers (402 lines)
├── request.js            # Request utilities (270 lines)
├── fileserver.js         # Static file serving (163 lines)
├── logger.js             # Logging system (231 lines)
├── config.js             # Config validation (190 lines)
└── cli.js                # CLI entry point

tests/
├── unit/                 # Unit tests (478 tests)
└── test-files/           # Test file assets

docs/                     # Documentation
types/                    # TypeScript definitions
benchmarks/               # Performance benchmarks
tpl/                      # HTML templates (index.html)
dist/                     # Distribution builds
```

### File Naming

- Use **kebab-case** for file names: `user-service.js`
- Use **camelCase** for directories when needed: `userService/`
- Test files should match the module name: `woodland.test.js`
- Use **lowercase** for directory names: `tpl/`, `types/`, `docs/`

### Module Organization

- One primary export per file (factory functions or classes)
- Group related imports together (Node.js built-ins, external packages, local modules)
- Use named exports exclusively (no default exports)
- Keep modules focused and single-responsibility

```javascript
// Node.js built-ins
import { join } from "node:path";
import { createReadStream } from "node:fs";

// Third-party modules
import { etag } from "tiny-etag";
import { lru } from "tiny-lru";

// Local modules
import { ACCESS_CONTROL_ALLOW_ORIGIN, EMPTY } from "./constants.js";
import { createFileServer } from "./fileserver.js";
```

---

## Naming Conventions

### Variables and Functions

- Use **camelCase** for variables and functions
- Use descriptive names that clearly indicate purpose
- Prefer full words over abbreviations

```javascript
// Good
const userAuthentication = true;
const calculateResponseTime = () => {};

// Bad
const auth = true;
const calcRespTime = () => {};
```

### Constants

- Use **UPPER_SNAKE_CASE** for constants
- Group related constants together
- Use descriptive names that indicate the constant's purpose

```javascript
// Good
const HTTP_STATUS_OK = 200;
const MAX_CACHE_SIZE = 1000;
const DEFAULT_CHARSET = "utf-8";

// Bad
const ok = 200;
const max = 1000;
const charset = "utf-8";
```

### Classes

- Use **PascalCase** for class names
- Use **camelCase** for method names
- Use **camelCase** for property names

```javascript
// Good
class HttpServer {
	constructor(options) {
		this.defaultHeaders = options.headers;
	}

	handleRequest(req, res) {
		// Implementation
	}
}

// Bad
class httpServer {
  constructor(options) {
    this.default_headers = options.headers;
  }

  handle_request(req, res) {
    // Implementation
  }
}
```

---

## Code Structure

### Function Declaration

- Use **function declarations** for top-level functions
- Use **arrow functions** for callbacks and inline functions
- Keep functions small and focused on a single responsibility

```javascript
// Good - Function declaration
export function calculateHash(data) {
	return crypto.createHash("sha256").update(data).digest("hex");
}

// Good - Arrow function for callbacks
const processItems = (items) => items.map((item) => transformItem(item));

// Bad - Mixed styles without clear purpose
const calculateHash = function (data) {
	return crypto.createHash("sha256").update(data).digest("hex");
};
```

### Object and Array Handling

- Use **destructuring** for extracting multiple values
- Use **spread operator** for copying and merging
- Use **object shorthand** when possible

```javascript
// Good
const { method, url, headers } = req;
const config = { autoIndex, cacheSize, ...defaultOptions };

// Bad
const method = req.method;
const url = req.url;
const headers = req.headers;
const config = { autoIndex: autoIndex, cacheSize: cacheSize };
```

### Factory Pattern

- Use factory functions for creating instances instead of constructors
- Factories use closures for private state instead of class fields
- Factories return objects with bound methods for testability

```javascript
// Good - Factory pattern
export function createLogger(config = {}) {
	const { enabled = true, format, level = INFO } = config;

	return {
		log: (msg, logLevel = DEBUG) => log(msg, logLevel, enabled, level),
		clf: (req, res) => clf(req, res, format),
	};
}

// Good - Class with factory
export class Woodland extends EventEmitter {
	constructor(config = {}) {
		super();
		// Implementation
	}
}

export function woodland(arg) {
	const app = new Woodland(arg);
	return app;
}
```

---

## Documentation Standards

### JSDoc Comments

Use JSDoc standard for all functions and classes:

```javascript
/**
 * Calculates the hash of the provided data
 * @param {string|Buffer} data - The data to hash
 * @param {string} [algorithm='sha256'] - The hash algorithm to use
 * @returns {string} The hexadecimal hash digest
 * @throws {Error} When data is invalid
 * @example
 * const hash = calculateHash('hello world');
 * console.log(hash); // "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9"
 */
export function calculateHash(data, algorithm = "sha256") {
	if (!data) {
		throw new Error("Data is required");
	}
	return crypto.createHash(algorithm).update(data).digest("hex");
}
```

### Class Documentation

Document classes with their purpose and usage:

```javascript
/**
 * Woodland HTTP server framework class extending EventEmitter
 * @class
 * @extends {EventEmitter}
 * @example
 * const server = woodland({
 *   autoIndex: true,
 *   cacheSize: 1000
 * });
 */
export class Woodland extends EventEmitter {
	/**
	 * Creates a new Woodland instance
	 * @param {Object} [config={}] - Configuration object
	 * @param {boolean} [config.autoIndex=false] - Enable automatic directory indexing
	 * @param {number} [config.cacheSize=1000] - Size of internal LRU cache
	 */
	constructor(config = {}) {
		super();
		// Implementation
	}
}
```

### Inline Comments

- Use inline comments sparingly and only for complex logic
- Explain **why**, not **what**
- Keep comments up-to-date with code changes

```javascript
// Security: Escape HTML to prevent XSS attacks
const safeTitle = escapeHtml(title);

// Performance: Use Set for O(1) lookup instead of array search
const ignored = new Set();
```

---

## Security Practices

### Input Validation

- **Always validate** user input
- **Sanitize** data before processing
- Use **allowlists** instead of blocklists when possible

```javascript
// Good - Input validation and sanitization
export function isValidIP(ip) {
	if (!ip || typeof ip !== "string") {
		return false;
	}

	// IPv4 validation - optimize with early character check
	if (ip.indexOf(":") === -1) {
		const match = IPV4_PATTERN.exec(ip);

		if (!match) {
			return false;
		}

		// Optimized octet validation - avoid array methods
		for (let i = 1; i < 5; i++) {
			const num = parseInt(match[i], 10);
			if (num > 255) {
				return false;
			}
		}

		return true;
	}

	// IPv6 validation continues...
}
```

### HTML Escaping

- **Always escape** HTML output
- Use established libraries or proven functions
- Use lookup tables for performance

```javascript
/**
 * Escapes HTML special characters to prevent XSS attacks
 * @param {string} [str=""] - The string to escape
 * @returns {string} The escaped string with HTML entities
 */
export function escapeHtml(str = EMPTY) {
	// Use lookup table for single-pass replacement
	const htmlEscapes = {
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		'"': "&quot;",
		"'": "&#39;",
	};

	return str.replace(/[&<>"']/g, (match) => htmlEscapes[match]);
}
```

### Safe File Operations

- Validate file paths before operations
- Use path normalization
- Implement proper access controls

```javascript
// Good - Safe file path handling using actual Woodland implementation
async function serve(app, req, res, arg, folder = process.cwd()) {
	const fp = resolve(folder, arg);
	const resolvedFolder = resolve(folder);

	// Security: Ensure resolved path stays within the allowed directory
	if (!fp.startsWith(resolvedFolder)) {
		app.logger.logServe(req, MSG_SERVE_PATH_OUTSIDE);
		res.error(INT_403, new Error(STATUS_CODES[INT_403]));
		return;
	}

	// Continue with file serving...
}
```

### CORS Security

- Deny CORS by default (empty origins array)
- Validate origins against allowlist
- Never expose sensitive headers

```javascript
// Good - CORS validation
export function cors(req, origins) {
	if (origins.size === 0) {
		return false;
	}

	const origin = req.headers.origin;
	const corsWildcard = origins.has(WILDCARD);
	return req.corsHost && (corsWildcard || origins.has(origin));
}
```

---

## Testing Guidelines

### Unit Tests

- Use **node:assert** for assertions
- Run tests with **Node.js built-in test runner** (`node --test`)
- Place unit tests in `tests/unit/`
- Follow the pattern: `module.test.js`

```javascript
import assert from "node:assert";
import { describe, it } from "node:test";
import { woodland } from "../src/woodland.js";

describe("Woodland", () => {
	it("should create app instance with default config", () => {
		const app = woodland();
		assert.ok(app);
		assert.strictEqual(typeof app.get, "function");
	});

	it("should throw error for invalid config", () => {
		assert.throws(() => woodland({ invalidField: true }), /Configuration validation failed/);
	});
});
```

---

## Performance Considerations

### Caching

- Use **LRU caches** for frequently accessed data (via `tiny-lru`)
- Set appropriate **TTL** values
- Use external packages for specialized caching (`tiny-etag` for ETags)
- **No file stats caching** - read fresh each time for accuracy

```javascript
// Good - Efficient caching with tiny-lru
import { lru } from "tiny-lru";

this.cache = lru(cacheSize, cacheTTL); // size: 1000, TTL: 10s

// Good - ETag generation with tiny-etag
this.etags = etag({ cacheSize, cacheTTL });

// File stats are read fresh each time - no caching
const stats = await stat(fp, { bigint: false });
```

### Async Operations

- Use **async/await** for better readability
- Handle **Promise rejections** properly
- Avoid **callback hell**

```javascript
// Good - Clean async code
export async function serve(app, req, res, arg, folder = process.cwd()) {
	try {
		const stats = await stat(fp, { bigint: false });
		const content = await readFile(fp, "utf8");
		return processContent(content, stats);
	} catch (error) {
		app.logger.logServe(req, error.message);
		throw error;
	}
}
```

### Memory Management

- **Avoid memory leaks** with proper cleanup
- Use **streams** for large data processing
- **Remove event listeners** when no longer needed

```javascript
// Good - Proper cleanup
export function createProcessor() {
	const processor = new EventEmitter();

	const cleanup = () => {
		processor.removeAllListeners();
	};

	return { processor, cleanup };
}
```

### Performance Patterns

- Cache regex patterns at module level or in constants.js
- Use `Object.create(null)` for null-prototype objects (faster property access)
- Use **for loops** instead of `for..of` in hot paths
- Cache environment variable reads in constructor (not module level)
- Avoid optional chaining in hot paths
- Use `Set` for O(1) lookups instead of array `.includes()`
- Pre-allocate arrays when size is known
- Batch property assignments and header sets
- Use spread operator `[...array]` instead of `structuredClone` for simple arrays

```javascript
// Good - Performance optimized
const htmlEscapes = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&#39;",
};

// Use for loops in hot paths
for (let i = 0; i < files.length; i++) {
	const file = files[i];
	// Process file
}

// Use Set for O(1) lookups
const ignored = new Set();
if (!ignored.has(fn)) {
	// Process
}
```

---

## Error Handling

### Error Types

- Use **specific error types** for different scenarios
- Include **meaningful error messages**
- Provide **context** in error messages

```javascript
// Good - Specific error handling
export function validateConfig(config = {}) {
	const result = validator.validate(config, CONFIG_SCHEMA);

	if (!result.valid) {
		const errors = result.errors.map((err) => {
			const field = Array.isArray(err.path)
				? err.path.join(PERIOD)
				: String(err.path).replace(/^\./, EMPTY);
			return `${MSG_CONFIG_FIELD}"${field}" ${err.message}`;
		});
		throw new Error(`${MSG_VALIDATION_FAILED}${errors.join(SEMICOLON_SPACE)}`);
	}

	return validated;
}
```

### Async Error Handling

- Always handle **Promise rejections**
- Use **try/catch** with async/await
- Provide **fallback behavior** when appropriate

```javascript
// Good - Comprehensive async error handling
export async function serve(app, req, res, arg, folder = process.cwd()) {
	let valid = true;
	let stats;

	try {
		stats = await stat(fp, { bigint: false });
	} catch {
		valid = false;
	}

	if (!valid) {
		res.error(INT_404, new Error(STATUS_CODES[INT_404]));
	}
	// Continue processing...
}
```

### Error Handler Middleware

- Error handlers have 4 parameters: `(err, req, res, next)`
- Middleware with 4 parameters is automatically detected as error handler
- Errors skip regular middleware until error handler is found

```javascript
// Good - Error handler middleware
app.use((err, req, res, next) => {
	app.logger.logError(req.parsed.pathname, req.method, req.ip);
	res.status(500).send(err.message);
});
```

---

## Modern JavaScript Features

### ES Modules

- Use **ES6 imports/exports** exclusively
- Use **named exports** for all functions and classes
- No default exports in the codebase

```javascript
// Good - Named exports only
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export function utilityFunction() {
	// Implementation
}

export class MainClass {
	// Implementation
}

// Bad - Default exports
export default class MainClass {
	// Implementation
}
```

### Template Literals

- Use **template literals** for string interpolation
- Use **multi-line strings** when appropriate

```javascript
// Good - Template literals
const message = `Processing ${count} items in ${duration}ms`;

const logEntry = `type=route, uri=${req.parsed.pathname}, method=${req.method}, ip=${req.ip}`;
```

### Destructuring and Spread

- Use **destructuring** for cleaner code
- Use **spread operator** for immutable operations

```javascript
// Good - Modern JavaScript patterns
const {
	method,
	url,
	headers: { host },
} = req;

const newConfig = {
	...defaultConfig,
	...userConfig,
	timestamp: Date.now(),
};
```

---

## Project-Specific Conventions

### Constants Organization

- Group constants by category in `constants.js`
- Use descriptive section headers
- Export individual constants, not objects

```javascript
// =============================================================================
// HTTP METHODS
// =============================================================================
export const CONNECT = "CONNECT";
export const DELETE = "DELETE";
export const GET = "GET";
export const HEAD = "HEAD";
export const OPTIONS = "OPTIONS";
export const PATCH = "PATCH";
export const POST = "POST";
export const PUT = "PUT";
export const TRACE = "TRACE";
export const NODE_METHODS = [CONNECT, DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT, TRACE];

// =============================================================================
// HTTP STATUS CODES
// =============================================================================
export const INT_200 = 200;
export const INT_204 = 204;
export const INT_404 = 404;
export const INT_500 = 500;

// =============================================================================
// EVENT CONSTANTS
// =============================================================================
export const EVT_CONNECT = "connect";
export const EVT_ERROR = "error";
export const EVT_STREAM = "stream";
export const EVT_FINISH = "finish";
export const EVT_CLOSE = "close";
```

### Middleware Registration

- Use `middleware.register(path, ...fn, method)` pattern
- HTTP method shortcuts delegate to `use()`
- `always()` middleware is wildcard for all methods
- HEAD routes cannot be registered directly; GET routes implicitly allow HEAD

```javascript
// Good - Middleware registration
app.get("/users", getUsers);
app.post("/users", createUser);
app.use((req, res, next) => {
	// Global middleware
	next();
});
app.always((req, res, next) => {
	// Wildcard middleware (ignored for route visibility)
	next();
});
```

### Request Decoration

- `decorate(req, res)` adds framework utilities to request/response
- Request properties: `parsed`, `ip`, `allow`, `cors`, `corsHost`, `params`, `body`, `host`, `valid`, `exit`, `precise`
- Response methods: `error()`, `header()`, `json()`, `redirect()`, `send()`, `set()`, `status()`

```javascript
// Good - Using decorated request/response
app.get("/users/:id", (req, res, next) => {
	const userId = req.params.id; // URL parameter
	const clientIP = req.ip; // Client IP
	req.valid = true; // Validation status

	res.json({ id: userId, ip: clientIP });
});
```

### Logging Patterns

- Use `app.logger.log()` for logging (not `app.log()`)
- Logger provides: `log`, `clf`, `logRoute`, `logMiddleware`, `logDecoration`, `logError`, `logServe`, `ms`, `timeOffset`
- Log levels: emerg, alert, crit, error, warn, notice, info, debug (0-7, lower = more severe)

```javascript
// Good - Logging patterns
this.logger.log(`type=route, uri=${req.parsed.pathname}, method=${req.method}, ip=${req.ip}`);
this.logger.logRoute(req.parsed.pathname, req.method, req.ip);
this.logger.logMiddleware(route, method);
```

### Response Handlers

- Response handlers support currying when bound to `res`
- `res.json(data, status, headers)` - JSON response
- `res.send(body, status, headers)` - Text/HTML response
- `res.redirect(uri, perm)` - Redirect (308 permanent, 307 temporary)
- `res.error(status, body)` - Error response

```javascript
// Good - Curried response handlers
res.json = this.json(res); // Returns function: res.json(data, status, headers)
res.send = this.send(req, res); // Returns function: res.send(body, status, headers)

// Usage
res.json({ success: true }, 200, customHeaders);
res.send("Hello World", 200, { "X-Custom": "value" });
```

### File Serving

- Use `createFileServer(app)` for static file serving
- `serve()` reads file stats fresh each time (no caching)
- Directories redirect to add trailing slash, or serve autoindex if enabled
- Looks for index files (index.htm, index.html) before autoindex

```javascript
// Good - File serving
app.files("/static", "./public");

// Or manually
app.serve(req, res, "/path/to/file", "./public");
```

### Environment Variables

- `WOODLAND_LOG_ENABLED` - Enable/disable logging ("true"/"false" or omitted for default)
- `WOODLAND_LOG_FORMAT` - Custom log format string
- `WOODLAND_LOG_LEVEL` - Log level (debug, info, warn, error, etc.)

---

## Conclusion

This style guide reflects the established patterns in the Woodland codebase while incorporating Node.js community best practices. Consistency is key - when in doubt, follow the existing patterns in the codebase.

Remember:

- **Security first** - always validate and sanitize input
- **Performance matters** - but don't prematurely optimize
- **Documentation helps** - write clear, helpful JSDoc comments
- **Testing ensures quality** - write tests for all new code
- **Consistency builds trust** - follow established patterns

For questions or clarifications about these guidelines, refer to the existing codebase examples or consult the team.
