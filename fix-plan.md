# Woodland Performance & Security Fix Plan

## Analysis Summary

Analyzed `src/woodland.js`, `src/cli.js`, `src/utility.js`, and `src/constants.js` for security vulnerabilities and performance issues.

---

## Security Fixes (High Priority First)

### 1. Error Message Exposure (CRITICAL)
- **File:** `src/woodland.js`
- **Line:** 470
- **Issue:** Internal error messages exposed directly to clients via `err.message`
- **Fix:** Create error whitelist/logging; only expose safe error messages
- **Tests Required:** Verify error messages don't expose stack traces or sensitive info

### 2. X-Forwarded-For Header Spoofing (CRITICAL)
- **File:** `src/woodland.js`
- **Lines:** 543-564
- **Issue:** IP extraction trusts first valid IP without validating trusted proxy chain
- **Fix:** Add trusted proxy configuration; only accept IPs from trusted sources
- **Tests Required:** Test IP spoofing attempts; verify trusted proxy validation

### 3. HTML Escape Bypass (HIGH)
- **File:** `src/utility.js`
- **Line:** 55-66
- **Issue:** `escapeHtml()` doesn't encode `&` last, allowing XSS bypass
- **Fix:** Sort entity replacements alphabetically; encode `&` last
- **Tests Required:** XSS payload tests with existing HTML entities

### 4. Case-Sensitive CORS (MEDIUM)
- **File:** `src/woodland.js`
- **Lines:** 345
- **Issue:** Origin validation is case-sensitive but should be case-insensitive
- **Fix:** Normalize origin to lowercase before comparison
- **Tests Required:** Test with mixed-case origins

### 5. URL-Encoded Path Traversal (MEDIUM)
- **File:** `src/woodland.js`
- **Line:** 904
- **Issue:** Path traversal check vulnerable to URL-encoded bypasses like `/path%2F..`
- **Fix:** Decode path before traversal check or use proper path normalization
- **Tests Required:** Test various traversal payloads with encodings

---

## Performance Optimizations (Medium Priority)

### 6. Unnecessary structuredClone Calls (LOW)
- **File:** `src/woodland.js`
- **Lines:** 166, 202
- **Issue:** `structuredClone()` used for simple arrays when spread/slice would suffice
- **Fix:** Replace with spread operator `[...array]` or `array.slice()`
- **Tests Required:** Ensure identical behavior before/after

### 7. Repeated Buffer Allocation (LOW)
- **File:** `src/woodland.js`
- **Line:** 850
- **Issue:** `Buffer.from(body)` creates new buffer for every request
- **Fix:** Check if body is already Buffer; add optional caching
- **Tests Required:** Verify streaming and non-streaming responses work correctly

### 8. Redundant Property Access (LOW)
- **File:** `src/woodland.js`
- **Lines:** 758-764
- **Issue:** Multiple redundant conditional checks in CORS validation
- **Fix:** Combine conditions into single check
- **Tests Required:** Verify CORS logic still functions correctly

### 9. Hot Path Object Creation (LOW)
- **File:** `src/woodland.js`
- **Lines:** 398-419
- **Issue:** Multiple Object.create(null) and header object creations per request
- **Fix:** Reuse objects where possible; batch operations
- **Tests Required:** Ensure no memory leaks or object mutation issues

---

## Test Coverage Requirements

The project has 100% test coverage requirement (see `c8` config in package.json):
- Lines: 100%
- Functions: 100%
- Branches: 100%
- Statements: 100%

### Test Files to Update:
1. `tests/unit/constants.test.js` - Constants verification
2. `tests/unit/utility.test.js` - Utility function tests
3. `tests/unit/woodland.test.js` - Woodland class tests
4. `tests/integration/*.test.js` - Integration tests
5. `tests/unit/cli.test.js` - CLI tests

### Test Addition Strategy:
1. Add security-focused tests **before** implementing fixes
2. Ensure all existing tests pass after each fix
3. Achieve 100% coverage for new code paths
4. Run `npm run test:src` after each change

---

## Order of Operations

1. **Add tests for vulnerabilities** - Before any fixes
2. **Test framework check** - Ensure 100% coverage tools work
3. **Fix critical security issues** - Error messages, IP spoofing
4. **Fix high-priority security** - HTML escaping
5. **Fix medium security** - CORS, path traversal
6. **Apply performance optimizations** - Less critical 
7. **Run full test suite** - Verify everything passes
8. **Verify 100% coverage maintained** - No coverage regressions

---

## Files to Modify

- `src/woodland.js` - Main application logic
- `src/utility.js` - Utility functions (escapeHtml, IP validation, etc.)
- `tests/unit/utility.test.js` - Tests for utility functions
- `tests/unit/woodland.test.js` - Tests for Woodland class
- `tests/integration/*.test.js` - Integration tests
- `tests/unit/constants.test.js` - Constants tests
- `tests/unit/cli.test.js` - CLI tests (if CLI affected)

---

## Monitoring Coverage

Use `todowrite` to track progress on each fix:
- Track each fix separately
- Mark complete when code + tests pass
- Verify coverage with `npm run coverage`
- Final verification: `npm run test`
