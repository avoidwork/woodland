import assert from "node:assert";
import { describe, it, beforeEach } from "node:test";
import { woodland } from "../../src/woodland.js";

describe("nested routers - parameterized routes", () => {
	let app;

	beforeEach(() => {
		app = woodland();
	});

	it("should resolve parameterized routes in mounted sub-apps correctly", () => {
		const api = app.mount("/api");
		api.get("/items/:id", () => {});
		app.use("/api", api);

		const routes = app.routes("/api/items/42", "GET");
		assert.ok(routes.visible > 0);
		assert.ok(routes.params === true);
		assert.ok(routes.getParams);
	});

	it("should support mixed parameterized and static routes", () => {
		const api = app.mount("/api");
		api.get("/users", () => {});
		api.get("/users/:id", () => {});
		api.get("/users/:id/posts/:postId", () => {});
		app.use("/api", api);

		const staticRoutes = app.routes("/api/users", "GET");
		const paramRoutes = app.routes("/api/users/42", "GET");
		const deepParamRoutes = app.routes("/api/users/42/posts/99", "GET");

		assert.ok(staticRoutes.visible > 0);
		assert.ok(staticRoutes.params === false);
		assert.ok(paramRoutes.visible > 0);
		assert.ok(paramRoutes.params === true);
		assert.ok(deepParamRoutes.visible > 0);
		assert.ok(deepParamRoutes.params === true);
		assert.ok(deepParamRoutes.getParams);
	});

	it("should handle parameterized routes in nested routers", () => {
		const apiRouter = app.mount("/api");
		const childRouter = app.mount("/v1");
		const handler = () => {};
		childRouter.get("/items/:id/:action", handler);
		apiRouter.get("/v1", childRouter);
		app.use("/api", apiRouter);

		const routes = app.routes("/api/v1/items/42/view", "GET");
		assert.ok(routes.visible > 0);
		assert.ok(routes.params === true);
		assert.ok(routes.middleware.includes(handler));
	});

	it("should work with different HTTP methods on parameterized routes", () => {
		const api = app.mount("/api");
		const getHandler = () => {};
		const putHandler = () => {};
		api.get("/items/:id", getHandler);
		api.put("/items/:id", putHandler);
		app.use("/api", api);

		const getRoutes = app.routes("/api/items/42", "GET");
		const putRoutes = app.routes("/api/items/42", "PUT");

		assert.ok(getRoutes.visible > 0);
		assert.ok(getRoutes.middleware.includes(getHandler));
		assert.ok(putRoutes.visible > 0);
		assert.ok(putRoutes.middleware.includes(putHandler));
	});
});
