import {woodland} from "../dist/woodland.js";

// Create test app instance with typical configuration
const app = woodland({
	cacheSize: 1000,
	cacheTTL: 10000,
	etags: true,
	logging: {enabled: false} // Disable logging for benchmarks
});

// Mock request and response objects for testing
const createMockRequest = (method = "GET", url = "/", headers = {}) => ({
	method,
	url,
	headers: {
		host: "localhost:3000",
		"user-agent": "benchmark-test",
		...headers
	},
	connection: {
		remoteAddress: "127.0.0.1"
	}
});

const createMockResponse = () => {
	const headers = new Map();
	const response = {
		statusCode: 200,
		headersSent: false,
		headers: headers,
		setHeader: (name, value) => headers.set(name.toLowerCase(), value),
		getHeader: (name) => headers.get(name.toLowerCase()),
		removeHeader: (name) => headers.delete(name.toLowerCase()),
		setHeaders: (hdrs) => {
			if (hdrs instanceof Map) {
				for (const [key, value] of hdrs) {
					headers.set(key.toLowerCase(), value);
				}
			} else if (hdrs instanceof Headers) {
				for (const [key, value] of hdrs) {
					headers.set(key.toLowerCase(), value);
				}
			}
		},
		writeHead: (statusCode, statusMessage, hdrs) => {
			response.statusCode = statusCode;
			if (hdrs) {
				Object.entries(hdrs).forEach(([key, value]) => {
					headers.set(key.toLowerCase(), value);
				});
			}
		},
		end: (data) => {
			response.headersSent = true;
			// Store response data if needed for testing
			if (data) {
				response._responseData = data;
			}
		},
		on: () => {},
		emit: () => {},
		pipe: () => {}
	};
	return response;
};

// Helper function to create a fresh app instance for each benchmark
const createFreshApp = () => {
	return woodland({
		cacheSize: 1000,
		cacheTTL: 10000,
		etags: true,
		logging: {enabled: false}
	});
};

/**
 * Benchmark middleware registration via use() method
 */
function benchmarkMiddlewareRegistration () {
	const freshApp = createFreshApp();
	const middleware = (req, res, next) => next();
	
	// Register middleware on random routes
	const routes = [
		"/",
		"/api/users",
		"/api/users/:id",
		"/api/posts",
		"/api/posts/:id",
		"/admin/dashboard",
		"/static/css/style.css"
	];
	
	const route = routes[Math.floor(Math.random() * routes.length)];
	
	return freshApp.use(route, middleware);
}

/**
 * Benchmark middleware registration for specific HTTP methods
 */
function benchmarkSpecificMethodRegistration () {
	const freshApp = createFreshApp();
	const middleware = (req, res, next) => next();
	
	const methods = ["get", "post", "put", "delete", "patch"];
	const method = methods[Math.floor(Math.random() * methods.length)];
	
	return freshApp[method]("/api/test", middleware);
}

/**
 * Benchmark middleware registration for all methods (always)
 */
function benchmarkAlwaysMiddlewareRegistration () {
	const freshApp = createFreshApp();
	const middleware = (req, res, next) => next();
	
	return freshApp.always(middleware);
}

/**
 * Benchmark middleware registration with multiple handlers
 */
function benchmarkMultipleHandlersRegistration () {
	const freshApp = createFreshApp();
	const middleware1 = (req, res, next) => next();
	const middleware2 = (req, res, next) => next();
	const middleware3 = (req, res, next) => next();
	
	return freshApp.use("/api/complex", middleware1, middleware2, middleware3);
}

/**
 * Benchmark request decoration (adding properties to req/res)
 */
function benchmarkRequestDecoration () {
	const freshApp = createFreshApp();
	const req = createMockRequest();
	const res = createMockResponse();
	
	// Add some routes first
	freshApp.get("/", (req, res) => res.send("OK"));
	freshApp.get("/api/users", (req, res) => res.json([]));
	freshApp.post("/api/users", (req, res) => res.json({}));
	
	return freshApp.decorate(req, res);
}

/**
 * Benchmark middleware execution chain - simple middleware
 */
function benchmarkSimpleMiddlewareExecution () {
	const freshApp = createFreshApp();
	
	// Add simple middleware
	freshApp.use((req, res, next) => {
		req.timestamp = Date.now();
		next();
	});
	
	freshApp.get("/test", (req, res) => {
		res.send("OK");
	});
	
	const req = createMockRequest("GET", "/test");
	const res = createMockResponse();
	
	return freshApp.route(req, res);
}

/**
 * Benchmark middleware execution chain - complex middleware stack
 */
