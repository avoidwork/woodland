## Context

Woodland currently uses a hand-rolled benchmark harness built on `node:perf_hooks`. The harness lives in `benchmark.js` (~254 lines) with 6 suite files in `benchmarks/` (~2,000+ lines total). It provides warmup, iteration control, and basic statistics (mean, median, stddev) but requires custom code to understand. Contributors cannot easily add new benchmarks or run subsets without editing multiple files.

The project uses `npm run benchmark` which dynamically installs Express and Fastify to run comparison benchmarks. This is ad-hoc and non-reproducible — dependencies are installed at runtime, not managed.

## Goals / Non-Goals

**Goals:**
- Replace all current benchmark code with standardized tools (tinybench + autocannon)
- Preserve 100% coverage of existing benchmark areas (comparison, HTTP, middleware, routing, serving, utility)
- Provide reproducible, scriptable benchmarking with proper CI integration
- Keep benchmark code simple to read and extend

**Non-Goals:**
- Migrating existing unit tests (`tests/`) — benchmarks are separate from tests
- Adding benchmarking to the package exports or runtime
- Benchmark harness changes to CI pipeline (not part of this change)
- Benchmark-as-a-service or web UI for results

## Decisions

### Decision 1: Use perf_hooks directly for micro-benchmarks (tinybench fallback)

**Choice**: `node:perf_hooks` (via tinybench-compatible output) over tinybench API

**Rationale**: tinybench v4-v6 has a compatibility bug with Node 25+ where the `run()` method hangs indefinitely. Until this is fixed upstream, micro-benchmarks use `performance.now()` directly while maintaining identical output format (mean, median, min, max, ops/sec) and the same structure as what tinybench would produce. tinybench is included as a devDependency for when Node 25 compatibility is resolved.

### Decision 2: Use autocannon for macro-benchmarks

**Choice**: autocannon over boomer or bombardier

**Rationale**: autocannon is by the Node.js core team (Matteo Collina), is the de facto standard for Node.js HTTP benchmarking, provides detailed latency histograms and throughput metrics out of the box, and integrates with Mochawesome and other CI reporters. It's a CLI tool, so benchmarks run via `autocannon` commands rather than inline JS.

### Decision 3: Project structure

```
benchmarks/
├── micro/                    # tinybench suites (replaces middleware.js, routing.js, serving.js, utility.js)
│   ├── middleware.bench.js
│   ├── routing.bench.js
│   ├── serving.bench.js
│   └── utility.bench.js
├── macro/                    # autocannon suites (replaces comparison.js, http.js)
│   ├── comparison.js         # runs autocannon against Woodland/Express/Fastify/raw
│   └── http.js               # runs autocannon against full Woodland app with varied routes
└── run.js                    # orchestrator: runs all suites (tinybench + autocannon)
```

### Decision 4: Benchmark script in package.json

```json
"benchmark": "node benchmarks/run.js"
```

The `run.js` orchestrator runs tinybench suites first, then runs each autocannon script. Both produce terminal output with statistics.

### Decision 5: Express/Fastify comparison dependency handling

Instead of installing Express/Fastify at benchmark runtime (current behavior), they are added as optional devDependencies with `optional: true` in `package.json`. The comparison benchmark detects whether they are available and skips those lanes if not.

## Risks / Trade-offs

[Risk] autocannon requires live HTTP servers — benchmarks are inherently slower and more variable than in-process benchmarks.
→ Mitigation: Keep autocannon runs short (default 5s duration), use warmup, and report p50/p95/p99 latency percentiles.

[Risk] tinybench runs via `node --test` which may interact with existing test runner configurations.
→ Mitigation: tinybench suites are in `benchmarks/` not `tests/`, so they won't interfere with the `npm test` coverage enforcement. Add `--test-name-pattern=false` if needed.

[Risk] Removing ~2,000 lines of proven benchmark code may introduce regressions if new benchmarks don't cover existing edge cases.
→ Mitigation: Map each existing benchmark to a new test explicitly in the task list and verify coverage parity before completing.
