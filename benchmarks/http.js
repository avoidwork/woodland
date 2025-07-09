import {createServer} from "node:http";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {performance} from "node:perf_hooks";
import {woodland} from "../dist/woodland.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

// Configuration for HTTP benchmarks
const HTTP_BENCHMARK_CONFIG = {
	duration: 5, // seconds
	connections: 10,
	pipelining: 1,
	timeout: 10000 // ms
};

// Test server configuration
const SERVER_CONFIG = {
	port: 0, // Use random available port
	host: "127.0.0.1"
};

/**
 * Creates a woodland app with typical routes for benchmarking
 * @returns {Object} Woodland app instance
 */
function createTestApp () {
	const app = woodland({
		cacheSize: 1000,
		cacheTTL: 10000,
		etags: true,
		logging: {enabled: false}, // Disable logging for benchmarks
		time: true // Enable timing headers
	});

	// Simple routes
	app.get("/", (req, res) => {
		res.send("Hello World");
	});

	app.get("/ping", (req, res) => {
		res.send("pong");
	});

	app.get("/health", (req, res) => {
		res.json({status: "ok", timestamp: Date.now()});
	});

	// Parameter routes
	app.get("/users/:id", (req, res) => {
		res.json({id: req.params.id, name: `User ${req.params.id}`});
	});

	app.get("/users/:id/posts/:postId", (req, res) => {
		res.json({
			userId: req.params.id,
			postId: req.params.postId,
			title: `Post ${req.params.postId} by User ${req.params.id}`
		});
	});

	// CRUD routes
	app.post("/users", (req, res) => {
		res.status(201).json({id: Math.random().toString(36).substr(2, 9), created: true});
	});

	app.put("/users/:id", (req, res) => {
		res.json({id: req.params.id, updated: true});
	});

	app.delete("/users/:id", (req, res) => {
		res.status(204).send();
	});

	// Middleware chain
	app.use("/api/*", (req, res, next) => {
		req.apiVersion = "v1";
		next();
	});

	app.use("/api/protected/*", (req, res, next) => {
		req.authenticated = true;
		next();
	});

	app.get("/api/data", (req, res) => {
		res.json({
			data: Array.from({length: 100}, (_, i) => ({id: i, value: `item-${i}`}))
		});
	});

	app.get("/api/protected/secret", (req, res) => {
		res.json({secret: "classified", authenticated: req.authenticated});
	});

	// Error handling
	app.get("/error", (req, res) => {
		res.error(500);
	});

	app.get("/not-found", (req, res) => {
		res.error(404);
	});

	// Large response
	app.get("/large", (req, res) => {
		const largeData = {
			items: Array.from({length: 1000}, (_, i) => ({
				id: i,
				name: `Item ${i}`,
				description: `This is a description for item ${i}`,
				metadata: {
					created: new Date().toISOString(),
					tags: [`tag-${i % 10}`, `category-${i % 5}`]
				}
			}))
		};
		res.json(largeData);
	});

	// Static file serving
	app.files("/static", join(__dirname, "..", "test-files"));

	return app;
}

/**
 * Starts a test server and returns server info
 * @returns {Promise<Object>} Server information
 */
async function startTestServer () {
	const app = createTestApp();
	const server = createServer(app.route);

	return new Promise((resolve, reject) => {
		server.listen(SERVER_CONFIG.port, SERVER_CONFIG.host, () => {
			const address = server.address();
			resolve({
				server,
				port: address.port,
				host: address.address,
				url: `http://${address.address}:${address.port}`
			});
		});

		server.on("error", reject);
	});
}

/**
 * Stops a test server
 * @param {Object} server - Server instance
 * @returns {Promise<void>}
 */
async function stopTestServer (server) {
	return new Promise((resolve) => {
		server.close(resolve);
	});
}

/**
 * Runs a simple HTTP benchmark without autocannon
 * @param {string} url - URL to benchmark
 * @param {Object} options - Benchmark options
 * @returns {Promise<Object>} Benchmark results
 */
