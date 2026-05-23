import assert from "node:assert";
import { createServer } from "node:http";
import { describe, it, afterEach } from "node:test";
import { INT_0, INT_1, INT_2 } from "../../src/constants.js";
import { woodland } from "../../src/woodland.js";

describe("cookie integration", () => {
	let server;

	const setupServer = (app) => {
		return new Promise((resolve) => {
			server = createServer(app.route);
			server.listen(0, "127.0.0.1", () => {
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

	it("should preserve set-cookie header when res.cookie is followed by res.send", async () => {
		const app = woodland({ logging: { enabled: false }, etags: false });

		app.get("/", (req, res) => {
			res.cookie("session", "abc123");
			res.send("ok");
		});

		const baseUrl = await setupServer(app);

		const response = await fetch(baseUrl);
		const body = await response.text();

		assert.strictEqual(response.status, 200);
		assert.strictEqual(body, "ok");
		const setCookie = response.headers.getSetCookie();
		assert.ok(setCookie.length > INT_0);
		assert.ok(setCookie[INT_0].includes("session=abc123"));
		assert.ok(setCookie[INT_0].includes("Path=/"));
	});

	it("should preserve multiple cookies with writeHead merge", async () => {
		const app = woodland({ logging: { enabled: false }, etags: false });

		app.get("/", (req, res) => {
			res.cookie("id", "123", { httpOnly: true });
			res.cookie("token", "xyz");
			res.send("done");
		});

		const baseUrl = await setupServer(app);

		const response = await fetch(baseUrl);
		const body = await response.text();

		assert.strictEqual(response.status, 200);
		assert.strictEqual(body, "done");
		const setCookie = response.headers.getSetCookie();
		assert.strictEqual(setCookie.length, INT_2);
		assert.ok(setCookie[INT_0].includes("id=123"));
		assert.ok(setCookie[INT_0].includes("HttpOnly"));
		assert.ok(setCookie[INT_1].includes("token=xyz"));
	});

	it("should include set-cookie header alongside other headers from res.header", async () => {
		const app = woodland({ logging: { enabled: false }, etags: false });

		app.get("/", (req, res) => {
			res.header("x-custom", "custom-value");
			res.cookie("sid", "val456");
			res.send("test");
		});

		const baseUrl = await setupServer(app);

		const response = await fetch(baseUrl);
		const body = await response.text();

		assert.strictEqual(response.status, 200);
		assert.strictEqual(body, "test");
		assert.strictEqual(response.headers.get("x-custom"), "custom-value");
		assert.ok(response.headers.get("set-cookie")?.includes("sid=val456"));
	});
});
