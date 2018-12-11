"use strict";


function handler (err) {
	console.error(err.stack || err.message);
	process.exit(1);
}

process.on("unhandledRejection", handler);
process.on("uncaughtException", handler);

const http2 = require("http2"),
	fs = require("fs"),
	path = require("path"),
	tinyhttptest = require("tiny-httptest"),
	router = require(path.join(__dirname, "..", "index.js"))({
		defaultHeaders: {
			"Cache-Control": "no-cache",
			"Content-Type": "text/plain"
		},
		http2: true
	});

function always (req, res, next) {
	res.header("x-always", "true");
	next();
}

router.onconnect = (req, res) => res.header("x-onconnect", "true");
router.onsend = (req, res, body, status, headers) => {
	headers["x-by-reference"] = "true";

	return body;
};
router.always("/.*", always).blacklist(always);
router.use("/", (req, res) => res.send("Hello World!"));
router.use("/json1", (req, res) => res.json({text: "Hello World!"}));
router.use("/json2", (req, res) => res.json("Hello World!"));
router.use("/empty", (req, res) => res.status(204).send(""));
router.use("/echo/:echo", (req, res) => res.send(req.params.echo));
router.use("/echo/:echo", (req, res) => res.send("The entity will be echoed back to you"), "OPTIONS");
router.use("/error", (req, res) => res.error(500));
router.use("/unhandled-error", () => {
	throw new Error("Unhandled Error");
});

http2.createSecureServer({
	key: fs.readFileSync(path.join(__dirname, "..", "ssl", "localhost.key")),
	cert: fs.readFileSync(path.join(__dirname, "..", "ssl", "localhost.crt"))
}).on("stream", router.route).listen(8002);

describe("Valid Requests (HTTP2)", function () {
	it("GET / (200 / 'Success')", function () {
		return tinyhttptest({http2: true, url: "https://localhost:8002/"})
			.expectStatus(200)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain")
			.expectHeader("x-always", "true")
			.expectHeader("x-by-reference", "true")
			.expectHeader("x-onconnect", "true")
			.expectBody(/^Hello World!$/)
			.end();
	});

	it("HEAD / (200 / 'Success')", function () {
		return tinyhttptest({http2: true, url: "https://localhost:8002/", method: "head"})
			.expectStatus(200)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain")
			.expectHeader("content-length", undefined)
			.expectBody(/^$/)
			.end();
	});

	it("OPTIONS / (200 / 'Success')", function () {
		return tinyhttptest({http2: true, url: "https://localhost:8002/", method: "options"})
			.expectStatus(200)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain")
			.expectHeader("content-length", undefined)
			.expectBody(/^Hello World!$/)
			.end();
	});

	it("GET / CORS Pre-flight (200 / 'Success')", function () {
		return tinyhttptest({http2: true, url: "https://localhost:8002/", method: "OPTIONS"})
			.cors("https://not.localhost:8002")
			.expectStatus(200)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("content-length", undefined)
			.end();
	});

	it("GET / CORS (200 / 'Success')", function () {
		return tinyhttptest({http2: true, url: "https://localhost:8002/"})
			.cors("https://not.localhost:8002")
			.expectStatus(200)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain")
			.expectBody(/^Hello World!$/)
			.end();
	});

	it("OPTIONS /echo/hello (200 / 'Success')", function () {
		return tinyhttptest({http2: true, url: "https://localhost:8002/echo/hello", method: "OPTIONS"})
			.expectStatus(200)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain")
			.expectBody("The entity will be echoed back to you")
			.end();
	});

	it("GET /echo/hello (200 / 'Success')", function () {
		return tinyhttptest({http2: true, url: "https://localhost:8002/echo/hello"})
			.expectStatus(200)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("cache-control", "no-cache")
			.expectBody(/^hello$/)
			.end();
	});

	it("GET /json1 (200 / 'Success')", function () {
		return tinyhttptest({http2: true, url: "https://localhost:8002/json1"})
			.expectStatus(200)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "application/json")
			.expectBody({text: "Hello World!"})
			.end();
	});

	it("GET /json2 (200 / 'Success')", function () {
		return tinyhttptest({http2: true, url: "https://localhost:8002/json2"})
			.expectStatus(200)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "application/json")
			.expectBody("Hello World!")
			.end();
	});

	it("GET /empty (204 / 'Success')", function () {
		return tinyhttptest({http2: true, url: "https://localhost:8002/empty"})
			.expectStatus(204)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain")
			.expectBody(/^$/)
			.end();
	});

	it("GET / (206 / 'Partial response - bytes=0-5')", function () {
		return tinyhttptest({http2: true, url: "https://localhost:8002/", headers: {range: "bytes=0-5"}})
			.expectStatus(206)
			.expectHeader("content-range", /^bytes 0-5\/12$/)
			.expectHeader("content-length", 6)
			.expectBody(/^Hello\s$/)
			.end();
	});

	it("GET / (206 / 'Partial response - bytes=-5')", function () {
		return tinyhttptest({http2: true, url: "https://localhost:8002/", headers: {range: "bytes=-5"}})
			.expectStatus(206)
			.expectHeader("content-range", /^bytes 7-12\/12$/)
			.expectHeader("content-length", 6)
			.expectBody(/^orld!$/)
			.end();
	});
});

