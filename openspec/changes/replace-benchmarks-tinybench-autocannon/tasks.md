## 1. Setup

- [x] 1.1 Add `tinybench` and `autocannon` as devDependencies in package.json
- [x] 1.2 Update `package.json` benchmark script: `"benchmark": "node benchmarks/run.js"`
- [x] 1.3 Create `benchmarks/run.js` orchestrator that runs tinybench and autocannon suites
- [x] 1.4 Create `benchmarks/micro/` directory for tinybench suites
- [x] 1.5 Create `benchmarks/macro/` directory for autocannon suites
- [x] 1.6 Verify existing `npm test` still passes (338 tests, 100% coverage)

## 2. Micro-benchmark suites (perf_hooks)

- [x] 2.1 Create `benchmarks/micro/utility.bench.js` — map 15 utility benchmarks from utility.js (parse, mime, ms, timeOffset, autoIndex, getStatus, params, partialHeaders, pipeable, reduce, writeHead, next, parse edge cases, isValidIP)
- [x] 2.2 Create `benchmarks/micro/middleware.bench.js` — map 12 middleware benchmarks from middleware.js (use registration, method routing, always, multiple handlers, list, ignore, simple/complex middleware execution, error handling, param extraction, CORS, response helpers)
- [x] 2.3 Create `benchmarks/micro/routing.bench.js` — map 5 routing benchmarks from routing.js (cached routes, uncached routes, parameter routes, static routes, not-found routes)
- [x] 2.4 Create `benchmarks/micro/serving.bench.js` — map 17 serving benchmarks from serving.js (serve small/medium/large/types/HEAD/OPTIONS/not-found/dir/dir-redirect/autoindex/range, stream methods/small/etag/no-etag, files, etag)
- [x] 2.5 Verify each micro benchmark suite runs with `node --test benchmarks/micro/*.bench.js` and produces statistics output

## 3. Macro-benchmark suites (autocannon)

- [x] 3.1 Create `benchmarks/macro/comparison.js` — map 4-server comparison from comparison.js (raw Node, Express, Fastify, Woodland) with optional framework detection
- [x] 3.2 Create `benchmarks/macro/http.js` — map 14 route types from http.js (simple GET, JSON, parameterized, nested parameterized, middleware chain, complex middleware, POST, PUT, DELETE, large response, error handling, 404, mixed workload, server startup)
- [x] 3.3 Framework detection at runtime (no deps added; skip unavailable frameworks dynamically)
- [x] 3.4 Verify comparison benchmark runs and skips unavailable frameworks gracefully
- [x] 3.5 Verify http.js benchmark runs against the full Woodland test app

## 4. Orchestrator and integration

- [x] 4.1 Implement `benchmarks/run.js` to first run all tinybench suites, then each autocannon suite
- [x] 4.2 Support `--suite` flag in run.js to run specific benchmark suites (micro/macro/comparison/etc.)
- [x] 4.3 Support `--help` flag in run.js showing available suites
- [x] 4.4 Verify `npm run benchmark` runs all suites end-to-end successfully

## 5. Cleanup and verification

- [x] 5.1 Delete `benchmark.js` root orchestrator
- [x] 5.2 Delete `benchmarks/comparison.js`
- [x] 5.3 Delete `benchmarks/http.js`
- [x] 5.4 Delete `benchmarks/middleware.js`
- [x] 5.5 Delete `benchmarks/routing.js`
- [x] 5.6 Delete `benchmarks/serving.js`
- [x] 5.7 Delete `benchmarks/utility.js`
- [x] 5.8 Verify `npm test` still passes (338 tests, 100% coverage) — benchmark files in `benchmarks/` must not be imported by tests
- [x] 5.9 Verify `npm run build` passes (generates dist files)
- [x] 5.10 Verify `npm run benchmark -- --suite micro` runs all new benchmarks successfully
