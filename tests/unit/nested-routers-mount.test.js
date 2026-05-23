import assert from "node:assert";
import { describe, it, beforeEach } from "node:test";
import { woodland } from "../../src/woodland.js";

describe("nested routers - mount", () => {
	describe("mount method", () => {
		let app;

		beforeEach(() => {
			app = woodland();
		});

		it("should return a Router instance", () => {
			const router = app.mount("/api");
			assert.ok(router);
			assert.strictEqual(router.parent, app);
			assert.strictEqual(router.prefix, "/api");
			assert.ok(router.routeMap instanceof Map);
		});

		it("should allow chaining route methods on mounted router", () => {
			const router = app.mount("/api");
			const handler = () => {};
			const result = router.get("/users", handler);
			assert.strictEqual(result, router);
		});

		it("should register routes on mounted router", () => {
			const router = app.mount("/api");
			const handler = () => {};
			router.get("/users", handler);
			const pathMap = router.routeMap.get("GET");
			assert.ok(pathMap.has("/users"));
			assert.strictEqual(pathMap.get("/users")[0], handler);
		});

		it("should mount nested router via use at root path", () => {
			const router = app.mount("/api");
			const handler = () => {};
			router.get("/users", handler);
			app.use("/api", router);

			assert.ok(app.routes("/api/users", "GET").middleware.includes(handler));
		});

		it("should work with different prefix depths", () => {
			const r1 = app.mount("/v0");
			r1.get("/home", () => {});
			app.use("/v0", r1);

			const r2 = app.mount("/api/v1");
			r2.get("/items", () => {});
			app.use("/api/v1", r2);

			assert.ok(app.routes("/v0/home", "GET").visible > 0);
			assert.ok(app.routes("/api/v1/items", "GET").visible > 0);
		});
	});
});
