"use strict";

const http = require("http"),
	path = require("path"),
	tinyhttptest = require("tiny-httptest"),
	router = require(path.join(__dirname, "..", "index.js"))({defaultHeaders: {"Cache-Control": "no-cache"}, defaultHost: "localhost", hosts: ["localhost", "noresponse"]});

router.use("/", (req, res) => {
	res.writeHead(200, {"Content-Type": "text/plain"});
	res.end(req.method !== "OPTIONS" ? "Hello World!" : "");
});

router.use("/echo/:echo", (req, res) => {
	res.writeHead(200, {"Content-Type": "text/plain"});
	res.end(req.params.echo);
});

router.use("/echo/:echo", (req, res) => {
	res.writeHead(200, {"Content-Type": "text/plain"});
	res.end("The entity will be echoed back to you");
}, "OPTIONS");

router.use("/nothere.html", (req, res) => {
	res.writeHead(204);
	res.end("");
}, "GET", "noresponse");

http.createServer(router.route).listen(8001);

describe("Valid Requests", function () {
	it("GET / (200 / 'Success')", function () {
		return tinyhttptest({url: "http://localhost:8001/"})
			.expectStatus(200)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain")
			.expectBody(/^Hello World!$/)
			.end();
	});

	it("HEAD / (200 / 'Success')", function () {
		return tinyhttptest({url: "http://localhost:8001/", method: "head"})
			.expectStatus(200)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain")
			.expectBody(/^$/)
			.end();
	});

	it("OPTIONS / (200 / 'Success')", function () {
		return tinyhttptest({url: "http://localhost:8001/", method: "options"})
			.expectStatus(200)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain")
			.expectBody(/^$/)
			.end();
	});

	it("OPTIONS /echo/hello (200 / 'Success')", function () {
		return tinyhttptest({url: "http://localhost:8001/echo/hello", method: "OPTIONS"})
			.expectStatus(200)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain")
			.expectBody("The entity will be echoed back to you")
			.end();
	});

	it("GET /echo/hello (200 / 'Success')", function () {
		return tinyhttptest({url: "http://localhost:8001/echo/hello"})
			.expectStatus(200)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain")
			.expectBody(/^hello$/)
			.end();
	});
});

describe("Invalid Requests", function () {
	it("POST / (405 / 'Method Not Allowed')", function () {
		return tinyhttptest({url: "http://localhost:8001/", method: "post"})
			.expectStatus(405)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain")
			.expectBody(/Method Not Allowed/)
			.end();
	});

	it("PUT / (405 / 'Method Not Allowed')", function () {
		return tinyhttptest({url: "http://localhost:8001/", method: "put"})
			.expectStatus(405)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain")
			.expectBody(/Method Not Allowed/)
			.end();
	});

	it("PATCH / (405 / 'Method Not Allowed')", function () {
		return tinyhttptest({url: "http://localhost:8001/", method: "patch"})
			.expectStatus(405)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain")
			.expectBody(/Method Not Allowed/)
			.end();
	});

	it("DELETE / (405 / 'Method Not Allowed')", function () {
		return tinyhttptest({url: "http://localhost:8001/", method: "delete"})
			.expectStatus(405)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain")
			.expectBody(/Method Not Allowed/)
			.end();
	});

	it("GET /nothere.html (404 / 'Not Found')", function () {
		return tinyhttptest({url: "http://localhost:8001/nothere.html"})
			.expectStatus(404)
			.expectHeader("allow", undefined)
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain")
			.expectBody(/Not Found/)
			.end();
	});

	it("GET /nothere.html%3fa=b?=c (404 / 'Not Found')", function () {
		return tinyhttptest({url: "http://localhost:8001/nothere.html%3fa=b?=c"})
			.expectStatus(404)
			.expectHeader("allow", undefined)
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain")
			.expectBody(/Not Found/)
			.end();
	});

	it("GET /nothere.x_%22%3E%3Cimg%20src=x%20onerror=prompt(1)%3E.html (404 / 'Not Found')", function () {
		return tinyhttptest({url: "http://localhost:8001/nothere.x_%22%3E%3Cimg%20src=x%20onerror=prompt(1)%3E.html"})
			.expectStatus(404)
			.expectHeader("allow", undefined)
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain")
			.expectBody(/Not Found/)
			.end();
	});

	// 405 is a result of a cached route that leads to a file system based 404 on GET
	it("POST /nothere.html (404 / 'Not Found')", function () {
		return tinyhttptest({url: "http://localhost:8001/nothere.html", method: "post"})
			.expectStatus(404)
			.expectHeader("allow", undefined)
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain")
			.expectBody(/Not Found/)
			.end();
	});

	it("PUT /nothere.html (404 / 'Not Found')", function () {
		return tinyhttptest({url: "http://localhost:8001/nothere.html", method: "put"})
			.expectStatus(404)
			.expectHeader("allow", undefined)
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain")
			.expectBody(/Not Found/)
			.end();
	});

	it("PATCH /nothere.html (404 / 'Not Found')", function () {
		return tinyhttptest({url: "http://localhost:8001/nothere.html", method: "patch"})
			.expectStatus(404)
			.expectHeader("allow", undefined)
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain")
			.expectBody(/Not Found/)
			.end();
	});

	it("DELETE /nothere.html (404 / 'Not Found')", function () {
		return tinyhttptest({url: "http://localhost:8001/nothere.html", method: "delete"})
			.expectStatus(404)
			.expectHeader("allow", undefined)
			.expectHeader("cache-control", "no-cache")
			.expectHeader("content-type", "text/plain")
			.expectBody(/Not Found/)
			.end();
	});
});
