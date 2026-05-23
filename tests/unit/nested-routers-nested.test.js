import assert from "node:assert";
import { describe, it, beforeEach } from "node:test";
import { woodland, Router } from "../../src/woodland.js";

describe("nested routers - nesting", () => {
	let app;

	beforeEach(() => {
		app = woodland();
	});

	it("should handle two-level nested routers", () => {
		const apiRouter = new Router(app, "nested");
		const childRouter = new Router(apiRouter, "nested");

		const handler = () => {};
		childRouter.get("/data", handler);

		apiRouter.get("/v1", childRouter);
		app.use("/api", apiRouter);

		const routes = app.routes("/api/v1/data", "GET");
		assert.ok(routes.visible > 0);
		assert.ok(routes.middleware.includes(handler));
	});

	it("should handle three-level deep nesting", () => {
		const level1 = new Router(app, "nested");
		const level2 = new Router(level1, "nested");
		const level3 = new Router(level2, "nested");

		const deepHandler = () => {};
		level3.get("/profile", deepHandler);

		level2.get("/users", level3);
		level1.get("/v1", level2);
		app.use("/api/namespace", level1);

		const routes = app.routes("/api/namespace/v1/users/profile", "GET");
		assert.ok(routes.visible > 0);
		assert.ok(routes.middleware.includes(deepHandler));
	});

	it("should preserve handler references through nesting", () => {
		const apiRouter = new Router(app, "nested");
		const childRouter = new Router(apiRouter, "nested");

		const handler1 = () => {};
		const handler2 = () => {};

		childRouter.get("/users", handler1);
		childRouter.get("/items", handler2);

		apiRouter.get("/v1", childRouter);
		app.use("/api", apiRouter);

		const usersRoutes = app.routes("/api/v1/users", "GET");
		const itemsRoutes = app.routes("/api/v1/items", "GET");

		assert.ok(usersRoutes.middleware.includes(handler1));
		assert.ok(itemsRoutes.middleware.includes(handler2));
		assert.strictEqual(usersRoutes.middleware.filter((h) => h === handler1).length, 1);
		assert.strictEqual(itemsRoutes.middleware.filter((h) => h === handler2).length, 1);
	});

	it("should handle nested routers alongside direct routes", () => {
		const apiRouter = new Router(app, "nested");
		const v1Router = new Router(apiRouter, "nested");

		const directHandler = () => {};
		const nestedHandler = () => {};

		apiRouter.get("/health", directHandler);
		v1Router.get("/data", nestedHandler);
		apiRouter.get("/v1", v1Router);

		app.use("/api", apiRouter);

		const directRoutes = app.routes("/api/health", "GET");
		const nestedRoutes = app.routes("/api/v1/data", "GET");

		assert.ok(directRoutes.visible > 0);
		assert.ok(directRoutes.middleware.includes(directHandler));
		assert.ok(nestedRoutes.visible > 0);
		assert.ok(nestedRoutes.middleware.includes(nestedHandler));
	});
});
