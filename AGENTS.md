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
2. Run tests: `npm test` (ensure 399 tests still pass)
3. Fix lint errors: `npm run fix`
4. Build: `npm run build`
5. Commit with `--no-verify` flag on Windows (pre-commit hooks fail with yargs ES modules)

## Git workflow
- Use `--no-verify` flag for git commits on Windows (pre-commit hooks fail due to yargs ES module issue)
- Pre-commit hooks have issues with ES modules on Windows

## Security considerations
- Validate all IP addresses before use (use `isValidIP` from utility.js)
- Block path traversal attempts in file serving
- Deny CORS by default (empty origins array)
- Escape HTML in autoindex to prevent XSS
- Don't expose sensitive information in error responses
- Ensure resolved file paths stay within allowed directories

## Test count
- 399 tests passing
