## ADDED Requirements

### Requirement: writeHead merges headers with existing response headers
The `writeHead(res, headers)` function MUST merge the passed `headers` argument with headers already set on the response object via `res.getHeaders()`, instead of passing headers directly to `res.writeHead()`.

#### Scenario: Merge new headers with existing
- **WHEN** `res.setHeader("x-custom", "value")` is called, then `writeHead(res, { "content-type": "application/json" })` is called
- **THEN** `res.writeHead()` is invoked with both `x-custom: value` and `content-type: application/json`

#### Scenario: Overwrite existing header
- **WHEN** `res.setHeader("content-type", "text/plain")` is called, then `writeHead(res, { "content-type": "application/json" })` is called
- **THEN** the final `content-type` header is `application/json` (new headers override)

#### Scenario: Empty headers passed
- **WHEN** `writeHead(res, {})` is called
- **THEN** only previously-set headers and the default status code are written

#### Scenario: Cookie headers set before writeHead are preserved
- **WHEN** `res.cookie("session", "abc")` is called, then `res.send("hello")` is called (which internally calls `writeHead`)
- **THEN** the `set-cookie` header is included in the response sent to the client
