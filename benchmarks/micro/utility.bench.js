import { performance } from "node:perf_hooks";
import { autoIndex } from "../../src/fileserver.js";
import { getStatus, mime, partialHeaders, pipeable, writeHead } from "../../src/response.js";
import { next as createNext, reduce } from "../../src/middleware.js";
import { isValidIP, params, parse } from "../../src/request.js";
import { ms, timeOffset } from "../../src/logger.js";

const createMockReq = (method = "GET", url = "/", headers = {}) => ({
	method,
	url,
	headers: { host: "localhost:3000", "user-agent": "benchmark-test", ...headers },
	connection: { remoteAddress: "127.0.0.1" },
	socket: { server: { _connectionKey: "6::::3000" } },
});

const createMockRes = () => {
	const headers = new Map();
	return {
		statusCode: 200,
		headersSent: false,
		setHeader: (n, v) => headers.set(n.toLowerCase(), v),
		getHeader: (n) => headers.get(n.toLowerCase()),
		removeHeader: (n) => headers.delete(n.toLowerCase()),
		header: (n, v) => headers.set(n.toLowerCase(), v),
		writeHead: (s, _m, h) => {
			if (h) Object.entries(h).forEach(([k, v]) => headers.set(k.toLowerCase(), v));
		},
		headers,
		end: () => {},
		on: () => {},
		once: () => {},
		emit: () => {},
		send: () => {},
		json: () => {},
		redirect: () => {},
		error: () => {},
	};
};

const testUrls = [
	"http://localhost:3000/api/users",
	"http://localhost:3000/api/users/123",
	"http://localhost:3000/api/users/123/posts/456",
	"http://localhost:3000/static/css/style.css",
	"http://localhost:3000/blog/my-awesome-post",
	"http://localhost:3000/search?q=test&page=1",
	"http://localhost:3000/api/v1/resource/123/nested/456?include=related",
];
const testFiles = [
	"style.css",
	"app.js",
	"logo.png",
	"favicon.ico",
	"index.html",
	"document.pdf",
	"image.jpg",
	"video.mp4",
	"audio.mp3",
	"data.json",
	"config.xml",
	"archive.zip",
	"text.txt",
	"presentation.pptx",
	"spreadsheet.xlsx",
	"executable.exe",
	"unknown.xyz",
	"no-extension",
];
const testTimeValues = [0, 1000000, 5000000, 10000000, 50000000, 100000000, 1000000000];
const testTimezoneOffsets = [0, -300, -420, -480, 120, 330, 480, 540, 570, 720];
const testIPs = [
	"192.168.1.1",
	"10.0.0.1",
	"127.0.0.1",
	"::1",
	"2001:db8::1",
	"invalid.ip",
	"256.256.256.256",
];
const mockFiles = [
	{ name: "file1.txt", isDirectory: () => false },
	{ name: "file2.js", isDirectory: () => false },
	{ name: "image.png", isDirectory: () => false },
	{ name: "subdir", isDirectory: () => true },
	{ name: "index.html", isDirectory: () => false },
	{ name: "style.css", isDirectory: () => false },
];

const ITER = 1000,
	WARM = 100;
const results = [];

function bench(name, fn) {
	let times = [];
	for (let i = 0; i < WARM; i++) fn();
	const start = performance.now();
	for (let i = 0; i < ITER; i++) {
		const t0 = performance.now();
		fn();
		const t1 = performance.now();
		times.push(t1 - t0);
	}
	const end = performance.now();
	const mean = times.reduce((a, b) => a + b, 0) / times.length;
	const min = Math.min(...times),
		max = Math.max(...times);
	const sorted = times.slice().sort((a, b) => a - b);
	const median = sorted[Math.floor(sorted.length / 2)];
	results.push({ name, mean, median, min, max, ops: 1000 / mean, totalTime: end - start });
	console.log(
		`  ${name}: mean=${mean.toFixed(4)}ms median=${median.toFixed(4)}ms max=${max.toFixed(4)}ms ops/sec=${(1000 / mean).toFixed(2)}`,
	);
}

console.log("=== UTILITY BENCHMARKS ===");

