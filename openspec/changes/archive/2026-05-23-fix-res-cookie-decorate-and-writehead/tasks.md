## 1. Write Cookie Serialization

- [x] 1.1 Create `serializeCookie(name, value, opts)` function in response.js that accepts name, value, and cookie options (domain, path, expires, maxAge, secure, httpOnly, sameSite, encode) and returns a properly formatted Set-Cookie header string
- [x] 1.2 Handle encoding: default to `encodeURIComponent`, support custom `encode` function in opts, skip encoding if `encode: false`
- [x] 1.3 Handle maxAge: convert ms to expires date, set Max-Age attribute alongside Expires
- [x] 1.4 Handle sameSite: normalize "strict"→"Strict", "lax"→"Lax", "none"→"None", pass through as-is for invalid values
- [x] 1.5 Default path to "/" when not specified in options

## 2. Add res.cookie to #decorateResponse

- [x] 2.1 Create `createCookieHandler(res)` factory function in response.js that returns the cookie setter bound to `res.setHeader("set-cookie", ...)`
- [x] 2.2 Add `res.cookie = createCookieHandler(res)` to `#decorateResponse` in woodland.js
- [x] 2.3 Update TypeScript definition in types/woodland.d.ts to add `res.cookie(name: string, value: string, opts?: CookieOptions): void`

## 3. Add res.clearCookie to #decorateResponse

- [x] 3.1 Create `createClearCookieHandler(res)` factory function in response.js that sets cookie to expired state (expires in past, maxAge=0, value="")
- [x] 3.2 Add `res.clearCookie = createClearCookieHandler(res)` to `#decorateResponse` in woodland.js
- [x] 3.3 Update TypeScript definition in types/woodland.d.ts to add `res.clearCookie(name: string, opts?: ClearCookieOptions): void`

## 4. Refactor writeHead to Merge Headers

- [x] 4.1 Modify `writeHead(res, headers)` in response.js to merge: read headers from `res.getHeaders()`, spread merge with incoming `headers` parameter, pass to `res.writeHead`
- [x] 4.2 Add merge logic: `{ ...res.getHeaders(), ...headers }` where incoming headers override existing
- [x] 4.3 Update `#onDone` in woodland.js if needed (ensure headers passed to `writeHead` are merged correctly)

## 5. Write Unit Tests

- [x] 5.1 Add test for `serializeCookie` basic cookie generation (name=value; Path=/)
- [x] 5.2 Add tests for `serializeCookie` with each option (maxAge, httpOnly, secure, sameSite, domain, path, encode)
- [x] 5.3 Add tests for res.cookie basic usage via decorated response
- [x] 5.4 Add tests for res.clearCookie with and without options
- [x] 5.5 Add test for writeHead merging headers with existing response headers
- [x] 5.6 Add test for writeHead overwriting existing headers
- [x] 5.7 Add integration test: res.cookie followed by res.send preserves set-cookie header in response

## 6. Update Existing Tests

- [x] 6.1 Update existing writeHead unit tests in tests/unit/response.test.js to mock `res.getHeaders()` return value
- [x] 6.2 Verify all tests pass with `npm test`
- [x] 6.3 Verify 100% line coverage maintained
