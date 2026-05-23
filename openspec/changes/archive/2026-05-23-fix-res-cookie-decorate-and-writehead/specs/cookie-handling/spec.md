## ADDED Requirements

### Requirement: res.cookie sets a cookie with serialized attributes
The response object MUST have a `res.cookie(name, value, opts)` method that serializes a cookie and sets it via the `set-cookie` response header.

#### Scenario: Set a basic cookie
- **WHEN** `res.cookie("session", "abc123")` is called
- **THEN** the `set-cookie` header is set to `session=abc123; Path=/`

#### Scenario: Set cookie with maxAge
- **WHEN** `res.cookie("token", "xyz", { maxAge: 3600000 })` is called
- **THEN** the `set-cookie` header includes `Max-Age=3600` and `Expires` set to one hour from now

#### Scenario: Set cookie with httpOnly
- **WHEN** `res.cookie("id", "val", { httpOnly: true })` is called
- **THEN** the `set-cookie` header includes the `HttpOnly` attribute

#### Scenario: Set cookie with secure
- **WHEN** `res.cookie("id", "val", { secure: true })` is called
- **THEN** the `set-cookie` header includes the `Secure` attribute

#### Scenario: Set cookie with sameSite
- **WHEN** `res.cookie("id", "val", { sameSite: "strict" })` is called
- **THEN** the `set-cookie` header includes `SameSite=Strict`

#### Scenario: Set cookie with custom domain and path
- **WHEN** `res.cookie("id", "val", { domain: "example.com", path: "/app" })` is called
- **THEN** the `set-cookie` header includes `Domain=example.com; Path=/app`

#### Scenario: Set cookie with value encoding
- **WHEN** `res.cookie("name", "a b")` is called (default encoding)
- **THEN** the cookie value is URL-encoded to `a%20b`

#### Scenario: Set cookie with encoding disabled
- **WHEN** `res.cookie("name", "a b", { encode: (v) => v })` is called
- **THEN** the cookie value is set as `a b` without encoding

### Requirement: res.clearCookie expires a cookie
The response object MUST have a `res.clearCookie(name, opts)` method that expires a cookie by setting an expired `Expires` and `Max-Age=0`.

#### Scenario: Clear a basic cookie
- **WHEN** `res.clearCookie("session")` is called
- **THEN** the `set-cookie` header is set with `session=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`

#### Scenario: Clear cookie with domain
- **WHEN** `res.clearCookie("session", { domain: "example.com" })` is called
- **THEN** the `set-cookie` header includes `Domain=example.com` along with expiration
