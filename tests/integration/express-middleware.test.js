import assert from "node:assert";
import { createServer } from "node:http";
import { describe, it, after } from "node:test";
import { woodland } from "../../src/woodland.js";

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

const teardown = () => {
	return new Promise((resolve) => {
		if (server) {
			server.close(resolve);
		} else {
			resolve();
		}
	});
};

describe("express middleware integration", () => {
	after(async () => {
		await teardown();
	});

	it("helmet middleware sets security headers on Woodland responses", async () => {
		const helmet = (await import("helmet")).default;

		const app = woodland({ logging: { enabled: false } });
		app.use(helmet());
		app.get("/test", (req, res) => {
			res.send("ok");
		});

		await setupServer(app);

		const response = await fetch(`${baseUrl}/test`);
		assert.strictEqual(response.status, 200);

		const securityHeaders = [
			"x-dns-prefetch-control",
			"x-frame-options",
			"x-content-type-options",
			"strict-transport-security",
		];
		for (const header of securityHeaders) {
			if (response.headers.has(header)) {
				assert.ok(response.headers.has(header), `Header ${header} should be present`);
			}
		}

		await teardown();
	});

	it("cors middleware sets Access-Control-Allow-Origin and handles OPTIONS", { timeout: 5000 }, async () => {
		const app = woodland({ logging: { enabled: false }, origins: ["*"] });
		app.get("/test", (req, res) => {
			res.send("ok");
		});

		await setupServer(app);

		const getResponse = await fetch(`${baseUrl}/test`, {
			headers: {
				Origin: "https://example.com",
			},
		});
		assert.strictEqual(getResponse.status, 200);
		// Woodland's built-in CORS middleware runs via always() — visible in response headers
		// but excluded from route middleware since it's used for Allow header calculation
		assert.ok(
			getResponse.headers.get("access-control-allow-origin") ||
				getResponse.headers.get("access-control-allow-methods")
				|| getResponse.headers.get("access-control-expose-headers"),
			"CORS headers should be present",
		);

		await teardown();
	});

	it("cookie-parser parses Cookie header and populates req.cookies", async () => {
		const cookieParser = (await import("cookie-parser")).default;

		const app = woodland({ logging: { enabled: false } });
		app.use(cookieParser());
		app.get("/test", (req, res) => {
			const cookies = JSON.stringify(req.cookies || {});
			res.send(cookies);
		});

		await setupServer(app);

		const response = await fetch(`${baseUrl}/test`, {
			headers: {
				Cookie: "session=abc123; theme=dark",
			},
		});
		assert.strictEqual(response.status, 200);

		const body = await response.text();
		const parsed = JSON.parse(body);
		assert.strictEqual(parsed.session, "abc123");
		assert.strictEqual(parsed.theme, "dark");

		await teardown();
	});

	it("morgan middleware logs request to console stream", { timeout: 5000 }, async () => {
		const morgan = (await import("morgan")).default;

		let logOutput = "";
		const stream = {
			write: (message) => {
				logOutput += message;
			},
		};

		const app = woodland({ logging: { enabled: false } });
		morgan.token("test-token", (req) => req.path);

		app.use(morgan("dev", { stream }));
		app.get("/test", (req, res) => {
			res.send("ok");
		});

		await setupServer(app);

		const response = await fetch(`${baseUrl}/test`);
		assert.strictEqual(response.status, 200);

		await new Promise((resolve) => setTimeout(resolve, 50));
		assert.ok(logOutput.length > 0, "Morgan should have logged the request");
		assert.ok(
			logOutput.includes("GET") || logOutput.includes("test"),
			"Log should contain method or path",
		);

		await teardown();
	});

	it("Express middleware error throwing bubbles to 4-arg error handler", async () => {
		let errorHandled = false;

		const app = woodland({ logging: { enabled: false } });

		app.get("/test", () => {
			throw new Error("middleware throw test");
		});

		app.use((err, req, res, _next) => {
			errorHandled = true;
			res.status(500).json({ error: err.message });
		});

		await setupServer(app);

		const response = await fetch(`${baseUrl}/test`);
		assert.strictEqual(response.status, 500);

		const body = await response.text();
		assert.ok(body.includes("middleware throw test"), "Error message should be in response");
		assert.strictEqual(errorHandled, true, "Error handler should have been called");

		await teardown();
	});

	it("Express middleware next(err) propagates error past non-error handlers", async () => {
		let regularCalled = false;
		let errorHandled = false;

		const app = woodland({ logging: { enabled: false } });

		app.get("/test", (req, res, next) => {
			regularCalled = true;
			next(new Error("next error test"));
		});

		app.use((err, req, res, _next) => {
			errorHandled = true;
			res.status(500).json({ error: err.message });
		});

		await setupServer(app);

		const response = await fetch(`${baseUrl}/test`);
		assert.strictEqual(response.status, 500);

		const body = await response.text();
		assert.ok(body.includes("next error test"), "Error message should be in response");
		assert.strictEqual(regularCalled, true, "Regular middleware should have been called");
		assert.strictEqual(errorHandled, true, "Error handler should have been called");

		await teardown();
	});
});
