# Contributing to Woodland

Thank you for your interest in contributing to Woodland! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Welcome newcomers and help them learn

## How to Contribute

### Reporting Bugs

1. Search existing issues first
2. Create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Node.js version and platform

### Suggesting Features

1. Open an issue to discuss the feature first
2. Explain the use case and benefits
3. Wait for feedback before implementing

### Pull Requests

1. Fork the repository
2. Create a branch from `main`
3. Make your changes
4. Ensure all tests pass
5. Submit a pull request

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/woodland.git
cd woodland

# Install dependencies
npm install

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run linting
npm run lint
```

## Code Style

- Follow existing code patterns
- Use ES modules (import/export)
- No magic numbers or strings - use constants
- Keep functions small and focused
- Add JSDoc comments for public APIs

### Constants

All string literals and numeric values must be defined as constants in `src/constants.js`:

```javascript
// Good
export const INT_0 = 0;
if (count === INT_0) { ... }

// Bad
if (count === 0) { ... }
```

### Testing

- Maintain 100% line coverage
- Test edge cases and error paths
- Include security-related tests
- No flaky tests

```bash
# Run tests with coverage
npm run coverage
```

## Commit Guidelines

### Commit Message Format

```
<type>: <subject>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `test`: Adding tests
- `refactor`: Code refactoring
- `chore`: Maintenance tasks

### Examples

```
feat: add CORS support
fix: resolve memory leak in middleware
docs: update API documentation
test: add unit tests for response.js
```

## Pull Request Process

1. Update documentation if needed
2. Add tests for new functionality
3. Ensure all tests pass
4. Squash commits if necessary
5. Request review from maintainers

## Questions?

Feel free to open an issue for any questions or discussions.
