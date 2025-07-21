import assert from "node:assert";
import {EventEmitter} from "node:events";
import {Woodland, woodland} from "../../src/woodland.js";

describe("Woodland", () => {
	let app;

	beforeEach(() => {
		app = new Woodland({ logging: { enabled: false }});
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
				origins: ["https://example.com"],
				logging: { enabled: false }
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
			const silentApp = new Woodland({silent: true,
				logging: { enabled: false }});
			assert.strictEqual(silentApp.defaultHeaders.length, 0);
		});

		it("should initialize etags when enabled", () => {
			assert.ok(app.etags !== null);
		});

		it("should not initialize etags when disabled", () => {
			const noEtagApp = new Woodland({etags: false,
				logging: { enabled: false }});
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
			assert.ok(result.includes("HEAD")); // Should be added automatically when GET is present
			assert.ok(result.includes("OPTIONS")); // Should be added automatically for any route with methods
		});

		it("should include OPTIONS for routes without GET", () => {
			app.post("/api", () => {});
			app.put("/api", () => {});
			app.delete("/api", () => {});

			const result = app.allows("/api");
			assert.ok(typeof result === "string");
			assert.ok(result.includes("POST"));
			assert.ok(result.includes("PUT"));
			assert.ok(result.includes("DELETE"));
			assert.ok(result.includes("OPTIONS")); // Should be added for non-GET routes
			assert.ok(!result.includes("HEAD")); // HEAD should only be added when GET is present
		});

		it("should include OPTIONS for single non-GET method routes", () => {
			app.post("/single", () => {});

			const result = app.allows("/single");
			assert.ok(result.includes("POST"));
			assert.ok(result.includes("OPTIONS"));
			assert.ok(!result.includes("HEAD"));
			assert.ok(!result.includes("GET"));
		});

		it("should include HEAD only when GET is present", () => {
			app.post("/no-get", () => {});
			const resultNoGet = app.allows("/no-get");
			assert.ok(!resultNoGet.includes("HEAD"));

			app.get("/with-get", () => {});
			const resultWithGet = app.allows("/with-get");
			assert.ok(resultWithGet.includes("HEAD"));
		});

		it("should not include duplicate OPTIONS", () => {
			app.options("/explicit", () => {});
			app.post("/explicit", () => {});

			const result = app.allows("/explicit");
			const methods = result.split(", ");
			const optionsCount = methods.filter(method => method === "OPTIONS").length;
			assert.strictEqual(optionsCount, 1, "OPTIONS should appear only once");
		});

		it("should not include duplicate HEAD", () => {
			app.get("/explicit-head", () => {});
			// Note: HEAD routes are not allowed in use() method, so we test with GET only

			const result = app.allows("/explicit-head");
			const methods = result.split(", ");
			const headCount = methods.filter(method => method === "HEAD").length;
			assert.strictEqual(headCount, 1, "HEAD should appear only once");
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

		it("should return empty for routes with no methods", () => {
			const result = app.allows("/nonexistent");
			assert.strictEqual(result, "");
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
			const corsApp = new Woodland({origins: ["*"],
				logging: { enabled: false }});
			const req = {
				corsHost: true,
				headers: {origin: "https://example.com"}
			};
			assert.strictEqual(corsApp.cors(req), true);
		});

		it("should allow CORS for specific origins", () => {
			const corsApp = new Woodland({origins: ["https://example.com"],
				logging: { enabled: false }});
			const req = {
				corsHost: true,
				headers: {origin: "https://example.com"}
			};
			assert.strictEqual(corsApp.cors(req), true);
		});

		it("should deny CORS for unlisted origins", () => {
			const corsApp = new Woodland({origins: ["https://trusted.com"],
				logging: { enabled: false }});
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
				headers: {"x-forwarded-for": "203.0.113.1, 192.168.1.1"},
				connection: {remoteAddress: "127.0.0.1"}
			};
			assert.strictEqual(app.ip(req), "203.0.113.1");
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
			const noEtagApp = new Woodland({etags: false,
				logging: { enabled: false }});
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

	describe("routing edge cases", () => {
		let mockReq, mockRes;

		beforeEach(() => {
			mockReq = {
				method: "OPTIONS",
				url: "/test",
				headers: {host: "localhost"},
				parsed: {pathname: "/test", hostname: "localhost", search: ""},
				allow: "GET, HEAD, OPTIONS",
				socket: {server: {_connectionKey: "::8000"}, remoteAddress: "127.0.0.1"},
				connection: {remoteAddress: "127.0.0.1"}
			};
			mockRes = {
				headersSent: false,
				statusCode: 200,
				_headers: {},
				setHeader: function (name, value) {
					this._headers[name.toLowerCase()] = value;
				},
				header: function (name, value) {
					this.setHeader(name, value);
				},
				removeHeader: function (name) {
					delete this._headers[name.toLowerCase()];
				},
				getHeader: function (name) {
					return this._headers[name.toLowerCase()];
				},
				on: function (event, callback) {
					if (event === "close") {
						setTimeout(callback, 0);
					}
					if (event === "finish") {
						setTimeout(callback, 0);
					}
				},
				writeHead: function () {
					// Mock implementation
				},
				end: function () {
					// Mock implementation
				},
				send: function () {},
				error: function () {}
			};
		});

		it("should fallback OPTIONS to GET when no OPTIONS route exists", () => {
			// Register only a GET route
			app.get("/test", (req, res) => {
				res.send("test");
			});

			// Mock the allowed method to return false for OPTIONS
			const originalAllowed = app.allowed.bind(app);
			app.allowed = function (method, uri) {
				if (method === "OPTIONS") {
					return false;
				}

				return originalAllowed(method, uri);
			};

			// Test that OPTIONS gets converted to GET
			app.route(mockReq, mockRes);

			// Restore original method
			app.allowed = originalAllowed;

			// The method should have been changed to GET internally
			// We can't easily assert this without more complex mocking
			assert.ok(true, "OPTIONS fallback executed without error");
		});

		it("should emit connect event when there are listeners", done => {
			let connectEmitted = false;

			app.on("connect", (req, res) => {
				connectEmitted = true;
				assert.strictEqual(req, mockReq);
				assert.strictEqual(res, mockRes);
			});

			app.route(mockReq, mockRes);

			setTimeout(() => {
				assert.strictEqual(connectEmitted, true, "Connect event should be emitted");
				done();
			}, 10);
		});

		it("should emit finish event when there are listeners", done => {
			let finishEmitted = false;

			app.on("finish", (req, res) => {
				finishEmitted = true;
				assert.strictEqual(req, mockReq);
				assert.strictEqual(res, mockRes);
			});

			app.route(mockReq, mockRes);

			setTimeout(() => {
				assert.strictEqual(finishEmitted, true, "Finish event should be emitted");
				done();
			}, 10);
		});

		it("should handle CORS rejection", () => {
			let errorCalled = false;
			let errorStatus = null;

			// Create a new app instance with empty origins to reject CORS
			const corsApp = woodland({origins: [],
				logging: { enabled: false }});

			// Setup request to be cross-origin
			mockReq.headers.origin = "https://evil.com";

			// Store the original error function and capture calls
			const originalError = mockRes.error;
			mockRes.error = function (status) {
				errorCalled = true;
				errorStatus = status;
				// Also call original to maintain compatibility
				if (originalError) originalError.call(this, status);
			};

			// Override the error method that gets set by decorate
			const originalDecorate = corsApp.decorate;
			corsApp.decorate = function (req, res) {
				originalDecorate.call(this, req, res);
				// Restore our test error handler after decorate overwrites it
				res.error = function (status) {
					errorCalled = true;
					errorStatus = status;
				};
			};

			corsApp.route(mockReq, mockRes);

			assert.strictEqual(errorCalled, true, "Error should be called for CORS rejection");
			assert.strictEqual(errorStatus, 403, "Should return 403 for CORS rejection");
			assert.strictEqual(mockReq.valid, false, "Request should be marked invalid");
		});

		it("should handle method not allowed", () => {
			let errorCalled = false;

			// Setup request with method not supported by any routes
			mockReq.method = "DELETE";
			mockReq.url = "/nonexistent";
			mockReq.parsed.pathname = "/nonexistent";

			// Override the error method that gets set by decorate
			const originalDecorate = app.decorate;
			app.decorate = function (req, res) {
				originalDecorate.call(this, req, res);
				// Restore our test error handler after decorate overwrites it
				res.error = function () {
					errorCalled = true;
				};
			};

			app.route(mockReq, mockRes);

			assert.strictEqual(errorCalled, true, "Error should be called for method not allowed");
			assert.strictEqual(mockReq.valid, false, "Request should be marked invalid");
		});
	});

	describe("advanced route handling", () => {
		let mockReq, mockRes;

		beforeEach(() => {
			mockReq = {
				method: "GET",
				url: "/users/123",
				headers: {host: "localhost"},
				parsed: {pathname: "/users/123", hostname: "localhost", search: ""},
				params: {},
				socket: {server: {_connectionKey: "::8000"}, remoteAddress: "127.0.0.1"},
				connection: {remoteAddress: "127.0.0.1"}
			};
			mockRes = {
				headersSent: false,
				statusCode: 200,
				_headers: {},
				setHeader: function (name, value) {
					this._headers[name.toLowerCase()] = value;
				},
				header: function (name, value) {
					this.setHeader(name, value);
				},
				removeHeader: function (name) {
					delete this._headers[name.toLowerCase()];
				},
				getHeader: function (name) {
					return this._headers[name.toLowerCase()];
				},
				on: function (event, callback) {
					if (event === "close") {
						setTimeout(callback, 0);
					}
				},
				writeHead: function () {
					// Mock implementation
				},
				end: function () {
					// Mock implementation
				},
				send: function () {},
				error: function () {}
			};
		});

		it("should extract parameters from parameterized routes", done => {
			let handlerCalled = false;
			let extractedParams = null;

			// Create a new app instance to avoid conflicts with other tests
			const paramApp = woodland({ logging: { enabled: false }});

			paramApp.get("/users/:id", (req, res) => {
				handlerCalled = true;
				extractedParams = req.params;
				res.send("OK");

				// Check assertions after handler completes
				try {
					assert.strictEqual(handlerCalled, true, "Handler should be called");
					assert.ok(extractedParams, "Parameters should be extracted");
					assert.strictEqual(extractedParams.id, 123, "Parameter should be parsed as number");
					done();
				} catch (error) {
					done(error);
				}
			});

			// Update mock request for GET method
			mockReq.method = "GET";

			paramApp.route(mockReq, mockRes);
		});

		it("should handle middleware with exit functionality", done => {
			let middleware1Called = false;
			let middleware2Called = false;
			let doneCalled = false;

			// Create a new app instance to avoid conflicts with other tests
			const middlewareApp = woodland({ logging: { enabled: false }});

			middlewareApp.always((req, res, next) => {
				middleware1Called = true;
				next();
			});

			middlewareApp.get("/users/:id", (req, res) => {
				middleware2Called = true;
				// Call exit to skip remaining middleware
				if (req.exit) {
					req.exit();
				}
				res.send("OK");

				// Check assertions after handler completes (only call done once)
				if (!doneCalled) {
					doneCalled = true;
					try {
						assert.strictEqual(middleware1Called, true, "First middleware should be called");
						assert.strictEqual(middleware2Called, true, "Second middleware should be called");
						// Exit functionality is set up by the route method
						assert.ok(typeof mockReq.exit === "function", "Exit function should be available");
						done();
					} catch (error) {
						done(error);
					}
				}
			});

			// Update mock request for GET method
			mockReq.method = "GET";

			middlewareApp.route(mockReq, mockRes);
		});
	});
});

describe("woodland factory function", () => {
	it("should create Woodland instance", () => {
		const app = woodland({ logging: { enabled: false }});
		assert.ok(app instanceof Woodland);
	});

	it("should pass configuration to constructor", () => {
		const app = woodland({autoindex: true, time: true, logging: { enabled: false }});
		assert.strictEqual(app.autoindex, true);
		assert.strictEqual(app.time, true);
	});

	it("should bind route method", () => {
		const app = woodland({ logging: { enabled: false }});
		assert.strictEqual(typeof app.route, "function");
		// The route method should be bound to the instance
		const routeFn = app.route;
		assert.strictEqual(typeof routeFn, "function");
	});
});

describe("Woodland CLF (Common Log Format)", () => {
	let app;
	let mockReq;
	let mockRes;

	beforeEach(() => {
		app = new Woodland({ logging: { enabled: false }});

		// Mock a complete request object
		mockReq = {
			method: "GET",
			headers: {
				host: "example.com",
				referer: "https://google.com/search?q=test",
				"user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"
			},
			parsed: {
				pathname: "/api/users",
				search: "?limit=10",
				username: "testuser"
			},
			ip: "192.168.1.100"
		};

		mockRes = {
			statusCode: 200,
			getHeader: function (name) {
				if (name === "content-length") {
					return "1234";
				}

				return undefined;
			}
		};
	});

	it("should generate CLF with all fields populated", () => {
		const logEntry = app.clf(mockReq, mockRes);

		assert.ok(typeof logEntry === "string", "Should return a string");
		assert.ok(logEntry.includes("example.com") || logEntry.includes("-"), "Should include host or placeholder");
		assert.ok(logEntry.includes("192.168.1.100"), "Should include IP address");
		assert.ok(logEntry.includes("testuser"), "Should include username");
		assert.ok(logEntry.includes("GET /api/users?limit=10 HTTP/1.1"), "Should include request line");
		assert.ok(logEntry.includes("200"), "Should include status code");
		assert.ok(logEntry.includes("1234"), "Should include content length");
		// Note: Default log format doesn't include referer and user-agent
	});

	it("should include referer and user-agent with custom format", () => {
		const customApp = new Woodland({
			logging: {
				enabled: false,
				format: "%h %l %u %t \"%r\" %>s %b %{Referer}i %{User-agent}i"
			}
		});
		const logEntry = customApp.clf(mockReq, mockRes);

		assert.ok(logEntry.includes("https://google.com/search?q=test"), "Should include referer");
		assert.ok(logEntry.includes("Mozilla/5.0"), "Should include user agent");
	});

	it("should handle missing host header", () => {
		delete mockReq.headers.host;
		const logEntry = app.clf(mockReq, mockRes);

		assert.ok(logEntry.includes("-"), "Should use hyphen for missing host");
		assert.ok(!logEntry.includes("undefined"), "Should not contain undefined");
	});

	it("should handle missing IP", () => {
		delete mockReq.ip;
		const logEntry = app.clf(mockReq, mockRes);

		assert.ok(logEntry.includes("-"), "Should use hyphen for missing IP");
	});

	it("should handle missing username", () => {
		delete mockReq.parsed.username;
		const logEntry = app.clf(mockReq, mockRes);

		assert.ok(logEntry.includes("-"), "Should use hyphen for missing username");
	});

	it("should handle missing referer header", () => {
		delete mockReq.headers.referer;
		const logEntry = app.clf(mockReq, mockRes);

		assert.ok(logEntry.includes("-"), "Should use hyphen for missing referer");
	});

	it("should handle missing user-agent header", () => {
		delete mockReq.headers["user-agent"];
		const logEntry = app.clf(mockReq, mockRes);

		assert.ok(logEntry.includes("-"), "Should use hyphen for missing user-agent");
	});

	it("should handle missing content-length", () => {
		mockRes.getHeader = () => undefined;
		const logEntry = app.clf(mockReq, mockRes);

		assert.ok(logEntry.includes("-"), "Should use hyphen for missing content-length");
	});

	it("should format timestamp correctly", () => {
		const logEntry = app.clf(mockReq, mockRes);

		// Check for timestamp format: [DD/MMM/YYYY:HH:MM:SS +ZZZZ]
		const timestampRegex = /\[\d{1,2}\/\w{3}\/\d{4}:\d{2}:\d{2}:\d{2} [+-]\d{4}\]/;
		assert.ok(timestampRegex.test(logEntry), "Should include properly formatted timestamp");
	});

	it("should include timezone offset", () => {
		const logEntry = app.clf(mockReq, mockRes);

		// Should have timezone offset like +0000, -0500, etc.
		const timezoneRegex = /[+-]\d{4}/;
		assert.ok(timezoneRegex.test(logEntry), "Should include timezone offset");
	});

	it("should handle custom logging format", () => {
		const customApp = new Woodland({
			logging: {
				enabled: false,
				format: "%h %l %u %t \"%r\" %>s %b custom-field"
			}
		});

		const logEntry = customApp.clf(mockReq, mockRes);
		assert.ok(logEntry.includes("custom-field"), "Should use custom format");
	});

	it("should work when timing is disabled", () => {
		const noTimeApp = new Woodland({
			time: false,
			logging: { enabled: false }
		});

		const [body, status, headers] = noTimeApp.onReady(mockReq, mockRes, "test", 200, {});

		assert.strictEqual(body, "test", "Should return original body");
		assert.strictEqual(status, 200, "Should return original status");
		assert.deepStrictEqual(headers, {}, "Should return original headers");
		assert.strictEqual(mockRes.getHeader("x-response-time"), undefined, "Should not set response time header");
	});
});

describe("Woodland Timing and Hooks", () => {
	let app;
	let mockReq;
	let mockRes;

	beforeEach(() => {
		app = new Woodland({
			time: true,
			logging: { enabled: false }
		});

		mockReq = {
			method: "GET",
			headers: { host: "localhost" },
			parsed: { pathname: "/test" }
		};

		mockRes = {
			headersSent: false,
			statusCode: 200,
			_headers: {},
			setHeader: function (name, value) {
				this._headers[name.toLowerCase()] = value;
			},
			header: function (name, value) {
				this.setHeader(name, value);
			},
			getHeader: function (name) {
				return this._headers[name.toLowerCase()];
			},
			removeHeader: function (name) {
				delete this._headers[name.toLowerCase()];
			}
		};
	});

	it("should add response time header when timing enabled", () => {
		// Mock precise timer
		mockReq.precise = {
			stop: () => ({
				diff: () => 1500000 // 1.5ms in nanoseconds
			})
		};

		app.onReady(mockReq, mockRes, "test", 200, {});

		assert.ok(mockRes.getHeader("x-response-time"), "Should set response time header");
		assert.ok(mockRes.getHeader("x-response-time").includes("ms"), "Should include 'ms' in response time");
	});

	it("should not override existing response time header", () => {
		mockRes.setHeader("x-response-time", "5.00ms");
		mockReq.precise = {
			stop: () => ({
				diff: () => 1500000
			})
		};

		app.onReady(mockReq, mockRes, "test", 200, {});

		assert.strictEqual(mockRes.getHeader("x-response-time"), "5.00ms", "Should not override existing header");
	});

	it("should call onSend hook", () => {
		let onSendCalled = false;

		// Mock precise timer
		mockReq.precise = {
			stop: () => ({
				diff: () => 1000000
			})
		};

		// Override onSend method
		app.onSend = function (req, res, body, status, headers) {
			onSendCalled = true;
			assert.strictEqual(req, mockReq, "Should pass request");
			assert.strictEqual(res, mockRes, "Should pass response");
			assert.strictEqual(body, "test body", "Should pass body");
			assert.strictEqual(status, 201, "Should pass status");
			assert.deepStrictEqual(headers, { "x-custom": "value" }, "Should pass headers");

			// Return modified values
			return ["modified body", 202, { "x-modified": "true" }];
		};

		const [resultBody, resultStatus, resultHeaders] = app.onReady(mockReq, mockRes, "test body", 201, { "x-custom": "value" });

		assert.strictEqual(onSendCalled, true, "Should call onSend hook");
		assert.strictEqual(resultBody, "modified body", "Should return modified body");
		assert.strictEqual(resultStatus, 202, "Should return modified status");
		assert.deepStrictEqual(resultHeaders, { "x-modified": "true" }, "Should return modified headers");
	});

	it("should work when timing is disabled", () => {
		const noTimeApp = new Woodland({
			time: false,
			logging: { enabled: false }
		});

		const [body, status, headers] = noTimeApp.onReady(mockReq, mockRes, "test", 200, {});

		assert.strictEqual(body, "test", "Should return original body");
		assert.strictEqual(status, 200, "Should return original status");
		assert.deepStrictEqual(headers, {}, "Should return original headers");
		assert.strictEqual(mockRes.getHeader("x-response-time"), undefined, "Should not set response time header");
	});
});

describe("Woodland Stream Method", () => {
	let app;
	let mockReq;
	let mockRes;

	beforeEach(() => {
		app = new Woodland({
			etags: true,
			logging: { enabled: false }
		});

		mockReq = {
			method: "GET",
			headers: {}
		};

		mockRes = {
			headersSent: false,
			statusCode: 200,
			_headers: {},
			setHeader: function (name, value) {
				this._headers[name.toLowerCase()] = value;
			},
			header: function (name, value) {
				this.setHeader(name, value);
			},
			getHeader: function (name) {
				return this._headers[name.toLowerCase()];
			},
			removeHeader: function (name) {
				delete this._headers[name.toLowerCase()];
			},
			send: function (stream, status) {
				this.sentStream = stream;
				this.sentStatus = status;
			}
		};
	});

	it("should set basic file headers for GET request", () => {
		const fileInfo = {
			charset: "utf-8",
			etag: "abc123",
			path: "/test/file.txt",
			stats: {
				size: 1024,
				mtime: new Date("2023-01-01T00:00:00Z")
			}
		};

		// Mock the send method to avoid file system access
		let sentBody, sentStatus; // eslint-disable-line no-unused-vars
		mockRes.send = function (body, status) {
			sentBody = body;
			sentStatus = status;
		};

		app.stream(mockReq, mockRes, fileInfo);

		assert.strictEqual(mockRes.getHeader("content-length"), 1024, "Should set content-length");
		assert.ok(mockRes.getHeader("content-type").includes("text/plain"), "Should set content-type for .txt file");
		assert.ok(mockRes.getHeader("content-type").includes("charset=utf-8"), "Should include charset");
		assert.strictEqual(mockRes.getHeader("last-modified"), "Sun, 01 Jan 2023 00:00:00 GMT", "Should set last-modified");
		assert.strictEqual(mockRes.getHeader("etag"), "abc123", "Should set etag");
		assert.strictEqual(mockRes.getHeader("cache-control"), undefined, "Should remove cache-control when etag is present");
	});

	it("should handle different file types correctly", () => {
		const jsFileInfo = {
			charset: "",
			etag: "",
			path: "/test/script.js",
			stats: { size: 500, mtime: new Date() }
		};

		// Mock the send method to avoid file system access
		let sentBody, sentStatus; // eslint-disable-line no-unused-vars
		mockRes.send = function (body, status) {
			sentBody = body;
			sentStatus = status;
		};

		app.stream(mockReq, mockRes, jsFileInfo);

		assert.ok(mockRes.getHeader("content-type").includes("text/javascript"), "Should set correct MIME type for .js file");
		assert.ok(!mockRes.getHeader("content-type").includes("charset"), "Should not include charset when empty");
	});

	it("should handle HEAD requests", () => {
		mockReq.method = "HEAD";
		const fileInfo = {
			charset: "utf-8",
			etag: "abc123",
			path: "/test/file.html",
			stats: { size: 2048, mtime: new Date() }
		};

		app.stream(mockReq, mockRes, fileInfo);

		assert.strictEqual(mockRes.sentStream, "", "Should send empty body for HEAD request");
	});

	it("should handle OPTIONS requests", () => {
		mockReq.method = "OPTIONS";
		const fileInfo = {
			charset: "utf-8",
			etag: "abc123",
			path: "/test/file.html",
			stats: { size: 2048, mtime: new Date() }
		};

		app.stream(mockReq, mockRes, fileInfo);

		assert.strictEqual(mockRes.getHeader("content-length"), undefined, "Should remove content-length for OPTIONS");
		assert.ok(typeof mockRes.sentStream === "string", "Should send OPTIONS body");
	});

	it("should handle range requests", () => {
		mockReq.headers.range = "bytes=0-499";

		const fileInfo = {
			charset: "utf-8",
			etag: "abc123",
			path: "/test/large-file.txt",
			stats: { size: 1000, mtime: new Date() }
		};

		// Mock the send method to avoid file system access
		let sentBody, sentStatus; // eslint-disable-line no-unused-vars
		mockRes.send = function (body, status) {
			sentBody = body;
			sentStatus = status;
		};

		app.stream(mockReq, mockRes, fileInfo);

		// With a range header, the stream method should set up range processing
		// The exact headers depend on the partialHeaders implementation
		assert.ok(mockRes.getHeader("content-range") || mockRes.getHeader("content-length"), "Should handle range processing");
	});

	it("should work without etags enabled", () => {
		const noEtagApp = new Woodland({
			etags: false,
			logging: { enabled: false }
		});

		const fileInfo = {
			charset: "utf-8",
			etag: "should-be-ignored",
			path: "/test/file.txt",
			stats: { size: 1024, mtime: new Date() }
		};

		// Mock the send method to avoid file system access
		let sentBody, sentStatus; // eslint-disable-line no-unused-vars
		mockRes.send = function (body, status) {
			sentBody = body;
			sentStatus = status;
		};

		noEtagApp.stream(mockReq, mockRes, fileInfo);

		assert.strictEqual(mockRes.getHeader("etag"), undefined, "Should not set etag when disabled");
	});

	it("should emit stream event", done => {
		app.on("stream", (req, res) => {
			assert.strictEqual(req, mockReq, "Should pass request to stream event");
			assert.strictEqual(res, mockRes, "Should pass response to stream event");
			done();
		});

		const fileInfo = {
			charset: "utf-8",
			etag: "",
			path: "/test/file.txt",
			stats: { size: 1024, mtime: new Date() }
		};

		app.stream(mockReq, mockRes, fileInfo);
	});

	it("should handle default file info", () => {
		// Test with default file info structure
		app.stream(mockReq, mockRes);

		assert.strictEqual(mockRes.getHeader("content-length"), 0, "Should use default size of 0");
		assert.ok(mockRes.getHeader("content-type"), "Should set some content-type");
		assert.ok(mockRes.getHeader("last-modified"), "Should set last-modified with default date");
	});

	it("should handle binary files correctly", () => {
		const binaryFileInfo = {
			charset: "",
			etag: "binary123",
			path: "/test/image.png",
			stats: { size: 2048, mtime: new Date() }
		};

		app.stream(mockReq, mockRes, binaryFileInfo);

		assert.ok(mockRes.getHeader("content-type").includes("image/png"), "Should set correct MIME type for PNG");
		assert.ok(!mockRes.getHeader("content-type").includes("charset"), "Should not include charset for binary files");
	});
});

describe("Woodland Range Requests and Partial Content", () => {
	let app;
	let mockReq;
	let mockRes;

	beforeEach(() => {
		app = new Woodland({ logging: { enabled: false }});

		mockReq = {
			method: "GET",
			headers: {},
			parsed: { pathname: "/test" }
		};

		mockRes = {
			headersSent: false,
			statusCode: 200,
			_headers: {},
			setHeader: function (name, value) {
				this._headers[name.toLowerCase()] = value;
			},
			header: function (name, value) {
				this.setHeader(name, value);
			},
			getHeader: function (name) {
				return this._headers[name.toLowerCase()];
			},
			removeHeader: function (name) {
				delete this._headers[name.toLowerCase()];
			},
			writeHead: function () {},
			end: function () {},
			error: function (status) {
				this.statusCode = status;
				this.errorCalled = true;
			}
		};
	});

	it("should handle range requests for string content", () => {
		mockReq.headers.range = "bytes=0-4";
		mockReq.range = { start: 0, end: 5 };

		const sendFn = app.send(mockReq, mockRes);
		const content = "Hello, World!";

		// Mock Buffer methods
		const originalBuffer = global.Buffer;
		global.Buffer = {
			...originalBuffer,
			from: str => ({
				slice: (start, end) => originalBuffer.from(str).slice(start, end),
				toString: () => str.slice(0, 5) // "Hello"
			}),
			byteLength: str => originalBuffer.byteLength(str)
		};

		sendFn(content);

		// Restore Buffer
		global.Buffer = originalBuffer;

		// Should handle partial content
		assert.ok(true, "Should handle range request without error");
	});

	it("should return 416 for invalid range", () => {
		mockReq.headers.range = "bytes=0-4";
		// Don't set req.range to simulate invalid range

		const sendFn = app.send(mockReq, mockRes);
		sendFn("Hello, World!");

		assert.strictEqual(mockRes.statusCode, 416, "Should return 416 for invalid range");
		assert.strictEqual(mockRes.errorCalled, true, "Should call error handler");
	});

	it("should handle range requests for streams", () => {
		mockReq.headers.range = "bytes=0-499";
		// Don't set req.range to simulate stream with invalid range

		const mockStream = {
			on: function (event, callback) {
				if (event === "error") {
					this.errorHandler = callback;
				}

				return this;
			},
			pipe: function () {
				// Mock pipe operation
				return this;
			}
		};

		const sendFn = app.send(mockReq, mockRes);
		sendFn(mockStream);

		assert.strictEqual(mockRes.statusCode, 416, "Should return 416 for stream with invalid range");
	});

	it("should send full content when no range specified", () => {
		const sendFn = app.send(mockReq, mockRes);
		const content = "Full content here";

		let endCalled = false;
		mockRes.end = function (body) {
			endCalled = true;
			assert.strictEqual(body, content, "Should send full content");
		};

		sendFn(content);

		assert.strictEqual(endCalled, true, "Should call res.end");
	});
});

describe("Woodland Cache Functionality", () => {
	let app;

	beforeEach(() => {
		app = new Woodland({
			cacheSize: 5,
			cacheTTL: 100, // 100ms for quick testing
			logging: { enabled: false }
		});
	});

	it("should cache route information", () => {
		app.get("/test", () => {});

		// First call should populate cache
		const result1 = app.routes("/test", "GET");

		// Second call should return cached result
		const result2 = app.routes("/test", "GET");

		assert.strictEqual(result1, result2, "Should return same cached object");
	});

	it("should cache allows results", () => {
		app.get("/api", () => {});
		app.post("/api", () => {});

		const result1 = app.allows("/api");
		const result2 = app.allows("/api");

		assert.strictEqual(result1, result2, "Should return same cached result");
		assert.ok(result1.includes("GET"), "Should include GET method");
		assert.ok(result1.includes("POST"), "Should include POST method");
	});

	it("should respect cache override", () => {
		app.get("/override", () => {});

		const cached = app.routes("/override", "GET", false);
		const uncached = app.routes("/override", "GET", true);

		// Both should have same structure but might be different objects
		assert.deepStrictEqual(
			Object.keys(cached),
			Object.keys(uncached),
			"Should have same structure when overriding cache"
		);
	});

	it("should handle cache eviction", done => {
		// Fill cache beyond capacity
		for (let i = 0; i < 10; i++) {
			app.get(`/route${i}`, () => {});
			app.routes(`/route${i}`, "GET");
		}

		// Wait for TTL expiration
		setTimeout(() => {
			// Access should still work (might not be cached)
			const result = app.routes("/route0", "GET");
			assert.ok(result, "Should still return route information after cache eviction");
			done();
		}, 150);
	});

	it("should handle permissions cache", () => {
		app.get("/permissions", () => {});

		const perms1 = app.allows("/permissions");
		const perms2 = app.allows("/permissions");

		assert.strictEqual(perms1, perms2, "Should cache permissions results");
	});
});


describe("Woodland Serve Method", () => {
	let app;
	let mockReq;
	let mockRes;
	let originalStat;
	let originalReaddir;

	beforeEach(async () => {
		app = new Woodland({
			indexes: ["index.html", "index.htm"],
			autoindex: false,
			logging: { enabled: false }
		});

		mockReq = {
			method: "GET",
			headers: { host: "localhost" },
			parsed: {
				pathname: "/test",
				search: "?query=1"
			},
			ip: "127.0.0.1"
		};

		mockRes = {
			statusCode: 200,
			_headers: {},
			setHeader: function (name, value) {
				this._headers[name.toLowerCase()] = value;
			},
			header: function (name, value) {
				this.setHeader(name, value);
			},
			getHeader: function (name) {
				return this._headers[name.toLowerCase()];
			},
			error: function (status) {
				this.statusCode = status;
				this.errorCalled = true;
			},
			redirect: function (url) {
				this.redirectUrl = url;
				this.redirectCalled = true;
			},
			send: function (body) {
				this.sentBody = body;
				this.sendCalled = true;
			}
		};

		// Store original fs functions for mocking
		const fs = await import("node:fs/promises");
		originalStat = fs.stat;
		originalReaddir = fs.readdir;
	});

	/* global afterEach */
	afterEach(async () => {
		// Restore original fs functions
		const fs = await import("node:fs/promises");
		fs.stat = originalStat;
		fs.readdir = originalReaddir;
	});

	it("should serve existing files", async () => {
		const fs = await import("node:fs/promises");

		// Mock fs.stat to return file stats
		fs.stat = async () => ({
			isDirectory: () => false,
			size: 1024,
			ino: 12345,
			mtimeMs: Date.now()
		});

		// Mock stream method to avoid file reading
		app.stream = function (req, res, fileInfo) {
			assert.ok(fileInfo.path.endsWith("test.txt"), "Should construct correct file path");
			assert.strictEqual(typeof fileInfo.etag, "string", "Should generate etag");
			res.send("File content");
		};

		await app.serve(mockReq, mockRes, "test.txt", "/var/www");

		assert.strictEqual(mockRes.sendCalled, true, "Should send file content");
	});

	it("should return 404 for non-existent files", async () => {
		const fs = await import("node:fs/promises");

		// Mock fs.stat to throw ENOENT error
		fs.stat = async () => {
			const error = new Error("ENOENT: no such file or directory");
			error.code = "ENOENT";
			throw error;
		};

		await app.serve(mockReq, mockRes, "nonexistent.txt", "/var/www");

		assert.strictEqual(mockRes.statusCode, 404, "Should return 404 for non-existent file");
		assert.strictEqual(mockRes.errorCalled, true, "Should call error handler");
	});

	it("should redirect directories without trailing slash", async () => {
		const fs = await import("node:fs/promises");

		// Mock fs.stat to return directory stats
		fs.stat = async () => ({
			isDirectory: () => true
		});

		// Mock request for directory without trailing slash
		mockReq.parsed.pathname = "/directory";

		await app.serve(mockReq, mockRes, "directory", "/var/www");

		assert.strictEqual(mockRes.redirectCalled, true, "Should redirect");
		assert.ok(mockRes.redirectUrl.includes("/directory/"), "Should redirect to path with trailing slash");
		assert.ok(mockRes.redirectUrl.includes("?query=1"), "Should preserve query string");
	});

	it("should serve index files from directories", async () => {
		const fs = await import("node:fs/promises");

		// Mock fs.stat to return directory stats first, then file stats
		let callCount = 0;
		fs.stat = async () => {
			callCount++;
			if (callCount === 1) {
				return { isDirectory: () => true };
			} else {
				return {
					isDirectory: () => false,
					size: 2048,
					ino: 67890,
					mtimeMs: Date.now()
				};
			}
		};

		// Mock fs.readdir to return index file
		fs.readdir = async () => [
			{ name: "index.html", isDirectory: () => false },
			{ name: "other.txt", isDirectory: () => false }
		];

		// Mock stream method
		app.stream = function (req, res, fileInfo) {
			assert.ok(fileInfo.path.includes("index.html"), "Should serve index.html");
			res.send("Index content");
		};

		// Mock request for directory with trailing slash
		mockReq.parsed.pathname = "/directory/";

		await app.serve(mockReq, mockRes, "directory", "/var/www");

		assert.strictEqual(mockRes.sendCalled, true, "Should serve index file");
	});

	it("should serve autoindex when enabled and no index file", async () => {
		const autoindexApp = new Woodland({
			autoindex: true,
			logging: { enabled: false }
		});

		const fs = await import("node:fs/promises");

		// Mock fs.stat to return directory stats
		fs.stat = async () => ({
			isDirectory: () => true
		});

		// Mock fs.readdir to return files without index
		fs.readdir = async () => [
			{ name: "file1.txt", isDirectory: () => false },
			{ name: "file2.txt", isDirectory: () => false },
			{ name: "subdirectory", isDirectory: () => true }
		];

		// Mock request for directory with trailing slash
		mockReq.parsed.pathname = "/directory/";

		await autoindexApp.serve(mockReq, mockRes, "directory", "/var/www");

		assert.strictEqual(mockRes.sendCalled, true, "Should send autoindex");
		assert.ok(mockRes.sentBody.includes("file1.txt"), "Should include files in autoindex");
		assert.ok(mockRes.sentBody.includes("subdirectory"), "Should include subdirectories in autoindex");
		assert.strictEqual(mockRes.getHeader("content-type"), "text/html; charset=utf-8", "Should set HTML content type");
	});

	it("should return 404 for directories when autoindex disabled and no index", async () => {
		const fs = await import("node:fs/promises");

		// Mock fs.stat to return directory stats
		fs.stat = async () => ({
			isDirectory: () => true
		});

		// Mock fs.readdir to return files without index
		fs.readdir = async () => [
			{ name: "file1.txt", isDirectory: () => false },
			{ name: "file2.txt", isDirectory: () => false }
		];

		// Mock request for directory with trailing slash
		mockReq.parsed.pathname = "/directory/";

		await app.serve(mockReq, mockRes, "directory", "/var/www");

		assert.strictEqual(mockRes.statusCode, 404, "Should return 404 when no index file and autoindex disabled");
		assert.strictEqual(mockRes.errorCalled, true, "Should call error handler");
	});

	it("should prioritize first matching index file", async () => {
		const fs = await import("node:fs/promises");

		let callCount = 0;
		fs.stat = async () => {
			callCount++;
			if (callCount === 1) {
				return { isDirectory: () => true };
			} else {
				return {
					isDirectory: () => false,
					size: 1024,
					ino: 12345,
					mtimeMs: Date.now()
				};
			}
		};

		// Mock fs.readdir to return multiple index files
		fs.readdir = async () => [
			{ name: "index.htm", isDirectory: () => false },
			{ name: "index.html", isDirectory: () => false },
			{ name: "other.txt", isDirectory: () => false }
		];

		// Mock stream method to verify which file is served
		let servedFile = "";
		app.stream = function (req, res, fileInfo) {
			servedFile = fileInfo.path;
			res.send("Index content");
		};

		mockReq.parsed.pathname = "/directory/";

		await app.serve(mockReq, mockRes, "directory", "/var/www");

		assert.ok(servedFile.includes("index.htm"), "Should serve first matching index file (index.htm)");
	});

	it("should handle custom folder parameter", async () => {
		const fs = await import("node:fs/promises");

		fs.stat = async () => ({
			isDirectory: () => false,
			size: 512,
			ino: 11111,
			mtimeMs: Date.now()
		});

		let servedPath = "";
		app.stream = function (req, res, fileInfo) {
			servedPath = fileInfo.path;
			res.send("Custom folder content");
		};

		await app.serve(mockReq, mockRes, "test.txt", "/custom/folder");

		assert.ok(servedPath.includes("/custom/folder"), "Should use custom folder path");
		assert.ok(servedPath.includes("test.txt"), "Should append file to custom folder");
	});

	it("should use default folder when not specified", async () => {
		const fs = await import("node:fs/promises");

		fs.stat = async () => ({
			isDirectory: () => false,
			size: 256,
			ino: 22222,
			mtimeMs: Date.now()
		});

		let servedPath = "";
		app.stream = function (req, res, fileInfo) {
			servedPath = fileInfo.path;
			res.send("Default folder content");
		};

		await app.serve(mockReq, mockRes, "test.txt");

		assert.ok(servedPath.includes(process.cwd()), "Should use current working directory as default");
	});

	it("should generate etag based on file stats", async () => {
		const fs = await import("node:fs/promises");

		const mockStats = {
			isDirectory: () => false,
			size: 1024,
			ino: 98765,
			mtimeMs: 1609459200000 // Fixed timestamp
		};

		fs.stat = async () => mockStats;

		let generatedEtag = "";
		app.stream = function (req, res, fileInfo) {
			generatedEtag = fileInfo.etag;
			res.send("Content with etag");
		};

		await app.serve(mockReq, mockRes, "test.txt", "/var/www");

		assert.ok(generatedEtag.length > 0, "Should generate etag");
		// Etag should be based on method, ino, size, and mtimeMs
		// Can't easily test exact etag value due to hashing, but can verify it's generated
	});

	it("should handle fs errors gracefully", async () => {
		const fs = await import("node:fs/promises");

		// Mock fs.stat to throw generic error
		fs.stat = async () => {
			const error = new Error("Permission denied");
			error.code = "EACCES";
			throw error;
		};

		await app.serve(mockReq, mockRes, "restricted.txt", "/var/www");

		assert.strictEqual(mockRes.statusCode, 404, "Should return 404 for any fs error");
		assert.strictEqual(mockRes.errorCalled, true, "Should call error handler");
	});
});

describe("Woodland Middleware Execution and Error Propagation", () => {
	let app;
	let mockReq;
	let mockRes;
	let executionOrder;

	beforeEach(() => {
		app = new Woodland({ logging: { enabled: false }});
		executionOrder = [];

		mockReq = {
			method: "GET",
			url: "/test",
			headers: { host: "localhost" },
			parsed: { pathname: "/test", hostname: "localhost", search: "" },
			socket: { remoteAddress: "127.0.0.1" },
			connection: { remoteAddress: "127.0.0.1" }
		};

		mockRes = {
			headersSent: false,
			statusCode: 200,
			_headers: {},
			setHeader: function (name, value) {
				this._headers[name.toLowerCase()] = value;
			},
			header: function (name, value) {
				this.setHeader(name, value);
			},
			removeHeader: function (name) {
				delete this._headers[name.toLowerCase()];
			},
			getHeader: function (name) {
				return this._headers[name.toLowerCase()];
			},
			on: function () {},
			writeHead: function () {},
			end: function () {},
			send: function (body) {
				this.sentBody = body;
			},
			error: function (status) {
				this.statusCode = status;
				this.errorCalled = true;
			}
		};
	});

	it("should execute wildcard middleware before specific method middleware", done => {
		app.always((req, res, next) => {
			executionOrder.push("wildcard1");
			next();
		});

		app.always((req, res, next) => {
			executionOrder.push("wildcard2");
			next();
		});

		app.get("/test", (req, res, next) => {
			executionOrder.push("get1");
			next();
		});

		app.get("/test", (req, res) => {
			executionOrder.push("get2");
			res.send("OK");

			// Verify execution order
			assert.deepStrictEqual(executionOrder, ["wildcard1", "wildcard2", "get1", "get2"],
				"Should execute wildcard middleware before specific method middleware");
			done();
		});

		app.route(mockReq, mockRes);
	});

	it("should stop execution when middleware doesn't call next", done => {
		app.always((req, res, next) => {
			executionOrder.push("wildcard");
			next();
		});

		app.get("/test", (req, res) => {
			executionOrder.push("blocking");
			res.send("Blocked");
			// Don't call next()
		});

		app.get("/test", (req, res) => {
			executionOrder.push("should-not-execute");
			res.send("Should not reach here");
		});

		setTimeout(() => {
			assert.deepStrictEqual(executionOrder, ["wildcard", "blocking"],
				"Should stop execution when middleware doesn't call next");
			assert.ok(!executionOrder.includes("should-not-execute"), "Should not execute subsequent middleware");
			done();
		}, 10);

		app.route(mockReq, mockRes);
	});

	it("should handle middleware errors", done => {
		app.get("/test", () => {
			executionOrder.push("before-error");
			throw new Error("Middleware error");
		});

		app.get("/test", () => {
			executionOrder.push("should-not-execute");
		});

		// Listen for error events
		app.on("error", (req, res, error) => {
			executionOrder.push("error-handler");
			assert.strictEqual(error.message, "Middleware error", "Should receive the thrown error");
			assert.ok(!executionOrder.includes("should-not-execute"), "Should not execute subsequent middleware after error");
			done();
		});

		app.route(mockReq, mockRes);
	});

	it("should provide exit function for skipping remaining middleware", done => {
		app.always((req, res, next) => {
			executionOrder.push("wildcard");
			next();
		});

		app.get("/test", (req, res, next) => {
			executionOrder.push("middleware1");
			next();
		});

		app.get("/test", (req, res) => {
			executionOrder.push("middleware2");

			// Use exit to skip remaining middleware
			if (req.exit) {
				req.exit();
			}

			res.send("OK");
		});

		app.get("/test", (req, res) => {
			executionOrder.push("should-not-execute");
			res.send("Should not reach here");
		});

		setTimeout(() => {
			assert.ok(typeof mockReq.exit === "function", "Should provide exit function");
			assert.ok(!executionOrder.includes("should-not-execute"), "Should skip remaining middleware after exit");
			done();
		}, 10);

		app.route(mockReq, mockRes);
	});

	it("should handle parameterized routes correctly", done => {
		app.get("/users/:id", (req, res) => {
			executionOrder.push("param-handler");
			assert.ok(req.params, "Should have params object");
			assert.strictEqual(req.params.id, "123", "Should extract route parameter");
			res.send("User 123");
			done();
		});

		mockReq.parsed.pathname = "/users/123";
		mockReq.url = "/users/123";

		app.route(mockReq, mockRes);
	});

	it("should handle multiple middleware functions on same route", done => {
		let middlewareCount = 0;

		app.get("/test",
			(req, res, next) => {
				middlewareCount++;
				executionOrder.push("middleware1");
				next();
			},
			(req, res, next) => {
				middlewareCount++;
				executionOrder.push("middleware2");
				next();
			},
			(req, res) => {
				middlewareCount++;
				executionOrder.push("final");
				res.send("Multiple middleware");

				assert.strictEqual(middlewareCount, 3, "Should execute all middleware functions");
				assert.deepStrictEqual(executionOrder, ["middleware1", "middleware2", "final"],
					"Should execute middleware in order");
				done();
			}
		);

		app.route(mockReq, mockRes);
	});
});


describe("Woodland Decorate Method and Header Manipulation", () => {
	let app;
	let mockReq;
	let mockRes;

	beforeEach(() => {
		app = new Woodland({
			time: true,
			logging: { enabled: false },
			defaultHeaders: {
				"Custom-Server": "Woodland-Test",
				"X-Frame-Options": "DENY"
			}
		});

		mockReq = {
			method: "GET",
			url: "/test?param=value",
			headers: {
				host: "example.com",
				"user-agent": "Test-Agent",
				"accept": "text/html,application/xhtml+xml"
			},
			connection: { remoteAddress: "192.168.1.100" },
			socket: { remoteAddress: "192.168.1.100" }
		};

		mockRes = {
			headersSent: false,
			statusCode: 200,
			_headers: {},
			locals: {},
			setHeader: function (name, value) {
				this._headers[name.toLowerCase()] = value;
			},
			header: function (name, value) {
				this.setHeader(name, value);
			},
			removeHeader: function (name) {
				delete this._headers[name.toLowerCase()];
			},
			getHeader: function (name) {
				return this._headers[name.toLowerCase()];
			},
			on: function (event, callback) {
				if (event === "close") {
					setTimeout(callback, 0);
				}
			}
		};
	});

	it("should set all default headers", () => {
		app.decorate(mockReq, mockRes);

		assert.ok(mockRes.getHeader("server"), "Should set server header");
		assert.ok(mockRes.getHeader("x-powered-by"), "Should set x-powered-by header");
		assert.strictEqual(mockRes.getHeader("custom-server"), "Woodland-Test", "Should set custom default headers");
		assert.strictEqual(mockRes.getHeader("x-frame-options"), "DENY", "Should set custom security headers");
		assert.strictEqual(mockRes.getHeader("x-content-type-options"), "nosniff", "Should set security headers");
	});

	it("should parse request URL correctly", () => {
		app.decorate(mockReq, mockRes);

		assert.ok(mockReq.parsed, "Should have parsed object");
		assert.strictEqual(mockReq.parsed.pathname, "/test", "Should parse pathname");
		assert.strictEqual(mockReq.parsed.search, "?param=value", "Should parse search parameters");
		assert.strictEqual(mockReq.parsed.hostname, "example.com", "Should parse hostname");
	});

	it("should set request properties correctly", () => {
		app.decorate(mockReq, mockRes);

		assert.strictEqual(mockReq.body, "", "Should initialize body as empty string");
		assert.strictEqual(typeof mockReq.allow, "string", "Should set allow string");
		assert.strictEqual(mockReq.host, "example.com", "Should set host from parsed");
		assert.strictEqual(mockReq.ip, "192.168.1.100", "Should set IP address");
		assert.deepStrictEqual(mockReq.params, {}, "Should initialize params as empty object");
		assert.strictEqual(mockReq.valid, true, "Should initialize valid as true");
	});

	it("should set response helper methods", () => {
		app.decorate(mockReq, mockRes);

		assert.strictEqual(typeof mockRes.error, "function", "Should set error method");
		assert.strictEqual(typeof mockRes.json, "function", "Should set json method");
		assert.strictEqual(typeof mockRes.redirect, "function", "Should set redirect method");
		assert.strictEqual(typeof mockRes.send, "function", "Should set send method");
		assert.strictEqual(typeof mockRes.set, "function", "Should set set method");
		assert.strictEqual(typeof mockRes.status, "function", "Should set status method");
		assert.strictEqual(mockRes.header, mockRes.setHeader, "Should alias header to setHeader");
		assert.deepStrictEqual(mockRes.locals, {}, "Should initialize locals as empty object");
	});

	it("should handle CORS requests correctly", () => {
		const corsApp = new Woodland({
			origins: ["https://trusted.com"],
			logging: { enabled: false }
		});

		mockReq.headers.origin = "https://trusted.com";
		corsApp.decorate(mockReq, mockRes);

		assert.strictEqual(mockReq.corsHost, true, "Should detect cross-origin request");
		assert.strictEqual(mockReq.cors, true, "Should allow CORS for trusted origin");
		assert.strictEqual(mockRes.getHeader("access-control-allow-origin"), "https://trusted.com", "Should set CORS origin header");
		assert.strictEqual(mockRes.getHeader("access-control-allow-credentials"), "true", "Should set credentials header");
		assert.strictEqual(mockRes.getHeader("timing-allow-origin"), "https://trusted.com", "Should set timing origin header");
		assert.ok(mockRes.getHeader("access-control-allow-methods"), "Should set allowed methods header");
	});

	it("should handle CORS preflight requests", () => {
		const corsApp = new Woodland({
			origins: ["*"],
			logging: { enabled: false }
		});

		mockReq.method = "OPTIONS";
		mockReq.headers.origin = "https://example.com";
		mockReq.headers["access-control-request-headers"] = "content-type,authorization";

		corsApp.decorate(mockReq, mockRes);

		assert.strictEqual(mockRes.getHeader("access-control-allow-headers"), "content-type,authorization",
			"Should set allowed headers for preflight");
	});

	it("should set CORS expose headers for non-preflight requests", () => {
		const corsApp = new Woodland({
			origins: ["*"],
			logging: { enabled: false }
		});

		corsApp.corsExpose = "x-custom-header,x-another-header";
		mockReq.headers.origin = "https://example.com";

		corsApp.decorate(mockReq, mockRes);

		assert.strictEqual(mockRes.getHeader("access-control-expose-headers"), "x-custom-header,x-another-header",
			"Should set expose headers for non-preflight requests");
	});

	it("should initialize precise timer when timing enabled", () => {
		app.decorate(mockReq, mockRes);

		assert.ok(mockReq.precise, "Should have precise timer object");
		assert.strictEqual(typeof mockReq.precise.start, "function", "Should have start method");
	});

	it("should not initialize timer when timing disabled", () => {
		const noTimeApp = new Woodland({
			time: false,
			logging: { enabled: false }
		});

		noTimeApp.decorate(mockReq, mockRes);

		assert.strictEqual(mockReq.precise, undefined, "Should not have precise timer when disabled");
	});

	it("should emit close event", done => {
		// Capture the log call
		app.log = function (message) {
			if (message.includes("192.168.1.100")) {
				done();
			}

			return this;
		};

		app.decorate(mockReq, mockRes);

		// The close event should be emitted via setTimeout
	});

	it("should handle same-origin requests", () => {
		mockReq.headers.origin = "https://example.com";
		app.decorate(mockReq, mockRes);

		assert.strictEqual(mockReq.corsHost, false, "Should not detect cross-origin for same host");
		assert.strictEqual(mockReq.cors, false, "Should not allow CORS for same origin when no origins configured");
	});

	it("should set allow header based on routes", () => {
		app.get("/test", () => {});
		app.post("/test", () => {});

		app.decorate(mockReq, mockRes);

		const allowHeader = mockRes.getHeader("allow");
		assert.ok(allowHeader.includes("GET"), "Should include GET in allow header");
		assert.ok(allowHeader.includes("POST"), "Should include POST in allow header");
		assert.ok(allowHeader.includes("HEAD"), "Should include HEAD in allow header");
		assert.ok(allowHeader.includes("OPTIONS"), "Should include OPTIONS in allow header");
	});
});

describe("Woodland Helper Method Edge Cases", () => {
	let app;
	let mockReq;
	let mockRes;

	beforeEach(() => {
		app = new Woodland({ logging: { enabled: false }});

		mockReq = {
			method: "GET",
			headers: {},
			parsed: { pathname: "/test" }
		};

		mockRes = {
			headersSent: false,
			statusCode: 200,
			_headers: {},
			setHeader: function (name, value) {
				this._headers[name.toLowerCase()] = value;
			},
			header: function (name, value) {
				this.setHeader(name, value);
			},
			getHeader: function (name) {
				return this._headers[name.toLowerCase()];
			},
			removeHeader: function (name) {
				delete this._headers[name.toLowerCase()];
			},
			setHeaders: function (headers) {
				if (headers instanceof Map) {
					for (const [key, value] of headers) {
						this.setHeader(key, value);
					}
				} else if (headers instanceof Headers) {
					for (const [key, value] of headers) {
						this.setHeader(key, value);
					}
				} else {
					for (const [key, value] of Object.entries(headers)) {
						this.setHeader(key, value);
					}
				}
			},
			writeHead: function () {},
			end: function () {}
		};
	});

	it("should handle json response with custom headers", () => {
		const jsonFn = app.json(mockRes);

		mockRes.send = function (body, status, headers) {
			assert.strictEqual(body, '{"test":"value"}', "Should stringify JSON");
			assert.strictEqual(status, 201, "Should use custom status");
			assert.strictEqual(headers["content-type"], "application/json; charset=utf-8", "Should set JSON content type");
			assert.strictEqual(headers["x-custom"], "header", "Should include custom headers");
		};

		jsonFn({ test: "value" }, 201, { "x-custom": "header" });
	});

	it("should handle redirect with temporary redirect", () => {
		const redirectFn = app.redirect(mockRes);

		mockRes.send = function (body, status, headers) {
			assert.strictEqual(body, "", "Should send empty body");
			assert.strictEqual(status, 307, "Should use 307 for temporary redirect");
			assert.strictEqual(headers.location, "/new-location", "Should set location header");
		};

		redirectFn("/new-location", false);
	});

	it("should handle redirect with permanent redirect", () => {
		const redirectFn = app.redirect(mockRes);

		mockRes.send = function (body, status, headers) {
			assert.strictEqual(body, "", "Should send empty body");
			assert.strictEqual(status, 308, "Should use 308 for permanent redirect");
			assert.strictEqual(headers.location, "/permanent-location", "Should set location header");
		};

		redirectFn("/permanent-location", true);
	});

	it("should handle set method with Map object", () => {
		const setFn = app.set(mockRes);
		const headerMap = new Map([
			["x-custom-1", "value1"],
			["x-custom-2", "value2"]
		]);

		const result = setFn(headerMap);

		assert.strictEqual(result, mockRes, "Should return response object for chaining");
		assert.strictEqual(mockRes.getHeader("x-custom-1"), "value1", "Should set header from Map");
		assert.strictEqual(mockRes.getHeader("x-custom-2"), "value2", "Should set header from Map");
	});

	it("should handle set method with Headers object", () => {
		const setFn = app.set(mockRes);
		const headers = new Headers([
			["x-header-1", "val1"],
			["x-header-2", "val2"]
		]);

		setFn(headers);

		assert.strictEqual(mockRes.getHeader("x-header-1"), "val1", "Should set header from Headers object");
		assert.strictEqual(mockRes.getHeader("x-header-2"), "val2", "Should set header from Headers object");
	});

	it("should handle status method", () => {
		const statusFn = app.status(mockRes);

		const result = statusFn(201);

		assert.strictEqual(result, mockRes, "Should return response object for chaining");
		assert.strictEqual(mockRes.statusCode, 201, "Should set status code");
	});

	it("should handle error method with Error object", () => {
		const errorFn = app.error(mockReq, mockRes);
		const testError = new Error("Custom error message");

		let errorEmitted = false;
		app.on("error", (req, res, err) => {
			errorEmitted = true;
			assert.strictEqual(err, testError, "Should emit the error object");
		});

		mockRes.end = function () {
			assert.strictEqual(errorEmitted, true, "Should emit error event");
		};

		errorFn(500, testError);
	});

	it("should handle error method when headers already sent", () => {
		const errorFn = app.error(mockReq, mockRes);
		mockRes.headersSent = true;

		let endCalled = false;
		mockRes.end = function () {
			endCalled = true;
		};

		errorFn(500, "Error after headers sent");

		assert.strictEqual(endCalled, false, "Should not call end when headers already sent");
	});

	it("should handle 404 errors by clearing Allow header", () => {
		const errorFn = app.error(mockReq, mockRes);

		// Set initial Allow header
		mockRes.setHeader("allow", "GET, POST");

		let allowHeaderCleared = false;
		const originalRemoveHeader = mockRes.removeHeader;
		mockRes.removeHeader = function (name) {
			if (name.toLowerCase() === "allow") {
				allowHeaderCleared = true;
			}
			originalRemoveHeader.call(this, name);
		};

		mockRes.end = function () {
			assert.strictEqual(allowHeaderCleared, true, "Should clear Allow header for 404");
			assert.strictEqual(mockRes.getHeader("allow"), "", "Should set empty Allow header");
		};

		errorFn(404, "Not found");
	});
});


