import assert from "node:assert";
import { createServer } from "node:http";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, afterEach } from "node:test";
import { woodland } from "../../src/woodland.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const testFilesDir = join(__dirname, "..", "test-files");

describe("fileserver integration", () => {
	let server;
	let baseUrl;

	const setupServer = (app) => {
		return new Promise((resolve) => {
			server = createServer(app.route);
			server.listen(0, "127.0.0.1", () => {
				const address = server.address();
				baseUrl = `http://${address.address}:${address.port}`;
				resolve();
			});
		});
	};

	afterEach(async () => {
		if (server) {
			await new Promise((resolve) => server.close(resolve));
			server = null;
			baseUrl = null;
		}
	});

	it("should serve file via mounted path", async () => {
		const app = woodland({
			logging: { enabled: false },
			etags: false,
		});

		app.files("/static", testFilesDir);

		await setupServer(app);

		const response = await fetch(`${baseUrl}/static/small.txt`);
		const body = await response.text();

		assert.strictEqual(response.status, 200);
		assert.strictEqual(body.trim(), "Hello World");
	});

	it("should strip mount prefix and serve nested files", async () => {
		const app = woodland({
			logging: { enabled: false },
			etags: false,
		});

		app.files("/files", testFilesDir);

		await setupServer(app);

		const response = await fetch(`${baseUrl}/files/subdir/nested.txt`);
		const body = await response.text();

		assert.strictEqual(response.status, 200);
		assert.ok(body.toLowerCase().includes("nested"));
	});

	it("should redirect directory without trailing slash", async () => {
		const app = woodland({
			logging: { enabled: false },
			etags: false,
		});

		app.files("/static", testFilesDir);

		await setupServer(app);

		const response = await fetch(`${baseUrl}/static/subdir`, { redirect: "manual" });

		// Woodland uses 308 (permanent redirect) for directory redirects
		assert.strictEqual(response.status, 308);
		assert.strictEqual(response.headers.get("location"), "/static/subdir/");
	});

	it("should serve directory listing with autoIndex enabled", async () => {
		const app = woodland({
			logging: { enabled: false },
			etags: false,
			autoIndex: true,
		});

		app.files("/static", testFilesDir);

		await setupServer(app);

		// Use a directory without index.html to trigger autoindex
		const response = await fetch(`${baseUrl}/static/`);
		const body = await response.text();

		assert.strictEqual(response.status, 200);
		assert.ok(body.includes("<!doctype html>"));
		assert.ok(body.includes("small.txt"));
	});

	it("should return 404 for non-existent file", async () => {
		const app = woodland({
			logging: { enabled: false },
			etags: false,
		});

		app.files("/static", testFilesDir);

		await setupServer(app);

		const response = await fetch(`${baseUrl}/static/nonexistent.txt`);

		assert.strictEqual(response.status, 404);
	});

	it("should block path traversal attempts", async () => {
		const app = woodland({
			logging: { enabled: false },
			etags: false,
		});

		app.files("/static", testFilesDir);

		await setupServer(app);

		// Test that accessing a file outside the root directory is blocked
		// Using a path that would resolve outside testFilesDir
		const response = await fetch(`${baseUrl}/static/../../../etc/passwd`);

		// The URL parser normalizes the path, so we get 404 for /etc/passwd
		// which is not in our routes. The actual path traversal protection
		// is tested in unit tests with direct serve() calls.
		// This test verifies that we don't leak file contents.
		assert.notStrictEqual(response.status, 200);
	});

	it("should serve correct MIME type for different file extensions", async () => {
		const app = woodland({
			logging: { enabled: false },
			etags: false,
		});

		app.files("/static", testFilesDir);

		await setupServer(app);

		const response = await fetch(`${baseUrl}/static/test.js`);
		const contentType = response.headers.get("content-type");

		assert.strictEqual(response.status, 200);
		assert.ok(contentType.includes("javascript"));
	});

	it("should handle multiple file mounts correctly", async () => {
		const app = woodland({
			logging: { enabled: false },
			etags: false,
		});

		app.files("/static", testFilesDir);
		app.files("/assets", testFilesDir);

		await setupServer(app);

		const response1 = await fetch(`${baseUrl}/static/small.txt`);
		const response2 = await fetch(`${baseUrl}/assets/small.txt`);

		assert.strictEqual(response1.status, 200);
		assert.strictEqual(response2.status, 200);

		const body1 = await response1.text();
		const body2 = await response2.text();

		assert.strictEqual(body1.trim(), body2.trim());
	});

	it("should serve index.html when accessing directory with autoIndex", async () => {
		const app = woodland({
			logging: { enabled: false },
			etags: false,
			autoIndex: true,
			indexes: ["index.html"],
		});

		app.files("/static", testFilesDir);

		await setupServer(app);

		// Create a temp directory with index.html for this test
		const { mkdirSync, writeFileSync, rmSync } = await import("node:fs");
		const tempDir = join(testFilesDir, "temp-index");
		mkdirSync(tempDir, { recursive: true });
		writeFileSync(join(tempDir, "index.html"), "<h1>Temp Index</h1>");

		try {
			const response = await fetch(`${baseUrl}/static/temp-index/`);
			const body = await response.text();

			assert.strictEqual(response.status, 200);
			assert.ok(body.includes("<h1>Temp Index</h1>"));
		} finally {
			rmSync(tempDir, { recursive: true, force: true });
		}
	});

	it("should handle HEAD requests for files", async () => {
		const app = woodland({
			logging: { enabled: false },
			etags: false,
		});

		app.files("/static", testFilesDir);

		await setupServer(app);

		const response = await fetch(`${baseUrl}/static/small.txt`, { method: "HEAD" });

		assert.strictEqual(response.status, 200);
		assert.ok(response.headers.has("content-type"));
	});

	it("should handle OPTIONS requests for files", async () => {
		const app = woodland({
			logging: { enabled: false },
			etags: false,
		});

		app.files("/static", testFilesDir);

		await setupServer(app);

		// OPTIONS is not typically supported for static file serving
		// It should return 405 Method Not Allowed
		const response = await fetch(`${baseUrl}/static/small.txt`, { method: "OPTIONS" });

		assert.strictEqual(response.status, 405);
	});
});
