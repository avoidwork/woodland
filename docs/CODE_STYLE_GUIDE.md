# Code Style Guide

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
- **Documentation**: Code should be self-documenting with appropriate comments
- **Pragmatic formatting**: Prioritize readability over strict line length limits for logging and complex expressions

### Formatting
- Use **tabs for indentation, not spaces**
- Maximum line length: **120 characters** (longer lines are acceptable for logging and complex expressions)
- Use **semicolons** consistently
- **No trailing commas** in multiline objects and arrays
- Use **double quotes** for import statements and **single quotes** for other strings when possible

```javascript
// Good
import {createServer} from "node:http";
import {woodland} from "woodland";

const config = {
	autoindex: false,
	cacheSize: 1000,
	charset: 'utf-8'
};

// Acceptable - Long lines for logging
this.log(`type=route, uri=${req.parsed.pathname}, method=${req.method}, ip=${req.ip}, message="${MSG_ROUTING}"`);

// Bad - Using spaces instead of tabs
const config = {
  autoindex: false,
  cacheSize: 1000,
  charset: "utf-8",  // Also bad - trailing comma
}
```

---

## File Organization

### Directory Structure
```
src/
├── constants.js          # All constants and configuration values
├── utility.js            # Utility functions and helpers
├── woodland.js           # Main application logic
└── cli.js                # Command-line interface

tests/
├── unit/                 # Unit tests
└── integration/          # Integration tests

docs/                     # Documentation
types/                    # TypeScript definitions
benchmarks/               # Performance benchmarks
tpl/                      # HTML templates
test-files/               # Test file assets
```

### File Naming
- Use **kebab-case** for file names: `user-service.js`
- Use **camelCase** for directories when needed: `userService/`
- Test files should match the module name: `utility.test.js`

### Module Organization
- One primary export per file
- Group related imports together
- Separate Node.js built-ins, third-party, and local imports

```javascript
// Node.js built-ins
import {join} from "node:path";
import {createReadStream} from "node:fs";

// Third-party modules
import {etag} from "tiny-etag";
import {lru} from "tiny-lru";

// Local modules
import {ACCESS_CONTROL_ALLOW_ORIGIN, EMPTY} from "./constants.js";
import {autoindex, getStatus, mime} from "./utility.js";
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
const DEFAULT_CHARSET = 'utf-8';

// Bad
const ok = 200;
const max = 1000;
const charset = 'utf-8';
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
	return crypto.createHash('sha256').update(data).digest('hex');
}

// Good - Arrow function for callbacks
const processItems = items => items.map(item => transformItem(item));

// Bad - Mixed styles without clear purpose
const calculateHash = function(data) {
	return crypto.createHash('sha256').update(data).digest('hex');
};
```

### Object and Array Handling
- Use **destructuring** for extracting multiple values
- Use **spread operator** for copying and merging
- Use **object shorthand** when possible

```javascript
// Good
const {method, url, headers} = req;
const config = {autoindex, cacheSize, ...defaultOptions};

// Bad
const method = req.method;
const url = req.url;
const headers = req.headers;
const config = {autoindex: autoindex, cacheSize: cacheSize};
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
export function calculateHash(data, algorithm = 'sha256') {
	if (!data) {
		throw new Error('Data is required');
	}
	return crypto.createHash(algorithm).update(data).digest('hex');
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
 * const server = new Woodland({
 *   autoindex: true,
 *   cacheSize: 1000
 * });
 */
export class Woodland extends EventEmitter {
	/**
	 * Creates a new Woodland instance
	 * @param {Object} [config={}] - Configuration object
	 * @param {boolean} [config.autoindex=false] - Enable automatic directory indexing
	 * @param {number} [config.cacheSize=1000] - Size of internal cache
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
export function escapeHtml(str = '') {
	// Use lookup table for single-pass replacement
	const htmlEscapes = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#39;'
	};
	
	return str.replace(/[&<>"']/g, match => htmlEscapes[match]);
}

// Good - IP address validation
export function isValidIP(ip) {
	if (!ip || typeof ip !== 'string') {
		return false;
	}
	
	// IPv4 validation
	if (!ip.includes(':')) {
		const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
		const match = ip.match(ipv4Pattern);
		
		if (!match) {
			return false;
		}
		
		// Check octets are in valid range (0-255)
		return match.slice(1).every(octet => {
			const num = parseInt(octet, 10);
			return num >= 0 && num <= 255;
		});
	}
	
	// IPv6 validation continues...
}
```

### HTML Escaping
- **Always escape** HTML output
- Use established libraries or proven functions

```javascript
/**
 * Escapes HTML special characters to prevent XSS attacks
 * @param {string} [str=""] - The string to escape
 * @returns {string} The escaped string with HTML entities
 */
function escapeHtml(str = '') {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}
```

### Safe File Operations
- Validate file paths before operations
- Use path normalization
- Implement proper access controls

