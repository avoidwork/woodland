import {join} from "node:path";
import {createServer, METHODS} from "node:http";
import {fileURLToPath, URL} from "node:url";
import {httptest} from "tiny-httptest";
import {woodland} from "../dist/woodland.cjs";
import {CACHE_CONTROL, CONTENT_TYPE} from "../src/constants.js";
const methods = METHODS.join(", ");

const __dirname = fileURLToPath(new URL(".", import.meta.url));

function handler (err) {
	console.error(err.stack || err.message);
	process.exit(1);
}

process.on("unhandledRejection", handler);
process.on("uncaughtException", handler);

const router = woodland({
	autoindex: true,
	defaultHeaders: {
		[CACHE_CONTROL]: "no-cache",
		[CONTENT_TYPE]: "text/plain; charset=utf-8"
	},
	origins: [
		"http://localhost:8001",
		"http://not.localhost:8001"
	],
	time: true
});

function always (req, res, next) {
	res.header("x-always", "true");
	next();
}

router.on("connect", (req, res) => res.header("x-onconnect", "true"));
router.onsend = (req, res, body, status, headers) => {
	headers["x-by-reference"] = "true";

	return [body, status, headers];
};

router.on("finish", () => void 0);
router.always("/.*", always).ignore(always);
router.use("/", (req, res) => res.send(req.method !== "OPTIONS" ? "Hello World!" : ""));
router.use("/int", (req, res) => res.send(123));
router.use("/json1", (req, res) => res.json({text: "Hello World!"}));
router.use("/json2", (req, res) => res.json("Hello World!"));
router.use("/empty", (req, res) => res.status(204).send(""));
router.use("/echo/:echo", (req, res) => res.send(req.params.echo));
router.use("/echo/:echo", (req, res) => res.send("The entity will be echoed back to you"), "OPTIONS");
router.use("/error", (req, res) => res.error(500));
router.use("/test(/.*)?", (req, res) => router.serve(req, res, req.parsed.pathname.replace(/^\/test\/?/, ""), join(__dirname, "..", "test")), "*");
router.use("/last", (req, res, next) => next());
router.use("/last-error", (req, res, next) => next(new Error("Something went wrong")));
router.use("/last-error", (err, req, res, next) => next(err));
router.use("/last-error", (req, res) => res.send("Never sent"));
router.use("/last-error-invalid", (req, res, next) => next(new Error("Something went wrong")));
router.use("/last-error-invalid", (err, req, res, next) => {
	res.statusCode = 502;
	next(err);
});

// Methods
router.connect("/methods", (req, res) => res.send("connect handler"));
router.del("/methods", (req, res) => res.send(""));
router.delete("/methods", (req, res) => res.send(""));
router.get("/methods", (req, res) => res.send(""));
router.patch("/methods", (req, res) => res.send(""));
router.post("/methods", (req, res) => res.send(""));
router.put("/methods", (req, res) => res.send(""));
router.options("/methods", (req, res) => res.send(""));
router.trace("/methods", (req, res) => res.send(""));

// Overriding log() to minimize coverage reduction
router.log = () => void 0;

const server = createServer(router.route).listen(8001);

describe("Methods", function () {
	it("Array of routes", function () {
		return router.list().length > 0 ? Promise.resolve(true) : Promise.reject(new Error("No routes found"));
	});

	it("Object of routes", function () {
		return Object.keys(router.list(undefined, undefined, "object")).length > 0 ? Promise.resolve(true) : Promise.reject(new Error("No routes found"));
	});
});

