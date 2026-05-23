import assert from "node:assert";
import { describe, it, beforeEach } from "node:test";
import { woodland } from "../../src/woodland.js";

describe("nested routers - list and routes API", () => {
	let app;

	beforeEach(() => {
		app = woodland();
	});

	it("should return flattened registered paths from list", () => {
		const api = app.mount("/api");
		api.get("/users", () => {});
		api.post("/users", () => {});
		app.use("/api", api);

		const routes = app.list("GET", "array");
		assert.ok(routes.includes("/api/users"));
	});

	it("should return flattened registered paths from list as object", () => {
		const api = app.mount("/api");
		api.get("/users", () => {});
		app.use("/api", api);

		const obj = app.list("GET", "object");
		assert.ok(obj["/api/users"]);
	});

	it("should return correct visible count for mounted routes", () => {
		const api = app.mount("/api");
		api.get("/users", () => {});
		api.post("/create", () => {});
		app.use("/api", api);

		const getRoutes = app.routes("/api/users", "GET");
		const postRoutes = app.routes("/api/create", "POST");

		assert.ok(getRoutes.visible > 0);
		assert.ok(postRoutes.visible > 0);
	});

	it("should show mounted routes in list along with direct routes", () => {
		const api = app.mount("/api");
		api.get("/users", () => {});
		app.get("/health", () => {});
		app.use("/api", api);

		const routes = app.list("GET", "array");
		assert.ok(routes.includes("/api/users"));
		assert.ok(routes.includes("/health"));
	});

	it("should handle routes from deeply nested routers in list", () => {
		const apiRouter = app.mount("/api");
		const v1Router = app.mount("/v1");

		v1Router.get("/items", () => {});
		apiRouter.get("/v1", v1Router);
		app.use("/api", apiRouter);

		const routes = app.list("GET", "array");
		assert.ok(routes.includes("/api/v1/items"));
	});

	it("should show multiple methods registered for same path", () => {
		const api = app.mount("/api");
		api.get("/resource", () => {});
		api.post("/resource", () => {});
		api.put("/resource", () => {});
		app.use("/api", api);

		const getRoutes = app.list("GET", "array");
		const postRoutes = app.list("POST", "array");
		const putRoutes = app.list("PUT", "array");

		assert.ok(getRoutes.includes("/api/resource"));
		assert.ok(postRoutes.includes("/api/resource"));
		assert.ok(putRoutes.includes("/api/resource"));
	});
});
