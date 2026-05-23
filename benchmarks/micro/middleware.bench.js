import { performance } from "node:perf_hooks";
import { woodland } from "../../dist/woodland.js";

const createMockReq = (method = "GET", url = "/", headers = {}) => ({
	method,
	url,
	headers: {
		host: "localhost:3000",
		"user-agent": "benchmark-test",
		...headers,
	},
	connection: { remoteAddress: "127.0.0.1" },
	socket: { server: { _connectionKey: "6::::3000" } },
});

const createMockRes = () => {
	const headers = new Map();
	const obj = {
		statusCode: 200,
		headersSent: false,
		headers,
		setHeader: () => {},
		getHeader: () => {},
		removeHeader: () => {},
		setHeaders: () => {},
		writeHead: () => {},
		send: () => {},
		json: () => {},
		end: () => {},
		on: () => {},
		emit: () => {},
		pipe: () => {},
		redirect: () => {},
		header: () => {},
		error: () => {},
		socket: { server: { _connectionKey: "6::::3000" } },
	};
	obj.setHeader = (n, v) => headers.set(n.toLowerCase(), v);
	obj.getHeader = (n) => headers.get(n.toLowerCase());
	obj.removeHeader = (n) => headers.delete(n.toLowerCase());
	obj.setHeaders = (h) => {
		if (h instanceof Map) for (const [k, v] of h) headers.set(k.toLowerCase(), v);
	};
	obj.writeHead = (s, _m, h) => {
		if (h) Object.entries(h).forEach(([k, v]) => headers.set(k.toLowerCase(), v));
	};
	obj.send = () => {
		obj.headersSent = true;
	};
	obj.json = () => {
		obj.headersSent = true;
	};
	obj.end = () => {
		obj.headersSent = true;
	};
	obj.redirect = (url, perm = true) => {
		obj.statusCode = perm ? 308 : 307;
		headers.set("location", url);
		obj.end();
	};
	obj.header = (n, v) => headers.set(n.toLowerCase(), v);
	obj.error = (st = 500) => {
		obj.statusCode = st;
		obj.end();
	};
	return obj;
};

const createApp = () =>
	woodland({ cacheSize: 1000, cacheTTL: 10000, etags: false, logging: { enabled: false } });

const ITER = 1000;
const WARM = 100;
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

// Shared data
const middleware = (req, res, next) => next();
const routes = [
	"/",
	"/api/users",
	"/api/users/:id",
	"/api/posts",
	"/admin/dashboard",
	"/static/css/style.css",
];

console.log("=== MIDDLEWARE BENCHMARKS ===");

bench("use() registration", () => {
	const app = createApp();
	const route = routes[Math.floor(Math.random() * routes.length)];
	app.use(route, middleware);
});

bench("method-specific registration", () => {
	const app = createApp();
	const methods = ["get", "post", "put", "delete", "patch"];
	const method = methods[Math.floor(Math.random() * methods.length)];
	app[method]("/api/test", middleware);
});

bench("always() registration", () => {
	const app = createApp();
	app.always(middleware);
});

bench("multiple handlers registration", () => {
	const app = createApp();
	app.use("/api/complex", middleware, middleware, middleware);
});

bench("list() route list", () => {
	const app = createApp();
	for (let i = 0; i < 20; i++) {
		app.get(`/route-${i}`, (req, res) => res.send(`Route ${i}`));
		app.post(`/route-${i}`, (req, res) => res.send(`Route ${i}`));
	}
	const method = Math.random() > 0.5 ? "get" : "post";
	const type = Math.random() > 0.5 ? "array" : "object";
	try {
		return app.list(method, type);
	} catch {
		return type === "array" ? [] : {};
	}
});

bench("ignore() middleware", () => {
	const app = createApp();
	app.use("/test", middleware);
	app.ignore(middleware);
});

bench("simple middleware execution", () => {
	const app = createApp();
	app.use((req, res, next) => {
		req.timestamp = Date.now();
		next();
	});
	app.get("/test", (req, res) => res.send("OK"));
	const req = createMockReq("GET", "/test");
	const res = createMockRes();
	app.route(req, res);
});

bench("complex middleware execution (4 layers)", () => {
	const app = createApp();
	app.always((req, res, next) => {
		req.startTime = Date.now();
		next();
	});
	app.use("/api/*", (req, res, next) => {
		req.apiVersion = "v1";
		next();
	});
	app.use("/api/users/*", (req, res, next) => {
		req.resource = "users";
		next();
	});
	app.use((req, res, next) => {
		req.processed = true;
		next();
	});
	app.get("/api/users/:id", (req, res) => res.json({ id: req.params.id }));
	const req = createMockReq("GET", "/api/users/123");
	const res = createMockRes();
	app.route(req, res);
});

bench("error handling middleware", () => {
	const app = createApp();
	app.use((req, res, next) => {
		if (Math.random() > 0.5) next(new Error("Test error"));
		else next();
	});
	app.use((err, req, res, _next) => {
		res.statusCode = 500;
	});
	app.get("/error-test", (req, res) => res.send("OK"));
	const req = createMockReq("GET", "/error-test");
	const res = createMockRes();
	app.route(req, res);
});

bench("parameter extraction", () => {
	const arrd = createApp();
	arrd.get("/users/:userId/posts/:postId/comments/:commentId", (req, res) => res.json({}));
	const req = createMockReq("GET", "/users/123/posts/456/comments/789");
	const res = createMockRes();
	arrd.route(req, res);
});

bench("CORS handling", () => {
	const app = createApp();
	app.get("/api/cors-test", (req, res) => res.json({ message: "CORS test" }));
	const req = createMockReq("GET", "/api/cors-test", { origin: "https://example.com" });
	const res = createMockRes();
	app.route(req, res);
});

bench("response helpers (json/send/redirect)", () => {
	const app = createApp();
	app.get("/helpers-test", (req, res) => {
		const c = Math.random();
		if (c < 0.33) res.json({ data: "test" });
		else if (c < 0.66) res.send("Hello World");
		else res.redirect("/redirected");
	});
	const req = createMockReq("GET", "/helpers-test");
	const res = createMockRes();
	app.route(req, res);
});

// Summary
const total = results.reduce((s, r) => s + r.totalTime, 0);
const sorted = results.slice().sort((a, b) => b.ops - a.ops);

console.log(`\n=== SUMMARY (${results.length} benchmarks, ${total.toFixed(1)}ms total) ===`);
console.log("\nFastest operations:");
sorted.slice(0, 5).forEach((r, i) => {
	console.log(`  ${i + 1}. ${r.name}: ${r.ops.toFixed(0)} ops/sec`);
});
