"use strict";

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

router.onconnect = (req, res) => res.header("x-onconnect", "true");
router.use("/", (req, res) => res.send(req.method !== "OPTIONS" ? "Hello World!" : ""));
router.use("/json1", (req, res) => res.json({text: "Hello World!"}));
router.use("/json2", (req, res) => res.json("Hello World!"));
router.use("/empty", (req, res) => res.status(204).send(""));
router.use("/echo/:echo", (req, res) => res.send(req.params.echo));
router.use("/echo/:echo", (req, res) => res.send("The entity will be echoed back to you"), "OPTIONS");

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
			.expectBody(/^$/)
			.end();
	});

	it("GET /json1 (200 / 'Success')", function () {
		return tinyhttptest({http2: true, url: "https://localhost:8002/json1"})
			.expectStatus(200)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "application/json")
			.expectBody(arg => JSON.stringify(arg) !== void 0)
			.end();
	});

	it("GET /json2 (200 / 'Success')", function () {
		return tinyhttptest({http2: true, url: "https://localhost:8002/json2"})
			.expectStatus(200)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "application/json")
			.expectBody(arg => JSON.stringify(arg) !== void 0)
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

describe("Methods", function () {
	it("Array of routes", function () {
		return router.list().length > 0 ? Promise.resolve(true) : Promise.reject(new Error("No routes found"));
	});

	it("Object of routes", function () {
		return Object.keys(router.list(undefined, undefined, "object")).length > 0 ? Promise.resolve(true) : Promise.reject(new Error("No routes found"));
	});
});
