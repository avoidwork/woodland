import {createServer} from "node:http";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {woodland} from "../dist/woodland.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

// Test server configuration
const SERVER_CONFIG = {
	port: 0, // Use random available port
	host: "127.0.0.1"
};

// Shared test server instance
let testServer = null;
let testServerUrl = null;

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

	// Mixed workload route
	app.get("/mixed", (req, res) => {
		const choice = Math.random();
		if (choice < 0.33) {
			res.json({type: "json", data: "test"});
		} else if (choice < 0.66) {
			res.send("text response");
		} else {
			res.redirect("/redirected");
		}
	});

	// Static file serving
	app.files("/static", join(__dirname, "..", "test-files"));

	return app;
}

/**
 * Starts the shared test server
 * @returns {Promise<void>}
 */
async function startSharedTestServer () {
	if (testServer) {
		return Promise.resolve(); // Already started
	}

	const app = createTestApp();
	testServer = createServer(app.route);

	return new Promise((resolve, reject) => {
		testServer.listen(SERVER_CONFIG.port, SERVER_CONFIG.host, () => {
			const address = testServer.address();
			testServerUrl = `http://${address.address}:${address.port}`;
			resolve();
		});

		testServer.on("error", reject);
	});
}

/**
 * Stops the shared test server
 * @returns {Promise<void>}
 */
async function stopSharedTestServer () {
	if (!testServer) {
		return Promise.resolve();
	}

	return new Promise(resolve => {
		testServer.close(() => {
			testServer = null;
			testServerUrl = null;
			resolve();
		});
	});
}

/**
 * Ensures the test server is running
 * @returns {Promise<void>}
 */
async function ensureTestServer () {
	if (!testServer) {
		await startSharedTestServer();
	}
}

/**
 * Performs a single HTTP request for benchmarking
 * @param {string} path - URL path to request
 * @param {Object} options - Request options
 * @returns {Promise<Response>} Fetch response
 */
async function performHttpRequest (path, options = {}) {
	await ensureTestServer();
	const url = `${testServerUrl}${path}`;

	return await fetch(url, options);
}

// Individual benchmark functions that perform single HTTP requests

/**
 * Benchmark simple GET request
 */
async function benchmarkSimpleGet () {
	const response = await performHttpRequest("/");
	await response.text(); // Consume response

	return response.status;
}

/**
 * Benchmark JSON response
 */
async function benchmarkJsonResponse () {
	const response = await performHttpRequest("/health");
	await response.json(); // Consume response

	return response.status;
}

/**
 * Benchmark parameterized routes
 */
async function benchmarkParameterizedRoutes () {
	const response = await performHttpRequest("/users/123");
	await response.json(); // Consume response

	return response.status;
}

/**
 * Benchmark nested parameterized routes
 */
async function benchmarkNestedParameterizedRoutes () {
	const response = await performHttpRequest("/users/123/posts/456");
	await response.json(); // Consume response

	return response.status;
}

/**
 * Benchmark middleware chain
 */
async function benchmarkMiddlewareChain () {
	const response = await performHttpRequest("/api/data");
	await response.json(); // Consume response

	return response.status;
}

/**
 * Benchmark complex middleware chain
 */
async function benchmarkComplexMiddleware () {
	const response = await performHttpRequest("/api/protected/secret");
	await response.json(); // Consume response

	return response.status;
}

/**
 * Benchmark POST requests
 */
async function benchmarkPostRequests () {
	const response = await performHttpRequest("/users", {
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify({name: "Test User"})
	});
	await response.json(); // Consume response

	return response.status;
}

/**
 * Benchmark PUT requests
 */
async function benchmarkPutRequests () {
	const response = await performHttpRequest("/users/123", {
		method: "PUT",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify({name: "Updated User"})
	});
	await response.json(); // Consume response

	return response.status;
}

/**
 * Benchmark DELETE requests
 */
async function benchmarkDeleteRequests () {
	const response = await performHttpRequest("/users/123", {
		method: "DELETE"
	});
	await response.text(); // Consume response

	return response.status;
}

/**
 * Benchmark large response
 */
async function benchmarkLargeResponse () {
	const response = await performHttpRequest("/large");
	await response.json(); // Consume response

	return response.status;
}

/**
 * Benchmark error handling
 */
async function benchmarkErrorHandling () {
	const response = await performHttpRequest("/error");
	await response.text(); // Consume response

	return response.status;
}

/**
 * Benchmark 404 handling
 */
async function benchmarkNotFoundHandling () {
	const response = await performHttpRequest("/not-found");
	await response.text(); // Consume response

	return response.status;
}

/**
 * Benchmark mixed workload
 */
async function benchmarkMixedWorkload () {
	const response = await performHttpRequest("/mixed");
	// Handle different response types
	const contentType = response.headers.get("content-type");
	if (contentType && contentType.includes("application/json")) {
		await response.json();
	} else {
		await response.text();
	}

	return response.status;
}

/**
 * Benchmark server startup (creates a new app instance)
 */
async function benchmarkServerStartup () {
	const app = createTestApp();

	return app ? 1 : 0; // Return success indicator
}

// Export benchmark functions
const benchmarks = {
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

// Add cleanup function to benchmark exports
benchmarks.cleanup = stopSharedTestServer;

export default benchmarks;

// Cleanup when process exits
process.on("exit", () => {
	if (testServer) {
		testServer.close();
	}
});

process.on("SIGINT", () => {
	if (testServer) {
		testServer.close();
	}
	process.exit(0);
});
