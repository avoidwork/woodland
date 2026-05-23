import assert from "node:assert";
import { describe, it, beforeEach } from "node:test";
import { woodland } from "../../src/woodland.js";

describe("nested routers - error handler isolation", () => {
	let app;

	beforeEach(() => {
		app = woodland();
	});

	it("should keep sub-app error handlers isolated from parent app", () => {
		let parentErrorReceived = false;
		let subErrorReceived = false;

		app.error = (err, req, res) => {
			parentErrorReceived = true;
			res.status(500).send("parent error");
		};

		const api = app.mount("/api");
		api.error = (err, req, res) => {
			subErrorReceived = true;
			res.status(500).send("sub error");
		};

		api.get("/error", () => {
			throw new Error("sub-app error");
		});

		app.use("/api", api);

		assert.strictEqual(subErrorReceived, false);
		assert.strictEqual(parentErrorReceived, false);
	});

	it("should allow sub-app to handle errors without affecting parent error handlers", () => {
		const errorHandlerCalled = [];
		const subErrorHandlerCalled = [];

		app.error = () => errorHandlerCalled.push("parent");
		const api = app.mount("/api");
		api.error = () => subErrorHandlerCalled.push("sub");

		api.get("/fail", () => {});
		app.use("/api", api);

		assert.strictEqual(errorHandlerCalled.length, 0);
		assert.strictEqual(subErrorHandlerCalled.length, 0);
	});

	it("should work with deeply nested error handler isolation", () => {
		const appErrs = [];
		const apiErrs = [];
		const v1Errs = [];

		app.error = () => appErrs.push("app");
		const api = app.mount("/api");
		api.error = () => apiErrs.push("api");
		const v1 = app.mount("/v1");
		v1.error = () => v1Errs.push("v1");

		api.get("/level", () => {});
		api.get("/v1", v1);
		app.use("/api", api);

		assert.strictEqual(appErrs.length, 0);
		assert.strictEqual(apiErrs.length, 0);
		assert.strictEqual(v1Errs.length, 0);
	});
});
