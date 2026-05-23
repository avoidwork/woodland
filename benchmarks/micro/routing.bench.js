import { performance } from "node:perf_hooks";
import { woodland } from "../../dist/woodland.js";

const app = woodland({
	cacheSize: 1000,
	cacheTTL: 10000,
	etags: false,
	logging: { enabled: false },
});

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
app.always((req, res, next) => {
	req.startTime = Date.now();
	next();
});

for (let i = 0; i < 10; i++) {
	app.get(`/api/v${i}/resource/:id/nested/:nestedId`, (req, res) => res.json({}));
	app.post(`/api/v${i}/resource/:id/nested/:nestedId`, (req, res) => res.json({}));
	app.put(`/api/v${i}/resource/:id/nested/:nestedId`, (req, res) => res.json({}));
	app.delete(`/api/v${i}/resource/:id/nested/:nestedId`, (req, res) => res.json({}));
}

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
];
const paramUris = [
	"/api/users/123",
	"/api/posts/456/comments/789",
	"/static/images/logo.png",
	"/blog/my-awesome-post",
	"/category/tech/posts",
	"/api/v1/resource/123/nested/456",
	"/api/v5/resource/789/nested/012",
];
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
	"/metrics",
];
const notFoundUris = [
	"/not-found-route",
	"/api/not-found",
	"/admin/not-found",
	"/static/not-found.js",
	"/api/users/not-found/comments",
	"/category/not-found/posts",
	"/api/v99/resource/123/nested/456",
];
const methods = ["GET", "POST", "PUT", "DELETE"];

const ITER = 2000;
const WARM = 200;
const results = [];

function bench(name, fn) {
	performance.now();
	for (let i = 0; i < WARM; i++) fn();

	const times = [];
	const start = performance.now();
	for (let i = 0; i < ITER; i++) {
		const t0 = performance.now();
		fn();
		const t1 = performance.now();
		times.push(t1 - t0);
	}
	const end = performance.now();

	const mean = times.reduce((a, b) => a + b, 0) / times.length;
	const min = Math.min(...times);
	const max = Math.max(...times);
	const sorted = times.slice().sort((a, b) => a - b);
	const median = sorted[Math.floor(sorted.length / 2)];
	const variance = times.reduce((s, t) => s + (t - mean) ** 2, 0) / times.length;
	const stddev = Math.sqrt(variance);

	results.push({ name, mean, median, min, max, stddev, ops: 1000 / mean, totalTime: end - start });
	console.log(
		`  ${name}: mean=${mean.toFixed(4)}ms median=${median.toFixed(4)}ms ops/sec=${(1000 / mean).toFixed(2)}`,
	);
}

console.log("=== ROUTING BENCHMARKS ===");

bench("routes() — with cache", () => {
	const uri = testUris[Math.floor(Math.random() * testUris.length)];
	const method = methods[Math.floor(Math.random() * methods.length)];
	app.routes(uri, method);
});

bench("routes() — no cache (forced miss)", () => {
	const uri = testUris[Math.floor(Math.random() * testUris.length)];
	const method = methods[Math.floor(Math.random() * methods.length)];
	app.routes(uri, method, true);
});

bench("parameter routes", () => {
	const uri = paramUris[Math.floor(Math.random() * paramUris.length)];
	const method = methods[Math.floor(Math.random() * methods.length)];
	app.routes(uri, method);
});

bench("static routes", () => {
	const uri = staticUris[Math.floor(Math.random() * staticUris.length)];
	const method = methods[Math.floor(Math.random() * methods.length)];
	app.routes(uri, method);
});

bench("not found routes", () => {
	const uri = notFoundUris[Math.floor(Math.random() * notFoundUris.length)];
	const method = methods[Math.floor(Math.random() * methods.length)];
	app.routes(uri, method);
});

// Summary
const total = results.reduce((s, r) => s + r.totalTime, 0);
const sorted = results.slice().sort((a, b) => b.ops - a.ops);

console.log(`\n=== SUMMARY (${results.length} benchmarks, ${total.toFixed(1)}ms total) ===`);
console.log("\nFastest operations:");
sorted.slice(0, 5).forEach((r, i) => {
	console.log(`  ${i + 1}. ${r.name}: ${r.ops.toFixed(0)} ops/sec`);
});
