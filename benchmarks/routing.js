import {woodland} from "../dist/woodland.js";

// Create test app instance with typical configuration
const app = woodland({
	cacheSize: 1000,
	cacheTTL: 10000,
	etags: true,
	logging: {enabled: false} // Disable logging for benchmarks
});

// Set up realistic routes for testing
const setupRoutes = () => {
	app.get("/", (req, res) => res.send("Home"));
	app.get("/api/users", (req, res) => res.json([]));
	app.post("/api/users", (req, res) => res.json({}));
	app.get("/api/users/:id", (req, res) => res.json({}));
	app.put("/api/users/:id", (req, res) => res.json({}));
	app.delete("/api/users/:id", (req, res) => res.json({}));
	app.get("/api/posts", (req, res) => res.json([]));
	app.post("/api/posts", (req, res) => res.json({}));
	app.get("/api/posts/:id", (req, res) => res.json({}));
	app.get("/api/posts/:id/comments", (req, res) => res.json([]));
	app.post("/api/posts/:id/comments", (req, res) => res.json({}));
	app.get("/api/posts/:id/comments/:commentId", (req, res) => res.json({}));
	app.put("/api/posts/:id/comments/:commentId", (req, res) => res.json({}));
	app.delete("/api/posts/:id/comments/:commentId", (req, res) => res.json({}));
	app.get("/static/css/style.css", (req, res) => res.send("body{}"));
	app.get("/static/js/app.js", (req, res) => res.send("console.log('app')"));
	app.get("/static/images/:filename", (req, res) => res.send("image"));
	app.get("/admin/dashboard", (req, res) => res.send("Admin"));
	app.get("/admin/users", (req, res) => res.send("Admin Users"));
	app.get("/admin/settings", (req, res) => res.send("Admin Settings"));
	app.get("/blog/:slug", (req, res) => res.send("Blog Post"));
	app.get("/category/:category/posts", (req, res) => res.json([]));
	app.get("/search", (req, res) => res.json([]));
	app.get("/health", (req, res) => res.send("OK"));
	app.get("/metrics", (req, res) => res.json({}));

	// Add middleware for all routes
	app.always((req, res, next) => {
		req.startTime = Date.now();
		next();
	});

	// Add some complex nested routes
	for (let i = 0; i < 10; i++) {
		app.get(`/api/v${i}/resource/:id/nested/:nestedId`, (req, res) => res.json({}));
		app.post(`/api/v${i}/resource/:id/nested/:nestedId`, (req, res) => res.json({}));
		app.put(`/api/v${i}/resource/:id/nested/:nestedId`, (req, res) => res.json({}));
		app.delete(`/api/v${i}/resource/:id/nested/:nestedId`, (req, res) => res.json({}));
	}
};

// Test URIs for benchmarking
const testUris = [
	"/",
	"/api/users",
	"/api/users/123",
	"/api/posts",
	"/api/posts/456",
	"/api/posts/456/comments",
	"/api/posts/456/comments/789",
	"/static/css/style.css",
	"/static/js/app.js",
	"/static/images/logo.png",
	"/admin/dashboard",
	"/admin/users",
	"/admin/settings",
	"/blog/my-awesome-post",
	"/category/tech/posts",
	"/search",
	"/health",
	"/metrics",
	"/api/v1/resource/123/nested/456",
	"/api/v5/resource/789/nested/012",
	"/not-found-route",
	"/api/not-found"
];

// Initialize routes once
setupRoutes();

/**
 * Benchmark routes() function - core route resolution with caching
 */
function benchmarkRoutes () {
	const uri = testUris[Math.floor(Math.random() * testUris.length)];
	const method = ["GET", "POST", "PUT", "DELETE"][Math.floor(Math.random() * 4)];

	return app.routes(uri, method);
}

/**
 * Benchmark routes() function without cache - forced cache miss
 */
function benchmarkRoutesNoCache () {
	const uri = testUris[Math.floor(Math.random() * testUris.length)];
	const method = ["GET", "POST", "PUT", "DELETE"][Math.floor(Math.random() * 4)];

	return app.routes(uri, method, true); // override cache
}