describe("Invalid Requests (HTTP2)", function () {
	it("POST / (405 / 'Method Not Allowed')", function () {
		return tinyhttptest({http2: true, url: "https://localhost:8002/", method: "post"})
			.expectStatus(405)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain")
			.expectBody(/Method Not Allowed/)
			.end();
	});

	it("PUT / (405 / 'Method Not Allowed')", function () {
		return tinyhttptest({http2: true, url: "https://localhost:8002/", method: "put"})
			.expectStatus(405)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain")
			.expectBody(/Method Not Allowed/)
			.end();
	});

	it("PATCH / (405 / 'Method Not Allowed')", function () {
		return tinyhttptest({http2: true, url: "https://localhost:8002/", method: "patch"})
			.expectStatus(405)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain")
			.expectBody(/Method Not Allowed/)
			.end();
	});

	it("DELETE / (405 / 'Method Not Allowed')", function () {
		return tinyhttptest({http2: true, url: "https://localhost:8002/", method: "delete"})
			.expectStatus(405)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain")
			.expectBody(/Method Not Allowed/)
			.end();
	});

	it("GET /nothere.html (404 / 'Not Found')", function () {
		return tinyhttptest({http2: true, url: "https://localhost:8002/nothere.html"})
			.expectStatus(404)
			.expectHeader("allow", undefined)
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain")
			.expectBody(/Not Found/)
			.end();
	});

	it("GET /nothere.html%3fa=b?=c (404 / 'Not Found')", function () {
		return tinyhttptest({http2: true, url: "https://localhost:8002/nothere.html%3fa=b?=c"})
			.expectStatus(404)
			.expectHeader("allow", undefined)
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain")
			.expectBody(/Not Found/)
			.end();
	});

	it("GET /nothere.x_%22%3E%3Cimg%20src=x%20onerror=prompt(1)%3E.html (404 / 'Not Found')", function () {
		return tinyhttptest({http2: true, url: "https://localhost:8002/nothere.x_%22%3E%3Cimg%20src=x%20onerror=prompt(1)%3E.html"})
			.expectStatus(404)
			.expectHeader("allow", undefined)
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain")
			.expectBody(/Not Found/)
			.end();
	});

	it("GET /../README (404 / 'Not Found')", function () {
		return tinyhttptest({http2: true, url: "https://localhost:8002/../README"})
			.expectStatus(404)
			.expectHeader("allow", undefined)
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain")
			.expectBody(/Not Found/)
			.end();
	});

	it("GET /././../README (404 / 'Not Found')", function () {
		return tinyhttptest({http2: true, url: "https://localhost:8002/././../README"})
			.expectStatus(404)
			.expectHeader("allow", undefined)
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain")
			.expectBody(/Not Found/)
			.end();
	});

	it("GET /error (500 / 'Internal Server Error')", function () {
		return tinyhttptest({http2: true, url: "https://localhost:8002/error"})
			.expectStatus(500)
			.expectHeader("allow", undefined)
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain")
			.expectHeader("content-length", 21)
			.expectBody(/^Internal Server Error$/)
			.end();
	});

	it("GET /unhandled-error (500 / 'Internal Server Error')", function () {
		return tinyhttptest({http2: true, url: "https://localhost:8002/unhandled-error"})
			.expectStatus(500)
			.expectHeader("allow", undefined)
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain")
			.expectHeader("content-length", 21)
			.expectBody(/^Internal Server Error$/)
			.end();
	});

	// 405 is a result of a cached route that leads to a file system based 404 on GET
	it("POST /nothere.html (404 / 'Not Found')", function () {
		return tinyhttptest({http2: true, url: "https://localhost:8002/nothere.html", method: "post"})
			.expectStatus(404)
			.expectHeader("allow", undefined)
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain")
			.expectBody(/Not Found/)
			.end();
	});

	it("PUT /nothere.html (404 / 'Not Found')", function () {
		return tinyhttptest({http2: true, url: "https://localhost:8002/nothere.html", method: "put"})
			.expectStatus(404)
			.expectHeader("allow", undefined)
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain")
			.expectBody(/Not Found/)
			.end();
	});

	it("PATCH /nothere.html (404 / 'Not Found')", function () {
		return tinyhttptest({http2: true, url: "https://localhost:8002/nothere.html", method: "patch"})
			.expectStatus(404)
			.expectHeader("allow", undefined)
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain")
			.expectBody(/Not Found/)
			.end();
	});

	it("DELETE /nothere.html (404 / 'Not Found')", function () {
		return tinyhttptest({http2: true, url: "https://localhost:8002/nothere.html", method: "delete"})
			.expectStatus(404)
			.expectHeader("allow", undefined)
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain")
			.expectBody(/Not Found/)
			.end();
	});
});
