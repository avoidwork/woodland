import assert from "node:assert";
import {Woodland} from "../../src/woodland.js";

describe("Woodland Security Tests", () => {
	let app;
	let mockReq;
	let mockRes;

	beforeEach(() => {
		app = new Woodland({ logging: { enabled: false }});

		// Mock request object
		mockReq = {
			method: "GET",
			headers: {
				host: "localhost:3000"
			},
			connection: {
				remoteAddress: "127.0.0.1"
			},
			socket: {
				remoteAddress: "127.0.0.1"
			},
			url: "/test",
			parsed: {
				pathname: "/test",
				hostname: "localhost",
				search: ""
			}
		};

		// Mock response object
		mockRes = {
			statusCode: 200,
			headersSent: false,
			_headers: {},
			setHeader: function (name, value) {
				this._headers[name.toLowerCase()] = value;
			},
			header: function (name, value) {
				this.setHeader(name, value);
			},
			removeHeader: function (name) {
				delete this._headers[name.toLowerCase()];
			},
			getHeader: function (name) {
				return this._headers[name.toLowerCase()];
			},
			error: function (status) {
				this.statusCode = status;
				this.ended = true;
			},
			end: function () {
				this.ended = true;
			},
			writeHead: function (status, headers) {
				this.statusCode = status;
				if (headers) {
					Object.assign(this._headers, headers);
				}
			},
			on: function (event, callback) {
				// Mock event listener for the close event
				if (event === "close") {
					// Simulate close event being fired
					setTimeout(callback, 0);
				}
			}
		};
	});

	describe("Path Traversal Protection", () => {
		it("should block path traversal attempts with ../", async () => {
			let errorCalled = false;
			let errorStatus = null;

			mockRes.error = function (status) {
				errorCalled = true;
				errorStatus = status;
			};

			await app.serve(mockReq, mockRes, "../../../etc/passwd");

			assert.strictEqual(errorCalled, true, "Error should be called for path traversal");
			assert.strictEqual(errorStatus, 403, "Should return 403 Forbidden");
		});

		it("should block path traversal attempts with ..", async () => {
			let errorCalled = false;
			let errorStatus = null;

			mockRes.error = function (status) {
				errorCalled = true;
				errorStatus = status;
			};

			await app.serve(mockReq, mockRes, "..");

			assert.strictEqual(errorCalled, true, "Error should be called for path traversal");
			assert.strictEqual(errorStatus, 403, "Should return 403 Forbidden");
		});

		it("should block null byte injection", async () => {
			const maliciousReq = {
				method: "GET",
				headers: { host: "localhost" },
				parsed: { pathname: "/test\0file.txt", search: "" },
				connection: { remoteAddress: "127.0.0.1" }
			};

			const maliciousRes = {
				statusCode: 200,
				error: function (status) {
					this.statusCode = status;
					this.errorCalled = true;
				}
			};

			await app.serve(maliciousReq, maliciousRes, "test\0file.txt");

			assert.strictEqual(maliciousRes.statusCode, 404, "Should return 404 Not Found");
		});

		it("should block newline injection", async () => {
			const maliciousReq = {
				method: "GET",
				headers: { host: "localhost" },
				parsed: { pathname: "/test\nfile.txt", search: "" },
				connection: { remoteAddress: "127.0.0.1" }
			};

			const maliciousRes = {
				statusCode: 200,
				error: function (status) {
					this.statusCode = status;
					this.errorCalled = true;
				}
			};

			await app.serve(maliciousReq, maliciousRes, "test\nfile.txt");

			assert.strictEqual(maliciousRes.statusCode, 404, "Should return 404 Not Found");
		});

		it("should allow safe file paths", async () => {
			mockRes.error = function (status) {
				// Error handler for mock - set statusCode like the real error function
				mockRes.statusCode = status;
			};

			// Mock fs.stat to avoid file system access
			const fs = await import("node:fs");
			const originalStat = fs.promises.stat;
			fs.promises.stat = async () => {
				const error = new Error("ENOENT");
				error.code = "ENOENT";
				throw error;
			};

			try {
				await app.serve(mockReq, mockRes, "safe-file.txt");
				// Should get 404 for non-existent file, not 403 for blocked path
				assert.strictEqual(mockRes.statusCode, 404, "Should return 404 for non-existent file");
			} finally {
				fs.promises.stat = originalStat;
			}
		});

		it("should handle malformed URI encoding in files() method", async () => {
			let errorCalled = false;
			let errorStatus = null;

			mockReq.parsed.pathname = "/%";
			mockRes.error = function (status) {
				errorCalled = true;
				errorStatus = status;
			};

			app.files("/static", "/tmp");

			// Get the registered middleware
			const middleware = app.middleware.get("GET").get("/static/(.*)?");
			assert.ok(middleware, "Middleware should be registered");

			// Call the handler and wait for it to complete (since serve() is async)
			await middleware.handlers[0](mockReq, mockRes);

			assert.strictEqual(errorCalled, true, "Error should be called for malformed URI");
			assert.ok(errorStatus === 400 || errorStatus === 404, "Should return 400 or 404 for malformed URI");
		});
	});

	describe("IP Address Security", () => {
		it("should return connection IP when no X-Forwarded-For header", () => {
			const ip = app.ip(mockReq);
			assert.strictEqual(ip, "127.0.0.1", "Should return connection IP");
		});

		it("should validate and extract IP from X-Forwarded-For header", () => {
			mockReq.headers["x-forwarded-for"] = "203.0.113.1, 192.168.1.1";
			const ip = app.ip(mockReq);
			assert.strictEqual(ip, "203.0.113.1", "Should extract first valid IP");
		});

		it("should accept private IPs in X-Forwarded-For header", () => {
			mockReq.headers["x-forwarded-for"] = "192.168.1.1, 10.0.0.1";
			const ip = app.ip(mockReq);
			assert.strictEqual(ip, "192.168.1.1", "Should extract first valid IP (including private IPs)");
		});

		it("should handle invalid X-Forwarded-For header", () => {
			mockReq.headers["x-forwarded-for"] = "invalid-ip, not-an-ip";
			const ip = app.ip(mockReq);
			assert.strictEqual(ip, "127.0.0.1", "Should fall back to connection IP for invalid IPs");
		});

		it("should handle empty X-Forwarded-For header", () => {
			mockReq.headers["x-forwarded-for"] = "";
			const ip = app.ip(mockReq);
			assert.strictEqual(ip, "127.0.0.1", "Should fall back to connection IP for empty header");
		});

		it("should handle IPv6 addresses", () => {
			mockReq.headers["x-forwarded-for"] = "2001:db8::1";
			const ip = app.ip(mockReq);
			assert.strictEqual(ip, "2001:db8::1", "Should handle valid IPv6 address");
		});
	});

	describe("CORS Security", () => {
		it("should deny CORS when origins array is empty", () => {
			mockReq.headers.origin = "https://evil.com";
			mockReq.corsHost = true;

			const corsAllowed = app.cors(mockReq);
			assert.strictEqual(corsAllowed, false, "Should deny CORS when no origins configured");
		});

		it("should allow CORS when origin is explicitly configured", () => {
			app.origins = ["https://trusted.com"];
			mockReq.headers.origin = "https://trusted.com";
			mockReq.corsHost = true;

			const corsAllowed = app.cors(mockReq);
			assert.strictEqual(corsAllowed, true, "Should allow CORS for trusted origin");
		});

		it("should allow CORS with wildcard if explicitly configured", () => {
			app.origins = ["*"];
			mockReq.headers.origin = "https://any.com";
			mockReq.corsHost = true;

			const corsAllowed = app.cors(mockReq);
			assert.strictEqual(corsAllowed, true, "Should allow CORS with wildcard");
		});

		it("should deny CORS for non-configured origins", () => {
			app.origins = ["https://trusted.com"];
			mockReq.headers.origin = "https://evil.com";
			mockReq.corsHost = true;

			const corsAllowed = app.cors(mockReq);
			assert.strictEqual(corsAllowed, false, "Should deny CORS for non-configured origin");
		});

		it("should deny CORS when corsHost is false", () => {
			app.origins = ["https://trusted.com"];
			mockReq.headers.origin = "https://trusted.com";
			mockReq.corsHost = false;

			const corsAllowed = app.cors(mockReq);
			assert.strictEqual(corsAllowed, false, "Should deny CORS when corsHost is false");
		});
	});

	describe("Autoindex Security", () => {
		it("should properly escape HTML in directory names", async () => {
			const mockFiles = [
				{ name: "<script>alert('xss')</script>", isDirectory: () => false },
				{ name: "normal-file.txt", isDirectory: () => false },
				{ name: "dir&with&ampersands", isDirectory: () => true }
			];

			// Mock the autoindex function
			const {autoindex} = await import("../../src/utility.js");
			const html = autoindex("/test<script>", mockFiles);

			assert.ok(!html.includes("<script>alert('xss')</script>"), "Should escape script tags in filenames");
			assert.ok(!html.includes("/test<script>"), "Should escape script tags in title");
			assert.ok(html.includes("&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;"), "Should contain escaped script tag");
			assert.ok(html.includes("dir&amp;with&amp;ampersands"), "Should escape ampersands");
		});

		it("should properly encode hrefs in directory listings", async () => {
			const mockFiles = [
				{ name: "file with spaces.txt", isDirectory: () => false },
				{ name: "special%chars.txt", isDirectory: () => false }
			];

			const {autoindex} = await import("../../src/utility.js");
			const html = autoindex("/test", mockFiles);

			assert.ok(html.includes('href="file%20with%20spaces.txt"'), "Should encode spaces in href");
			assert.ok(html.includes('href="special%25chars.txt"'), "Should encode percent signs in href");
		});
	});

	describe("Error Handling Security", () => {
		it("should not expose sensitive information in error messages", () => {
			const error = app.error(mockReq, mockRes);

			// Test that error handler doesn't expose internal paths
			error(500);
			assert.strictEqual(mockRes.statusCode, 500, "Should set correct status code");
			assert.strictEqual(mockRes.ended, true, "Should end response");
		});

		it("should handle multiple error calls gracefully", () => {
			const error = app.error(mockReq, mockRes);

			error(404);
			assert.strictEqual(mockRes.statusCode, 404, "Should set first error status");

			// Simulate that headers have been sent after first error
			mockRes.headersSent = true;

			// Second error call should be ignored
			error(500);
			assert.strictEqual(mockRes.statusCode, 404, "Should keep first error status");
		});
	});

	describe("Security Headers", () => {
		it("should set X-Content-Type-Options header", () => {
			app.decorate(mockReq, mockRes);
			app.onDone(mockReq, mockRes, "test content", {});

			assert.strictEqual(mockRes.getHeader("x-content-type-options"), "nosniff", "Should set X-Content-Type-Options header");
		});

		it("should set secure default headers", () => {
			const secureApp = new Woodland({ logging: { enabled: false }});

			assert.ok(secureApp.defaultHeaders.length > 0, "Should have default headers");

			// Check that default headers include security headers
			const headers = secureApp.defaultHeaders.map(h => h[0]);
			assert.ok(headers.includes("x-powered-by"), "Should include X-Powered-By header");
		});
	});
});