/**
 * Benchmark allows() function - determines allowed methods for URI
 */
function benchmarkAllows () {
	const uri = testUris[Math.floor(Math.random() * testUris.length)];

	return app.allows(uri);
}

/**
 * Benchmark allows() function without cache
 */
function benchmarkAllowsNoCache () {
	const uri = testUris[Math.floor(Math.random() * testUris.length)];

	return app.allows(uri, true); // override cache
}

/**
 * Benchmark allowed() function - checks if method is allowed for URI
 */
function benchmarkAllowed () {
	const uri = testUris[Math.floor(Math.random() * testUris.length)];
	const method = ["GET", "POST", "PUT", "DELETE"][Math.floor(Math.random() * 4)];

	return app.allowed(method, uri);
}

/**
 * Benchmark allowed() function without cache
 */
function benchmarkAllowedNoCache () {
	const uri = testUris[Math.floor(Math.random() * testUris.length)];
	const method = ["GET", "POST", "PUT", "DELETE"][Math.floor(Math.random() * 4)];

	return app.allowed(method, uri, true); // override cache
}

/**
 * Benchmark route matching with parameters
 */
function benchmarkParameterRoutes () {
	const parameterizerdUris = [
		"/api/users/123",
		"/api/posts/456/comments/789",
		"/static/images/logo.png",
		"/blog/my-awesome-post",
		"/category/tech/posts",
		"/api/v1/resource/123/nested/456",
		"/api/v5/resource/789/nested/012"
	];

	const uri = parameterizerdUris[Math.floor(Math.random() * parameterizerdUris.length)];
	const method = ["GET", "POST", "PUT", "DELETE"][Math.floor(Math.random() * 4)];

	return app.routes(uri, method);
}

/**
 * Benchmark route matching for static routes (no parameters)
 */
function benchmarkStaticRoutes () {
	const staticUris = [
		"/",
		"/api/users",
		"/api/posts",
		"/static/css/style.css",
		"/static/js/app.js",
		"/admin/dashboard",
		"/admin/users",
		"/admin/settings",
		"/search",
		"/health",
		"/metrics"
	];

	const uri = staticUris[Math.floor(Math.random() * staticUris.length)];
	const method = ["GET", "POST", "PUT", "DELETE"][Math.floor(Math.random() * 4)];

	return app.routes(uri, method);
}

/**
 * Benchmark route matching for non-existent routes
 */
function benchmarkNotFoundRoutes () {
	const notFoundUris = [
		"/not-found-route",
		"/api/not-found",
		"/admin/not-found",
		"/static/not-found.js",
		"/api/users/not-found/comments",
		"/category/not-found/posts",
		"/api/v99/resource/123/nested/456"
	];

	const uri = notFoundUris[Math.floor(Math.random() * notFoundUris.length)];
	const method = ["GET", "POST", "PUT", "DELETE"][Math.floor(Math.random() * 4)];

	return app.routes(uri, method);
}

/**
 * Benchmark path conversion (parameter routes to regex)
 */
function benchmarkPathConversion () {
	const paths = [
		"/api/users/:id",
		"/api/posts/:id/comments/:commentId",
		"/static/images/:filename",
		"/blog/:slug",
		"/category/:category/posts",
		"/api/v:version/resource/:id/nested/:nestedId",
		"/users/:userId/posts/:postId/comments/:commentId/replies/:replyId"
	];

	const path = paths[Math.floor(Math.random() * paths.length)];

	return app.path(path);
}

// Export benchmark functions
export default {
	"routes() - with cache": benchmarkRoutes,
	"routes() - no cache": benchmarkRoutesNoCache,
	"allows() - with cache": benchmarkAllows,
	"allows() - no cache": benchmarkAllowsNoCache,
	"allowed() - with cache": benchmarkAllowed,
	"allowed() - no cache": benchmarkAllowedNoCache,
	"parameter routes": benchmarkParameterRoutes,
	"static routes": benchmarkStaticRoutes,
	"not found routes": benchmarkNotFoundRoutes,
	"path conversion": benchmarkPathConversion
};
