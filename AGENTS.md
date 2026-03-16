# AGENTS.md

## Setup commands

- Install deps: `npm install`
- Build: `npm run build`
- Run tests: `npm test`
- Run tests with coverage: `npm run coverage`
- Run benchmarks: `npm run benchmarks`
- Fix lint errors: `npm run fix`
- Check lint only: `npm run lint`
- Documentation is in `./docs`

## Development workflow

1. Make changes to source files
2. Run tests: `npm test` (ensure 406 tests still pass)
3. Fix lint errors: `npm run fix`
4. Build: `npm run build`

## Tooling

- **Linting**: oxlint (with `no-console: error` and `no-unused-vars: error` rules)
- **Formatting**: oxfmt
- **Testing**: Node.js built-in test runner (`node --test`)
- **Git hooks**: husky (runs `npm run fix && npm run coverage && git add -A` on pre-commit)
- **Build**: rollup
- **Validation**: jsonschema (JSON Schema Draft-07 for config validation)

## Code style

- Use JSDoc standard for creating docblocks of functions and classes.
- Always use camelCase for function names.
- Always use upper-case snake_case for constants.
- Create integration tests in `tests/integration` that use node-assert.
- Create unit tests in `tests/unit` that use node-assert.
- Use node.js community "Best Practices".
- Fix lint errors by running `npm run fix`
- Adhere to DRY, KISS, YAGNI, & SOLID principles
- Adhere to OWASP security guidance

## Codebase structure

- `src/config.js` - Configuration validation using jsonschema (JSON Schema Draft-07) (`validateConfig`, `validateValue`, `validateLogging`, `validateOrigins`, `mergeEnvLogging`)
- `src/woodland.js` - Main framework file, exports `Woodland` class and `woodland` factory function
- `src/response.js` - Response handlers (`mime`, `getStatusText`, `error`, `json`, `redirect`, `send`, `set`, `status`, `stream`)
- `src/request.js` - Request handlers (`isValidIP`, `cors`, `corsHost`, `corsRequest`, `extractIP`, `decorate`, `logClose`)
- `src/logger.js` - Logger factory and functions (`createLogger`, `log`, `clfm`, `extractIP`, `logRoute`, `logMiddleware`, `logDecoration`, `logError`, `logServe`)
- `src/utility.js` - Utility functions (559 lines), all named exports
- `src/constants.js` - All constants and regex patterns used throughout framework
- `src/cli.js` - CLI entry point for running the server
- `src/fileserver.js` - File server handler with `createFileServer` factory
- `src/middleware.js` - Middleware registry with `createMiddlewareRegistry` factory
- `src/tpl/autoindex.html` - Template for autoindex directory listings
- `tests/unit/` - Unit tests with Node.js test runner (comprehensive coverage, 406 tests)

**Note:** Integration tests are optional when unit tests provide comprehensive coverage of all exported functions.

## Performance patterns

- Cache regex patterns at module level or in constants.js
- Use `Object.create(null)` for null-prototype objects (faster property access)
- Use `for` loops instead of `for..of` in hot paths
- Cache environment variable reads in constructor (not module level) to support test overrides
- Avoid optional chaining in hot paths
- Use `Set` for O(1) lookups instead of array `.includes()`
- Pre-allocate arrays when size is known
- Batch property assignments and header sets
- Use spread operator `[...array]` instead of `structuredClone` for simple arrays

## Environment variables

- `WOODLAND_LOG_ENABLED` - Enable/disable logging ("true"/"false" or omitted for default)
- `WOODLAND_LOG_FORMAT` - Custom log format string
- `WOODLAND_LOG_LEVEL` - Log level (debug, info, warn, error, etc.)

## Git workflow

- Git hooks managed by husky (runs `npm test` on pre-commit)

## Security considerations

- Validate all IP addresses before use (use `isValidIP` from utility.js)
- Block path traversal attempts in file serving
- Deny CORS by default (empty origins array)
- Escape HTML in autoindex to prevent XSS
- Don't expose sensitive information in error responses
- Ensure resolved file paths stay within allowed directories

## Test count

- 406 tests passing

## Key implementation details

- `escapeHtml` is a private function in `utility.js`, not exported for testing
- `autoindex` template uses lowercase doctype: `<!doctype html>`
- `params` uses `coerce()` to convert numeric strings to numbers
- `partialHeaders` uses lowercase header names (e.g., `content-range`)
- `timeOffset` uses JavaScript timezone offset convention: positive input (e.g., 300 for EST) returns `-0500`, negative input (e.g., -330 for IST) returns `0530`
- IPv6 validation accepts incomplete compressed addresses (e.g., `2001:db8:::`)
- Middleware execution is async via `process.nextTick`, tests need to wait
- CORS check (`req.cors`) only true when origin host differs from request host
- Unknown file extensions may have MIME types in mime-db; use unique extensions for octet-stream
- Response handler functions (`error`, `json`, `redirect`, `send`, `set`, `status`) are exported directly and support curried calls when passed to `res.*` decorators (e.g., `res.json = this.json(res)` returns a function that can be called later with data)
- Request handler functions (`cors`, `corsHost`, `corsRequest`, `extractIP`) are exported directly instead of being wrapped in factory functions
- Logger functions (`log`, `clfm`, `logRoute`, `logMiddleware`, `logDecoration`, `logError`, `logServe`) are exported directly with `createLogger` returning an object with bound methods