function benchmarkComplexMiddlewareExecution () {
	const freshApp = createFreshApp();
	
	// Add multiple middleware layers
	freshApp.always((req, res, next) => {
		req.startTime = Date.now();
		next();
	});
	
	freshApp.use("/api/*", (req, res, next) => {
		req.apiVersion = "v1";
		next();
	});
	
	freshApp.use("/api/users/*", (req, res, next) => {
		req.resource = "users";
		next();
	});
	
	freshApp.use((req, res, next) => {
		req.processed = true;
		next();
	});
	
	freshApp.get("/api/users/:id", (req, res) => {
		res.json({id: req.params.id});
	});
	
	const req = createMockRequest("GET", "/api/users/123");
	const res = createMockResponse();
	
	return freshApp.route(req, res);
}

/**
 * Benchmark middleware execution with error handling
 */
function benchmarkErrorHandlingMiddleware () {
	const freshApp = createFreshApp();
	
	// Add error-producing middleware
	freshApp.use((req, res, next) => {
		if (Math.random() > 0.5) {
			next(new Error("Test error"));
		} else {
			next();
		}
	});
	
	// Error handler middleware
	freshApp.use((err, req, res, next) => {
		if (res.status) {
			res.status(500).send("Error handled");
		} else {
			res.statusCode = 500;
			if (typeof res.end === 'function') {
				res.end("Error handled");
			} else {
				// Fallback for mock responses
				res.headersSent = true;
				res._responseData = "Error handled";
			}
		}
	});
	
	freshApp.get("/error-test", (req, res) => {
		res.send("OK");
	});
	
	const req = createMockRequest("GET", "/error-test");
	const res = createMockResponse();
	
	return freshApp.route(req, res);
}

/**
 * Benchmark list() method - getting registered routes
 */
function benchmarkRouteList () {
	const freshApp = createFreshApp();
	
	// Add many routes
	for (let i = 0; i < 20; i++) {
		freshApp.get(`/route-${i}`, (req, res) => res.send(`Route ${i}`));
		freshApp.post(`/route-${i}`, (req, res) => res.send(`Route ${i}`));
	}
	
	const methods = ["get", "post"];
	const method = methods[Math.floor(Math.random() * methods.length)];
	const type = Math.random() > 0.5 ? "array" : "object";
	
	try {
		return freshApp.list(method, type);
	} catch (e) {
		// If list fails, just return an empty array/object
		return type === "array" ? [] : {};
	}
}

/**
 * Benchmark ignore() method - marking middleware as ignored
 */
function benchmarkIgnoreMiddleware () {
	const freshApp = createFreshApp();
	const middleware = (req, res, next) => next();
	
	// Register middleware then ignore it
	freshApp.use("/test", middleware);
	
	return freshApp.ignore(middleware);
}

/**
 * Benchmark parameter extraction and processing
 */
function benchmarkParameterExtraction () {
	const freshApp = createFreshApp();
	
	freshApp.get("/users/:userId/posts/:postId/comments/:commentId", (req, res) => {
		res.json({
			userId: req.params.userId,
			postId: req.params.postId,
			commentId: req.params.commentId
		});
	});
	
	const req = createMockRequest("GET", "/users/123/posts/456/comments/789");
	const res = createMockResponse();
	
	return freshApp.route(req, res);
}

/**
 * Benchmark CORS handling middleware
 */
function benchmarkCorsHandling () {
	const freshApp = createFreshApp();
	
	freshApp.get("/api/cors-test", (req, res) => {
		res.json({message: "CORS test"});
	});
	
	const req = createMockRequest("GET", "/api/cors-test", {
		origin: "https://example.com"
	});
	const res = createMockResponse();
	
	return freshApp.route(req, res);
}

/**
 * Benchmark response helper methods (json, send, redirect)
 */
function benchmarkResponseHelpers () {
	const freshApp = createFreshApp();
	
	freshApp.get("/helpers-test", (req, res) => {
		const randomChoice = Math.random();
		
		if (randomChoice < 0.33) {
			res.json({data: "test"});
		} else if (randomChoice < 0.66) {
			res.send("Hello World");
		} else {
			res.redirect("/redirected");
		}
	});
	
	const req = createMockRequest("GET", "/helpers-test");
	const res = createMockResponse();
	
	return freshApp.route(req, res);
}

// Export benchmark functions
export default {
	"middleware registration": benchmarkMiddlewareRegistration,
	"specific method registration": benchmarkSpecificMethodRegistration,
	"always middleware registration": benchmarkAlwaysMiddlewareRegistration,
	"multiple handlers registration": benchmarkMultipleHandlersRegistration,
	"request decoration": benchmarkRequestDecoration,
	"simple middleware execution": benchmarkSimpleMiddlewareExecution,
	"complex middleware execution": benchmarkComplexMiddlewareExecution,
	"error handling middleware": benchmarkErrorHandlingMiddleware,
	"route list": benchmarkRouteList,
	"ignore middleware": benchmarkIgnoreMiddleware,
	"parameter extraction": benchmarkParameterExtraction,
	"CORS handling": benchmarkCorsHandling,
	"response helpers": benchmarkResponseHelpers
}; 