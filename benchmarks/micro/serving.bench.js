import { performance } from "node:perf_hooks";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { woodland } from "../../dist/woodland.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const testDir = join(__dirname, "../../tests/test-files");
const subdir = join(testDir, "subdir");
if (!existsSync(subdir)) {
	mkdirSync(subdir, { recursive: true });
	writeFileSync(join(subdir, "file1.txt"), "Test file 1");
	writeFileSync(join(subdir, "file2.html"), "<h1>Test HTML</h1>");
}

const createMockReq = (method = "GET", url = "/", headers = {}) => ({
	method,
	url,
	headers: { host: "localhost:3000", "user-agent": "benchmark-test", ...headers },
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
		end: () => {},
		on: () => {},
		emit: () => {},
		pipe: () => {},
		header: () => {},
		error: () => {},
		redirect: () => {},
		send: () => {},
		json: () => {},
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
	obj.end = () => {
		obj.headersSent = true;
	};
	obj.redirect = (url, perm = true) => {
		obj.statusCode = perm ? 308 : 307;
		headers.set("location", url);
		obj.end();
	};
	obj.send = (body) => {
		if (body && typeof body.destroy === "function") body.destroy();
		obj.end();
	};
	obj.json = (_d) => {
		headers.set("content-type", "application/json");
		obj.end();
	};
	obj.error = (st = 500) => {
		obj.statusCode = st;
		obj.end();
	};
	obj.header = (n, v) => headers.set(n.toLowerCase(), v);
	return obj;
};

const makeApp = (opts = {}) =>
	woodland({
		cacheSize: 1000,
		cacheTTL: 10000,
		etags: false,
		logging: { enabled: false },
		...opts,
	});

const ITER = 500;
const WARM = 50;
const results = [];

function bench(name, fn) {
	if (typeof fn === "function" && fn.constructor.name === "AsyncFunction") {
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
		const _variance = times.reduce((s, t) => s + (t - mean) ** 2, 0) / times.length;

		results.push({ name, mean, median, min, max, ops: 1000 / mean, totalTime: end - start });
		console.log(
			`  ${name}: mean=${mean.toFixed(4)}ms median=${median.toFixed(4)}ms ops/sec=${(1000 / mean).toFixed(2)}`,
		);
	} else {
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
		const _variance = times.reduce((s, t) => s + (t - mean) ** 2, 0) / times.length;

		results.push({ name, mean, median, min, max, ops: 1000 / mean, totalTime: end - start });
		console.log(
			`  ${name}: mean=${mean.toFixed(4)}ms median=${median.toFixed(4)}ms ops/sec=${(1000 / mean).toFixed(2)}`,
		);
	}
}

console.log("=== SERVING BENCHMARKS ===");

bench("serve() — small file", async () => {
	const app = makeApp();
	const req = createMockReq("GET", "/small.txt");
	req.parsed = { pathname: "/small.txt" };
	await app.serve(req, createMockRes(), "small.txt", testDir);
});

bench("serve() — medium file", async () => {
	const app = makeApp();
	const req = createMockReq("GET", "/medium.txt");
	req.parsed = { pathname: "/medium.txt" };
	await app.serve(req, createMockRes(), "medium.txt", testDir);
});

bench("serve() — large file", async () => {
	const app = makeApp();
	const req = createMockReq("GET", "/large.txt");
	req.parsed = { pathname: "/large.txt" };
	await app.serve(req, createMockRes(), "large.txt", testDir);
});

bench("serve() — different file types", async () => {
	const app = makeApp();
	const files = ["test.js", "test.css", "test.json", "test.html", "test.xml", "binary.dat"];
	const file = files[Math.floor(Math.random() * files.length)];
	const req = createMockReq("GET", `/${file}`);
	req.parsed = { pathname: `/${file}` };
	await app.serve(req, createMockRes(), file, testDir);
});

bench("serve() — HEAD request", async () => {
	const app = makeApp();
	const req = createMockReq("HEAD", "/medium.txt");
	req.parsed = { pathname: "/medium.txt" };
	await app.serve(req, createMockRes(), "medium.txt", testDir);
});

bench("serve() — OPTIONS request", async () => {
	const app = makeApp();
	const req = createMockReq("OPTIONS", "/medium.txt");
	req.parsed = { pathname: "/medium.txt" };
	await app.serve(req, createMockRes(), "medium.txt", testDir);
});

bench("serve() — not found", async () => {
	const app = makeApp();
	const req = createMockReq("GET", "/notfound.txt");
	req.parsed = { pathname: "/notfound.txt" };
	await app.serve(req, createMockRes(), "notfound.txt", testDir);
});

bench("serve() — directory", async () => {
	const app = makeApp();
	const req = createMockReq("GET", "/subdir/");
	req.parsed = { pathname: "/subdir/" };
	await app.serve(req, createMockRes(), "subdir", testDir);
});

bench("serve() — directory redirect", async () => {
	const app = makeApp();
	const req = createMockReq("GET", "/subdir");
	req.parsed = { pathname: "/subdir", search: "" };
	await app.serve(req, createMockRes(), "subdir", testDir);
});

bench("serve() — autoindex", async () => {
	const app = makeApp({ autoIndex: true });
	const req = createMockReq("GET", "/subdir/");
	req.parsed = { pathname: "/subdir/" };
	await app.serve(req, createMockRes(), "subdir", testDir);
});

bench("serve() — range request", async () => {
	const app = makeApp();
	const req = createMockReq("GET", "/large.txt", { range: "bytes=0-1023" });
	req.parsed = { pathname: "/large.txt" };
	await app.serve(req, createMockRes(), "large.txt", testDir);
});

bench("stream() — different methods", () => {
	const app = makeApp({ etags: true });
	const methods = ["GET", "HEAD", "OPTIONS"];
	const req = createMockReq(methods[Math.floor(Math.random() * methods.length)], "/test.txt");
	const res = createMockRes();
	const file = {
		charset: "utf-8",
		etag: '"test"',
		path: join(testDir, "small.txt"),
		stats: { mtime: new Date(), size: 11 },
	};
	app.stream(req, res, file);
});

bench("stream() — small file", () => {
	const app = makeApp({ etags: false });
	const req = createMockReq("GET", "/small.txt");
	const res = createMockRes();
	const file = {
		charset: "utf-8",
		etag: '"test"',
		path: join(testDir, "small.txt"),
		stats: { mtime: new Date(), size: 11 },
	};
	app.stream(req, res, file);
});

bench("stream() — with etags", () => {
	const app = makeApp({ etags: true });
	const req = createMockReq("GET", "/test.txt");
	req.headers["if-none-match"] = '"test-etag-value"';
	const res = createMockRes();
	const file = {
		charset: "utf-8",
		etag: '"test-etag-value"',
		path: join(testDir, "small.txt"),
		stats: { mtime: new Date(), size: 11 },
	};
	app.stream(req, res, file);
});

bench("stream() — without etags", () => {
	const app = makeApp({ etags: false });
	const req = createMockReq("GET", "/test.txt");
	const res = createMockRes();
	const file = {
		charset: "utf-8",
		etag: "",
		path: join(testDir, "small.txt"),
		stats: { mtime: new Date(), size: 11 },
	};
	app.stream(req, res, file);
});

bench("files() — static serving", () => {
	const app = makeApp();
	const roots = ["/", "/static", "/assets", "/public"];
	const root = roots[Math.floor(Math.random() * roots.length)];
	app.files(root, testDir);
});

bench("etag() — generation", () => {
	const app = makeApp();
	const methods = ["GET", "HEAD", "OPTIONS"];
	const method = methods[Math.floor(Math.random() * methods.length)];
	app.etag(method, 12345, 1000, Date.now());
});

// Summary
const total = results.reduce((s, r) => s + r.totalTime, 0);
const sorted = results.slice().sort((a, b) => b.ops - a.ops);

console.log(`\n=== SUMMARY (${results.length} benchmarks, ${total.toFixed(1)}ms total) ===`);
console.log("\nFastest operations:");
sorted.slice(0, 5).forEach((r, i) => {
	console.log(`  ${i + 1}. ${r.name}: ${r.ops.toFixed(0)} ops/sec`);
});
