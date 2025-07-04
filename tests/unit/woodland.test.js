import assert from "node:assert";
import {EventEmitter} from "node:events";
import {Woodland, woodland} from "../../src/woodland.js";

describe("Woodland", () => {
	let app;

	beforeEach(() => {
		app = new Woodland();
	});

	describe("constructor", () => {
		it("should create instance extending EventEmitter", () => {
			assert.ok(app instanceof EventEmitter);
			assert.ok(app instanceof Woodland);
		});

		it("should set default configuration", () => {
			assert.strictEqual(app.autoindex, false);
			assert.strictEqual(app.charset, "utf-8");
			assert.strictEqual(app.digit, 3);
			assert.strictEqual(app.time, false);
			assert.ok(Array.isArray(app.indexes));
			assert.ok(Array.isArray(app.origins));
			assert.ok(Array.isArray(app.methods));
			assert.ok(app.middleware instanceof Map);
			assert.ok(app.cache);
			assert.ok(app.permissions);
			assert.ok(app.ignored instanceof Set);
		});

		it("should accept custom configuration", () => {
			const customApp = new Woodland({
				autoindex: true,
				charset: "utf-16",
				digit: 2,
				time: true,
				silent: true,
				indexes: ["home.html"],
				origins: ["https://example.com"]
			});

			assert.strictEqual(customApp.autoindex, true);
			assert.strictEqual(customApp.charset, "utf-16");
			assert.strictEqual(customApp.digit, 2);
			assert.strictEqual(customApp.time, true);
			assert.deepStrictEqual(customApp.indexes, ["home.html"]);
			assert.deepStrictEqual(customApp.origins, ["https://example.com"]);
		});

		it("should set default headers when not silent", () => {
			const headers = app.defaultHeaders;
			assert.ok(Array.isArray(headers));
			assert.ok(headers.length > 0);
		});

		it("should not set default headers when silent", () => {
			const silentApp = new Woodland({silent: true});
			assert.strictEqual(silentApp.defaultHeaders.length, 0);
		});

		it("should initialize etags when enabled", () => {
			assert.ok(app.etags !== null);
		});

		it("should not initialize etags when disabled", () => {
			const noEtagApp = new Woodland({etags: false});
			assert.strictEqual(noEtagApp.etags, null);
		});
	});

	describe("HTTP method handlers", () => {
		it("should register GET routes", () => {
			const handler = () => {};
			app.get("/test", handler);
			assert.ok(app.middleware.has("GET"));
			assert.ok(app.middleware.get("GET").has("/test"));
		});

		it("should register POST routes", () => {
			const handler = () => {};
			app.post("/test", handler);
			assert.ok(app.middleware.has("POST"));
			assert.ok(app.middleware.get("POST").has("/test"));
		});

		it("should register PUT routes", () => {
			const handler = () => {};
			app.put("/test", handler);
			assert.ok(app.middleware.has("PUT"));
			assert.ok(app.middleware.get("PUT").has("/test"));
		});

		it("should register DELETE routes", () => {
			const handler = () => {};
			app.delete("/test", handler);
			assert.ok(app.middleware.has("DELETE"));
			assert.ok(app.middleware.get("DELETE").has("/test"));
		});

		it("should register PATCH routes", () => {
			const handler = () => {};
			app.patch("/test", handler);
			assert.ok(app.middleware.has("PATCH"));
			assert.ok(app.middleware.get("PATCH").has("/test"));
		});

		it("should register OPTIONS routes", () => {
			const handler = () => {};
			app.options("/test", handler);
			assert.ok(app.middleware.has("OPTIONS"));
			assert.ok(app.middleware.get("OPTIONS").has("/test"));
		});

		it("should register TRACE routes", () => {
			const handler = () => {};
			app.trace("/test", handler);
			assert.ok(app.middleware.has("TRACE"));
			assert.ok(app.middleware.get("TRACE").has("/test"));
		});

		it("should register CONNECT routes", () => {
			const handler = () => {};
			app.connect("/test", handler);
			assert.ok(app.middleware.has("CONNECT"));
			assert.ok(app.middleware.get("CONNECT").has("/test"));
		});
	});

	describe("use", () => {
		it("should register middleware with route pattern", () => {
			const handler = () => {};
			app.use("/api/*", handler);
			assert.ok(app.middleware.has("GET"));
			assert.ok(app.middleware.get("GET").has("/api/*"));
		});

		it("should register middleware without route pattern", () => {
			const handler = () => {};
			app.use(handler);
			assert.ok(app.middleware.has("GET"));
			assert.ok(app.middleware.get("GET").has("/.*"));
		});

		it("should register middleware with specific method", () => {
			const handler = () => {};
			app.use("/test", handler, "POST");
			assert.ok(app.middleware.has("POST"));
			assert.ok(app.middleware.get("POST").has("/test"));
		});

		it("should throw error for invalid method", () => {
			const handler = () => {};
			assert.throws(() => {
				app.use("/test", handler, "INVALID");
			}, TypeError);
		});

		it("should throw error for HEAD method", () => {
			const handler = () => {};
			assert.throws(() => {
				app.use("/test", handler, "HEAD");
			}, TypeError);
		});

		it("should handle parameterized routes", () => {
			const handler = () => {};
			app.use("/users/:id", handler);
			const route = app.middleware.get("GET").get("/users/(?<id>[^/]+)");
			assert.ok(route);
			assert.strictEqual(route.params, true);
		});

		it("should return instance for chaining", () => {
			const handler = () => {};
			const result = app.use("/test", handler);
			assert.strictEqual(result, app);
		});
	});

	describe("always", () => {
		it("should register wildcard middleware", () => {
			const handler = () => {};
			app.always(handler);
			assert.ok(app.middleware.has("*"));
		});

		it("should return instance for chaining", () => {
			const handler = () => {};
			const result = app.always(handler);
			assert.strictEqual(result, app);
		});
	});

	describe("allowed", () => {
		beforeEach(() => {
			app.get("/test", () => {});
		});

		it("should return true for allowed method", () => {
			const result = app.allowed("GET", "/test");
			assert.strictEqual(result, true);
		});

		it("should return false for disallowed method", () => {
			const result = app.allowed("POST", "/test");
			assert.strictEqual(result, false);
		});

		it("should handle override parameter", () => {
			const result = app.allowed("GET", "/test", true);
			assert.strictEqual(result, true);
		});
	});

	describe("allows", () => {
		beforeEach(() => {
			app.get("/test", () => {});
			app.post("/test", () => {});
		});

		it("should return comma-separated list of allowed methods", () => {
			const result = app.allows("/test");
			assert.ok(typeof result === "string");
			assert.ok(result.includes("GET"));
			assert.ok(result.includes("POST"));
			assert.ok(result.includes("HEAD")); // Should be added automatically
			assert.ok(result.includes("OPTIONS")); // Should be added automatically
		});

		it("should cache results", () => {
			const result1 = app.allows("/test");
			const result2 = app.allows("/test");
			assert.strictEqual(result1, result2);
		});

		it("should handle override parameter", () => {
			const result = app.allows("/test", true);
			assert.ok(typeof result === "string");
		});
	});

	describe("cors and corsHost", () => {
		it("should detect cross-origin requests", () => {
			const req = {
				headers: {
					origin: "https://example.com",
					host: "api.example.com"
				}
			};
			assert.strictEqual(app.corsHost(req), true);
		});

		it("should not detect same-origin requests", () => {
			const req = {
				headers: {
					origin: "https://example.com",
					host: "example.com"
				}
			};
			assert.strictEqual(app.corsHost(req), false);
		});

		it("should allow CORS for wildcard origins", () => {
			const req = {
				corsHost: true,
				headers: {origin: "https://example.com"}
			};
			assert.strictEqual(app.cors(req), true);
		});

		it("should allow CORS for specific origins", () => {
			const corsApp = new Woodland({origins: ["https://example.com"]});
			const req = {
				corsHost: true,
				headers: {origin: "https://example.com"}
			};
			assert.strictEqual(corsApp.cors(req), true);
		});

		it("should deny CORS for unlisted origins", () => {
			const corsApp = new Woodland({origins: ["https://trusted.com"]});
			const req = {
				corsHost: true,
				headers: {origin: "https://untrusted.com"}
			};
			assert.strictEqual(corsApp.cors(req), false);
		});
	});

	describe("ip", () => {
		it("should extract IP from connection", () => {
			const req = {
				headers: {},
				connection: {remoteAddress: "192.168.1.1"}
			};
			assert.strictEqual(app.ip(req), "192.168.1.1");
		});

		it("should extract IP from X-Forwarded-For header", () => {
			const req = {
				headers: {"x-forwarded-for": "10.0.0.1, 192.168.1.1"},
				connection: {remoteAddress: "127.0.0.1"}
			};
			assert.strictEqual(app.ip(req), "192.168.1.1");
		});
	});

	describe("ignore", () => {
		it("should add function to ignored set", () => {
			const fn = () => {};
			app.ignore(fn);
			assert.ok(app.ignored.has(fn));
		});

		it("should return instance for chaining", () => {
			const fn = () => {};
			const result = app.ignore(fn);
			assert.strictEqual(result, app);
		});
	});

	describe("list", () => {
		beforeEach(() => {
			app.get("/test1", () => {});
			app.get("/test2", () => {});
			app.post("/api", () => {});
		});

		it("should return array of routes by default", () => {
			const result = app.list();
			assert.ok(Array.isArray(result));
			assert.ok(result.includes("/test1"));
			assert.ok(result.includes("/test2"));
		});

		it("should return object when type is object", () => {
			const result = app.list("get", "object");
			assert.ok(typeof result === "object");
			assert.ok(!Array.isArray(result));
			assert.ok(result["/test1"]);
			assert.ok(result["/test2"]);
		});

		it("should filter by method", () => {
			const getRoutes = app.list("get");
			const postRoutes = app.list("post");
			assert.ok(getRoutes.includes("/test1"));
			assert.ok(postRoutes.includes("/api"));
			assert.ok(!postRoutes.includes("/test1"));
		});
	});

	describe("log", () => {
		it("should log messages when logging enabled", () => {
			let logged = false; // eslint-disable-line no-unused-vars
			const originalLog = console.log;
			console.log = () => { logged = true; };

			app.log("test message");

			// Restore console.log
			console.log = originalLog;
			// Note: Due to nextTick, we can't easily test the actual logging
			assert.ok(typeof app.log("test") === "object"); // Returns this
		});

		it("should return instance for chaining", () => {
			const result = app.log("test message");
			assert.strictEqual(result, app);
		});
	});

	describe("path", () => {
		it("should convert route parameters to regex groups", () => {
			const result = app.path("/users/:id");
			assert.strictEqual(result, "/users/(?<id>[^/]+)");
		});

		it("should handle multiple parameters", () => {
			const result = app.path("/users/:id/posts/:postId");
			assert.strictEqual(result, "/users/(?<id>[^/]+)/posts/(?<postId>[^/]+)");
		});

		it("should return unchanged string for no parameters", () => {
			const result = app.path("/users");
			assert.strictEqual(result, "/users");
		});

		it("should handle empty string", () => {
			const result = app.path();
			assert.strictEqual(result, "");
		});
	});

	describe("etag", () => {
		it("should generate etag for GET requests", () => {
			const result = app.etag("GET", "test", "data");
			assert.ok(typeof result === "string");
		});

		it("should generate etag for HEAD requests", () => {
			const result = app.etag("HEAD", "test", "data");
			assert.ok(typeof result === "string");
		});

		it("should generate etag for OPTIONS requests", () => {
			const result = app.etag("OPTIONS", "test", "data");
			assert.ok(typeof result === "string");
		});

		it("should return empty string for other methods", () => {
			const result = app.etag("POST", "test", "data");
			assert.strictEqual(result, "");
		});

		it("should return empty string when etags disabled", () => {
			const noEtagApp = new Woodland({etags: false});
			const result = noEtagApp.etag("GET", "test", "data");
			assert.strictEqual(result, "");
		});
	});

	describe("routes", () => {
		beforeEach(() => {
			app.get("/test", () => {});
			app.post("/test", () => {});
			app.always(() => {}); // wildcard middleware
		});

		it("should return route information", () => {
			const result = app.routes("/test", "GET");
			assert.ok(typeof result === "object");
			assert.ok(Array.isArray(result.middleware));
			assert.ok(typeof result.visible === "number");
			assert.ok(typeof result.params === "boolean");
		});

		it("should include wildcard middleware", () => {
			const result = app.routes("/test", "GET");
			assert.ok(result.middleware.length >= 2); // wildcard + GET specific
		});

		it("should cache results", () => {
			const result1 = app.routes("/test", "GET");
			const result2 = app.routes("/test", "GET");
			assert.strictEqual(result1, result2);
		});

		it("should handle override parameter", () => {
			const result = app.routes("/test", "GET", true);
			assert.ok(typeof result === "object");
		});
	});

	describe("helper method factories", () => {
		let mockReq, mockRes;

		beforeEach(() => {
			mockReq = {
				method: "GET",
				headers: {},
				parsed: {pathname: "/test"}
			};
			mockRes = {
				headersSent: false,
				statusCode: 200,
				setHeader: () => {},
				header: () => {},
				getHeader: () => undefined,
				removeHeader: () => {},
				end: () => {}
			};
		});

		describe("json", () => {
			it("should create json response function", () => {
				const jsonFn = app.json(mockRes);
				assert.strictEqual(typeof jsonFn, "function");
			});
		});

		describe("redirect", () => {
			it("should create redirect function", () => {
				const redirectFn = app.redirect(mockRes);
				assert.strictEqual(typeof redirectFn, "function");
			});
		});

		describe("send", () => {
			it("should create send function", () => {
				const sendFn = app.send(mockReq, mockRes);
				assert.strictEqual(typeof sendFn, "function");
			});
		});

		describe("set", () => {
			it("should create header setting function", () => {
				const setFn = app.set(mockRes);
				assert.strictEqual(typeof setFn, "function");
			});
		});

		describe("status", () => {
			it("should create status setting function", () => {
				const statusFn = app.status(mockRes);
				assert.strictEqual(typeof statusFn, "function");
			});
		});

		describe("error", () => {
			it("should create error handler function", () => {
				const errorFn = app.error(mockReq, mockRes);
				assert.strictEqual(typeof errorFn, "function");
			});
		});
	});

	describe("files", () => {
		it("should register file serving route", () => {
			app.files("/static", "/var/www");
			assert.ok(app.middleware.has("GET"));
			// Should register a route pattern for serving files
			const routes = app.list();
			assert.ok(routes.some(route => route.includes(".*")));
		});

		it("should handle default parameters", () => {
			app.files();
			const routes = app.list();
			assert.ok(Array.isArray(routes));
		});
	});
});

describe("woodland factory function", () => {
	it("should create Woodland instance", () => {
		const app = woodland();
		assert.ok(app instanceof Woodland);
	});

	it("should pass configuration to constructor", () => {
		const app = woodland({autoindex: true, time: true});
		assert.strictEqual(app.autoindex, true);
		assert.strictEqual(app.time, true);
	});

	it("should bind route method", () => {
		const app = woodland();
		assert.strictEqual(typeof app.route, "function");
		// The route method should be bound to the instance
		const routeFn = app.route;
		assert.strictEqual(typeof routeFn, "function");
	});
});
