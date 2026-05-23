import assert from "node:assert";
import { describe, it, beforeEach } from "node:test";
import { woodland } from "../../src/woodland.js";

describe("nested routers - prefix middleware isolation", () => {
	let app;

	beforeEach(() => {
		app = woodland();
	});

	it("should isolate middleware by prefix", () => {
		const api = app.mount("/api");
		const web = app.mount("/web");

		const apiHandler = () => {};
		const webHandler = () => {};

		api.get("/users", apiHandler);
		web.get("/home", webHandler);

		app.use("/api", api);
		app.use("/web", web);

		assert.ok(app.routes("/api/users", "GET").middleware.includes(apiHandler));
		assert.ok(app.routes("/web/home", "GET").middleware.includes(webHandler));
	});

	it("should handle child router alongside direct routes", () => {
		const api = app.mount("/api");
		const v1 = app.mount("/v1");

		const dataHandler = () => {};
		v1.get("/data", dataHandler);
		api.get("/v1", v1);
		app.use("/api", api);

		const routes = app.routes("/api/v1/data", "GET");
		assert.ok(routes.visible > 0);
		assert.ok(routes.middleware.includes(dataHandler));
	});

	it("should allow different middleware on different app sections", () => {
		const api = app.mount("/api");
		const admin = app.mount("/admin");

		const dataHandler = () => {};
		const adminHandler = () => {};

		api.get("/items", dataHandler);
		admin.get("/users", adminHandler);
		api.get("/admin", admin);

		app.use("/api", api);

		assert.ok(app.routes("/api/items", "GET").visible > 0);
		assert.ok(app.routes("/api/items", "GET").middleware.includes(dataHandler));
		assert.ok(app.routes("/api/admin/users", "GET").visible > 0);
		assert.ok(app.routes("/api/admin/users", "GET").middleware.includes(adminHandler));
	});
});