describe("Valid Requests", function () {
	it("GET / (200 / 'Success')", function () {
		return httptest({url: "http://localhost:8001/"})
			.expectStatus(200)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain; charset=utf-8")
			.expectHeader("x-always", "true")
			.expectHeader("x-by-reference", "true")
			.expectHeader("x-onconnect", "true")
			.expectBody(/^Hello World!$/)
			.end();
	});

	it("HEAD / (200 / 'Success')", function () {
		return httptest({url: "http://localhost:8001/", method: "HEAD"})
			.expectStatus(200)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain; charset=utf-8")
			.expectHeader("content-length", undefined)
			.expectBody(/^$/)
			.end();
	});

	it("OPTIONS / (200 / 'Success')", function () {
		return httptest({url: "http://localhost:8001/", method: "OPTIONS"})
			.expectStatus(200)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain; charset=utf-8")
			.expectHeader("content-length", undefined)
			.expectBody(/^$/)
			.end();
	});

	it("GET / CORS Pre-flight (200 / 'Success')", function () {
		return httptest({url: "http://localhost:8001/", method: "OPTIONS"})
			.cors("http://not.localhost:8001")
			.expectStatus(200)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("content-length", undefined)
			.end();
	});

	it("GET / CORS (200 / 'Success')", function () {
		return httptest({url: "http://localhost:8001/"})
			.cors("http://not.localhost:8001")
			.expectStatus(200)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain; charset=utf-8")
			.expectBody(/^Hello World!$/)
			.end();
	});

	it("GET / Faux CORS (200 / 'Success')", function () {
		return httptest({url: "http://localhost:8001/", method: "OPTIONS", headers: {origin: "http://localhost:8001"}})
			.expectStatus(200)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("access-control-allow-origin", undefined)
			.end();
	});

	it("GET / CORS Pre-flight (403 / 'Forbidden')", function () {
		return httptest({url: "http://localhost:8001/", method: "OPTIONS"})
			.cors("http://nope.localhost:8001", false)
			.expectStatus(403)
			.expectBody(/Forbidden/)
			.end();
	});

	it("OPTIONS /echo/hello (200 / 'Success')", function () {
		return httptest({url: "http://localhost:8001/echo/hello", method: "OPTIONS"})
			.expectStatus(200)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain; charset=utf-8")
			.expectBody("The entity will be echoed back to you")
			.end();
	});

	it("GET /echo/hello (200 / 'Success')", function () {
		return httptest({url: "http://localhost:8001/echo/hello"})
			.expectStatus(200)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("cache-control", "no-cache")
			.expectBody(/^hello$/)
			.end();
	});

	it("GET /int (200 / 'Success')", function () {
		return httptest({url: "http://localhost:8001/int"})
			.expectStatus(200)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("cache-control", "no-cache")
			.expectBody(/^123$/)
			.end();
	});

	it("GET /json1 (200 / 'Success')", function () {
		return httptest({url: "http://localhost:8001/json1"})
			.expectStatus(200)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "application/json; charset=utf-8")
			.expectBody({text: "Hello World!"})
			.end();
	});

	it("GET /json2 (200 / 'Success')", function () {
		return httptest({url: "http://localhost:8001/json2"})
			.expectStatus(200)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "application/json; charset=utf-8")
			.expectBody("Hello World!")
			.end();
	});

	it("GET /empty (204 / 'Success')", function () {
		return httptest({url: "http://localhost:8001/empty"})
			.expectStatus(204)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain; charset=utf-8")
			.expectBody(/^$/)
			.end();
	});

	it("GET / (206 / 'Partial response - bytes=0-5')", function () {
		return httptest({url: "http://localhost:8001/", headers: {range: "bytes=0-5"}})
			.expectStatus(206)
			.expectHeader("content-range", /^bytes 0-5\/12$/)
			.expectHeader("content-length", 5)
			.expectBody(/^Hello$/)
			.end();
	});

	it("GET / (206 / 'Partial response - bytes=-5')", function () {
		return httptest({url: "http://localhost:8001/", headers: {range: "bytes=-5"}})
			.expectStatus(206)
			.expectHeader("content-range", /^bytes 7-12\/12$/)
			.expectHeader("content-length", 5)
			.expectBody(/^orld!$/)
			.end();
	});

	it("GET / (206 / 'Partial response - bytes=5-')", function () {
		return httptest({url: "http://localhost:8001/", headers: {range: "bytes=5-"}})
			.expectStatus(206)
			.expectHeader("content-range", /^bytes 5-12\/12$/)
			.expectHeader("content-length", 7)
			.expectBody(/^ World!$/)
			.end();
	});

	it("GET /test/ (206 / 'Partial response - bytes=0-5')", function () {
		return httptest({url: "http://localhost:8001/test/", headers: {range: "bytes=0-5"}})
			.expectStatus(206)
			.expectHeader("content-range", /^bytes 0-5\/947$/)
			.expectHeader("content-length", 5)
			.end();
	});

	it("GET /test/ (206 / 'Partial response - bytes=-5')", function () {
		return httptest({url: "http://localhost:8001/test/", headers: {range: "bytes=-5"}})
			.expectStatus(206)
			.expectHeader("content-range", /^bytes 942-947\/947$/)
			.expectHeader("content-length", 5)
			.end();
	});

	it("GET /test/ (206 / 'Partial response - bytes=5-')", function () {
		return httptest({url: "http://localhost:8001/test/", headers: {range: "bytes=5-"}})
			.expectStatus(206)
			.expectHeader("content-range", /^bytes 5-947\/947$/)
			.expectHeader("content-length", 942)
			.end();
	});

	it("GET /test/test.js (200 / 'Success')", function () {
		return httptest({url: "http://localhost:8001/test/test.js"})
			.etags()
			.expectStatus(200)
			.expectHeader("allow", methods)
			.expectHeader("content-type", "application/javascript; charset=utf-8")
			.expectHeader("x-always", "true")
			.expectHeader("x-by-reference", "true")
			.expectHeader("x-onconnect", "true")
			.expectHeader("etag", /^(.*)$/)
			.expectBody(/[\w]+/)
			.end();
	});

	it("GET /test/test.js (304 / 'Not Modified')", function () {
		return httptest({url: "http://localhost:8001/test/test.js"})
			.etags()
			.expectStatus(304)
			.end();
	});

	it("GET /test/test.js (206 / 'Partial response - bytes=0-5')", function () {
		return httptest({url: "http://localhost:8001/test/test.js", headers: {range: "bytes=0-5"}})
			.expectStatus(206)
			.expectHeader("content-length", 5)
			.expectHeader("content-type", "application/javascript; charset=utf-8")
			.end();
	});

	it("HEAD /test/test.js (200 / 'Success')", function () {
		return httptest({url: "http://localhost:8001/test/test.js", method: "HEAD"})
			.expectStatus(200)
			.expectHeader("allow", methods)
			.expectHeader("content-type", "application/javascript; charset=utf-8")
			.expectBody(/^$/)
			.end();
	});

	it("OPTIONS /test/test.js (200 / 'Success')", function () {
		return httptest({url: "http://localhost:8001/test/test.js", method: "OPTIONS"})
			.expectStatus(200)
			.expectHeader("allow", methods)
			.expectHeader("content-type", "application/javascript; charset=utf-8")
			.expectBody("Make a GET request to retrieve the file")
			.end();
	});

	it("GET /test/another (301 / 'Redirect')", function () {
		return httptest({url: "http://localhost:8001/test/another"})
			.expectStatus(301)
			.expectHeader("location", "/test/another/")
			.end();
	});

	it("GET /test/another/ (200 / 'Success')", function () {
		return httptest({url: "http://localhost:8001/test/another/"})
			.expectStatus(200)
			.expectHeader("allow", methods)
			.expectHeader("content-type", "text/html; charset=utf-8")
			.expectHeader("x-always", "true")
			.expectHeader("x-by-reference", "true")
			.expectHeader("x-onconnect", "true")
			.expectHeader("etag", /^(.*)$/)
			.expectBody(/[\w]+/)
			.end();
	});
});

