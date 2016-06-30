"use strict";

const http = require("http"),
	path = require("path");

let router = require(path.join(__dirname, "..", "index.js"))({defaultHeaders: {"Cache-Control": "no-cache"}, defaultHost: "localhost", hosts: ["localhost", "noresponse"]}),
	hippie = require("hippie");

function request () {
	return hippie().base("http://localhost:8001");
}

router.use("/", (req, res) => {
	res.writeHead(200, {"Content-Type": "text/plain"});
	res.end("Hello World!");
});

router.use("/nothere.html", (req, res) => {
	res.writeHead(204);
	res.end("");
}, "GET", "noresponse");

http.createServer(router.route).listen(8001);

describe("Valid Requests", function () {
	it("GET / (200 / 'Success')", function (done) {
		request()
			.get("/")
			.expectStatus(200)
			.expectHeader("Allow", "GET, HEAD, OPTIONS")
			.expectHeader("Cache-Control", "no-cache")
			.expectHeader("Content-Type", "text/plain")
			.expectBody(/^Hello World!$/)
			.end(function (err) {
				if (err) throw err;
				done();
			});
	});

	it("HEAD / (200 / 'Success')", function (done) {
		request()
			.head("/")
			.expectStatus(200)
			.expectHeader("Allow", "GET, HEAD, OPTIONS")
			.expectHeader("Cache-Control", "no-cache")
			.expectHeader("Content-Type", "text/plain")
			.expectBody(/^$/)
			.end(function (err) {
				if (err) throw err;
				done();
			});
	});
});

describe("Invalid Requests", function () {
	it("POST / (405 / 'Method Not Allowed')", function (done) {
		request()
			.post("/")
			.expectStatus(405)
			.expectHeader("Allow", "GET, HEAD, OPTIONS")
			.expectHeader("Cache-Control", "no-cache")
			.expectBody(/Method Not Allowed/)
			.end(function (err) {
				if (err) throw err;
				done();
			});
	});

	it("PUT / (405 / 'Method Not Allowed')", function (done) {
		request()
			.put("/")
			.expectStatus(405)
			.expectHeader("Allow", "GET, HEAD, OPTIONS")
			.expectHeader("Cache-Control", "no-cache")
			.expectBody(/Method Not Allowed/)
			.end(function (err) {
				if (err) throw err;
				done();
			});
	});

	it("PATCH / (405 / 'Method Not Allowed')", function (done) {
		request()
			.patch("/")
			.expectStatus(405)
			.expectHeader("Allow", "GET, HEAD, OPTIONS")
			.expectHeader("Cache-Control", "no-cache")
			.expectBody(/Method Not Allowed/)
			.end(function (err) {
				if (err) throw err;
				done();
			});
	});

	it("DELETE / (405 / 'Method Not Allowed')", function (done) {
		request()
			.del("/")
			.expectStatus(405)
			.expectHeader("Allow", "GET, HEAD, OPTIONS")
			.expectHeader("Cache-Control", "no-cache")
			.expectBody(/Method Not Allowed/)
			.end(function (err) {
				if (err) throw err;
				done();
			});
	});

	it("GET /nothere.html (404 / 'Not Found')", function (done) {
		request()
			.get("/nothere.html")
			.expectStatus(404)
			.expectHeader("Cache-Control", "no-cache")
			.expectBody(/Not Found/)
			.end(function (err) {
				if (err) throw err;
				done();
			});
	});

	it("GET /nothere.html%3fa=b?=c (404 / 'Not Found')", function (done) {
		request()
			.get("/nothere.html%3fa=b?=c")
			.expectStatus(404)
			.expectHeader("Cache-Control", "no-cache")
			.expectBody(/Not Found/)
			.end(function (err) {
				if (err) throw err;
				done();
			});
	});

	it("GET /nothere.x_%22%3E%3Cimg%20src=x%20onerror=prompt(1)%3E.html (404 / 'Not Found')", function (done) {
		request()
			.get("/nothere.x_%22%3E%3Cimg%20src=x%20onerror=prompt(1)%3E.html")
			.expectStatus(404)
			.expectHeader("Cache-Control", "no-cache")
			.expectBody(/Not Found/)
			.end(function (err) {
				if (err) throw err;
				done();
			});
	});

	// 405 is a result of a cached route that leads to a file system based 404 on GET
	it("POST /nothere.html (404 / 'Not Found')", function (done) {
		request()
			.post("/nothere.html")
			.expectStatus(404)
			.expectHeader("Cache-Control", "no-cache")
			.expectBody(/Not Found/)
			.end(function (err) {
				if (err) throw err;
				done();
			});
	});

	it("PUT /nothere.html (404 / 'Not Found')", function (done) {
		request()
			.put("/nothere.html")
			.expectStatus(404)
			.expectHeader("Cache-Control", "no-cache")
			.expectBody(/Not Found/)
			.end(function (err) {
				if (err) throw err;
				done();
			});
	});

	it("PATCH /nothere.html (404 / 'Not Found')", function (done) {
		request()
			.patch("/nothere.html")
			.expectStatus(404)
			.expectHeader("Cache-Control", "no-cache")
			.expectBody(/Not Found/)
			.end(function (err) {
				if (err) throw err;
				done();
			});
	});

	it("DELETE /nothere.html (404 / 'Not Found')", function (done) {
		request()
			.del("/nothere.html")
			.expectStatus(404)
			.expectHeader("Cache-Control", "no-cache")
			.expectBody(/Not Found/)
			.end(function (err) {
				if (err) throw err;
				done();
			});
	});
});
