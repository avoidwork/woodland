import { createServer } from "node:http";
import { woodland } from "../../dist/woodland.js";

const SERVER_CONFIG = { port: 0, host: "127.0.0.1" };
let testServer = null;
let testServerUrl = null;

const app = woodland({
	cacheSize: 1000,
	cacheTTL: 10000,
	etags: false,
	logging: { enabled: false },
	time: true,
});

// Simple routes
app.get("/", (req, res) => res.send("Hello World"));
app.get("/ping", (req, res) => res.send("pong"));
app.get("/health", (req, res) => res.json({ status: "ok", timestamp: Date.now() }));

// Parameter routes
app.get("/users/:id", (req, res) => res.json({ id: req.params.id, name: `User ${req.params.id}` }));
app.get("/users/:id/posts/:postId", (req, res) =>
	res.json({
		userId: req.params.id,
		postId: req.params.postId,
		title: `Post ${req.params.postId} by User ${req.params.id}`,
	}),
);

// CRUD
app.post("/users", (req, res) =>
	res.status(201).json({ id: Math.random().toString(36).substr(2, 9), created: true }),
);
app.put("/users/:id", (req, res) => res.json({ id: req.params.id, updated: true }));
app.delete("/users/:id", (req, res) => res.status(204).send());

// Middleware chain
app.use("/api/*", (req, res, next) => {
	req.apiVersion = "v1";
	next();
});
app.use("/api/protected/*", (req, res, next) => {
	req.authenticated = true;
	next();
});
app.get("/api/data", (req, res) =>
	res.json({ data: Array.from({ length: 100 }, (_, i) => ({ id: i, value: `item-${i}` })) }),
);
app.get("/api/protected/secret", (req, res) =>
	res.json({ secret: "classified", authenticated: req.authenticated }),
);

// Error handling
app.get("/error", (req, res) => res.error(500));
app.get("/not-found", (req, res) => res.error(404));

// Large response
app.get("/large", (req, res) => {
	const largeData = {
		items: Array.from({ length: 1000 }, (_, i) => ({
			id: i,
			name: `Item ${i}`,
			description: `This is a description for item ${i}`,
			metadata: { created: new Date().toISOString(), tags: [`tag-${i % 10}`, `category-${i % 5}`] },
		})),
	};
	res.json(largeData);
});

// Mixed workload
app.get("/mixed", (req, res) => {
	const choice = Math.random();
	if (choice < 0.33) res.json({ type: "json", data: "test" });
	else if (choice < 0.66) res.send("text response");
	else res.redirect("/redirected");
});

testServer = createServer(app.route);

await new Promise((resolve) => {
	testServer.listen(SERVER_CONFIG.port, SERVER_CONFIG.host, () => {
		const addr = testServer.address();
		testServerUrl = `http://${addr.address}:${addr.port}`;
		console.log(`Woodland server running at ${testServerUrl}`);
		resolve();
	});
});

console.log(`\nPids: ${process.pid}`);
console.log(`URL:  ${testServerUrl}`);
console.log(`\nRun benchmarks manually:`);
console.log(`  npx --yes autocannon ${testServerUrl}`);
console.log(`\nOr benchmark specific endpoints:`);
console.log(`  npx --yes autocannon ${testServerUrl}/users/123`);
console.log(`  npx --yes autocannon ${testServerUrl}/health -m POST`);
console.log(`  npx --yes autocannon ${testServerUrl}/api/data`);
console.log();

console.log("=== ENDPOINTS ===");
const endpoints = [
	"GET /",
	"GET /ping",
	"GET /health",
	"GET /users/:id",
	"GET /users/:id/posts/:postId",
	"POST /users",
	"PUT /users/:id",
	"DELETE /users/:id",
	"GET /api/data",
	"GET /api/protected/secret",
	"GET /error",
	"GET /not-found",
	"GET /large",
	"GET /mixed",
];
console.log(endpoints.map((r) => `  ${r}`).join("\n"));
console.log("\nPress Ctrl+C to stop");

// Graceful shutdown
process.on("SIGINT", async () => {
	console.log("\nShutting down...");
	await new Promise((resolve) => testServer.close(() => resolve()));
	process.exit(0);
});
