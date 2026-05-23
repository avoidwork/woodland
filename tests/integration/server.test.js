import assert from "node:assert";
import { createServer } from "node:http";
import { describe, it, afterEach } from "node:test";
import { INT_0 } from "../../src/constants.js";
import { woodland } from "../../src/woodland.js";

describe("server integration", () => {
	let server;

	const setupServer = (app) => {
		return new Promise((resolve) => {
			server = createServer(app.route);
			server.listen(INT_0, "127.0.0.1", () => {
				const address = server.address();
				resolve(`http://${address.address}:${address.port}`);
			});
		});
	};

	afterEach(async () => {
		if (server) {
			await new Promise((resolve) => server.close(resolve));
		}
	});

	it("should reject disallowed origin with 403", async () => {
		const app = woodland({ logging: { enabled: false }, origins: ["https://safe.com"], etags: false });

		app.get("/", (req, res) => {
			res.send("ok");
		});

		const baseUrl = await setupServer(app);

		const response = await fetch(baseUrl, {
			headers: {
				Origin: "https://evil.com",
				Host: "localhost",
			},
		});

		assert.strictEqual(response.status, 403);
	});

	it("should not allow long origin even if in allowlist (#isSafeOrigin length check)", async () => {
		const longOrigin = "https://" + "a".repeat(300) + ".com";
		const app = woodland({
			logging: { enabled: false },
			origins: [longOrigin],
			etags: false,
		});

		app.get("/", (req, res) => {
			res.send("ok");
		});

		const baseUrl = await setupServer(app);

		const response = await fetch(baseUrl, {
			headers: {
				Origin: longOrigin,
				Host: "localhost",
			},
		});

		// Long origin should pass the origin check (corsHost=true && origin in allowlist)
		// But #isSafeOrigin returns false, so CORS headers aren't set
		assert.strictEqual(response.status, 200);
		// CORS allow header should NOT be present because isSafeOrigin returned false
		assert.strictEqual(response.headers.get("access-control-allow-origin"), null);
	});

	it("should pass origin validation when safe and in allowlist", async () => {
		const safeOrigin = "https://safe-origin.com";
		const app = woodland({ logging: { enabled: false }, origins: [safeOrigin], etags: false });

		app.get("/", (req, res) => {
			res.send("ok");
		});

		const baseUrl = await setupServer(app);

		const response = await fetch(baseUrl, {
			headers: {
				Origin: safeOrigin,
				Host: "localhost",
			},
		});

		// Safe origin in allowlist: 200 with ACA-Origin header
		assert.strictEqual(response.status, 200);
		assert.strictEqual(
			response.headers.get("access-control-allow-origin"),
			safeOrigin,
		);
	});
});