async function runSimpleHttpBenchmark (url, options = {}) {
	const {
		duration = HTTP_BENCHMARK_CONFIG.duration,
		connections = HTTP_BENCHMARK_CONFIG.connections
	} = options;

	const results = {
		requests: 0,
		errors: 0,
		duration: 0,
		avgLatency: 0,
		requestsPerSecond: 0
	};

	const startTime = performance.now();
	const endTime = startTime + (duration * 1000);
	const latencies = [];

	// Create workers to simulate concurrent connections
	const workers = Array.from({length: connections}, async () => {
		while (performance.now() < endTime) {
			const reqStart = performance.now();
			
			try {
				const response = await fetch(url);
				const reqEnd = performance.now();
				
				if (response.ok) {
					results.requests++;
					latencies.push(reqEnd - reqStart);
				} else {
					results.errors++;
				}
			} catch (error) {
				results.errors++;
			}
		}
	});

	// Wait for all workers to complete
	await Promise.all(workers);

	const actualDuration = (performance.now() - startTime) / 1000;
	results.duration = actualDuration;
	results.avgLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
	results.requestsPerSecond = results.requests / actualDuration;

	return results;
}

/**
 * Benchmark simple GET request
 */
async function benchmarkSimpleGet () {
	const serverInfo = await startTestServer();
	
	try {
		const results = await runSimpleHttpBenchmark(`${serverInfo.url}/`, {
			duration: 1, // Shorter duration for individual benchmark
			connections: 5
		});
		
		return results.requestsPerSecond;
	} finally {
		await stopTestServer(serverInfo.server);
	}
}

/**
 * Benchmark JSON response
 */
async function benchmarkJsonResponse () {
	const serverInfo = await startTestServer();
	
	try {
		const results = await runSimpleHttpBenchmark(`${serverInfo.url}/health`, {
			duration: 1,
			connections: 5
		});
		
		return results.requestsPerSecond;
	} finally {
		await stopTestServer(serverInfo.server);
	}
}

/**
 * Benchmark parameterized routes
 */
async function benchmarkParameterizedRoutes () {
	const serverInfo = await startTestServer();
	
	try {
		const results = await runSimpleHttpBenchmark(`${serverInfo.url}/users/123`, {
			duration: 1,
			connections: 5
		});
		
		return results.requestsPerSecond;
	} finally {
		await stopTestServer(serverInfo.server);
	}
}

/**
 * Benchmark nested parameterized routes
 */
async function benchmarkNestedParameterizedRoutes () {
	const serverInfo = await startTestServer();
	
	try {
		const results = await runSimpleHttpBenchmark(`${serverInfo.url}/users/123/posts/456`, {
			duration: 1,
			connections: 5
		});
		
		return results.requestsPerSecond;
	} finally {
		await stopTestServer(serverInfo.server);
	}
}

/**
 * Benchmark middleware chain
 */
async function benchmarkMiddlewareChain () {
	const serverInfo = await startTestServer();
	
	try {
		const results = await runSimpleHttpBenchmark(`${serverInfo.url}/api/data`, {
			duration: 1,
			connections: 5
		});
		
		return results.requestsPerSecond;
	} finally {
		await stopTestServer(serverInfo.server);
	}
}

/**
 * Benchmark complex middleware chain
 */
async function benchmarkComplexMiddleware () {
	const serverInfo = await startTestServer();
	
	try {
		const results = await runSimpleHttpBenchmark(`${serverInfo.url}/api/protected/secret`, {
			duration: 1,
			connections: 5
		});
		
		return results.requestsPerSecond;
	} finally {
		await stopTestServer(serverInfo.server);
	}
}

/**
 * Benchmark POST requests
 */
async function benchmarkPostRequests () {
	const serverInfo = await startTestServer();
	
	try {
		const results = await runSimpleHttpBenchmark(`${serverInfo.url}/users`, {
			duration: 1,
			connections: 5,
			method: "POST"
		});
		
		return results.requestsPerSecond;
	} finally {
		await stopTestServer(serverInfo.server);
	}
}