describe("Invalid Requests", function () {
	it("POST / (405 / 'Method Not Allowed')", function () {
		return httptest({url: "http://localhost:8001/", method: "POST"})
			.expectStatus(405)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain; charset=utf-8")
			.expectHeader("content-length", 18)
			.expectBody(/Method Not Allowed/)
			.end();
	});

	it("PUT / (405 / 'Method Not Allowed')", function () {
		return httptest({url: "http://localhost:8001/", method: "PUT"})
			.expectStatus(405)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain; charset=utf-8")
			.expectHeader("content-length", 18)
			.expectBody(/Method Not Allowed/)
			.end();
	});

	it("PATCH / (405 / 'Method Not Allowed')", function () {
		return httptest({url: "http://localhost:8001/", method: "PATCH"})
			.expectStatus(405)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain; charset=utf-8")
			.expectHeader("content-length", 18)
			.expectBody(/Method Not Allowed/)
			.end();
	});

	it("DELETE / (405 / 'Method Not Allowed')", function () {
		return httptest({url: "http://localhost:8001/", method: "DELETE"})
			.expectStatus(405)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain; charset=utf-8")
			.expectHeader("content-length", 18)
			.expectBody(/Method Not Allowed/)
			.end();
	});

	it("GET /nothere.html (404 / 'Not Found')", function () {
		return httptest({url: "http://localhost:8001/nothere.html"})
			.expectStatus(404)
			.expectHeader("allow", "")
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain; charset=utf-8")
			.expectHeader("content-length", 9)
			.expectBody(/Not Found/)
			.end();
	});

	it("GET /nothere.html%3fa=b?=c (404 / 'Not Found')", function () {
		return httptest({url: "http://localhost:8001/nothere.html%3fa=b?=c"})
			.expectStatus(404)
			.expectHeader("allow", "")
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain; charset=utf-8")
			.expectHeader("content-length", 9)
			.expectBody(/Not Found/)
			.end();
	});

	it("GET /nothere.x_%22%3E%3Cimg%20src=x%20onerror=prompt(1)%3E.html (404 / 'Not Found')", function () {
		return httptest({url: "http://localhost:8001/nothere.x_%22%3E%3Cimg%20src=x%20onerror=prompt(1)%3E.html"})
			.expectStatus(404)
			.expectHeader("allow", "")
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain; charset=utf-8")
			.expectHeader("content-length", 9)
			.expectBody(/Not Found/)
			.end();
	});

	it("GET /../README.md (404 / 'Not Found')", function () {
		return httptest({url: "http://localhost:8001/../README.md"})
			.expectStatus(404)
			.expectHeader("allow", "")
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain; charset=utf-8")
			.expectHeader("content-length", 9)
			.expectBody(/Not Found/)
			.end();
	});

	it("GET /././../README.md (404 / 'Not Found')", function () {
		return httptest({url: "http://localhost:8001/././../README.md"})
			.expectStatus(404)
			.expectHeader("allow", "")
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain; charset=utf-8")
			.expectHeader("content-length", 9)
			.expectBody(/Not Found/)
			.end();
	});

	it("GET /error (500 / 'Internal Server Error')", function () {
		return httptest({url: "http://localhost:8001/error"})
			.expectStatus(500)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain; charset=utf-8")
			.expectHeader("content-length", 21)
			.expectBody(/^Internal Server Error$/)
			.end();
	});

	// 405 is a result of a cached route that leads to a file system based 404 on GET
	it("POST /nothere.html (404 / 'Not Found')", function () {
		return httptest({url: "http://localhost:8001/nothere.html", method: "POST"})
			.expectStatus(404)
			.expectHeader("allow", "")
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain; charset=utf-8")
			.expectHeader("content-length", 9)
			.expectBody(/Not Found/)
			.end();
	});

	it("PUT /nothere.html (404 / 'Not Found')", function () {
		return httptest({url: "http://localhost:8001/nothere.html", method: "PUT"})
			.expectStatus(404)
			.expectHeader("allow", "")
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain; charset=utf-8")
			.expectHeader("content-length", 9)
			.expectBody(/Not Found/)
			.end();
	});

	it("PATCH /nothere.html (404 / 'Not Found')", function () {
		return httptest({url: "http://localhost:8001/nothere.html", method: "PATCH"})
			.expectStatus(404)
			.expectHeader("allow", "")
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain; charset=utf-8")
			.expectHeader("content-length", 9)
			.expectBody(/Not Found/)
			.end();
	});

	it("DELETE /nothere.html (404 / 'Not Found')", function () {
		return httptest({url: "http://localhost:8001/nothere.html", method: "DELETE"})
			.expectStatus(404)
			.expectHeader("allow", "")
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain; charset=utf-8")
			.expectHeader("content-length", 9)
			.expectBody(/Not Found/)
			.end();
	});

	it("DELETE /test/ (405 / 'Method Not Allowed')", function () {
		return httptest({url: "http://localhost:8001/test/", method: "DELETE"})
			.expectStatus(405)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain; charset=utf-8")
			.expectHeader("content-length", "18")
			.expectBody(/Method Not Allowed/)
			.end();
	});

	it("DELETE /test/test.js (405 / 'Method Not Allowed')", function () {
		return httptest({url: "http://localhost:8001/test/test.js", method: "DELETE"})
			.expectStatus(405)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain; charset=utf-8")
			.expectHeader("content-length", "18")
			.expectBody(/Method Not Allowed/)
			.end();
	});

	it("GET /test/test.js (417 / 'Method Not Allowed')", function () {
		return httptest({url: "http://localhost:8001/test/test.js", headers: {expect: "x"}})
			.expectStatus(417)
			.end();
	});

	it("GET /test/nothere.html (404 / 'Not Found')", function () {
		return httptest({url: "http://localhost:8001/test/nothere.html"})
			.expectStatus(404)
			.expectHeader("allow", "")
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain; charset=utf-8")
			.expectHeader("content-length", 9)
			.expectBody(/Not Found/)
			.end();
	});

	it("GET /last (500 / 'Internal Server Error')", function () {
		return httptest({url: "http://localhost:8001/last"})
			.expectStatus(500)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain; charset=utf-8")
			.expectHeader("content-length", 21)
			.expectBody(/Internal Server Error/)
			.end();
	});

	it("GET /last-error (500 / 'Internal Server Error')", function () {
		return httptest({url: "http://localhost:8001/last-error"})
			.expectStatus(500)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain; charset=utf-8")
			.expectHeader("content-length", 21)
			.expectBody(/Internal Server Error/)
			.end();
	});

	it("GET /last-error-invalid (502 / 'Faux Bad Gateway')", function () {
		return httptest({url: "http://localhost:8001/last-error-invalid"})
			.expectStatus(502)
			.end().then(() => server.close());
	});
});
