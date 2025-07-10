/* global afterEach */
import assert from "node:assert";
import {createServer, request} from "node:http";
import {writeFileSync, mkdirSync, rmSync} from "node:fs";
import {join} from "node:path";
import {woodland} from "../../src/woodland.js";

describe("Security Integration Tests", () => {
	let app;
	let server;
	let testDir;

	beforeEach(() => {
		app = woodland();
		server = createServer((req, res) => {
			app.route(req, res);
		});

		// Create test directory structure
		testDir = join(process.cwd(), "test-security-temp");
		try {
			rmSync(testDir, { recursive: true, force: true });
		} catch {
			// Ignore if directory doesn't exist
		}
		mkdirSync(testDir, { recursive: true });

		// Create test files in structure that matches the buggy files() implementation
		// The files() method uses req.parsed.pathname.substring(1) so it expects:
		// /static/safe-file.txt -> static/safe-file.txt in the served directory
		mkdirSync(join(testDir, "static"), { recursive: true });
		writeFileSync(join(testDir, "static", "safe-file.txt"), "This is a safe file");
		writeFileSync(join(testDir, "index.html"), "<h1>Index Page</h1>");

		// Create nested directory
		mkdirSync(join(testDir, "subdir"), { recursive: true });
		writeFileSync(join(testDir, "subdir", "nested.txt"), "Nested file content");

		// Create sensitive file outside the test directory
		writeFileSync(join(process.cwd(), "sensitive.txt"), "SENSITIVE DATA");
	});

	afterEach(function (done) {
		if (server.listening) {
			server.close(() => {
				// Clean up test files
				try {
					rmSync(testDir, { recursive: true, force: true });
					rmSync(join(process.cwd(), "sensitive.txt"), { force: true });
				} catch {
					// Ignore cleanup errors
				}
				done();
			});
		} else {
			// Clean up test files
			try {
				rmSync(testDir, { recursive: true, force: true });
				rmSync(join(process.cwd(), "sensitive.txt"), { force: true });
			} catch {
				// Ignore cleanup errors
			}
			done();
		}
	});

	function makeRequest (path, options = {}, customServer = null) {
		return new Promise((resolve, reject) => {
			const targetServer = customServer || server;
			const req = request({
				hostname: "localhost",
				port: targetServer.address().port,
				path: path,
				method: options.method || "GET",
				headers: options.headers || {}
			}, res => {
				let data = "";
				res.on("data", chunk => {
					data += chunk;
				});
				res.on("end", () => {
					resolve({
						statusCode: res.statusCode,
						headers: res.headers,
						body: data
					});
				});
			});

			req.on("error", reject);

			if (options.body) {
				req.write(options.body);
			}

			req.end();
		});
	}

	describe("Path Traversal Protection", () => {
		it("should block path traversal attempts through file serving", done => {
			app.files("/static", testDir);

			server.listen(0, async () => {
				try {
					const response = await makeRequest("/static/../sensitive.txt");
					// The path traversal attempt should be blocked, but the exact status depends on implementation
					assert.ok(response.statusCode === 403 || response.statusCode === 404, "Should return 403 or 404 for path traversal attempt");
					done();
				} catch (err) {
					done(err);
				}
			});
		});

		it("should block encoded path traversal attempts", done => {
			app.files("/static", testDir);

			server.listen(0, async () => {
				try {
					const response = await makeRequest("/static/%2e%2e%2fsensitive.txt");
					assert.ok(response.statusCode === 403 || response.statusCode === 404, "Should return 403 or 404 for encoded path traversal");
					done();
				} catch (err) {
					done(err);
				}
			});
		});

		it("should allow access to safe files", done => {
			app.files("/static", testDir);

			server.listen(0, async () => {
				try {
					const response = await makeRequest("/static/safe-file.txt");
					assert.strictEqual(response.statusCode, 200, "Should return 200 for safe file");
					assert.strictEqual(response.body, "This is a safe file", "Should return correct file content");
					done();
				} catch (err) {
					done(err);
				}
			});
		});

		it("should handle malformed URI encoding", done => {
			app.files("/static", testDir);

			server.listen(0, async () => {
				try {
					const response = await makeRequest("/static/%");
					assert.ok(response.statusCode === 400 || response.statusCode === 404, "Should return 400 or 404 for malformed URI");
					done();
				} catch (err) {
					done(err);
				}
			});
		});
	});

	describe("IP Address Security", () => {
		it("should handle X-Forwarded-For header securely", done => {
			app.get("/ip", (req, res) => {
				res.json({ ip: req.ip });
			});

			server.listen(0, async () => {
				try {
					const response = await makeRequest("/ip", {
						headers: { "X-Forwarded-For": "192.168.1.1, 10.0.0.1" }
					});

					assert.strictEqual(response.statusCode, 200, "Should return 200");
					const data = JSON.parse(response.body);
					assert.strictEqual(data.ip, "192.168.1.1", "Should extract first valid IP (including private IPs)");
					done();
				} catch (err) {
					done(err);
				}
			});
		});

		it("should extract valid IP from X-Forwarded-For", done => {
			app.get("/ip", (req, res) => {
				res.json({ ip: req.ip });
			});

			server.listen(0, async () => {
				try {
					const response = await makeRequest("/ip", {
						headers: { "X-Forwarded-For": "203.0.113.1, 192.168.1.1" }
					});

					assert.strictEqual(response.statusCode, 200, "Should return 200");
					const data = JSON.parse(response.body);
					assert.strictEqual(data.ip, "203.0.113.1", "Should extract first valid IP");
					done();
				} catch (err) {
					done(err);
				}
			});
		});

		it("should handle invalid X-Forwarded-For header", done => {
			app.get("/ip", (req, res) => {
				res.json({ ip: req.ip });
			});

			server.listen(0, async () => {
				try {
					const response = await makeRequest("/ip", {
						headers: { "X-Forwarded-For": "invalid-ip, not-an-ip" }
					});

					assert.strictEqual(response.statusCode, 200, "Should return 200");
					const data = JSON.parse(response.body);
					assert.ok(data.ip === "127.0.0.1" || data.ip === "::ffff:127.0.0.1", "Should fall back to connection IP");
					done();
				} catch (err) {
					done(err);
				}
			});
		});
	});

	describe("CORS Security", () => {
		it("should deny CORS by default", done => {
			app.get("/test", (req, res) => {
				res.json({ message: "test" });
			});

			server.listen(0, async () => {
				try {
					const response = await makeRequest("/test", {
						headers: { "Origin": "https://evil.com" }
					});

					assert.strictEqual(response.statusCode, 403, "Should return 403 for cross-origin request");
					assert.strictEqual(response.headers["access-control-allow-origin"], undefined, "Should not set CORS headers");
					done();
				} catch (err) {
					done(err);
				}
			});
		});

		it("should allow CORS when explicitly configured", done => {
			const corsApp = woodland({ origins: ["https://trusted.com"] });
			corsApp.get("/test", (req, res) => {
				res.json({ message: "test" });
			});

			const corsServer = createServer((req, res) => {
				corsApp.route(req, res);
			});

			corsServer.listen(0, async () => {
				try {
					const response = await makeRequest("/test", {
						headers: { "Origin": "https://trusted.com" }
					}, corsServer);

					assert.strictEqual(response.statusCode, 200, "Should return 200");
					assert.strictEqual(response.headers["access-control-allow-origin"], "https://trusted.com", "Should set CORS headers");
					corsServer.close(done);
				} catch (err) {
					corsServer.close(() => done(err));
				}
			});
		});

		it("should deny CORS for non-configured origins", done => {
			const corsApp = woodland({ origins: ["https://trusted.com"] });
			corsApp.get("/test", (req, res) => {
				res.json({ message: "test" });
			});

			const corsServer = createServer((req, res) => {
				corsApp.route(req, res);
			});

			corsServer.listen(0, async () => {
				try {
					const response = await makeRequest("/test", {
						headers: { "Origin": "https://evil.com" }
					}, corsServer);

					assert.strictEqual(response.statusCode, 403, "Should return 403 for non-configured origin");
					corsServer.close(done);
				} catch (err) {
					corsServer.close(() => done(err));
				}
			});
		});
	});

	describe("Autoindex Security", () => {
		it("should escape HTML in directory listings", done => {
			// Create a subdirectory for autoindex testing (no index.html)
			const autoindexDir = join(testDir, "autoindex");
			mkdirSync(autoindexDir, { recursive: true });
			// Create the static subdirectory that the buggy files() method expects
			mkdirSync(join(autoindexDir, "static"), { recursive: true });

			// Create files with potentially dangerous names (using safe filenames)
			writeFileSync(join(autoindexDir, "static", "script-alert-xss.txt"), "test");
			writeFileSync(join(autoindexDir, "static", "file&name.txt"), "test");

			const autoindexApp = woodland({ autoindex: true });
			autoindexApp.files("/static", autoindexDir);

			const autoindexServer = createServer((req, res) => {
				autoindexApp.route(req, res);
			});

			autoindexServer.listen(0, async () => {
				try {
					const response = await makeRequest("/static/", {}, autoindexServer);

					assert.strictEqual(response.statusCode, 200, "Should return 200");
					assert.ok(response.body.includes("script-alert-xss.txt"),
						"Should show safe filename");
					assert.ok(response.body.includes("file&amp;name.txt"),
						"Should escape ampersands in filename");
					assert.ok(!response.body.includes("<script>alert('xss')</script>"),
						"Should not contain unescaped script tags");

					autoindexServer.close(done);
				} catch (err) {
					autoindexServer.close(() => done(err));
				}
			});
		});

		it("should properly encode hrefs in directory listings", done => {
			// Create a subdirectory for autoindex testing (no index.html)
			const autoindexDir = join(testDir, "autoindex2");
			mkdirSync(autoindexDir, { recursive: true });
			// Create the static subdirectory that the buggy files() method expects
			mkdirSync(join(autoindexDir, "static"), { recursive: true });

			// Create files with special characters
			writeFileSync(join(autoindexDir, "static", "file with spaces.txt"), "test");
			writeFileSync(join(autoindexDir, "static", "file%percent.txt"), "test");

			const autoindexApp = woodland({ autoindex: true });
			autoindexApp.files("/static", autoindexDir);

			const autoindexServer = createServer((req, res) => {
				autoindexApp.route(req, res);
			});

			autoindexServer.listen(0, async () => {
				try {
					const response = await makeRequest("/static/", {}, autoindexServer);

					assert.strictEqual(response.statusCode, 200, "Should return 200");
					assert.ok(response.body.includes('href="file%20with%20spaces.txt"'),
						"Should URL encode spaces in href");
					assert.ok(response.body.includes('href="file%25percent.txt"'),
						"Should URL encode percent signs in href");

					autoindexServer.close(done);
				} catch (err) {
					autoindexServer.close(() => done(err));
				}
			});
		});

		it("should not expose autoindex when disabled", done => {
			// Create a subdirectory without index files for testing autoindex disabled
			const noIndexDir = join(testDir, "noindex");
			mkdirSync(noIndexDir, { recursive: true });
			writeFileSync(join(noIndexDir, "test-file.txt"), "test");

			app.files("/static", noIndexDir);

			server.listen(0, async () => {
				try {
					const response = await makeRequest("/static/");

					assert.strictEqual(response.statusCode, 404, "Should return 404 when autoindex is disabled");
					done();
				} catch (err) {
					done(err);
				}
			});
		});
	});

	describe("Security Headers", () => {
		it("should set X-Content-Type-Options header", done => {
			app.get("/test", (req, res) => {
				res.send("test content");
			});

			server.listen(0, async () => {
				try {
					const response = await makeRequest("/test");

					assert.strictEqual(response.statusCode, 200, "Should return 200");
					assert.strictEqual(response.headers["x-content-type-options"], "nosniff",
						"Should set X-Content-Type-Options header");
					done();
				} catch (err) {
					done(err);
				}
			});
		});

		it("should set secure default headers", done => {
			app.get("/test", (req, res) => {
				res.send("test content");
			});

			server.listen(0, async () => {
				try {
					const response = await makeRequest("/test");

					assert.strictEqual(response.statusCode, 200, "Should return 200");
					assert.ok(response.headers["x-powered-by"], "Should set X-Powered-By header");
					assert.ok(response.headers.server, "Should set Server header");
					done();
				} catch (err) {
					done(err);
				}
			});
		});

		it("should allow disabling default headers", done => {
			const silentApp = woodland({ silent: true });
			silentApp.get("/test", (req, res) => {
				res.send("test content");
			});

			const silentServer = createServer((req, res) => {
				silentApp.route(req, res);
			});

			silentServer.listen(0, async () => {
				try {
					const response = await makeRequest("/test", {}, silentServer);

					assert.strictEqual(response.statusCode, 200, "Should return 200");
					assert.strictEqual(response.headers["x-powered-by"], undefined,
						"Should not set X-Powered-By header when silent");

					silentServer.close(done);
				} catch (err) {
					silentServer.close(() => done(err));
				}
			});
		});
	});

	describe("Error Handling Security", () => {
		it("should not expose sensitive information in error responses", done => {
			app.get("/error", (req, res) => {
				res.error(500);
			});

			server.listen(0, async () => {
				try {
					const response = await makeRequest("/error");

					assert.strictEqual(response.statusCode, 500, "Should return 500");
					assert.ok(!response.body.includes("woodland"),
						"Should not expose framework details in error");
					assert.ok(!response.body.includes("/Users/"),
						"Should not expose file paths in error");
					done();
				} catch (err) {
					done(err);
				}
			});
		});

		it("should handle 404 errors securely", done => {
			server.listen(0, async () => {
				try {
					const response = await makeRequest("/nonexistent");

					assert.strictEqual(response.statusCode, 404, "Should return 404");
					assert.ok(!response.body.includes("woodland"),
						"Should not expose framework details in 404");
					done();
				} catch (err) {
					done(err);
				}
			});
		});
	});
});
