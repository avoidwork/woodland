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

		it("should fall back to error response when no error handler exists", async () => {
			let errorStatus = null;
			let errorMessage = null;

			const req = {
				allow: ["GET"],
				method: "GET",
			};
			const res = {
				statusCode: 500,
				error: (status, err) => {
					errorStatus = status;
					errorMessage = err.message;
				},
				send: () => {},
			};

			const middleware = {
				next: () => {
					return { done: true };
				},
			};

			const fn = next(req, res, middleware, true);
			const testError = new Error("Test error");
			fn(testError);

			await new Promise((resolve) => setTimeout(resolve, 10));
			assert.ok(errorStatus !== null);
			assert.ok(errorMessage !== null);
		});

		it("should skip non-error-handlers when searching for error handler", async () => {
			let errorCalled = false;

			const req = {
				allow: ["GET"],
				method: "GET",
			};
			const res = {
				statusCode: 500,
				error: () => {
					errorCalled = true;
				},
				send: () => {},
			};

			let callCount = 0;
			const middleware = {
				next: () => {
					callCount++;
					if (callCount === 1) {
						return {
							done: false,
							value: (req, res, next) => {
								next();
							},
						};
					}
					if (callCount === 2) {
						return {
							done: false,
							value: (req, res, next) => {
								next();
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
			assert.ok(errorCalled);
		});
	});

	describe("createMiddlewareRegistry", () => {
		let methods, cache;

		beforeEach(() => {
			methods = new Set();
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

			it("should throw error for invalid or HEAD method", () => {
				const registry = createMiddlewareRegistry(methods, cache);

				assert.throws(() => registry.register("/test", () => {}, "INVALID"), /Invalid HTTP method/);
				assert.throws(() => registry.register("/test", () => {}, "HEAD"), /Cannot set HEAD route/);
			});

			it("should convert parameterized routes to regex", () => {
				const registry = createMiddlewareRegistry(methods, cache);
				const handler = () => {};

				registry.register("/users/:id", handler);

				const list = registry.list("GET", "array");
				const hasConvertedRoute = list.some((r) => r.includes("("));
				assert.ok(hasConvertedRoute);
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
		});

		describe("allowed", () => {
			it("should return true for allowed route", () => {
				const registry = createMiddlewareRegistry(methods, cache);
				registry.register("/test", () => {});

				assert.strictEqual(registry.allowed("GET", "/test"), true);
			});

			it("should return false for non-allowed route", () => {
				const registry = createMiddlewareRegistry(methods, cache);

				assert.strictEqual(registry.allowed("GET", "/nonexistent"), false);
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

			it("should cache and invalidate route results", () => {
				const registry = createMiddlewareRegistry(methods, cache);
				registry.register("/test", () => {});

				const result1 = registry.routes("/test", "GET");
				const result2 = registry.routes("/test", "GET");
				const result3 = registry.routes("/test", "GET", true);

				assert.strictEqual(result1, result2);
				assert.notStrictEqual(result1, result3);
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

			it("should return empty array for method with no registrations", () => {
				const registry = createMiddlewareRegistry(methods, cache);
				registry.register("/test", () => {}, "GET");

				const result = registry.list("DELETE", "array");

				assert.ok(Array.isArray(result));
				assert.strictEqual(result.length, 0);
			});

			it("should return empty object for method with no registrations", () => {
				const registry = createMiddlewareRegistry(methods, cache);
				registry.register("/test", () => {}, "GET");

				const result = registry.list("DELETE", "object");

				assert.strictEqual(typeof result, "object");
				assert.strictEqual(Object.keys(result).length, 0);
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

		it("should compute routes for wildcard and specific methods", () => {
			middleware.get("GET").set("/test", {
				handlers: [() => {}],
				regex: /^\/test$/,
				params: false,
			});

			const result1 = computeRoutes(middleware, ignored, "/test", "*", cache);
			const result2 = computeRoutes(middleware, ignored, "/test", "GET", cache);

			assert.ok(Array.isArray(result1.middleware));
			assert.strictEqual(typeof result1.visible, "number");
			assert.strictEqual(result2.visible, 1);
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

		it("should return empty array for completely missing method", () => {
			// middleware only has GET, not DELETE
			const result = listRoutes(middleware, "DELETE", "array");

			assert.ok(Array.isArray(result));
			assert.strictEqual(result.length, 0);
		});

		it("should return empty object for completely missing method", () => {
			// middleware only has GET, not DELETE
			const result = listRoutes(middleware, "DELETE", "object");

			assert.strictEqual(typeof result, "object");
			assert.strictEqual(Object.keys(result).length, 0);
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
		let middleware, ignored, methods;

		beforeEach(() => {
			middleware = new Map();
			ignored = new Set();
			methods = new Set();
		});

		it("should register middleware for path and method", () => {
			registerMiddleware(middleware, ignored, methods, "/test", () => {});

			assert.ok(middleware.has("GET"));
		});

		it("should register middleware for specific method", () => {
			registerMiddleware(middleware, ignored, methods, "/test", () => {}, "POST");

			assert.ok(middleware.has("POST"));
		});

		it("should register wildcard middleware when function passed as first arg", () => {
			const handler = () => {};
			const result = registerMiddleware(middleware, ignored, methods, handler);

			assert.ok(middleware.has("GET"));
			assert.ok(middleware.get("GET").has("/.*"));
			assert.strictEqual(result, void 0);
		});

		it("should throw error for invalid or HEAD method", () => {
			assert.throws(
				() => registerMiddleware(middleware, ignored, methods, "/test", () => {}, "INVALID"),
				/Invalid HTTP method/,
			);
			assert.throws(
				() => registerMiddleware(middleware, ignored, methods, "/test", () => {}, "HEAD"),
				/Cannot set HEAD route/,
			);
		});

		it("should convert parameterized routes to regex", () => {
			registerMiddleware(middleware, ignored, methods, "/users/:id", () => {});

			const routes = Array.from(middleware.get("GET").keys());
			const hasConvertedRoute = routes.some((route) => route.includes(":") === false);

			assert.ok(hasConvertedRoute);
		});

		it("should add multiple handlers to same route", () => {
			const handler1 = () => {};
			const handler2 = () => {};

			registerMiddleware(middleware, ignored, methods, "/test", handler1);
			registerMiddleware(middleware, ignored, methods, "/test", handler2);

			const routeData = middleware.get("GET").get("/test");
			assert.strictEqual(routeData.handlers.length, 2);
		});

		it("should add method to methods array for non-wildcard", () => {
			registerMiddleware(middleware, ignored, methods, "/test", () => {}, "POST");

			assert.ok(methods.has("POST"));
		});

		it("should not add method to methods array for wildcard method", () => {
			registerMiddleware(middleware, ignored, methods, "/test", () => {}, "*");

			assert.strictEqual(methods.size, 0);
		});

		it("should return early when rpath is undefined", () => {
			const result = registerMiddleware(middleware, ignored, methods, void 0, () => {});

			assert.strictEqual(result, void 0);
			assert.strictEqual(middleware.size, 0);
		});
	});
});
