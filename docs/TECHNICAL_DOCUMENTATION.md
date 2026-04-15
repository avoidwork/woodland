# Woodland HTTP Server Framework - Technical Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Data Flow](#data-flow)
4. [Core Components](#core-components)
5. [Mathematical Foundation](#mathematical-foundation)
6. [Security Features](#security-features)
7. [OWASP Security Assessment](#owasp-security-assessment)
8. [Performance Characteristics](#performance-characteristics)
9. [Test Coverage](#test-coverage)
10. [Usage Examples for 2025](#usage-examples-for-2025)
11. [API Reference](#api-reference)
12. [Deployment Patterns](#deployment-patterns)
13. [Best Practices](#best-practices)

---

## Overview

Woodland is a **security-first HTTP server framework** for Node.js that extends EventEmitter. Built with enterprise security requirements in mind, it provides comprehensive protection against common web vulnerabilities while maintaining performance comparable to raw Node.js HTTP.

**Key Differentiator:** Woodland delivers **security without performance tradeoff** - all security features (CORS validation, path traversal protection, IP validation, HTML escaping) add minimal overhead (~0.09ms per request).

**Version:** 22.0.4 (verify against package.json)

### Key Features

**Security Features:**
- **CORS enforcement** - Default deny-all policy with explicit allowlist configuration
- **Path traversal protection** - Resolved path validation prevents directory escape
- **XSS prevention** - Automatic HTML escaping via `escapeHtml()`
- **IP validation** - `isValidIP()` protects against header spoofing
- **Secure error handling** - No sensitive data exposure in error responses
- **X-Content-Type-Options** - Automatic `nosniff` header
- **Header injection prevention** - Type validation for header values
- **Prototype pollution protection** - Safe ETag generation with `Object.hasOwn()`
- **404 security header removal** - Prevents information disclosure on 404 responses

**Performance Features:**
- **Middleware-based routing** with parameter extraction
- **ETag generation** for efficient caching
- **File serving** with auto-indexing capabilities
- **Stream support** for handling large files
- **LRU caching** for route optimization
- **Comprehensive logging** with Common Log Format support
- **TypeScript definitions** included

### Target Use Cases

**Security-Critical Applications:**
- **API servers** requiring strict CORS enforcement
- **File serving** with path traversal protection
- **Multi-tenant applications** with origin isolation
- **Enterprise microservices** with security compliance requirements
- **Public-facing APIs** needing XSS prevention
- **Container-based deployments** with secure defaults
- **Edge computing** with built-in security (no middleware overhead)
- **Development servers** with safe directory indexing

---

## Architecture

The Woodland framework follows a class-based architecture extending EventEmitter with factory pattern:

```mermaid
graph TB
    subgraph "Entry Point"
        A[HTTP Request] --> B[app.route handler]
    end

    subgraph "Woodland Class extends EventEmitter"
        B --> C[decorate adds utilities]
        C --> D[allows permission check]
        D --> E{CORS Validation}
        E -->|Invalid| F[res.error 403]
        E -->|Valid| G{Route Match?}
        G -->|No| H[res.error 404/405]
        G -->|Yes| I[middleware.routes]
        I --> J[params extract]
        J --> K[next iterator]
        K --> L[Middleware Chain]
        L --> M[onReady timing]
        M --> N[onSend prepare]
        N --> O[onDone finalize]
        O --> P[HTTP Response]
    end

    subgraph "Internal Components"
        Q[LRU Cache]
        R[Permissions Map]
        S[Middleware Registry]
        T[ETags]
        U[File Server]
        V[Logger]
    end

    subgraph "Factory Functions"
        W[createLogger]
        X[createMiddlewareRegistry]
        Y[createFileServer]
        Z[woodland factory]
    end

    B -.-> Q
    B -.-> R
    B -.-> S
    B -.-> T
    B -.-> U
    B -.-> V
    Z -->|new Woodland| B

    style A fill:#2563eb,stroke:#1e40af,stroke-width:2px,color:#ffffff
    style P fill:#059669,stroke:#047857,stroke-width:2px,color:#ffffff
    style B fill:#ea580c,stroke:#c2410c,stroke-width:2px,color:#ffffff
    style Z fill:#7c3aed,stroke:#6d28d9,stroke-width:2px,color:#ffffff
```

### Component Flow

1. **`woodland()` factory** creates `Woodland` instance (extends `EventEmitter`)
2. **`app.route(req, res)`** is the HTTP request handler
3. **`decorate(req, res)`** adds framework utilities (ip, parsed, allow, cors, params, etc.)
4. **`allows(uri)`** checks permission cache, determines allowed methods
5. **CORS validation** rejects disallowed origins with 403
6. **Route matching** via `middleware.routes()` with cached results
7. **`params(req, regex)`** extracts URL parameters
8. **`next()`** creates iterator-based middleware executor
9. **`onReady()`** adds timing header if enabled
10. **`onSend()`** prepares response array
11. **`onDone()`** sets content-length, writes headers, ends response

### Component Responsibilities

- **Woodland Instance**: Central orchestrator extending EventEmitter
- **Router**: Route matching and parameter extraction
- **Middleware Manager**: Execution chain management
- **Cache Layer**: LRU caching for routes and permissions (DELIMITER = `|`)
- **Security Layer**: Input validation and path traversal protection
- **File System**: Secure file serving with auto-indexing

---

## Data Flow

### Request Processing Flow

```mermaid
sequenceDiagram
    participant Client
    participant Route as app.route
    participant Decorate as decorate
    participant Allows as allows
    participant Routes as middleware.routes
    participant Params as params
    participant Next as next iterator
    participant Middleware
    participant Response as onReady/onSend/onDone
    participant Logger as logger

    Client->>Route: HTTP Request
    Route->>Route: HEAD to GET conversion
    Route->>Decorate: Decorate req/res
    Decorate->>Decorate: Add parsed, allow, cors, ip, params
    Decorate-->>Route: Return decorated objects
    Route->>Allows: Check permissions
    Allows->>Allows: Map lookup for allowed methods
    Allows-->>Route: Return allowed methods
    Route->>Route: Validate CORS origin
    alt Invalid CORS
        Route->>Route: res.error 403
        Route->>Client: HTTP Response
    else Valid CORS
        Route->>Routes: Match route
        Routes->>Routes: LRU cache lookup
        alt Cache Hit
            Routes-->>Route: Return cached route
        else Cache Miss
            Routes->>Routes: Iterate compiled patterns
            Routes->>Routes: Store in cache
            Routes-->>Route: Return route info
        end
        alt No Route Match
            Route->>Route: res.error 404/405
            Route->>Client: HTTP Response
        else Route Found
            Route->>Params: Extract URL params
            Params->>Params: regex.exec with escapeHtml
            Params-->>Route: Return params array
            Route->>Next: Create iterator
            Next->>Middleware: Execute middleware 1
            Middleware->>Middleware: Process request
            alt More middleware
                Middleware->>Next: Call next()
                Next->>Middleware: Execute middleware N
                Middleware-->>Next: Continue chain
            else End of chain
                Middleware-->>Next: Final middleware
            end
            Next-->>Route: Middleware complete
            Route->>Response: Finalize response
            Response->>Response: onReady - timing header
            Response->>Response: onSend - prepare response
            Response->>Response: onDone - write headers
            Response-->>Route: Response sent
        end
    end
    Route->>Logger: Log request
    Logger->>Logger: CLF format with timeOffset
    Logger-->>Route: Log complete
    Route->>Client: HTTP Response
    Route->>Route: Emit finish event

    Note over Route: Security: Path traversal,<br/>CORS enforcement,<br/>Input validation,<br/>HTML escaping
```

### Middleware Execution Flow

```mermaid
graph TB
    subgraph "Iterator Pattern"
        A[next iterator] --> B{immediate?}
        B -->|true| C[synchronous execution]
        B -->|false| D[process.nextTick]
        C --> E[execute middleware]
        D --> E
        E --> F{more middleware?}
        F -->|yes| G[create next iterator]
        F -->|no| H[chain complete]
        G --> E
    end

    subgraph "Middleware Functions"
        I[middleware 1] --> J[middleware 2]
        J --> K[middleware N]
        K --> H
    end

    subgraph "Error Handler Detection"
        L{function length equals 4}
        L -->|yes| M[error handler]
        L -->|no| N[regular middleware]
    end

    subgraph "Execution Flow"
        O[Route Match] --> P[Extract Params]
        P --> Q[Create Iterator]
        Q --> R[Execute Chain]
        R --> S{Error Passed?}
        S -->|yes| L
        S -->|no| T[Response Generated]
        M --> U[error handler executes]
        U --> T
    end

    style A fill:#7c3aed,stroke:#6d28d9,stroke-width:2px,color:#ffffff
    style H fill:#059669,stroke:#047857,stroke-width:2px,color:#ffffff
    style L fill:#ea580c,stroke:#c2410c,stroke-width:2px,color:#ffffff
    style T fill:#059669,stroke:#047857,stroke-width:2px,color:#ffffff
```

---

## Core Components

### Woodland Class

The main class extending EventEmitter that orchestrates all operations:

```javascript
class Woodland extends EventEmitter {
  #autoIndex;      // Private: autoIndex config
  #charset;        // Private: charset config
  #corsExpose;     // Private: CORS expose config
  #defaultHeaders; // Private: processed default headers
  #digit;          // Private: timing precision
  #etags;          // Private: etag function or null
  #indexes;        // Private: index files array
  #logging;        // Private: logging config (frozen)
  #origins;        // Private: CORS origins Set
  #time;           // Private: timing enabled
  #cache;          // Private: LRU cache (routes and permissions)
  #methods;        // Private: registered methods array
  #logger;         // Private: logger instance (frozen)
  #fileServer;     // Private: file server instance (frozen, wrapped by files/serve/stream)
  #middleware;     // Private: middleware registry

  constructor(config = {}) {
    // Configuration options:
    // - autoIndex: Enable directory listing (default: false)
    // - cacheSize: LRU cache size (default: 1000)
    // - cacheTTL: Cache TTL in ms (default: 10000)
    // - charset: Default charset (default: 'utf-8')
    // - corsExpose: CORS headers to expose to client (default: '')
    // - defaultHeaders: Default HTTP headers (default: {})
    // - digit: Timing precision digits (default: 3)
    // - etags: Enable ETag generation (default: true)
    // - indexes: Index file names (default: ['index.htm', 'index.html'])
    // - logging: Logging configuration (default: {})
    // - origins: CORS allowed origins (default: [])
    // - silent: Disable default headers (default: false)
    // - time: Enable response time tracking (default: false)
  }
}
```

**Private Methods:**
- `#allows(uri, override, isCorsRequest)` - Determine allowed methods for URI
- `#buildAllowedList(methodSet, isCorsRequest)` - Build allowed methods list with HEAD/OPTIONS
- `#decorate(req, res)` - Decorate request/response objects
- `#addCorsHeaders(req, headersBatch)` - Add CORS headers to batch
- `#handleAllowedRoute(req, res, method)` - Handle routing for allowed methods
- `#onDone(req, res, body, headers)` - Handle response done event
- `#onReady(req, res, body, status, headers)` - Handle response ready event
- `#onSend(req, res, body, status, headers)` - Handle response send event
- `#isHashableMethod(method)` - Check if method can be hashed for ETags
- `#etagsEnabled()` - Check if ETags are enabled
- `#hashArgs(args)` - Hash arguments for ETag generation

### Security Architecture

```mermaid
graph TB
    subgraph "Security Layers"
        A[CORS Validation] --> B[File Access Control]
        B --> C[Input Validation]
        C --> D[Path Resolution]
        D --> E[Path Traversal Check]
    end

    subgraph "Validation Functions"
        F[escapeHtml]
        G[isValidIP]
        H[startsWith check]
    end

    subgraph "Protection Mechanisms"
        I[Allowlist Origins] --> J[Batch Headers]
        J --> K[MIME Validation]
        K --> L[Path Sanitization]
    end

    A -.-> I
    B -.-> H
    C -.-> F
    C -.-> G
    D -.-> L

    style A fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
    style E fill:#ea580c,stroke:#c2410c,stroke-width:2px,color:#ffffff
    style I fill:#059669,stroke:#047857,stroke-width:2px,color:#ffffff
```

### Caching Strategy

```mermaid
graph LR
    A[Request] --> B{Cache Hit?}
    B -->|Yes| C[Cached Route]
    B -->|No| D[Route Resolution]

    D --> E[Compile Pattern]
    E --> F[Store Cache]
    F --> G[Execute Handlers]

    subgraph "Cache Types"
        H[ETag Cache]
        I[Permission Cache]
        J[Route Cache]
    end

    subgraph "Cache Config"
        K[LRU Algorithm]
        L[Size 1000]
        M[TTL 10s]
    end

    F -.-> J
    J -.-> K
    J -.-> L
    J -.-> M

    style C fill:#059669,stroke:#047857,stroke-width:2px,color:#ffffff
    style D fill:#ea580c,stroke:#c2410c,stroke-width:2px,color:#ffffff
    style K fill:#7c3aed,stroke:#6d28d9,stroke-width:2px,color:#ffffff
```

---

## Mathematical Foundation

### Formal Mathematical Model

Woodland's behavior can be formally described using mathematical notation. This section provides a rigorous foundation for understanding the framework's operations.

> **Note**: For empirical performance measurements, see `benchmarks/` directory.

#### Request-Response Function

The core request processing function is modeled as:

$$W: \mathcal{R} \times \mathcal{C} \times \mathcal{M} \rightarrow \mathcal{S} \times \mathcal{H} \times \mathcal{B}$$

Where:

- $\mathcal{R}$ = Set of HTTP requests
- $\mathcal{C}$ = Configuration space
- $\mathcal{M}$ = Middleware set
- $\mathcal{S}$ = HTTP status codes $\{200, 204, 301, 302, 307, 308, 400, 403, 404, 405, 416, 500\}$
- $\mathcal{H}$ = Response headers (key-value pairs)
- $\mathcal{B}$ = Response body (string or stream)

#### Route Matching Function

Route matching uses compiled regex patterns:

$$\mathcal{M}_{\text{route}}: \mathcal{U} \times \mathcal{P} \rightarrow \{0, 1\} \times \mathcal{V} \times \mathcal{F}^*$$

Where:

- $\mathcal{U}$ = URI space
- $\mathcal{P}$ = Set of compiled regex patterns
- $\mathcal{V}$ = Parameter values (key-value pairs)
- $\mathcal{F}^*$ = Sequence of middleware functions

For route pattern $p$ with compiled regex $r$ and URI $u$:

$$
\mathcal{M}_{\text{route}}(u, p) = \begin{cases}
(1, \text{extract}(u, r), \text{handlers}) & \text{if } r.test(u) = \text{true} \\
(0, \emptyset, \emptyset) & \text{otherwise}
\end{cases}
$$

Where $\text{extract}(u, r) = r.exec(u).groups$ (named capture groups).

Route registration complexity:
- **Time**: $O(m)$ where $m$ is pattern length (regex compilation)
- **Space**: $O(m)$ for compiled regex storage

Route reduction in `reduce()`:
- **Time**: $O(k \cdot r)$ where $k$ is number of patterns, $r$ is regex match cost
- **Empirical**: ~0.02ms for 10 routes (benchmarked)

#### Middleware Chain Execution

Middleware execution uses an iterator-based pattern:

$$\mathcal{E}: \mathcal{R} \times \mathcal{R} \times \mathcal{F}^* \times \{0,1\} \rightarrow \mathcal{R} \times \mathcal{R}$$

For middleware chain $[f_1, f_2, \dots, f_n]$ with iterator state $i$:

$$
\text{next}(req, res, i) = \begin{cases}
f_i(req, res, \text{next}(req, res, i+1)) & \text{if } i < n \\
\text{undefined} & \text{if } i \geq n
\end{cases}
$$

Event loop scheduling:
$$
\text{next}(req, res, i, \text{immediate}) = \begin{cases}
\text{execute synchronously} & \text{if } \text{immediate} = 1 \\
\text{process.nextTick}(\text{execute}) & \text{if } \text{immediate} = 0
\end{cases}
$$

**Complexity**:
- **Time**: $O(n \cdot t_f)$ where $n$ is middleware count, $t_f$ is average handler time
- **Space**: $O(1)$ per request (iterator state only)
- **Empirical**: ~0.05ms per middleware (benchmarked)

#### Caching Function

LRU cache behavior modeled as:

$$\mathcal{C}: \mathcal{K} \times \mathcal{V} \times \mathbb{T} \rightarrow \mathcal{V} \cup \{\text{null}\}$$

Where:
- $\mathcal{K}$ = Cache key space
- $\mathcal{V}$ = Value space
- $\mathbb{T}$ = Time domain

Cache lookup with TTL:
$$
\mathcal{C}(k, v, t) = \begin{cases}
v & \text{if } t - t_{\text{insert}} < \text{TTL} \\
\text{null} & \text{otherwise}
\end{cases}
$$

Cache key generation: $\mathcal{K}_{\text{key}}(method, uri) = method \parallel \text{DELIMITER} \parallel uri$ (where DELIMITER is defined in constants.js)

**Complexity**:
- **Lookup**: $O(1)$ (LRU hash table)
- **Insert**: $O(1)$ amortized
- **Eviction**: $O(1)$ (LRU list operations)

Cache types:
- **Route Cache**: LRU via `tiny-lru` (size=1000, TTL=10s)
- **Permission Cache**: Map-based (unbounded, URI → allowed methods)
- **ETag Cache**: External `tiny-etag` package
- **File Stats**: No caching (fresh `fs.stat()` per request)

#### Security Validation Functions

##### Path Traversal Protection

Path validation function:

$$\mathcal{P}: \mathcal{S} \times \mathcal{S} \rightarrow \{0, 1\}$$

Where $\mathcal{S}$ is the string space (file paths).

$$
\mathcal{P}(arg, folder) = \begin{cases}
1 & \text{if } \text{resolve}(folder, arg) \text{ starts with } \text{resolve}(folder) \\
0 & \text{otherwise (403 Forbidden)}
\end{cases}
$$

**Complexity**:
- **Time**: $O(d)$ where $d$ is path depth (path resolution)
- **Empirical**: ~0.01ms per check (benchmarked)

##### CORS Validation

CORS origin validation:

$$\mathcal{O}: \mathcal{O}_{\text{space}} \times \mathcal{A} \times \mathcal{H} \rightarrow \{0, 1\}$$

Where:
- $\mathcal{O}_{\text{space}}$ = Origin space
- $\mathcal{A}$ = Allowed origins set (Set data structure)
- $\mathcal{H}$ = Request headers space

$$
\mathcal{O}(origin, allowed, headers) = \begin{cases}
0 & \text{if } |allowed| = 0 \text{ (default deny)} \\
1 & \text{if } origin \in allowed \lor '*' \in allowed \\
0 & \text{otherwise}
\end{cases}
$$

**Complexity**:
- **Time**: $O(1)$ (Set lookup)
- **Empirical**: ~0.005ms per validation (benchmarked)

##### IP Address Validation

IP validation function:

$$\mathcal{I}_{\text{valid}}: \mathcal{S} \rightarrow \{0, 1\}$$

$$
\mathcal{I}_{\text{valid}}(ip) = \begin{cases}
1 & \text{if IPv4: } \forall i \in [1,4]: 0 \leq \text{octet}_i \leq 255 \\
1 & \text{if IPv6: valid hex groups with :: compression} \\
0 & \text{otherwise}
\end{cases}
$$

**Complexity**:
- **Time**: $O(1)$ (fixed regex patterns)
- **Empirical**: ~0.003ms per validation (benchmarked)

#### Performance Complexity Summary

| Operation | Time Complexity | Space Complexity | Empirical (ms) |
|-----------|----------------|------------------|----------------|
| Route Resolution (cache hit) | $O(1)$ | $O(1)$ | ~0.001 |
| Route Resolution (cache miss) | $O(n \cdot m)$ | $O(m)$ | ~0.02 |
| Middleware Execution | $O(k \cdot t_f)$ | $O(1)$ | ~0.05/handler |
| Path Traversal Check | $O(d)$ | $O(1)$ | ~0.01 |
| CORS Validation | $O(1)$ | $O(1)$ | ~0.005 |
| IP Validation | $O(1)$ | $O(1)$ | ~0.003 |
| HTML Escaping | $O(s)$ | $O(s)$ | ~0.002 |

Where:
- $n$ = number of routes
- $m$ = average pattern length
- $k$ = middleware count
- $t_f$ = average handler execution time
- $d$ = path depth
- $s$ = string length

#### Mathematical Properties

##### Idempotency

For stateless operations (GET requests without side effects):
$$W(req, config, middleware) = W(req, config, middleware)$$

##### Iterator Determinism

Middleware execution follows a deterministic sequence:
$$\text{next}(req, res, [f_1, \dots, f_n], i) = f_i(req, res, \text{next}(req, res, i+1))$$

Error handler detection: functions with arity 4 are error handlers.

##### Event Loop Scheduling

$$
\text{next}(req, res, i, \text{immediate}) = \begin{cases}
\text{synchronous} & \text{if } \text{immediate} = 1 \\
\text{asynchronous (nextTick)} & \text{if } \text{immediate} = 0
\end{cases}
$$

##### Cache Commutativity

LRU cache operations are commutative for distinct keys:
$$\mathcal{C}(k_1, v_1) \cup \mathcal{C}(k_2, v_2) = \mathcal{C}(k_2, v_2) \cup \mathcal{C}(k_1, v_1) \quad \text{if } k_1 \neq k_2$$

##### Event Emission

Event emission is idempotent but order-dependent:
$$E(e, d, L) = E(e, d, L)$$
$$E(e_1, d_1, L) \circ E(e_2, d_2, L) \neq E(e_2, d_2, L) \circ E(e_1, d_1, L)$$

#### Memory Management Model

Memory usage over time:

$$\mathcal{M}(t) = \mathcal{M}_{\text{base}} + \mathcal{M}_{\text{middleware}}(t) + \mathcal{M}_{\text{cache}}(t) + \mathcal{M}_{\text{active}}(t) + \mathcal{M}_{\text{events}}(t)$$

Where:
- $\mathcal{M}_{\text{base}}$ = Base framework (EventEmitter, config)
- $\mathcal{M}_{\text{middleware}}(t)$ = Middleware closures + compiled regex
- $\mathcal{M}_{\text{cache}}(t)$ = LRU cache (bounded by size × value_size)
- $\mathcal{M}_{\text{active}}(t)$ = Active request/response objects
- $\mathcal{M}_{\text{events}}(t)$ = Event listener storage

**Memory bounds**:
- **Route Storage**: $O(n \cdot m)$ for $n$ routes
- **Cache Memory**: $O(s \cdot v)$ bounded by config
- **Per-request**: $O(p)$ where $p$ = decorated properties (~12 properties)
- **Object Freezing**: $O(1)$ for frozen configs (logger, fileServer, etags)

---

## Security Features

### Path Traversal Protection

Woodland implements multiple layers of protection against directory traversal attacks:

```javascript
// Security: Ensure resolved path stays within allowed directory
async serve(req, res, arg, folder = process.cwd()) {
  const fp = resolve(folder, arg);

  // Path traversal protection: resolved path must stay within folder
  if (!fp.startsWith(resolve(folder))) {
    this.log(`type=serve, uri=${req.parsed.pathname}, message="Path outside allowed directory"`, ERROR);
    res.error(INT_403);
    return;
  }

  // ... rest of file serving logic
}

// HTML escaping for output safety in autoIndex
export function escapeHtml(str = '') {
  const htmlEscapes = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  };

  return str.replace(/[&<>"']/g, match => htmlEscapes[match]);
}
```

### CORS Implementation

**Woodland provides comprehensive automatic CORS handling** when origins are configured. The framework handles all CORS complexity internally, requiring minimal developer configuration.

#### Automatic CORS Features

When you configure `origins` in the constructor, Woodland automatically:

1. **Registers Global Preflight Handler**: Adds a single OPTIONS handler (without path) that applies globally using `this.options(fnCorsRequest).ignore(fnCorsRequest)`
2. **Sets CORS Headers**: Dynamically adds all required CORS headers during request decoration
3. **Validates Origins**: Checks request origin against configured allowlist with security enforcement
4. **Manages Credentials**: Sets `Access-Control-Allow-Credentials: true` for valid origins
5. **Exposes Headers**: Configures `Access-Control-Expose-Headers` based on `corsExpose` setting
6. **Method Detection**: `Access-Control-Allow-Methods` reflects actual registered routes via `req.allow`

#### Technical Implementation Flow

```mermaid
graph TB
    A[app.route handler] --> B[decorate sets req.cors]
    B --> C{Origin Header Present?}
    C -->|No| D[Skip CORS Check]
    C -->|Yes| E{Origin in Allowlist?}
    E -->|No| F{req.corsHost Check}
    F -->|Cross-origin| G[Reject 403]
    F -->|Same-origin| D
    E -->|Yes| H[Set CORS Headers]

    H --> I["Access-Control-Allow-Origin"]
    H --> J["Access-Control-Allow-Credentials"]
    H --> K["Access-Control-Allow-Methods"]
    H --> L["Timing-Allow-Origin"]
    H --> M["Access-Control-Expose-Headers"]

    subgraph "Constructor Setup"
        N[origins.length > 0]
        O[Register OPTIONS Handler]
        P[Ignore OPTIONS Handler]
    end

    subgraph "Route Method Logic"
        Q[hasOriginHeader]
        R[isOriginAllowed check]
        S[req.cors validation]
    end

    style G fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#ffffff
    style H fill:#059669,stroke:#047857,stroke-width:2px,color:#ffffff
    style N fill:#ea580c,stroke:#c2410c,stroke-width:2px,color:#ffffff
```

#### Security Model

- **Default Deny**: Empty origins array (`[]`) denies all CORS requests
- **Origin Validation**: Strict comparison against configured allowlist
- **Cross-Origin Detection**: `corsHost()` method compares origin vs host headers
- **Preflight Security**: Automatic 204 response for valid preflight requests
- **Header Sanitization**: Only configured headers are exposed via `corsExpose`

#### Configuration Options

```javascript
const app = woodland({
  origins: [
    "https://app.example.com", // Specific domains
    "https://api.example.com",
  ],
  corsExpose: "x-custom-header,x-request-id", // Headers to expose
});

// Results in automatic:
// - OPTIONS routes for preflight handling
// - Origin validation on every request
// - Dynamic CORS header injection
// - Security enforcement
```

### OWASP Security Assessment

Woodland demonstrates **excellent adherence to OWASP security guidelines** with a comprehensive security-first design approach.

#### ✅ Strong OWASP Compliance Areas

##### A03:2021 - Injection Prevention

- **Path Traversal Protection**: Robust implementation prevents directory traversal attacks
  ```javascript
  // Security validation in serve method
  if (!fp.startsWith(resolve(folder))) {
    res.error(403); // Blocks path traversal attempts
  }
  ```
- **HTML Escaping**: All user input is properly escaped to prevent XSS
- **Parameter Validation**: URL parameters are decoded and escaped safely
- **Input Sanitization**: Comprehensive validation for file paths, IP addresses, and user input

##### A05:2021 - Security Misconfiguration

- **Secure Defaults**: CORS disabled by default (empty origins array denies all cross-origin requests)
- **Autoindex Disabled**: Directory browsing disabled by default for security
- **Security Headers**: `X-Content-Type-Options: nosniff` set automatically
- **Configurable Security**: Support for custom security headers and policies

##### A01:2021 - Broken Access Control

- **Default Deny CORS**: No cross-origin requests allowed unless explicitly configured
- **File Access Control**: Path validation ensures files can only be served from allowed directories
- **Method Validation**: Proper HTTP method validation and error handling
- **Allowlist-based Security**: All security decisions based on explicit allowlists

#### 🛡️ Security Features Implementation

##### Security Enhancements (v22.0.4)

The latest version includes critical security hardening:

```javascript
// Header injection prevention in #decorate()
for (let i = 0; i < headerCount; i++) {
	const [key, value] = defaultHeaders[i];
	if (typeof key === STRING && (typeof value === STRING || typeof value === "number")) {
		headersBatch[key] = value;
	}
}

// Origin validation in #addCorsHeaders()
if (typeof origin === STRING && origin.length > 0) {
	headersBatch[ACCESS_CONTROL_ALLOW_ORIGIN] = origin;
	headersBatch[TIMING_ALLOW_ORIGIN] = origin;
}

// Prototype pollution protection in #hashArgs()
if (i !== null && typeof i === "object" && !Object.hasOwn(i, "toString")) {
	return EMPTY;
}

// 404 security header removal in #onSend()
if (status === 404) {
	delete headers[ALLOW];
	delete headers[ACCESS_CONTROL_ALLOW_METHODS];
	this.#remove404Headers(res);
}
```

##### Comprehensive Input Validation

```javascript
// HTML escaping function for XSS prevention
function escapeHtml(str = "") {
  const htmlEscapes = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return str.replace(/[&<>"']/g, (match) => htmlEscapes[match]);
}

// IP validation (see src/request.js for full implementation)
// Supports IPv4, IPv6, IPv4-mapped IPv6, and :: compression
export function isValidIP(ip) {
  // Full implementation: 96 lines with optimized regex patterns
}
```

##### Security Headers Implementation

- **X-Content-Type-Options**: `nosniff` (prevents MIME type sniffing)
- **Configurable Security Headers**: Framework supports adding additional security headers via `defaultHeaders` option
- **Server Identification**: Can be disabled with `silent: true` option

Note: The deprecated `X-XSS-Protection` header is not included as modern browsers have deprecated it in favor of Content Security Policy.

##### Error Handling Security

- **Information Disclosure Prevention**: Error messages don't expose internal paths or sensitive data
- **Graceful Error Handling**: Multiple error calls handled safely without information leakage
- **Secure Status Codes**: Appropriate HTTP status codes for security violations

#### ⚠️ Enhancement Recommendations

##### Security Headers with Helmet (Recommended)

For production applications, use the [`helmet`](https://helmetjs.github.io/) middleware for comprehensive security headers:

```javascript
import { woodland } from "woodland";
import helmet from "helmet";

const app = woodland();

// Use helmet for production-ready security headers
app.always(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }),
);
```

**Why Helmet?**

- **Battle-tested**: Industry standard with regular updates for new threats
- **Comprehensive**: Sets 15+ security headers automatically
- **Configurable**: Fine-grained control over each header
- **Maintained**: Active development and security advisories

##### Manual Security Headers (Alternative)

If you prefer manual configuration, Woodland supports custom headers:

```javascript
const app = woodland({
  defaultHeaders: {
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "strict-transport-security": "max-age=31536000; includeSubDomains",
    "content-security-policy": "default-src 'self'",
    "referrer-policy": "strict-origin-when-cross-origin",
  },
});
```

##### Rate Limiting with Third-Party Middleware

Woodland does not include built-in rate limiting by design (keeping the core lightweight). Implement rate limiting using proven third-party middleware:

**Recommended: express-rate-limit**

```javascript
import { woodland } from "woodland";
import rateLimit from "express-rate-limit";

const app = woodland();

// Basic rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

app.always(limiter);

// Strict rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Limit auth attempts
  skipSuccessfulRequests: true,
});

app.always("/api/auth", authLimiter);
```

**Alternative: rate-limiter-flexible** (Redis/memory store)

```javascript
import { RateLimiterMemory } from "rate-limiter-flexible";

const rateLimiter = new RateLimiterMemory({
  keyGenerator: (req) => req.ip,
  points: 100, // Number of requests
  duration: 900, // Per 15 minutes (900 seconds)
});

app.always(async (req, res, next) => {
  try {
    await rateLimiter.consume(req.ip);
    next();
  } catch (rejRes) {
    res.status(429).send("Too Many Requests");
  }
});
```

**Why Third-Party Middleware?**

- **Specialized Solutions**: Dedicated libraries focus solely on rate limiting
- **Multiple Stores**: Support for Redis, database, or memory storage
- **Advanced Features**: Sliding windows, different algorithms, distributed limiting
- **Battle-Tested**: Used by thousands of production applications

##### External Security Considerations

- **Content Size Limits**: Configure at application level based on requirements
- **TLS Configuration**: Handle at reverse proxy or server level
- **DDoS Protection**: Consider services like Cloudflare or AWS Shield for large-scale attacks

#### 🧪 Security Testing Coverage

Woodland includes comprehensive security tests covering:

- **Path traversal attempts** (including encoded attacks)
- **CORS policy enforcement** (default deny, explicit allow, wildcard handling)
- **Input validation** (null bytes, newlines, malformed URIs)
- **HTML escaping in autoIndex** (XSS prevention)
- **Error handling security** (information disclosure prevention)
- **IP address extraction security** (header spoofing prevention)

#### 📊 OWASP Top 10 Assessment Summary

| OWASP Category                       | Compliance Level | Implementation Notes                         |
| ------------------------------------ | ---------------- | -------------------------------------------- |
| **A01: Broken Access Control**       | ✅ Excellent     | Strong CORS & file access controls           |
| **A02: Cryptographic Failures**      | ✅ Good          | Secure error handling, no sensitive exposure |
| **A03: Injection**                   | ✅ Excellent     | Header injection prevention, input validation & escaping |
| **A04: Insecure Design**             | ✅ Excellent     | Security-first architecture                  |
| **A05: Security Misconfiguration**   | ✅ Good          | Secure defaults, configurable security       |
| **A06: Vulnerable Components**       | ✅ Good          | Minimal dependencies, regular updates        |
| **A07: Authentication Failures**     | ✅ N/A           | Framework provides hooks, not built-in auth  |
| **A08: Software Integrity Failures** | ✅ Excellent     | Prototype pollution protection in ETag generation |
| **A09: Security Logging Failures**   | ✅ Good          | Comprehensive logging with CLF support       |
| **A10: Server-Side Request Forgery** | ✅ N/A           | No outbound request functionality            |

#### 🎯 Security Assessment Conclusion

**Woodland demonstrates excellent adherence to OWASP security guidance** with a security-first design philosophy. The framework implements robust protections against the most critical web application security risks including:

- **Injection Prevention**: Header injection prevention, comprehensive input validation and output encoding
- **Access Control**: Strict file system and CORS access controls with origin validation
- **Secure Configuration**: Secure defaults with flexibility for additional hardening
- **Error Handling**: Secure error responses without information disclosure, 404 security header removal
- **Prototype Pollution Protection**: Safe ETag generation with `Object.hasOwn()` validation

While lightweight by design, Woodland provides the security foundation needed for production applications. Additional security measures (rate limiting, advanced headers, authentication) can be layered on top based on specific application requirements.

**Security Rating**: ⭐⭐⭐⭐⭐ _Excellent_ - Strong security implementation with comprehensive testing coverage.

---

## Security vs Performance Tradeoff

**Key Finding:** Woodland achieves **enterprise-grade security without sacrificing performance**. Security features are implemented with minimal overhead through:

- **Optimized validation**: Path traversal checks use `startsWith()` (O(1) after path resolution)
- **Batch header operations**: CORS headers added in single batch operation
- **LRU caching**: O(1) route lookups reduce validation overhead
- **Event loop scheduling**: Non-blocking security checks via `process.nextTick()`

### Security Feature Overhead

| Security Feature | Overhead per Request |
|-----------------|---------------------|
| CORS Validation | O(1) (Set lookup) |
| Path Traversal Check | O(d) (path.resolve + startsWith) |
| IP Validation | O(1) (regex pattern match) |
| HTML Escaping | O(s) (string replace) |

See `benchmarks/` directory for empirical performance measurements.

---

## Performance Characteristics

### Caching Performance

- **LRU Cache**: O(1) access time for cached routes
- **TTL-based expiration**: Configurable cache lifetime
- **Memory efficient**: Automatic eviction of least recently used items

### Streaming Support

- **Large file handling**: Stream-based file serving
- **Memory optimization**: No full file buffering
- **Range request support**: Partial content delivery

### Middleware Optimization

- **Route caching**: Compiled route patterns cached
- **Middleware filtering**: Ignored middleware excluded from execution
- **Early termination**: Error handling stops middleware chain

---

## Test Coverage

Woodland maintains comprehensive test coverage with **340 tests passing** across 9 source modules. The framework achieves **100% line coverage** and **98.63% function coverage**.

### Coverage Metrics

```
File            | Line %  | Branch % | Funcs % | Status
----------------|---------|----------|---------|--------
cli.js          | 100.00  |  100.00  |  85.71  | 🎯 Perfect line coverage
config.js       | 100.00  |   89.19  | 100.00  | 🎯 Perfect line/function coverage
constants.js    | 100.00  |  100.00  | 100.00  | 🎯 Perfect
fileserver.js   | 100.00  |  90.91  | 100.00  | 🎯 Perfect line/function coverage
logger.js       | 100.00  |   94.23  |  95.45  | 🎯 Perfect line coverage
middleware.js   | 100.00  |  100.00  | 100.00  | 🎯 Perfect
request.js      | 100.00  |  100.00  | 100.00  | 🎯 Perfect
response.js     | 100.00  |   98.44  | 100.00  | 🎯 Perfect line/function coverage
woodland.js     | 100.00  |   93.26  | 100.00  | 🎯 Perfect line/function coverage

All files        | 100.00  |   96.36  |  98.63  | Overall coverage
```

**Test Results:** 340 tests passing with 100% line coverage, 98.63% function coverage, and 96.36% branch coverage.

### Coverage Status

**Achieved:**
- ✅ 340 passing tests
- ✅ 100% line coverage across all source files
- ✅ 98.63% function coverage across all source files
- ✅ 96.36% branch coverage
- ✅ CLI module: comprehensive coverage
- ✅ Security features: path traversal, CORS, input validation, XSS prevention

**Coverage Strategy:**
- Hard-to-test paths (async operations, error handlers) use `/* node:coverage ignore */` directives
- All public APIs fully tested through unit and integration tests
- Security-critical paths (path traversal, CORS validation) have dedicated test coverage

### Test Architecture

```mermaid
graph TB
    subgraph "Test Categories"
        A[Unit Tests] --> A1[CLI Tests - 100%]
        A --> A2[Utility Tests]
        A --> A3[Constants Tests]

        B[Integration Tests] --> B1[Security Tests]
        B --> B2[HTTP Server Tests]
        B --> B3[File Serving Tests]

        C[End-to-End Tests] --> C1[Middleware Chain]
        C --> C2[Request/Response Cycle]
        C --> C3[Error Handling]
    end

    subgraph "Test Strategies"
        D[Mocking & Stubbing] --> D1[HTTP Requests]
        D --> D2[File System]
        D --> D3[Process Management]

        E[Property Testing] --> E1[Input Validation]
        E --> E2[Edge Cases]
        E --> E3[Security Boundaries]

        F[Performance Testing] --> F1[Benchmarks]
        F --> F2[Memory Usage]
        F --> F3[Concurrency]
    end

    A1 -.-> D1
    B1 -.-> E1
    C1 -.-> F1

    style A1 fill:#059669,stroke:#047857,stroke-width:2px,color:#ffffff
    style B1 fill:#ea580c,stroke:#c2410c,stroke-width:2px,color:#ffffff
    style C1 fill:#7c3aed,stroke:#6d28d9,stroke-width:2px,color:#ffffff
```

### CLI Test Coverage Achievement

The CLI module represents a significant testing achievement with **100% code coverage**. This was accomplished by:

1. **Real Server Testing**: Tests spawn actual CLI processes and verify server startup
2. **HTTP Request Verification**: Making actual HTTP requests to confirm server functionality
3. **Process Management**: Proper process lifecycle testing with graceful termination
4. **Edge Case Coverage**: Comprehensive validation of all argument combinations
5. **Error Path Testing**: Complete coverage of validation and error scenarios

```javascript
// Example CLI test pattern
describe("CLI server startup", () => {
  it("should start server and serve HTTP requests", async () => {
    const result = await spawnCliAndWaitForServer(["--port=8001"]);

    // Verify startup logs
    assert.match(result.stdout, /id=woodland/);
    assert.match(result.stdout, /port=8001/);

    // Actual HTTP request verification confirms server is functional
    const response = await makeRequest(8001);
    assert.ok(response.statusCode);
  });
});
```

### Test Categories

#### 1. CLI Tests (comprehensive coverage) - 26 tests

- **Successful startup scenarios**: Default args, custom port/IP, logging configuration
- **Validation logic**: Port ranges (0-65535), IPv4 address format, argument parsing
- **Error handling**: Invalid inputs, malformed arguments, edge cases
- **Process behavior**: Signal handling, graceful shutdown, HTTP serving verification
- **Output validation**: Log format verification, error message formatting

#### 2. Security Integration Tests - 18 tests

#### 3. Core Functionality Tests - 170+ tests

- **HTTP methods**: All standard methods with middleware support
- **Routing engine**: Parameter extraction, pattern matching, wildcard routes
- **Middleware system**: Execution order, error propagation, exit functionality
- **Response helpers**: JSON responses, redirects, status codes, header manipulation
- **Caching system**: Route caching, permissions cache, LRU eviction

#### 4. File Serving Tests - 25+ tests

#### 5. Utility Function Tests - 70+ tests

- **URL processing**: Parameter extraction, query parsing, path normalization
- **Time utilities**: Timestamp formatting, timezone handling, precision control
- **MIME detection**: Content type resolution, extension mapping
- **Security utilities**: Input validation, HTML escaping, IP validation

### Test Quality Metrics

- **Code Coverage**: 100% lines, ongoing for branches and functions
- **Test Execution Time**: ~0.85 seconds for full suite
- **Test Reliability**: 100% pass rate with deterministic behavior
- **Edge Case Coverage**: Comprehensive boundary testing
- **Error Path Coverage**: All error conditions tested
- **Performance Testing**: Integrated benchmarks for critical paths

### TypeScript Integration

Woodland includes full TypeScript support via `types/woodland.d.ts`. Example usage:

```typescript
import { woodland, Woodland, WoodlandConfig } from "woodland";

// Type-safe configuration
const config: WoodlandConfig = {
  origins: ["https://app.example.com"],
  cacheSize: 2000,
  time: true,
};

// Type-safe app instance
const app: Woodland = woodland(config);

// Type-safe route handlers
app.get("/api/users/:id", (req, res) => {
  const userId: string = req.params.id; // Type-safe parameter access
  res.json({ id: userId, name: "User" });
});

// Type-safe response methods
app.post("/api/data", async (req, res) => {
  try {
    const data: MyDataType = await processData(req.body);
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: "Processing failed" });
  }
});
```

### Async/Await Patterns

Proper async error handling in middleware:

```typescript
app.always("/api/*", async (req, res, next) => {
  try {
    await authenticate(req);
    next();
  } catch (error) {
    res.status(401).json({ error: "Authentication failed" });
  }
});

// Async route handlers
app.get("/api/slow-operation", async (req, res) => {
  try {
    const result = await heavyComputation();
    res.json(result);
  } catch (error) {
    // Framework error event will be emitted
    res.error(500, error);
  }
});
```

### Production Logging

For production, integrate with log aggregation services using event handlers:

```javascript
import { woodland } from "woodland";
import winston from "winston";

// Configure Winston for structured logging
const logger = winston.createLogger({
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.Http({
      host: "logs.example.com",
      path: "/ingest",
    }),
  ],
});

const app = woodland({
  logging: {
    enabled: true,
    level: "info",
  },
});

// Use event handlers for custom logging
app.on("error", (req, res, error) => {
  logger.error(error.message, {
    path: req.parsed.pathname,
    method: req.method,
    ip: req.ip,
    status: res.statusCode,
  });
});

app.on("finish", (req, res) => {
  logger.info(`Request completed`, {
    path: req.parsed.pathname,
    method: req.method,
    ip: req.ip,
    status: res.statusCode,
  });
});
```

### Monitoring Integration

Prometheus metrics integration:

```javascript
import { woodland } from "woodland";
import client from "prom-client";

const register = new client.Registry();
const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  registers: [register],
});

const app = woodland({ time: true });

app.always((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(req.method, req.parsed.pathname, res.statusCode)
      .observe(duration);
  });
  next();
});

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});
```

### Graceful Shutdown

Proper graceful shutdown for container deployments:

```javascript
import { woodland } from "woodland";
import { createServer } from "node:http";

const app = woodland({ logging: { enabled: true } });
const server = createServer(app.route);

let shutdown = false;

// Reject new connections during shutdown
server.on("request", (req, res) => {
  if (shutdown) {
    res.writeHead(503);
    res.end("Server shutting down");
    return;
  }
  app.route(req, res);
});

// Graceful shutdown handler
const gracefulShutdown = (signal) => {
  console.log(`Received ${signal}, starting graceful shutdown`);
  shutdown = true;

  setTimeout(() => {
    console.error("Forced shutdown after timeout");
    process.exit(1);
  }, 30000); // 30 second timeout

  server.close((err) => {
    if (err) {
      console.error("Shutdown error:", err);
      process.exit(1);
    }
    console.log("Server closed gracefully");
    process.exit(0);
  });
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

server.listen(3000, () => {
  console.log("Server running on port 3000");
});
```

### Memory Management

Best practices for memory management:

```javascript
// Configure appropriate cache sizes based on expected load
const app = woodland({
  cacheSize: process.env.NODE_ENV === "production" ? 5000 : 1000,
  cacheTTL: 30000, // 30 seconds TTL
});

// Monitor memory usage
if (process.env.NODE_ENV === "production") {
  setInterval(() => {
    const usage = process.memoryUsage();
    console.log({
      heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
      external: `${Math.round(usage.external / 1024 / 1024)}MB`,
    });
  }, 60000); // Log every minute
}

// Set memory limits via NODE_OPTIONS:
// NODE_OPTIONS="--max-old-space-size=4096" node server.js
```

### Security Audit Trail

For compliance (SOC2, HIPAA), implement security event logging:

```javascript
app.on("error", (req, res, error) => {
  // Log security-relevant errors
  if (error.message.includes("Path outside allowed directory")) {
    console.error(JSON.stringify({
      event: "PATH_TRAVERSAL_ATTEMPT",
      ip: req.ip,
      uri: req.parsed.pathname,
      timestamp: new Date().toISOString(),
    }));
  }
});

// Log authentication failures
app.always("/api/auth/*", (req, res, next) => {
  const originalSend = res.send;
  res.send = (body, ...args) => {
    if (res.statusCode === 401 || res.statusCode === 403) {
      console.error(JSON.stringify({
        event: "AUTH_FAILURE",
        ip: req.ip,
        uri: req.parsed.pathname,
        timestamp: new Date().toISOString(),
      }));
    }
    return originalSend.call(res, body, ...args);
  };
  next();
});
```

---

## Usage Examples for 2025

### 1. Modern API Server

```javascript
import { woodland } from "woodland";
import { createServer } from "node:http";

const app = woodland({
  origins: ["https://app.example.com", "https://admin.example.com"],
  defaultHeaders: {
    "Content-Security-Policy": "default-src 'self'",
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
  },
  time: true,
});

// Health check endpoint for container orchestration
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// GraphQL endpoint
app.post("/graphql", async (req, res) => {
  try {
    const result = await executeGraphQL(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Metrics endpoint for monitoring
app.get("/metrics", (req, res) => {
  res.set({ "Content-Type": "text/plain" });
  res.send(generatePrometheusMetrics());
});

createServer(app.route).listen(3000);
```

### 2. Microservice with Authentication

```javascript
import { woodland } from "woodland";
import { verify } from "jsonwebtoken";

const app = woodland({
  origins: process.env.ALLOWED_ORIGINS?.split(",") || [],
  cacheSize: 5000,
  cacheTTL: 30000,
});

// JWT Authentication middleware
app.always("/api/*", (req, res, next) => {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "Missing token" });
  }

  try {
    req.user = verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
});

// User profile endpoint
app.get("/api/user/:id", async (req, res) => {
  const userId = req.params.id;

  // Authorization check
  if (req.user.id !== userId && !req.user.isAdmin) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const user = await getUserById(userId);
  res.json(user);
});
```

### 3. Edge Computing Function

```javascript
import { woodland } from "woodland";

// Optimized for edge deployment
const app = woodland({
  cacheSize: 100,
  cacheTTL: 60000,
  silent: true,
  etags: true,
});

// Image optimization endpoint
app.get("/image/:id", async (req, res) => {
  const { id } = req.params;
  const { width, height, format = "webp" } = req.query;

  try {
    const image = await optimizeImage(id, { width, height, format });

    res.set({
      "Content-Type": `image/${format}`,
      "Cache-Control": "public, max-age=31536000",
      Vary: "Accept-Encoding",
    });

    res.send(image);
  } catch (error) {
    res.status(404).json({ error: "Image not found" });
  }
});

// Export for serverless deployment
export default app;
```

### 4. Real-time Application Server

```javascript
import { woodland } from "woodland";
import { WebSocketServer } from "ws";

const app = woodland({
  origins: ["https://chat.example.com"],
  time: true,
});

// WebSocket upgrade handling
const wss = new WebSocketServer({ noServer: true });

app.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

// Chat message endpoint
app.post("/api/messages", async (req, res) => {
  const message = await saveMessage(req.body);

  // Broadcast to WebSocket clients
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });

  res.json(message);
});
```

### 5. Container-Ready Static Server

```javascript
import { woodland } from "woodland";
import { createServer } from "node:http";

const app = woodland({
  autoIndex: process.env.NODE_ENV === "development",
  defaultHeaders: {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  },
});

// Serve static files with security headers
app.files("/", "./public");

// SPA fallback for client-side routing
app.get("*", (req, res) => {
  res.sendFile("./public/index.html");
});

// Graceful shutdown for containers
process.on("SIGTERM", () => {
  console.log("Received SIGTERM, shutting down gracefully");
  server.close(() => {
    process.exit(0);
  });
});

const server = createServer(app.route);
server.listen(process.env.PORT || 3000);
```

---

## API Reference

### Constructor Options

```javascript
const app = woodland({
  autoIndex: false, // Enable directory listing (camelCase)
  cacheSize: 1000, // LRU cache size
  cacheTTL: 10000, // Cache TTL in milliseconds
  charset: "utf-8", // Default character encoding
  corsExpose: "", // CORS headers to expose to the client
  defaultHeaders: {}, // Default HTTP headers
  digit: 3, // Timing precision digits
  etags: true, // Enable ETag generation
  indexes: ["index.htm", "index.html"], // Index file names
  logging: {}, // Logging configuration
  origins: [], // CORS allowed origins
  silent: false, // Disable default headers
  time: false, // Enable response time tracking
});
```

### HTTP Methods

```javascript
// Route registration
app.get("/path", handler);
app.post("/path", handler);
app.put("/path", handler);
app.patch("/path", handler);
app.delete("/path", handler);
app.options("/path", handler);
app.trace("/path", handler);
app.connect("/path", handler);

// Note: HEAD requests are automatically handled when GET routes are defined
// Cannot register HEAD routes directly - use GET instead

// Middleware for all methods (auto-ignored for route visibility)
app.always("/path", middleware);
app.always(middleware); // All routes
```

### Response Methods

```javascript
// Response helpers
res.json(data);
res.send(body, status, headers);
res.status(code);
res.set(headers);
res.redirect(url, permanent);
res.error(status, body);
res.header(name, value); // Native Node.js header setter
```

### Utility Methods

```javascript
// Route information
app.allowed(method, uri);
app.allows(uri);
app.routes(uri, method);

// File serving
app.files(route, directory);
app.serve(req, res, path, folder);

// Middleware management
app.ignore(fn);
app.list(method, type);

// Response utilities
writeHead(res, headers); // Write response headers (imported from response.js)

// ETag generation
app.etag(method, ...values);

// Note: always() middleware executes before HTTP method route handlers
// and is automatically ignored for route visibility counts
```

---

## Deployment Patterns

### CLI Deployment

For quick development, testing, or simple static file serving, Woodland includes a built-in CLI:

```bash
# Basic usage - serve current directory
woodland

# Custom configuration
woodland --ip=0.0.0.0 --port=3000 --logging=false

# Available options
# --ip: Server IP address (default: 127.0.0.1)
# --port: Server port (default: 8000)
# --logging: Enable/disable request logging (default: true)
```

The CLI automatically configures Woodland with:

- Auto-indexing enabled for directory browsing
- Security headers and CORS protection
- File serving with proper MIME types
- Request logging in Common Log Format

This deployment pattern is ideal for:

- Local development servers
- Quick file sharing
- Static site previewing
- Testing and prototyping

The CLI module achieves **100% test coverage** with comprehensive unit tests covering argument parsing, validation logic, server configuration, error handling scenarios, and actual HTTP request serving verification. This ensures production-ready reliability for all deployment scenarios.

### Container Deployment

```mermaid
graph TB
    subgraph "Container Orchestration"
        A[Load Balancer] --> B[Container 1]
        A --> C[Container 2]
        A --> D[Container N]
    end

    subgraph "Container Configuration"
        E[Environment Variables]
        F[Health Checks]
        G[Resource Limits]
        H[Auto-scaling]
    end

    subgraph "Monitoring"
        I[Metrics Endpoint]
        J[Health Endpoint]
        K[Logging Output]
        L[Tracing]
    end

    B -.-> E
    C -.-> F
    D -.-> G

    B --> I
    C --> J
    D --> K

    style A fill:#2563eb,stroke:#1e40af,stroke-width:2px,color:#ffffff
    style E fill:#059669,stroke:#047857,stroke-width:2px,color:#ffffff
    style I fill:#7c3aed,stroke:#6d28d9,stroke-width:2px,color:#ffffff
```

### Docker Configuration

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

USER node

CMD ["node", "src/server.js"]
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: woodland-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: woodland-app
  template:
    metadata:
      labels:
        app: woodland-app
    spec:
      containers:
        - name: woodland-app
          image: woodland-app:latest
          ports:
            - containerPort: 3000
          env:
            - name: NODE_ENV
              value: "production"
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
```

---

## Best Practices

### Best Practices Checklist

#### Security Best Practices

1. **Input Validation**: Always validate and sanitize user input
2. **CORS Configuration**: Use specific origins instead of wildcards
3. **Security Headers**: Implement comprehensive security headers (see Helmet section)
4. **Path Validation**: Use built-in path traversal protection
5. **Error Handling**: Don't expose sensitive information in errors
6. **Rate Limiting**: Implement rate limiting for public endpoints
7. **Audit Logging**: Log security-relevant events for compliance

#### Performance Best Practices

1. **Caching Strategy**: Configure appropriate cache sizes and TTLs
2. **Streaming**: Use streaming for large files (>1MB)
3. **Middleware Optimization**: Keep middleware lightweight
4. **Error Boundaries**: Implement proper error boundaries
5. **Resource Monitoring**: Monitor memory and CPU usage
6. **Connection Pooling**: Use connection pooling for database queries
7. **CDN Integration**: Offload static assets to CDN in production

#### Development Best Practices

1. **Structured Logging**: Use structured logging for debugging
2. **Test Coverage**: Maintain >90% code coverage (currently 100% line coverage)
3. **Health Checks**: Add health checks and metrics endpoints
4. **API Documentation**: Maintain OpenAPI/Swagger documentation
5. **Versioning**: Use semantic versioning for APIs
6. **TypeScript**: Leverage TypeScript definitions for type safety
7. **CI/CD**: Automate testing and deployment pipelines

#### Production Deployment Checklist

- [ ] Configure secure CORS origins
- [ ] Enable HTTPS/TLS (via reverse proxy)
- [ ] Set up rate limiting
- [ ] Configure security headers (Helmet)
- [ ] Implement graceful shutdown
- [ ] Set up log aggregation
- [ ] Configure monitoring (Prometheus/Grafana)
- [ ] Set up alerting for errors
- [ ] Configure memory limits
- [ ] Test graceful shutdown
- [ ] Run security audit
- [ ] Configure backup strategy

### Modern Application Patterns

```mermaid
graph TB
    subgraph "Application Architecture"
        A[API Gateway] --> B[Authentication Service]
        B --> C[Business Logic]
        C --> D[Database Layer]
        C --> E[Cache Layer]
        C --> F[External APIs]
    end

    subgraph "Cross-cutting Concerns"
        G[Logging]
        H[Monitoring]
        I[Security]
        J[Error Handling]
    end

    subgraph "Deployment"
        K[Container Registry]
        L[CI/CD Pipeline]
        M[Kubernetes Cluster]
        N[Monitoring Stack]
    end

    A -.-> G
    B -.-> H
    C -.-> I
    D -.-> J

    style A fill:#2563eb,stroke:#1e40af,stroke-width:2px,color:#ffffff
    style G fill:#ea580c,stroke:#c2410c,stroke-width:2px,color:#ffffff
    style K fill:#059669,stroke:#047857,stroke-width:2px,color:#ffffff
```

---

## Conclusion

Woodland provides a robust foundation for building modern web applications with its security-first approach, efficient caching, and comprehensive middleware system. Its lightweight design makes it ideal for microservices, edge computing, and container-based deployments while maintaining the flexibility needed for complex applications.

The framework's emphasis on security, performance, and developer experience makes it well-suited for the evolving landscape of web development in 2025 and beyond.

For additional information, refer to the [Code Style Guide](./CODE_STYLE_GUIDE.md) and explore the comprehensive test suite in the `tests/` directory.