bench("parse() — string URIs", () => {
	parse(testUrls[Math.floor(Math.random() * testUrls.length)]);
});
bench("parse() — request objects", () => {
	parse(
		createMockReq(
			"GET",
			testUrls[Math.floor(Math.random() * testUrls.length)].replace(/^https?:\/\/[^/]+/, ""),
		),
	);
});
bench("mime() — basic files", () => {
	mime(testFiles[Math.floor(Math.random() * testFiles.length)]);
});
bench("ms() — time formatting", () => {
	ms(
		testTimeValues[Math.floor(Math.random() * testTimeValues.length)],
		Math.floor(Math.random() * 5) + 1,
	);
});
bench("timeOffset() — timezone offset", () => {
	timeOffset(testTimezoneOffsets[Math.floor(Math.random() * testTimezoneOffsets.length)]);
});
bench("autoIndex() — directory listing", () => {
	autoIndex("/test/directory", mockFiles);
});
bench("getStatus() — status determination", () => {
	const req = createMockReq();
	const res = createMockRes();
	req.allow = "GET, POST, PUT, DELETE";
	req.method = "GET";
	res.statusCode = 200;
	getStatus(req, res);
});
bench("params() — parameter extraction", () => {
	const req = createMockReq();
	req.parsed = { pathname: "/users/123/posts/456/comments/789" };
	req.params = {};
	params(
		req,
		/^\/users\/(?<userId>[^/]+)\/posts\/(?<postId>[^/]+)\/comments\/(?<commentId>[^/]+)$/,
	);
});
bench("partialHeaders() — range headers", () => {
	const req = createMockReq();
	const res = createMockRes();
	req.headers.range = "bytes=0-1023";
	partialHeaders(req, res, 10000, 200, {}, {});
});
bench("pipeable() — content check", () => {
	pipeable(
		["GET", "POST", "PUT", "HEAD", "OPTIONS"][Math.floor(Math.random() * 5)],
		["string", { pipe: () => {}, on: () => {} }, Buffer.from("buf"), 123, null][
			Math.floor(Math.random() * 5)
		],
	);
});
bench("reduce() — route reduction", () => {
	const m = new Map();
	m.set("/.∗", { handlers: [() => {}], params: false, regex: /^\/\.∗$/ });
	m.set("/api/users/:id/posts", {
		handlers: [() => {}],
		params: true,
		regex: /^\/api\/users\/([^/]+)\/posts$/,
	});
	m.set("/api/users", { handlers: [() => {}], params: false, regex: /^\/api\/users$/ });
	reduce("/api/users/123/posts", m, {
		getParams: null,
		middleware: [],
		params: false,
		visible: 0,
		exit: -1,
	});
});
bench("writeHead() — header writing", () => {
	writeHead(createMockRes(), { "Content-Type": "application/json", "Cache-Control": "no-cache" });
});
bench("next() — middleware chain", () => {
	const mw = [
		(r, _s, n) => {
			r.step1 = true;
			n();
		},
		(r, _s, n) => {
			r.step2 = true;
			n();
		},
		(r, _s) => {
			r.step3 = true;
		},
	];
	const req = createMockReq();
	const res = createMockRes();
	const iter = mw[Symbol.iterator]();
	const nf = createNext(req, res, iter, Math.random() > 0.5);
	nf();
});
bench("parse() — edge cases", () => {
	parse(
		[
			"http://localhost/",
			"http://localhost:8080/path?q=v#f",
			"http://[::1]:3000/ipv6",
			"http://localhost/path with spaces",
		][Math.floor(Math.random() * 4)],
	);
});
bench("isValidIP() — IP validation", () => {
	isValidIP(testIPs[Math.floor(Math.random() * testIPs.length)]);
});

const total = results.reduce((s, r) => s + r.totalTime, 0);
const sorted = results.slice().sort((a, b) => b.ops - a.ops);

console.log(`\n=== SUMMARY (${results.length} benchmarks, ${total.toFixed(1)}ms total) ===`);
console.log("\nFastest operations:");
sorted.slice(0, 5).forEach((r, i) => {
	console.log(`  ${i + 1}. ${r.name}: ${r.ops.toFixed(0)} ops/sec`);
});
