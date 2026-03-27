# Woodland Code Style Guide

Conventions and standards for the Woodland HTTP framework codebase.

---

## Table of Contents

- [JavaScript Version](#javascript-version)
- [Formatting](#formatting)
- [Naming Conventions](#naming-conventions)
- [Code Structure](#code-structure)
- [Security Patterns](#security-patterns)
- [Testing Standards](#testing-standards)
- [Documentation](#documentation)

---

## JavaScript Version

- **Target**: ES2022
- **Modules**: ES modules (`import`/`export`)
- **Private fields**: ES2022 `#` syntax for encapsulation
- **No transpilation**: Code runs directly on Node.js LTS

---

## Formatting

### Indentation

- **Tabs** for indentation (not spaces)
- Consistent tab width throughout

### Semicolons

- **Required** on all statement-ending lines
- No trailing semicolons after blocks

### Quotes

- **Double quotes** (`"`) for imports
- **Single quotes** (`'`) for strings in code
- Example:
  ```javascript
  import { woodland } from "woodland";

  const message = 'Hello World';
  ```

### No Console

- **Forbidden**: `console.log`, `console.error`, etc.
- Use `app.logger.log()` for application logging
- Lint rule: `no-console: error`

### Unused Parameters

- Prefix with underscore (`_`) when unused
- Example:
  ```javascript
  app.get("/test", (req, res, _next) => {
    res.json({ ok: true });
  });
  ```

---

## Naming Conventions

### Files

- **Lowercase** with hyphens or underscores
- Descriptive names: `woodland.js`, `fileserver.js`, `middleware.js`

### Classes

- **PascalCase**: `Woodland`, `FileServer`

### Functions

- **camelCase**: `createLogger`, `validateConfig`, `extractIP`

### Constants

- **UPPER_SNAKE_CASE**: `SLASH`, `EMPTY`, `INT_0`, `GET`, `STATUS_CODES`

### Private Members

- **ES2022 `#` prefix**: `#cache`, `#logger`, `#middleware`
- Private methods also use `#`: `#decorate()`, `#onReady()`

### Variables

- **camelCase**: `validated`, `resolvedFolder`, `middlewareArray`
- Single-letter for counters: `i`, `j`, `len`

---

## Code Structure

### Private Fields Pattern

All internal state uses ES2022 private fields:

```javascript
class Woodland extends EventEmitter {
  #cache;
  #logger;
  #middleware;

  constructor(config) {
    super();
    this.#cache = lru(1000, 10000);
    this.#logger = createLogger(config.logging);
  }
}
```

### Factory Functions

Use factories for object creation:

```javascript
export function createLogger(config) {
  return Object.freeze({
    log: (msg) => console.log(msg),
  });
}

export function createMiddlewareRegistry(methods, cache) {
  return {
    register: (path, ...fn) => {},
    allowed: (method, uri) => {},
  };
}
```

### Immutability

- Freeze public objects: `Object.freeze()`
- Return copies, not references
- Example:
  ```javascript
  this.#indexes = [...indexes]; // Copy array
  this.#logger = Object.freeze(logger); // Freeze object
  ```

### Method Chaining

Public methods return `this` for chaining:

```javascript
use(rpath, ...fn) {
  this.#middleware.register(rpath, ...fn);
  return this;
}

get(...args) {
  return this.use(...args, GET);
}
```

### For Loops Over for..of

Prefer `for` loops in hot paths:

```javascript
// Preferred
for (let i = 0; i < array.length; i++) {
  const item = array[i];
}

// Avoid in hot paths
for (const item of array) {
}
```

---

## Security Patterns

### Path Traversal Protection

Always validate file paths with boundary checks:

```javascript
const resolvedFolder = resolve(folder);
const isWithin =
  fp === resolvedFolder ||
  (fp.startsWith(resolvedFolder) && fp[resolvedFolder.length] === sep);

if (!isWithin) {
  res.error(403);
  return;
}
```

**Key points**:
- Use `path.sep` for cross-platform compatibility
- Check boundary character, not just `startsWith`
- Handle exact matches (`fp === resolvedFolder`)

### XSS Prevention

Escape all user output:

```javascript
import { escapeHtml } from "./response.js";

const safeName = escapeHtml(fileName);
params[key] = coerce(escapeHtml(decoded));
```

### CORS Default Deny

Empty origins array = deny all:

```javascript
if (origins.size === 0) {
  return false; // Deny CORS
}
```

### IP Validation

Validate IPs before use:

```javascript
if (!isValidIP(ip)) {
  return fallbackIP;
}
```

### Error Handling

No sensitive data in error responses:

```javascript
res.error(status, new Error(STATUS_CODES[status]));
// Never: res.error(500, err.stack)
```

---

## Testing Standards

### Test Structure

```javascript
import { describe, it } from "node:test";
import assert from "node:assert";

describe("module", () => {
  it("should do something", async () => {
    const result = await someFunction();
    assert.strictEqual(result, expected);
  });
});
```

### Mock Requirements

For HTTP tests, mock responses must include:
- `send()`, `json()`, `end()`, `pipe()`, `on()`, `emit()` methods
- `socket.server._connectionKey` for CORS/IP extraction
- Destroy file streams to prevent EMFILE errors

### Coverage Targets

- **100% line coverage** (required)
- Ongoing work: 100% branch and function coverage

### Test Edge Cases

Always test:
- Path traversal: `../../../etc/passwd`
- Sibling bypass: `../public2/file.txt`
- Boundary conditions: exact matches vs. prefix matches

---

## Documentation

### JSDoc Comments

All public functions and classes:

```javascript
/**
 * Creates a new Woodland instance
 * @param {Object} [config={}] - Configuration object
 * @param {boolean} [config.autoIndex=false] - Enable directory indexing
 * @returns {Woodland} New Woodland instance
 */
export function woodland(config = {}) {
  return new Woodland(config);
}
```

### Inline Comments

Use sparingly, only for complex logic:

```javascript
// Path traversal protection: ensure fp is within resolvedFolder
// Must match exactly or be a subdirectory (not a sibling)
const isWithin =
  fp === resolvedFolder ||
  (fp.startsWith(resolvedFolder) && fp[resolvedFolder.length] === sep);
```

---

## Linting

### oxlint Rules

- `no-console: error` - No console statements
- `no-unused-vars: error` - No unused variables
- Prefix unused params with `_`

### Running Lint

```bash
npm run lint   # Check linting
npm run fix    # Auto-fix issues
```

---

## Commit Workflow

1. Make changes
2. Run `npm run fix` (fixes lint + formatting)
3. Run `npm run coverage` (ensures 100% line coverage)
4. Commit only when explicitly requested

**Pre-commit hook**: `npm run fix && npm run coverage && git add -A`

---

*Last updated: March 2026*