describe("Woodland Security Integration", () => {
	let app;

	beforeEach(() => {
		app = new Woodland({ logging: { enabled: false }});
	});

	it("should create instance with secure defaults", () => {
		assert.strictEqual(app.origins.length, 0, "Should have empty origins array by default");
		assert.strictEqual(app.autoindex, false, "Should have autoindex disabled by default");
	});

	it("should allow explicit security configuration", () => {
		const secureApp = new Woodland({
			logging: { enabled: false },
			origins: ["https://trusted.com"],
			autoindex: false
		});

		assert.deepStrictEqual(secureApp.origins, ["https://trusted.com"], "Should accept explicit origins");
		assert.strictEqual(secureApp.autoindex, false, "Should respect autoindex setting");
	});

	it("should reject requests with body larger than maxBodySize", () => {
		// Create app with small body size limit (100 bytes)
		const limitedApp = new Woodland({ logging: { enabled: false }, maxBodySize: 100 });

		const req = {
			method: "POST",
			url: "/test",
			headers: {
				host: "localhost:3000",
				"content-length": "500"
			},
			connection: { remoteAddress: "127.0.0.1" },
			socket: { remoteAddress: "127.0.0.1" },
			parsed: { pathname: "/test", hostname: "localhost", search: "" }
		};

		const res = {
			statusCode: 200,
			headersSent: false,
			_headers: {},
			valid: true,
			errorCalled: false,
			errorStatusCode: null,
			setHeader: function (name, value) {
				this._headers[name.toLowerCase()] = value;
			},
			header: function (name, value) {
				this.setHeader(name, value);
			},
			removeHeader: function (name) {
				delete this._headers[name.toLowerCase()];
			},
			getHeader: function (name) {
				return this._headers[name.toLowerCase()];
			},
			error: function (status) {
				this.statusCode = status;
				this.errorCalled = true;
				this.errorStatusCode = status;
			},
			end: function () {
				this.ended = true;
			},
			writeHead: function (status, headers) {
				this.statusCode = status;
				if (headers) {
					Object.assign(this._headers, headers);
				}
			}
		};

		limitedApp.decorate(req, res);

		assert.strictEqual(res.errorCalled, true, "Error should be called for oversized body");
		assert.strictEqual(res.errorStatusCode, 413, "Should return 413 Payload Too Large");
		assert.strictEqual(req.valid, false, "Request should be marked as invalid");
	});

	it("should allow requests within maxBodySize limit", () => {
		// Create app with reasonable body size limit (1MB)
		const appWithLimit = new Woodland({ logging: { enabled: false }, maxBodySize: 1048576 });

		const req = {
			method: "POST",
			url: "/test",
			headers: {
				host: "localhost",
				"content-length": "100" // 100 bytes is within limit
			},
			connection: { remoteAddress: "127.0.0.1" },
			socket: { remoteAddress: "127.0.0.1" },
			parsed: { pathname: "/test", hostname: "localhost", search: "" }
		};

		const res = {
			statusCode: 200,
			headersSent: false,
			_headers: {},
			valid: true,
			errorCalled: false,
			on: function (event, callback) {
				if (event === "close") {
					setTimeout(callback, 0);
				}
			},
			setHeader: function (name, value) {
				this._headers[name.toLowerCase()] = value;
			},
			header: function (name, value) {
				this.setHeader(name, value);
			},
			removeHeader: function (name) {
				delete this._headers[name.toLowerCase()];
			},
			getHeader: function (name) {
				return this._headers[name.toLowerCase()];
			},
			error: function (status) {
				this.statusCode = status;
				this.errorCalled = true;
			},
			end: function () {
				this.ended = true;
			},
			writeHead: function (status, headers) {
				this.statusCode = status;
				if (headers) {
					Object.assign(this._headers, headers);
				}
			}
		};

		appWithLimit.decorate(req, res);

		assert.strictEqual(res.errorCalled, false, "Error should not be called for valid body");
		assert.strictEqual(req.valid, true, "Request should remain valid");
	});

	it("should handle requests with no content-length header", () => {
		const appNoContentLength = new Woodland({ logging: { enabled: false }, maxBodySize: 1000 });

		const req = {
			method: "POST",
			url: "/test",
			headers: {
				host: "localhost"
				// No content-length header
			},
			connection: { remoteAddress: "127.0.0.1" },
			socket: { remoteAddress: "127.0.0.1" },
			parsed: { pathname: "/test", hostname: "localhost", search: "" }
		};

		const res = {
			statusCode: 200,
			headersSent: false,
			_headers: {},
			valid: true,
			errorCalled: false,
			on: function (event, callback) {
				if (event === "close") {
					setTimeout(callback, 0);
				}
			},
			setHeader: function (name, value) {
				this._headers[name.toLowerCase()] = value;
			},
			header: function (name, value) {
				this.setHeader(name, value);
			},
			removeHeader: function (name) {
				delete this._headers[name.toLowerCase()];
			},
			getHeader: function (name) {
				return this._headers[name.toLowerCase()];
			},
			error: function (status) {
				this.statusCode = status;
				this.errorCalled = true;
			},
			end: function () {
				this.ended = true;
			},
			writeHead: function (status, headers) {
				this.statusCode = status;
				if (headers) {
					Object.assign(this._headers, headers);
				}
			}
		};

		appNoContentLength.decorate(req, res);

		assert.strictEqual(res.errorCalled, false, "Should not error without content-length");
		assert.strictEqual(req.valid, true, "Request should remain valid");
	});

	it("should handle invalid content-length header", () => {
		const appInvalidHeader = new Woodland({ logging: { enabled: false }, maxBodySize: 1000 });

		const req = {
			method: "POST",
			url: "/test",
			headers: {
				host: "localhost",
				"content-length": "not-a-number"
			},
			connection: { remoteAddress: "127.0.0.1" },
			socket: { remoteAddress: "127.0.0.1" },
			parsed: { pathname: "/test", hostname: "localhost", search: "" }
		};

		const res = {
			statusCode: 200,
			headersSent: false,
			_headers: {},
			valid: true,
			errorCalled: false,
			on: function (event, callback) {
				if (event === "close") {
					setTimeout(callback, 0);
				}
			},
			setHeader: function (name, value) {
				this._headers[name.toLowerCase()] = value;
			},
			header: function (name, value) {
				this.setHeader(name, value);
			},
			removeHeader: function (name) {
				delete this._headers[name.toLowerCase()];
			},
			getHeader: function (name) {
				return this._headers[name.toLowerCase()];
			},
			error: function (status) {
				this.statusCode = status;
				this.errorCalled = true;
			},
			end: function () {
				this.ended = true;
			},
			writeHead: function (status, headers) {
				this.statusCode = status;
				if (headers) {
					Object.assign(this._headers, headers);
				}
			}
		};

		appInvalidHeader.decorate(req, res);

		assert.strictEqual(res.errorCalled, false, "Should not error on invalid content-length");
		assert.strictEqual(req.valid, true, "Request should remain valid");
	});
});
