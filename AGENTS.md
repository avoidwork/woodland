# AGENTS.md

## Setup commands
- Install deps: `npm install`
- Run tests: `npm test`
- Run benchmarks: `npm run benchmarks`
- Documentation is in `./docs`

## Code style
- Use JSDoc standard for creating docblocks of functions and classes.
- Always use camelCase for function names.
- Always use upper-case snake_case for constants.
- Create integration tests in `tests/integration` that use node-assert, which run with mocha.
- Create unit tests in `tests/unit` that use node-assert, which run with mocha.
- Use node.js community "Best Practices".
- Fix lint errors by running `npm run fix`
- Adhere to DRY, KISS, YAGNI, & SOLID principles
- Adhere to OWASP security guidance

## Codebase structure
- `src/woodland.js` - Main framework file (1144 lines), exports `Woodland` class and `woodland` factory function
- `src/utility.js` - Utility functions (559 lines), all named exports
- `src/constants.js` - All constants and regex patterns used throughout framework
- `src/cli.js` - CLI entry point for running the server
- `src/tpl/autoindex.html` - Template for autoindex directory listings
- `tests/integration/` - Integration tests with mocha
- `tests/unit/` - Unit tests with mocha

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
- Use `--no-verify` flag for git commits (pre-commit hooks fail due to yargs ES module issue)
- Pre-commit hooks have issues with ES modules

## Security considerations
- Validate all IP addresses before use (use `isValidIP` from utility.js)
- Block path traversal attempts in file serving
- Deny CORS by default (empty origins array)
- Escape HTML in autoindex to prevent XSS
- Don't expose sensitive information in error responses
- Ensure resolved file paths stay within allowed directories

## Test count
- 399 tests passing
