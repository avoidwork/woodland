import assert from "node:assert";
import { describe, it, beforeEach, afterEach } from "node:test";
import { createServer, request } from "node:http";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { woodland } from "../../src/woodland.js";

describe("Security Integration Tests", () => {
	let app;
	let server;
	let testDir;

	beforeEach(() => {
		app = woodland({ logging: { enabled: false } });
		server = createServer((req, res) => {
			app.route(req, res);
		});

		testDir = join(process.cwd(), "test-security-temp");
		try {
			rmSync(testDir, { recursive: true, force: true });
		} catch {
			// Ignore if directory doesn't exist
		}
		mkdirSync(testDir, { recursive: true });

		mkdirSync(join(testDir, "static"), { recursive: true });
		writeFileSync(join(testDir, "static", "safe-file.txt"), "This is a safe file");
		writeFileSync(join(testDir, "index.html"), "<h1>Index Page</h1>");

		mkdirSync(join(testDir, "subdir"), { recursive: true });
		writeFileSync(join(testDir, "subdir", "nested.txt"), "Nested file content");

		writeFileSync(join(process.cwd(), "sensitive.txt"), "SENSITIVE DATA");
	});

	afterEach(async () => {
		if (server.listening) {
			await new Promise((resolve) => server.close(resolve));
		}
		try {
			rmSync(testDir, { recursive: true, force: true });
			rmSync(join(process.cwd(), "sensitive.txt"), { force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	function makeRequest(path, options = {}, customServer = null) {
		return new Promise((resolve, reject) => {
			const targetServer = customServer || server;
			const req = request(
				{
					hostname: "localhost",
					port: targetServer.address().port,
					path: path,
					method: options.method || "GET",
					headers: options.headers || {},
				},
				(res) => {
					let data = "";
					res.on("data", (chunk) => {
						data += chunk;
					});
					res.on("end", () => {
						resolve({
							statusCode: res.statusCode,
							headers: res.headers,
							body: data,
						});
					});
				},
			);

			req.on("error", reject);

			if (options.body) {
				req.write(options.body);
			}

			req.end();
		});
	}

	function startServer() {
		return new Promise((resolve) => {
			server.listen(0, resolve);
		});
	}

	describe("Path Traversal Protection", () => {
		it("should block path traversal attempts through file serving", async () => {
			app.files("/static", testDir);
			await startServer();

			const response = await makeRequest("/static/../sensitive.txt");
			assert.ok(
				response.statusCode === 403 || response.statusCode === 404,
				"Should return 403 or 404 for path traversal attempt",
			);
		});

		it("should block encoded path traversal attempts", async () => {
			app.files("/static", testDir);
			await startServer();

			const response = await makeRequest("/static/%2e%2e%2fsensitive.txt");
			assert.ok(
				response.statusCode === 403 || response.statusCode === 404,
				"Should return 403 or 404 for encoded path traversal",
			);
		});

		it("should allow access to safe files", async () => {
			app.files("/static", testDir);
			await startServer();

			const response = await makeRequest("/static/safe-file.txt");
			assert.strictEqual(response.statusCode, 200, "Should return 200 for safe file");
			assert.strictEqual(
				response.body,
				"This is a safe file",
				"Should return correct file content",
			);
		});

		it("should handle malformed URI encoding", async () => {
			app.files("/static", testDir);
			await startServer();

			const response = await makeRequest("/static/%");
			assert.ok(
				response.statusCode === 400 || response.statusCode === 404,
				"Should return 400 or 404 for malformed URI",
			);
		});
	});

	describe("IP Address Security", () => {
		it("should handle X-Forwarded-For header securely", async () => {
			app.get("/ip", (req, res) => {
				res.json({ ip: req.ip });
			});
			await startServer();

			const response = await makeRequest("/ip", {
				headers: { "X-Forwarded-For": "192.168.1.1, 10.0.0.1" },
			});

			assert.strictEqual(response.statusCode, 200, "Should return 200");
			const data = JSON.parse(response.body);
			assert.strictEqual(
				data.ip,
				"192.168.1.1",
				"Should extract first valid IP (including private IPs)",
			);
		});

		it("should extract valid IP from X-Forwarded-For", async () => {
			app.get("/ip", (req, res) => {
				res.json({ ip: req.ip });
			});
			await startServer();

			const response = await makeRequest("/ip", {
				headers: { "X-Forwarded-For": "203.0.113.1, 192.168.1.1" },
			});

			assert.strictEqual(response.statusCode, 200, "Should return 200");
			const data = JSON.parse(response.body);
			assert.strictEqual(data.ip, "203.0.113.1", "Should extract first valid IP");
		});

		it("should handle invalid X-Forwarded-For header", async () => {
			app.get("/ip", (req, res) => {
				res.json({ ip: req.ip });
			});
			await startServer();

			const response = await makeRequest("/ip", {
				headers: { "X-Forwarded-For": "invalid-ip, not-an-ip" },
			});

			assert.strictEqual(response.statusCode, 200, "Should return 200");
			const data = JSON.parse(response.body);
			assert.ok(data.ip.length > 0, "Should fall back to connection IP");
		});
	});

	describe("CORS Security", () => {
		it("should deny CORS by default", async () => {
			app.get("/test", (req, res) => {
				res.json({ message: "test" });
			});
			await startServer();

			const response = await makeRequest("/test", {
				headers: { Origin: "https://evil.com" },
			});

			assert.strictEqual(
				response.statusCode,
				403,
				"Should return 403 for cross-origin request",
			);
			assert.strictEqual(
				response.headers["access-control-allow-origin"],
				undefined,
				"Should not set CORS headers",
			);
		});

		it("should allow CORS when explicitly configured", async () => {
			const corsApp = woodland({
				origins: ["https://trusted.com"],
				logging: { enabled: false },
			});
			corsApp.get("/test", (req, res) => {
				res.json({ message: "test" });
			});

			const corsServer = createServer((req, res) => {
				corsApp.route(req, res);
			});

			await new Promise((resolve) => corsServer.listen(0, resolve));

			try {
				const response = await makeRequest(
					"/test",
					{
						headers: { Origin: "https://trusted.com" },
					},
					corsServer,
				);

				assert.strictEqual(response.statusCode, 200, "Should return 200");
				assert.strictEqual(
					response.headers["access-control-allow-origin"],
					"https://trusted.com",
					"Should set CORS headers",
				);
			} finally {
				await new Promise((resolve) => corsServer.close(resolve));
			}
		});

		it("should deny CORS for non-configured origins", async () => {
			const corsApp = woodland({
				origins: ["https://trusted.com"],
				logging: { enabled: false },
			});
			corsApp.get("/test", (req, res) => {
				res.json({ message: "test" });
			});

			const corsServer = createServer((req, res) => {
				corsApp.route(req, res);
			});

			await new Promise((resolve) => corsServer.listen(0, resolve));

			try {
				const response = await makeRequest(
					"/test",
					{
						headers: { Origin: "https://evil.com" },
					},
					corsServer,
				);

				assert.strictEqual(
					response.statusCode,
					403,
					"Should return 403 for non-configured origin",
				);
			} finally {
				await new Promise((resolve) => corsServer.close(resolve));
			}
		});
	});

	describe("Autoindex Security", () => {
		it("should escape HTML in directory listings", async () => {
			const autoindexDir = join(testDir, "autoindex");
			mkdirSync(autoindexDir, { recursive: true });
			mkdirSync(join(autoindexDir, "static"), { recursive: true });

			writeFileSync(join(autoindexDir, "static", "script-alert-xss.txt"), "test");
			writeFileSync(join(autoindexDir, "static", "file&name.txt"), "test");

			const autoindexApp = woodland({ autoindex: true, logging: { enabled: false } });
			autoindexApp.files("/static", autoindexDir);

			const autoindexServer = createServer((req, res) => {
				autoindexApp.route(req, res);
			});

			await new Promise((resolve) => autoindexServer.listen(0, resolve));

			try {
				const response = await makeRequest("/static/", {}, autoindexServer);

				assert.strictEqual(response.statusCode, 200, "Should return 200");
				assert.ok(
					response.body.includes("script-alert-xss.txt"),
					"Should show safe filename",
				);
				assert.ok(
					response.body.includes("file&amp;name.txt"),
					"Should escape ampersands in filename",
				);
				assert.ok(
					!response.body.includes("<script>alert('xss')</script>"),
					"Should not contain unescaped script tags",
				);
			} finally {
				await new Promise((resolve) => autoindexServer.close(resolve));
			}
		});

		it("should properly encode hrefs in directory listings", async () => {
			const autoindexDir = join(testDir, "autoindex2");
			mkdirSync(autoindexDir, { recursive: true });
			mkdirSync(join(autoindexDir, "static"), { recursive: true });

			writeFileSync(join(autoindexDir, "static", "file with spaces.txt"), "test");
			writeFileSync(join(autoindexDir, "static", "file%percent.txt"), "test");

			const autoindexApp = woodland({ autoindex: true, logging: { enabled: false } });
			autoindexApp.files("/static", autoindexDir);

			const autoindexServer = createServer((req, res) => {
				autoindexApp.route(req, res);
			});

			await new Promise((resolve) => autoindexServer.listen(0, resolve));

			try {
				const response = await makeRequest("/static/", {}, autoindexServer);

				assert.strictEqual(response.statusCode, 200, "Should return 200");
				assert.ok(
					response.body.includes('href="file%20with%20spaces.txt"'),
					"Should URL encode spaces in href",
				);
				assert.ok(
					response.body.includes('href="file%25percent.txt"'),
					"Should URL encode percent signs in href",
				);
			} finally {
				await new Promise((resolve) => autoindexServer.close(resolve));
			}
		});

		it("should not expose autoindex when disabled", async () => {
			const noIndexDir = join(testDir, "noindex");
			mkdirSync(noIndexDir, { recursive: true });
			writeFileSync(join(noIndexDir, "test-file.txt"), "test");

			app.files("/static", noIndexDir);
			await startServer();

			const response = await makeRequest("/static/");

			assert.strictEqual(
				response.statusCode,
				404,
				"Should return 404 when autoindex is disabled",
			);
		});
	});

	describe("Security Headers", () => {
		it("should set X-Content-Type-Options header", async () => {
			app.get("/test", (req, res) => {
				res.send("test content");
			});
			await startServer();

			const response = await makeRequest("/test");

			assert.strictEqual(response.statusCode, 200, "Should return 200");
			assert.strictEqual(
				response.headers["x-content-type-options"],
				"nosniff",
				"Should set X-Content-Type-Options header",
			);
		});

		it("should set secure default headers", async () => {
			app.get("/test", (req, res) => {
				res.send("test content");
			});
			await startServer();

			const response = await makeRequest("/test");

			assert.strictEqual(response.statusCode, 200, "Should return 200");
			assert.ok(response.headers["x-powered-by"], "Should set X-Powered-By header");
			assert.ok(response.headers.server, "Should set Server header");
		});

		it("should allow disabling default headers", async () => {
			const silentApp = woodland({ silent: true, logging: { enabled: false } });
			silentApp.get("/test", (req, res) => {
				res.send("test content");
			});

			const silentServer = createServer((req, res) => {
				silentApp.route(req, res);
			});

			await new Promise((resolve) => silentServer.listen(0, resolve));

			try {
				const response = await makeRequest("/test", {}, silentServer);

				assert.strictEqual(response.statusCode, 200, "Should return 200");
				assert.strictEqual(
					response.headers["x-powered-by"],
					undefined,
					"Should not set X-Powered-By header when silent",
				);
			} finally {
				await new Promise((resolve) => silentServer.close(resolve));
			}
		});
	});

	describe("Error Handling Security", () => {
		it("should not expose sensitive information in error responses", async () => {
			app.get("/error", (req, res) => {
				res.error(500);
			});
			await startServer();

			const response = await makeRequest("/error");

			assert.strictEqual(response.statusCode, 500, "Should return 500");
			assert.ok(
				!response.body.includes("woodland"),
				"Should not expose framework details in error",
			);
			assert.ok(!response.body.includes("/Users/"), "Should not expose file paths in error");
		});

		it("should handle 404 errors securely", async () => {
			await startServer();

			const response = await makeRequest("/nonexistent");

			assert.strictEqual(response.statusCode, 404, "Should return 404");
			assert.ok(
				!response.body.includes("woodland"),
				"Should not expose framework details in 404",
			);
		});
	});
});
