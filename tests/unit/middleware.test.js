import assert from "node:assert";
import { describe, it, beforeEach } from "node:test";
import { reduce, getStatus, next, createMiddlewareRegistry } from "../../src/middleware.js";

describe("middleware", () => {
	describe("reduce", () => {
		it("should return undefined for empty map", () => {
			const result = reduce("/test", new Map(), { middleware: [], params: false });

			assert.strictEqual(result, void 0);
		});

		it("should collect middleware for matching route", () => {
			const middleware = new Map();
			const middlewareArray = [];

			middleware.set("/", {
				regex: /^\/$/,
				handlers: [() => {}],
				params: false,
			});

			reduce("/", middleware, { middleware: middlewareArray, params: false });

			assert.strictEqual(middlewareArray.length, 1);
		});

		it("should collect multiple handlers for matching route", () => {
			const middleware = new Map();
			const middlewareArray = [];

			middleware.set("/", {
				regex: /^\/$/,
				handlers: [() => {}, () => {}],
				params: false,
			});

			reduce("/", middleware, { middleware: middlewareArray, params: false });

			assert.strictEqual(middlewareArray.length, 2);
		});

		it("should set params flag when parameterized route matches", () => {
			const middleware = new Map();
			const arg = { middleware: [], params: false };

			middleware.set("/:id", {
				regex: /^\/([^/]+)$/,
				handlers: [() => {}],
				params: true,
			});

			reduce("/123", middleware, arg);

			assert.strictEqual(arg.params, true);
			assert.ok(arg.getParams);
		});

		it("should not override params flag once set", () => {
			const middleware = new Map();
			const arg = { middleware: [], params: true };

			middleware.set("/test", {
				regex: /^\/test$/,
				handlers: [() => {}],
				params: true,
			});

			reduce("/test", middleware, arg);

			assert.strictEqual(arg.params, true);
		});

		it("should handle wildcard middleware", () => {
			const middleware = new Map();
			const middlewareArray = [];

			middleware.set(".*", {
				regex: /^.*$/,
				handlers: [() => {}],
				params: false,
			});

			reduce("/any/path", middleware, { middleware: middlewareArray, params: false });

			assert.strictEqual(middlewareArray.length, 1);
		});

		it("should reset regex lastIndex for each test", () => {
			const middleware = new Map();
			const middlewareArray = [];

			middleware.set("/test", {
				regex: /^\/test$/,
				handlers: [() => {}],
				params: false,
			});

			reduce("/test", middleware, { middleware: middlewareArray, params: false });
			reduce("/test", middleware, { middleware: middlewareArray, params: false });

			assert.strictEqual(middlewareArray.length, 2);
		});
	});

	describe("getStatus", () => {
		it("should return 404 when allow array is empty", () => {
			const req = { allow: [], method: "GET" };
			const res = { statusCode: 200 };

			const status = getStatus(req, res);

			assert.strictEqual(status, 404);
		});

		it("should return 405 when method is not GET", () => {
			const req = { allow: ["POST"], method: "POST" };
			const res = { statusCode: 200 };

			const status = getStatus(req, res);

			assert.strictEqual(status, 405);
		});

		it("should return 404 when GET not in allow list", () => {
			const req = { allow: ["POST"], method: "GET" };
			const res = { statusCode: 200 };

			const status = getStatus(req, res);

			assert.strictEqual(status, 404);
		});

		it("should return 500 when GET is allowed and status <= 500", () => {
			const req = { allow: ["GET"], method: "GET" };
			const res = { statusCode: 500 };

			const status = getStatus(req, res);

			assert.strictEqual(status, 500);
		});

		it("should return custom status when > 500", () => {
			const req = { allow: ["GET"], method: "GET" };
			const res = { statusCode: 503 };

			const status = getStatus(req, res);

			assert.strictEqual(status, 503);
		});
	});

	describe("next", () => {
		it("should create next function", () => {
			const req = { allow: [], method: "GET" };
			const res = { statusCode: 500, error: () => {} };
			const middleware = { next: () => ({ done: true }) };

			const fn = next(req, res, middleware);

			assert.strictEqual(typeof fn, "function");
		});

		it("should call error handler when middleware is done", async () => {
			let errorCalled = false;
			const req = { allow: [], method: "GET" };
			const res = {
				statusCode: 500,
				error: () => {
					errorCalled = true;
				},
			};
			const middleware = { next: () => ({ done: true }) };

			const fn = next(req, res, middleware);
			fn();

			await new Promise((resolve) => setTimeout(resolve, 10));
			assert.strictEqual(errorCalled, true);
		});

		it("should create immediate next function when immediate is true", () => {
			const req = { allow: [], method: "GET" };
			const res = { statusCode: 500, error: () => {} };
			const middleware = { next: () => ({ done: true }) };

			const fn = next(req, res, middleware, true);

			assert.strictEqual(typeof fn, "function");
		});

		it("should call error handler with error when middleware has error", async () => {
			let errorHandlerCalled = false;
			let errorArg = null;

			const req = { allow: ["GET"], method: "GET" };
			const res = {
				statusCode: 500,
				error: () => {},
				send: (val) => {
					errorHandlerCalled = true;
					errorArg = val;
				},
			};

			let callCount = 0;
			const middleware = {
				next: () => {
					callCount++;
					if (callCount === 1) {
						return {
							done: false,
							value: (err, r, s, fn) => {
								errorHandlerCalled = true;
								errorArg = err;
								fn();
							},
						};
					}
					return { done: true };
				},
			};

			const fn = next(req, res, middleware, true);
			const testError = new Error("Test error");
			fn(testError);

			await new Promise((resolve) => setTimeout(resolve, 10));
			assert.strictEqual(errorHandlerCalled, true);
			assert.strictEqual(errorArg, testError);
		});

		it("should skip to error handler when error passed and middleware length < 4", async () => {
			let errorStatusCalled = false;

			const req = { allow: ["GET"], method: "GET" };
			const res = {
				statusCode: 500,
				error: () => {
					errorStatusCalled = true;
				},
			};

			let callCount = 0;
			const middleware = {
				next: () => {
					callCount++;
					if (callCount === 1) {
						return { done: false, value: () => {} };
					}
					return { done: true };
				},
			};

			const fn = next(req, res, middleware, true);
			const testError = new Error("Test error");
			fn(testError);

			await new Promise((resolve) => setTimeout(resolve, 10));
			assert.strictEqual(errorStatusCalled, true);
		});

		it("should execute middleware when no error passed", async () => {
			let middlewareCalled = false;
			let fnCalled = false;

			const req = { allow: ["GET"], method: "GET" };
			const res = {
				statusCode: 500,
				error: () => {},
			};

			const middleware = {
				next: () => {
					if (fnCalled) {
						return { done: true };
					}
					fnCalled = true;
					return {
						done: false,
						value: (r, s, fn) => {
							middlewareCalled = true;
							fn();
						},
					};
				},
			};

			const fn = next(req, res, middleware, true);
			fn();

			await new Promise((resolve) => setTimeout(resolve, 10));
			assert.strictEqual(middlewareCalled, true);
		});

		it("should send value when middleware returns non-function", async () => {
			let sentValue = null;

			const req = { allow: ["GET"], method: "GET" };
			const res = {
				statusCode: 500,
				error: () => {},
				send: (val) => {
					sentValue = val;
				},
			};

			const middleware = {
				next: () => {
					return { done: false, value: "test value" };
				},
			};

			const fn = next(req, res, middleware, true);
			fn();

			await new Promise((resolve) => setTimeout(resolve, 10));
			assert.strictEqual(sentValue, "test value");
		});
	});

	describe("createMiddlewareRegistry", () => {
		let middleware, ignored, methods, cache;

		beforeEach(() => {
			middleware = new Map();
			ignored = new Set();
			methods = [];
			cache = new Map();
		});

		it("should create registry with all methods", () => {
			const registry = createMiddlewareRegistry(middleware, ignored, methods, cache);

			assert.ok(registry.ignore);
			assert.ok(registry.allowed);
			assert.ok(registry.routes);
			assert.ok(registry.register);
			assert.ok(registry.list);
		});

		describe("register", () => {
			it("should register middleware for GET route", () => {
				const registry = createMiddlewareRegistry(middleware, ignored, methods, cache);
				const handler = () => {};

				registry.register("/test", handler);

				assert.ok(middleware.has("GET"));
			});

			it("should register wildcard middleware", () => {
				const registry = createMiddlewareRegistry(middleware, ignored, methods, cache);
				const handler = () => {};

				registry.register(handler);

				assert.ok(middleware.has("GET"));
				assert.ok(middleware.get("GET").has("/.*"));
			});

			it("should register middleware for specific method", () => {
				const registry = createMiddlewareRegistry(middleware, ignored, methods, cache);
				const handler = () => {};

				registry.register("/test", handler, "POST");

				assert.ok(middleware.has("POST"));
			});

			it("should throw error for invalid method", () => {
				const registry = createMiddlewareRegistry(middleware, ignored, methods, cache);

				assert.throws(() => {
					registry.register("/test", () => {}, "INVALID");
				}, /Invalid HTTP method/);
			});

			it("should throw error for HEAD method", () => {
				const registry = createMiddlewareRegistry(middleware, ignored, methods, cache);

				assert.throws(() => {
					registry.register("/test", () => {}, "HEAD");
				}, /Cannot set HEAD route/);
			});

			it("should convert parameterized routes to regex", () => {
				const registry = createMiddlewareRegistry(middleware, ignored, methods, cache);
				const handler = () => {};

				registry.register("/users/:id", handler);

				const routes = middleware.get("GET").keys();
				let found = false;

				for (const route of routes) {
					if (route.includes(":") === false) {
						found = true;
						break;
					}
				}

				assert.ok(found);
			});

			it("should return registry object for chaining", () => {
				const registry = createMiddlewareRegistry(middleware, ignored, methods, cache);
				const result = registry.register("/test", () => {});

				assert.strictEqual(result.ignore, registry.ignore);
				assert.strictEqual(result.allowed, registry.allowed);
				assert.strictEqual(result.routes, registry.routes);
				assert.strictEqual(result.register, registry.register);
				assert.strictEqual(result.list, registry.list);
			});
		});

		describe("ignore", () => {
			it("should add function to ignored set", () => {
				const registry = createMiddlewareRegistry(middleware, ignored, methods, cache);
				const handler = () => {};

				registry.ignore(handler);

				assert.ok(ignored.has(handler));
			});

			it("should return registry object for chaining", () => {
				const registry = createMiddlewareRegistry(middleware, ignored, methods, cache);
				const result = registry.ignore(() => {});

				assert.strictEqual(result.ignore, registry.ignore);
				assert.strictEqual(result.register, registry.register);
			});
		});

		describe("allowed", () => {
			it("should return true for allowed route", () => {
				const registry = createMiddlewareRegistry(middleware, ignored, methods, cache);
				registry.register("/test", () => {});

				// Check that the route was registered
				assert.ok(middleware.has("GET"));
				assert.ok(middleware.get("GET").has("/test"));

				const result = registry.allowed("GET", "/test");

				assert.strictEqual(result, true);
			});

			it("should return false for non-allowed route", () => {
				const registry = createMiddlewareRegistry(middleware, ignored, methods, cache);

				const result = registry.allowed("/nonexistent", "GET");

				assert.strictEqual(result, false);
			});
		});

		describe("routes", () => {
			it("should return route information", () => {
				const registry = createMiddlewareRegistry(middleware, ignored, methods, cache);
				registry.register("/test", () => {});

				const result = registry.routes("/test", "GET");

				assert.ok(result.middleware);
				assert.strictEqual(typeof result.visible, "number");
				assert.strictEqual(typeof result.exit, "number");
			});

			it("should cache route results", () => {
				const registry = createMiddlewareRegistry(middleware, ignored, methods, cache);
				registry.register("/test", () => {});

				const result1 = registry.routes("/test", "GET");
				const result2 = registry.routes("/test", "GET");

				assert.strictEqual(result1, result2);
			});

			it("should invalidate cache when override is true", () => {
				const registry = createMiddlewareRegistry(middleware, ignored, methods, cache);
				registry.register("/test", () => {});

				const result1 = registry.routes("/test", "GET");
				const result2 = registry.routes("/test", "GET", true);

				assert.notStrictEqual(result1, result2);
			});
		});

		describe("list", () => {
			it("should return array of routes", () => {
				const registry = createMiddlewareRegistry(middleware, ignored, methods, cache);
				registry.register("/test1", () => {});
				registry.register("/test2", () => {});

				const result = registry.list("GET", "array");

				assert.ok(Array.isArray(result));
			});

			it("should return object of routes", () => {
				const registry = createMiddlewareRegistry(middleware, ignored, methods, cache);
				registry.register("/test1", () => {});
				registry.register("/test2", () => {});

				const result = registry.list("GET", "object");

				assert.strictEqual(typeof result, "object");
			});
		});
	});
});
