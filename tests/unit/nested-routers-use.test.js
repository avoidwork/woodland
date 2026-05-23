import assert from "node:assert";
import { describe, it, beforeEach } from "node:test";
import { woodland } from "../../src/woodland.js";
import { INT_1, INT_2 } from "../../src/constants.js";

describe("nested routers", () => {
	describe("Router class", () => {
		it("should create a Router instance", () => {
			const app = woodland();
			const router = app.mount("/api");

			assert.ok(router);
			assert.strictEqual(router.parent, app);
			assert.strictEqual(router.prefix, "/api");
			assert.ok(router.routeMap instanceof Map);
		});

		it("should return chainable router from mount", () => {
			const app = woodland();
			const router = app.mount("/api");

			assert.strictEqual(
				router.get("/users", () => {}),
				router,
			);
			assert.strictEqual(
				router.post("/users", () => {}),
				router,
			);
		});

		it("should register route handler for GET", () => {
			const app = woodland();
			const router = app.mount("/api");
			const handler = () => {};

			router.get("/users", handler);

			const pathMap = router.routeMap.get("GET");
			assert.ok(pathMap);
			assert.ok(pathMap.has("/users"));
			const handlers = pathMap.get("/users");
			assert.ok(Array.isArray(handlers));
			assert.strictEqual(handlers[0], handler);
		});

		it("should register route handler for POST", () => {
			const app = woodland();
			const router = app.mount("/api");
			const handler = () => {};

			router.post("/users", handler);

			const pathMap = router.routeMap.get("POST");
			assert.ok(pathMap);
			assert.ok(pathMap.has("/users"));
		});

		it("should register route handler for PUT", () => {
			const app = woodland();
			const router = app.mount("/api");
			const handler = () => {};

			router.put("/users/1", handler);

			const pathMap = router.routeMap.get("PUT");
			assert.ok(pathMap);
			assert.ok(pathMap.has("/users/1"));
		});

		it("should register route handler for DELETE", () => {
			const app = woodland();
			const router = app.mount("/api");
			const handler = () => {};

			router.delete("/users/1", handler);

			const pathMap = router.routeMap.get("DELETE");
			assert.ok(pathMap);
			assert.ok(pathMap.has("/users/1"));
		});

		it("should register route handler for PATCH", () => {
			const app = woodland();
			const router = app.mount("/api");
			const handler = () => {};

			router.patch("/users/1", handler);

			const pathMap = router.routeMap.get("PATCH");
			assert.ok(pathMap);
			assert.ok(pathMap.has("/users/1"));
		});

		it("should handle multiple handlers for same route", () => {
			const app = woodland();
			const router = app.mount("/api");
			const handler1 = () => {};
			const handler2 = () => {};

			router.get("/users", handler1);
			router.get("/users", handler2);

			const pathMap = router.routeMap.get("GET");
			const handlers = pathMap.get("/users");
			assert.strictEqual(handlers.length, INT_2);
			assert.strictEqual(handlers[INT_1], handler2);
		});

		it("should normalize paths with leading slash", () => {
			const app = woodland();
			const router = app.mount("/api");

			router.get("users", () => {});

			const pathMap = router.routeMap.get("GET");
			assert.ok(pathMap.has("/users"));
		});

		it("should return this from ignore", () => {
			const app = woodland();
			const router = app.mount("/api");
			const handler = () => {};

			const result = router.ignore(handler);
			assert.strictEqual(result, router);
		});
	});

	describe("app.use with Router", () => {
		let app;

		beforeEach(() => {
			app = woodland();
		});

		it("should register router routes with prefix at GET", () => {
			const router = app.mount("/api");
			const handler = () => {};

			router.get("/users", handler);
			app.use("/api", router);

			const routes = app.routes("/api/users", "GET");
			assert.ok(routes.middleware.includes(handler));
		});

		it("should register router routes with prefix at POST", () => {
			const router = app.mount("/api");
			const handler = () => {};

			router.post("/users", handler);
			app.use("/api", router);

			const routes = app.routes("/api/users", "POST");
			assert.ok(routes.middleware.includes(handler));
		});

		it("should register router routes with prefix at PUT", () => {
			const router = app.mount("/api");
			const handler = () => {};

			router.put("/users/1", handler);
			app.use("/api", router);

			const routes = app.routes("/api/users/1", "PUT");
			assert.ok(routes.middleware.includes(handler));
		});

		it("should register router routes with prefix at DELETE", () => {
			const router = app.mount("/api");
			const handler = () => {};

			router.delete("/users/1", handler);
			app.use("/api", router);

			const routes = app.routes("/api/users/1", "DELETE");
			assert.ok(routes.middleware.includes(handler));
		});

		it("should register router routes with prefix at PATCH", () => {
			const router = app.mount("/api");
			const handler = () => {};

			router.patch("/users/1", handler);
			app.use("/api", router);

			const routes = app.routes("/api/users/1", "PATCH");
			assert.ok(routes.middleware.includes(handler));
		});

		it("should register multiple methods from same router", () => {
			const router = app.mount("/api");
			const getHandler = () => {};
			const postHandler = () => {};

			router.get("/users", getHandler);
			router.post("/users", postHandler);
			app.use("/api", router);

			assert.ok(app.routes("/api/users", "GET").middleware.includes(getHandler));
			assert.ok(app.routes("/api/users", "POST").middleware.includes(postHandler));
		});
	});
});