```javascript
// Good - Safe file path handling using actual Woodland implementation
async serve(req, res, arg, folder = process.cwd()) {
	const fp = resolve(folder, arg);
	
	// Security: Ensure resolved path stays within the allowed directory
	if (!fp.startsWith(resolve(folder))) {
		this.log(`type=serve, uri=${req.parsed.pathname}, method=${req.method}, ip=${req.ip}, message="Path outside allowed directory", path="${arg}"`, ERROR);
		res.error(INT_403);
		return;
	}
	
	// Continue with file serving...
}
```

---

## Testing Guidelines

### Unit Tests
- Use **node:assert** for assertions
- Run tests with **Mocha**
- Place unit tests in `tests/unit/`
- Follow the pattern: `module.test.js`

```javascript
import assert from 'node:assert';
import {describe, it} from 'mocha';
import {calculateHash} from '../src/utility.js';

describe('calculateHash', () => {
	it('should generate correct hash for string input', () => {
		const result = calculateHash('hello world');
		const expected = 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9';
		assert.strictEqual(result, expected);
	});

	it('should throw error for invalid input', () => {
		assert.throws(() => calculateHash(null), /Data is required/);
	});
});
```

### Integration Tests
- Place integration tests in `tests/integration/`
- Test complete workflows and interactions
- Use realistic data and scenarios

```javascript
import assert from 'node:assert';
import {describe, it} from 'mocha';
import {Woodland} from '../src/woodland.js';

describe('Woodland Integration', () => {
	it('should handle complete request lifecycle', async () => {
		const server = new Woodland();
		// Test implementation
	});
});
```

---

## Performance Considerations

### Caching
- Use **LRU caches** for frequently accessed data
- Set appropriate **TTL** values
- Monitor cache hit rates

```javascript
// Good - Efficient caching
import {lru} from 'tiny-lru';

const cache = lru(1000, 10000); // size: 1000, TTL: 10s

export function getCachedResult(key) {
	return cache.get(key) || computeExpensiveResult(key);
}
```

### Async Operations
- Use **async/await** for better readability
- Handle **Promise rejections** properly
- Avoid **callback hell**

```javascript
// Good - Clean async code
export async function processFile(filePath) {
	try {
		const stats = await stat(filePath);
		const content = await readFile(filePath, 'utf8');
		return processContent(content, stats);
	} catch (error) {
		throw new Error(`Failed to process file: ${error.message}`);
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
	
	return {processor, cleanup};
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
export function validateConfig(config) {
	if (!config) {
		throw new Error('Configuration is required');
	}
	
	if (typeof config.port !== 'number' || config.port < 1 || config.port > 65535) {
		throw new RangeError('Port must be a number between 1 and 65535');
	}
	
	return true;
}
```

### Async Error Handling
- Always handle **Promise rejections**
- Use **try/catch** with async/await
- Provide **fallback behavior** when appropriate

```javascript
// Good - Comprehensive async error handling
export async function safeFileOperation(filePath) {
	try {
		const result = await riskyFileOperation(filePath);
		return result;
	} catch (error) {
		console.error(`File operation failed for ${filePath}:`, error.message);
		return null; // Fallback value
	}
}
```

---

## Modern JavaScript Features

### ES Modules
- Use **ES6 imports/exports** exclusively
- Use **named exports** for utilities
- Use **default exports** for main classes/functions

```javascript
// Good - ES6 modules
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';

export function utilityFunction() {
	// Implementation
}

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

const html = `
	<div class="container">
		<h1>${title}</h1>
		<p>${description}</p>
	</div>
`;
```

### Destructuring and Spread
- Use **destructuring** for cleaner code
- Use **spread operator** for immutable operations

```javascript
// Good - Modern JavaScript patterns
const {method, url, headers: {host}} = req;

const newConfig = {
	...defaultConfig,
	...userConfig,
	timestamp: Date.now()
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
// HTTP STATUS CODES
// =============================================================================
export const HTTP_STATUS_OK = 200;
export const HTTP_STATUS_NOT_FOUND = 404;
export const HTTP_STATUS_SERVER_ERROR = 500;

// =============================================================================
// CONTENT TYPES
// =============================================================================
export const CONTENT_TYPE_JSON = 'application/json';
export const CONTENT_TYPE_HTML = 'text/html';
```

### Utility Function Patterns
- Export individual utility functions
- Use **pure functions** when possible
- Handle **edge cases** gracefully

```javascript
// Good - Utility function pattern
export function formatTime(timestamp, precision = 3) {
	if (!timestamp || typeof timestamp !== 'number') {
		return '0.000ms';
	}
	
	return `${(timestamp / 1e6).toFixed(precision)}ms`;
}
```

---

## Conclusion

This style guide reflects the established patterns in the Woodland codebase while incorporating Node.js community best practices. Consistency is key - when in doubt, follow the existing patterns in the codebase.

Remember:
- **Security first** - always validate and sanitize input
- **Performance matters** - but don't prematurely optimize
- **Documentation helps** - write clear, helpful comments
- **Testing ensures quality** - write tests for all new code
- **Consistency builds trust** - follow established patterns

For questions or clarifications about these guidelines, refer to the existing codebase examples or consult the team. 
