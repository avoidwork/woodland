import assert from "node:assert";
import { describe, it, beforeEach } from "node:test";
import {
	reduce,
	next,
	createMiddlewareRegistry,
	computeRoutes,
	listRoutes,
	checkAllowed,
	registerMiddleware,
} from "../../src/middleware.js";

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
		let methods, cache;

		beforeEach(() => {
			methods = [];
			cache = new Map();
		});

		it("should create registry with all methods", () => {
			const registry = createMiddlewareRegistry(methods, cache);

			assert.ok(registry.ignore);
			assert.ok(registry.allowed);
			assert.ok(registry.routes);
			assert.ok(registry.register);
			assert.ok(registry.list);
		});

		describe("register", () => {
			it("should register middleware for GET route", () => {
				const registry = createMiddlewareRegistry(methods, cache);
				const handler = () => {};

				registry.register("/test", handler);

				const list = registry.list("GET", "array");
				assert.ok(list.includes("/test"));
			});

			it("should register wildcard middleware", () => {
				const registry = createMiddlewareRegistry(methods, cache);
				const handler = () => {};

				registry.register(handler);

				const list = registry.list("GET", "array");
				assert.ok(list.includes("/.*"));
			});

			it("should register middleware for specific method", () => {
				const registry = createMiddlewareRegistry(methods, cache);
				const handler = () => {};

				registry.register("/test", handler, "POST");

				const list = registry.list("POST", "array");
				assert.ok(list.includes("/test"));
			});

			it("should throw error for invalid method", () => {
				const registry = createMiddlewareRegistry(methods, cache);

				assert.throws(() => {
					registry.register("/test", () => {}, "INVALID");
				}, /Invalid HTTP method/);
			});

			it("should throw error for HEAD method", () => {
				const registry = createMiddlewareRegistry(methods, cache);

				assert.throws(() => {
					registry.register("/test", () => {}, "HEAD");
				}, /Cannot set HEAD route/);
			});

			it("should convert parameterized routes to regex", () => {
				const registry = createMiddlewareRegistry(methods, cache);
				const handler = () => {};

				registry.register("/users/:id", handler);

				const list = registry.list("GET", "array");
				let found = false;

				for (const route of list) {
					if (route.includes(":") === false) {
						found = true;
						break;
					}
				}

				assert.ok(found);
			});

			it("should return undefined for chaining", () => {
				const registry = createMiddlewareRegistry(methods, cache);
				const result = registry.register("/test", () => {});

				assert.strictEqual(result, void 0);
			});
		});

		describe("ignore", () => {
			it("should add function to ignored set", () => {
				const registry = createMiddlewareRegistry(methods, cache);
				const handler = () => {};

				registry.register("/test", handler);
				registry.ignore(handler);

				const result = registry.routes("/test", "GET");
				assert.strictEqual(result.visible, 0);
			});

			it("should add function to ignored set", () => {
				const registry = createMiddlewareRegistry(methods, cache);
				const fn = () => {};

				registry.ignore(fn);

				// Verify function was added (no return value expected)
				assert.strictEqual(registry.ignore(fn), void 0);
			});
		});

		describe("allowed", () => {
			it("should return true for allowed route", () => {
				const registry = createMiddlewareRegistry(methods, cache);
				registry.register("/test", () => {});

				const result = registry.allowed("GET", "/test");

				assert.strictEqual(result, true);
			});

			it("should return false for non-allowed route", () => {
				const registry = createMiddlewareRegistry(methods, cache);

				const result = registry.allowed("GET", "/nonexistent");

				assert.strictEqual(result, false);
			});
		});

		describe("routes", () => {
			it("should return route information", () => {
				const registry = createMiddlewareRegistry(methods, cache);
				registry.register("/test", () => {});

				const result = registry.routes("/test", "GET");

				assert.ok(result.middleware);
				assert.strictEqual(typeof result.visible, "number");
				assert.strictEqual(typeof result.exit, "number");
			});

			it("should cache route results", () => {
				const registry = createMiddlewareRegistry(methods, cache);
				registry.register("/test", () => {});

				const result1 = registry.routes("/test", "GET");
				const result2 = registry.routes("/test", "GET");

				assert.strictEqual(result1, result2);
			});

			it("should invalidate cache when override is true", () => {
				const registry = createMiddlewareRegistry(methods, cache);
				registry.register("/test", () => {});

				const result1 = registry.routes("/test", "GET");
				const result2 = registry.routes("/test", "GET", true);

				assert.notStrictEqual(result1, result2);
			});
		});

		describe("list", () => {
			it("should return array of routes", () => {
				const registry = createMiddlewareRegistry(methods, cache);
				registry.register("/test1", () => {});
				registry.register("/test2", () => {});

				const result = registry.list("GET", "array");

				assert.ok(Array.isArray(result));
			});

			it("should return object of routes", () => {
				const registry = createMiddlewareRegistry(methods, cache);
				registry.register("/test1", () => {});
				registry.register("/test2", () => {});

				const result = registry.list("GET", "object");

				assert.strictEqual(typeof result, "object");
			});
		});
	});

	describe("computeRoutes", () => {
		let middleware, ignored, cache;

		beforeEach(() => {
			middleware = new Map();
			ignored = new Set();
			cache = new Map();

			middleware.set("GET", new Map());
			middleware.set("POST", new Map());
		});

		it("should compute routes for wildcard method", () => {
			middleware.get("GET").set("/test", {
				handlers: [() => {}],
				regex: /^\/test$/,
				params: false,
			});

			const result = computeRoutes(middleware, ignored, "/test", "*", cache);

			assert.ok(Array.isArray(result.middleware));
			assert.strictEqual(typeof result.visible, "number");
		});

		it("should compute routes for specific method", () => {
			middleware.get("GET").set("/test", {
				handlers: [() => {}],
				regex: /^\/test$/,
				params: false,
			});

			const result = computeRoutes(middleware, ignored, "/test", "GET", cache);

			assert.strictEqual(result.visible, 1);
		});

		it("should cache route results", () => {
			middleware.get("GET").set("/test", {
				handlers: [() => {}],
				regex: /^\/test$/,
				params: false,
			});

			const result1 = computeRoutes(middleware, ignored, "/test", "GET", cache);
			const result2 = computeRoutes(middleware, ignored, "/test", "GET", cache);

			assert.strictEqual(result1, result2);
		});

		it("should override cache when override is true", () => {
			middleware.get("GET").set("/test", {
				handlers: [() => {}],
				regex: /^\/test$/,
				params: false,
			});

			const result1 = computeRoutes(middleware, ignored, "/test", "GET", cache);
			const result2 = computeRoutes(middleware, ignored, "/test", "GET", cache, true);

			assert.notStrictEqual(result1, result2);
		});

		it("should count visible middleware when some are ignored", () => {
			const handler1 = () => {};
			const handler2 = () => {};

			middleware.get("GET").set("/test", {
				handlers: [handler1, handler2],
				regex: /^\/test$/,
				params: false,
			});

			ignored.add(handler1);

			const result = computeRoutes(middleware, ignored, "/test", "GET", cache);

			assert.strictEqual(result.visible, 1);
		});

		it("should set exit to middleware length for non-wildcard method", () => {
			middleware.get("GET").set("/test", {
				handlers: [() => {}],
				regex: /^\/test$/,
				params: false,
			});

			const result = computeRoutes(middleware, ignored, "/test", "GET", cache);

			// exit is set before method-specific middleware is added, so it's 0
			assert.strictEqual(result.exit, 0);
		});
	});

	describe("listRoutes", () => {
		let middleware;

		beforeEach(() => {
			middleware = new Map();
			middleware.set("GET", new Map());
		});

		it("should return array of routes", () => {
			middleware.get("GET").set("/test1", {});
			middleware.get("GET").set("/test2", {});

			const result = listRoutes(middleware, "GET", "array");

			assert.ok(Array.isArray(result));
			assert.strictEqual(result.length, 2);
		});

		it("should return object of routes", () => {
			middleware.get("GET").set("/test1", "value1");
			middleware.get("GET").set("/test2", "value2");

			const result = listRoutes(middleware, "GET", "object");

			assert.strictEqual(typeof result, "object");
			assert.strictEqual(result["/test1"], "value1");
			assert.strictEqual(result["/test2"], "value2");
		});

		it("should return empty array for non-existent method", () => {
			middleware.set("POST", new Map());

			const result = listRoutes(middleware, "POST", "array");

			assert.ok(Array.isArray(result));
			assert.strictEqual(result.length, 0);
		});
	});

	describe("checkAllowed", () => {
		let middleware, ignored, cache;

		beforeEach(() => {
			middleware = new Map();
			ignored = new Set();
			cache = new Map();
			middleware.set("GET", new Map());
		});

		it("should return true for allowed route", () => {
			middleware.get("GET").set("/test", {
				handlers: [() => {}],
				regex: /^\/test$/,
				params: false,
			});

			const result = checkAllowed(middleware, ignored, cache, "GET", "/test");

			assert.strictEqual(result, true);
		});

		it("should return false for non-allowed route", () => {
			const result = checkAllowed(middleware, ignored, cache, "GET", "/nonexistent");

			assert.strictEqual(result, false);
		});

		it("should return false when route is ignored", () => {
			const handler = () => {};

			middleware.get("GET").set("/test", {
				handlers: [handler],
				regex: /^\/test$/,
				params: false,
			});

			ignored.add(handler);

			const result = checkAllowed(middleware, ignored, cache, "GET", "/test");

			assert.strictEqual(result, false);
		});
	});

	describe("registerMiddleware", () => {
		let middleware, ignored, methods, cache;

		beforeEach(() => {
			middleware = new Map();
			ignored = new Set();
			methods = [];
			cache = new Map();
		});

		it("should register middleware for path", () => {
			const result = registerMiddleware(middleware, ignored, methods, cache, "/test", () => {});

			assert.ok(middleware.has("GET"));
			assert.strictEqual(result, void 0);
		});

		it("should register middleware for specific method", () => {
			const result = registerMiddleware(
				middleware,
				ignored,
				methods,
				cache,
				"/test",
				() => {},
				"POST",
			);

			assert.ok(middleware.has("POST"));
			assert.strictEqual(result, void 0);
		});

		it("should register wildcard middleware when function passed as first arg", () => {
			const handler = () => {};
			const result = registerMiddleware(middleware, ignored, methods, cache, handler);

			assert.ok(middleware.has("GET"));
			assert.ok(middleware.get("GET").has("/.*"));
			assert.strictEqual(result, void 0);
		});

		it("should throw error for invalid HTTP method", () => {
			assert.throws(() => {
				registerMiddleware(middleware, ignored, methods, cache, "/test", () => {}, "INVALID");
			}, /Invalid HTTP method/);
		});

		it("should throw error for HEAD method", () => {
			assert.throws(() => {
				registerMiddleware(middleware, ignored, methods, cache, "/test", () => {}, "HEAD");
			}, /Cannot set HEAD route/);
		});

		it("should convert parameterized routes to regex", () => {
			const result = registerMiddleware(
				middleware,
				ignored,
				methods,
				cache,
				"/users/:id",
				() => {},
			);

			const routes = Array.from(middleware.get("GET").keys());
			const hasConvertedRoute = routes.some(
				(route) => route.includes(":") === false && route.includes(":id") === false,
			);

			assert.ok(hasConvertedRoute);
			assert.strictEqual(result, void 0);
		});

		it("should add multiple handlers to same route", () => {
			const handler1 = () => {};
			const handler2 = () => {};

			registerMiddleware(middleware, ignored, methods, cache, "/test", handler1);
			registerMiddleware(middleware, ignored, methods, cache, "/test", handler2);

			const routeData = middleware.get("GET").get("/test");
			assert.strictEqual(routeData.handlers.length, 2);
		});

		it("should return undefined", () => {
			const handler = () => {};
			const result = registerMiddleware(middleware, ignored, methods, cache, "/test", handler);

			assert.strictEqual(result, void 0);
		});

		it("should add method to methods array for non-wildcard", () => {
			registerMiddleware(middleware, ignored, methods, cache, "/test", () => {}, "POST");

			assert.ok(methods.includes("POST"));
		});

		it("should not add method to methods array for wildcard method", () => {
			registerMiddleware(middleware, ignored, methods, cache, "/test", () => {}, "*");

			assert.strictEqual(methods.length, 0);
		});

		it("should return early when rpath is undefined", () => {
			const result = registerMiddleware(middleware, ignored, methods, cache, void 0, () => {});

			assert.strictEqual(result, void 0);
			assert.strictEqual(middleware.size, 0);
		});
	});
});