/**
 * Benchmark PUT requests
 */
async function benchmarkPutRequests () {
	const serverInfo = await startTestServer();
	
	try {
		const results = await runSimpleHttpBenchmark(`${serverInfo.url}/users/123`, {
			duration: 1,
			connections: 5,
			method: "PUT"
		});
		
		return results.requestsPerSecond;
	} finally {
		await stopTestServer(serverInfo.server);
	}
}

/**
 * Benchmark DELETE requests
 */
async function benchmarkDeleteRequests () {
	const serverInfo = await startTestServer();
	
	try {
		const results = await runSimpleHttpBenchmark(`${serverInfo.url}/users/123`, {
			duration: 1,
			connections: 5,
			method: "DELETE"
		});
		
		return results.requestsPerSecond;
	} finally {
		await stopTestServer(serverInfo.server);
	}
}

/**
 * Benchmark large response
 */
async function benchmarkLargeResponse () {
	const serverInfo = await startTestServer();
	
	try {
		const results = await runSimpleHttpBenchmark(`${serverInfo.url}/large`, {
			duration: 1,
			connections: 3 // Fewer connections for large responses
		});
		
		return results.requestsPerSecond;
	} finally {
		await stopTestServer(serverInfo.server);
	}
}

/**
 * Benchmark error handling
 */
async function benchmarkErrorHandling () {
	const serverInfo = await startTestServer();
	
	try {
		const results = await runSimpleHttpBenchmark(`${serverInfo.url}/error`, {
			duration: 1,
			connections: 5
		});
		
		return results.requestsPerSecond;
	} finally {
		await stopTestServer(serverInfo.server);
	}
}

/**
 * Benchmark 404 handling
 */
async function benchmarkNotFoundHandling () {
	const serverInfo = await startTestServer();
	
	try {
		const results = await runSimpleHttpBenchmark(`${serverInfo.url}/does-not-exist`, {
			duration: 1,
			connections: 5
		});
		
		return results.requestsPerSecond;
	} finally {
		await stopTestServer(serverInfo.server);
	}
}

/**
 * Benchmark mixed workload
 */
async function benchmarkMixedWorkload () {
	const serverInfo = await startTestServer();
	
	try {
		const urls = [
			`${serverInfo.url}/`,
			`${serverInfo.url}/health`,
			`${serverInfo.url}/users/123`,
			`${serverInfo.url}/api/data`,
			`${serverInfo.url}/ping`
		];
		
		const results = await Promise.all(
			urls.map(url => runSimpleHttpBenchmark(url, {
				duration: 0.5,
				connections: 2
			}))
		);
		
		// Return average requests per second
		return results.reduce((sum, result) => sum + result.requestsPerSecond, 0) / results.length;
	} finally {
		await stopTestServer(serverInfo.server);
	}
}

/**
 * Test server startup and shutdown performance
 */
async function benchmarkServerStartup () {
	const start = performance.now();
	const serverInfo = await startTestServer();
	const startupTime = performance.now() - start;
	
	const shutdownStart = performance.now();
	await stopTestServer(serverInfo.server);
	const shutdownTime = performance.now() - shutdownStart;
	
	// Return startup time as the benchmark result
	return 1000 / startupTime; // Convert to operations per second
}

// Export benchmark functions
export default {
	"simple GET": benchmarkSimpleGet,
	"JSON response": benchmarkJsonResponse,
	"parameterized routes": benchmarkParameterizedRoutes,
	"nested parameterized routes": benchmarkNestedParameterizedRoutes,
	"middleware chain": benchmarkMiddlewareChain,
	"complex middleware": benchmarkComplexMiddleware,
	"POST requests": benchmarkPostRequests,
	"PUT requests": benchmarkPutRequests,
	"DELETE requests": benchmarkDeleteRequests,
	"large response": benchmarkLargeResponse,
	"error handling": benchmarkErrorHandling,
	"404 handling": benchmarkNotFoundHandling,
	"mixed workload": benchmarkMixedWorkload,
	"server startup": benchmarkServerStartup
}; 