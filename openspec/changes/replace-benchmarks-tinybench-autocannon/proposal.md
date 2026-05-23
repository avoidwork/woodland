## Why

The current benchmark harness uses a hand-rolled `node:perf_hooks` timer with basic statistics. This custom implementation lacks consistent methodology, makes it hard to compare results over time, and doesn't provide the statistical rigor needed for meaningful performance analysis. External contributors and auditors also can't verify benchmark validity without reading custom timing code.

Replacing it with **tinybench** (for micro-benchmarks: internal functions, middleware chains, route lookup) and **autocannon** (for macro-benchmarks: live HTTP server throughput against raw Node, Express, Fastify) gives standardized, well-tested benchmarking tools with proper statistics, CI integrability, and community support.

## What Changes

- Remove hand-rolled `benchmark.js` orchestrator and all existing benchmark suites
- Create new benchmark suites using **tinybench** for micro-benchmarks (unit-level function performance)
- Create new benchmark suites using **autocannon** for macro-benchmarks (live HTTP server performance)
- Add `tinybench` and `autocannon` as devDependencies
- Update `package.json` benchmark script to use new tooling
- Preserve all current benchmark coverage areas (comparison, HTTP, middleware, routing, serving, utility) with equivalent tests

## Capabilities

### New Capabilities
- `benchmark-tinybench`: Micro-benchmark suite using tinybench for internal function performance testing (utility functions, middleware, routing, serving)
- `benchmark-autocannon`: Macro-benchmark suite using autocannon for live HTTP server performance testing (comparison with Express/Fastify, end-to-end HTTP)

### Modified Capabilities
- *(none — no existing specs to modify)*

## Impact

- **Dependencies**: Add `tinybench` and `autocannon` as devDependencies
- **Removed**: Custom `benchmark.js` orchestrator (~254 lines), 6 existing benchmark suite files (~2,000+ lines total)
- **Scripts**: `npm run benchmark` will change to run tinybench + autocannon suites
- **CI**: Benchmark scripts will be callable via `node --test benchmarks/` for tinybench; autocannon runs as standalone scripts
- **Coverage**: All current benchmark coverage areas preserved in equivalent new form
