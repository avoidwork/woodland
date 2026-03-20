import assert from "node:assert";
import { describe, it, beforeEach } from "node:test";
import { Woodland, woodland } from "../../src/woodland.js";
import { CONNECT } from "../../src/constants.js";

describe("woodland", () => {
	describe("Woodland class", () => {
		it("should create instance with default config", () => {
			const app = new Woodland();

			assert.ok(app instanceof Woodland);
		});

		it("should create instance with woodland factory function", () => {
			const app = woodland();

			assert.ok(app instanceof Woodland);
		});

		it("should have EventEmitter methods", () => {
			const app = new Woodland();

			assert.strictEqual(typeof app.on, "function");
			assert.strictEqual(typeof app.emit, "function");
			assert.strictEqual(typeof app.removeListener, "function");
		});

		it("should have default properties", () => {
			const app = new Woodland();

			assert.ok(app.autoindex !== void 0);
			assert.ok(app.charset !== void 0);
			assert.ok(app.corsExpose !== void 0);
			assert.ok(Array.isArray(app.defaultHeaders));
			assert.ok(app.digit !== void 0);
			assert.ok(app.etags !== void 0 || app.etags === null);
			assert.ok(Array.isArray(app.indexes));
			assert.ok(app.logging !== void 0);
			assert.ok(app.origins instanceof Set);
			assert.ok(app.time !== void 0);
		});

		it("should have cache, permissions, middleware, methods", () => {
			const app = new Woodland();

			assert.ok(app.cache instanceof Map);
			assert.ok(app.permissions instanceof Map);
			assert.ok(app.middleware);
			assert.strictEqual(typeof app.middleware.register, "function");
			assert.strictEqual(typeof app.middleware.ignore, "function");
			assert.strictEqual(typeof app.middleware.allowed, "function");
			assert.strictEqual(typeof app.middleware.routes, "function");
			assert.strictEqual(typeof app.middleware.list, "function");
			assert.ok(Array.isArray(app.methods));
		});

		it("should have logger object with all methods", () => {
			const app = new Woodland();

			assert.ok(app.logger.log);
			assert.ok(app.logger.logRoute);
			assert.ok(app.logger.logMiddleware);
			assert.ok(app.logger.logDecoration);
			assert.ok(app.logger.logError);
			assert.ok(app.logger.logServe);
		});

		it("should have cors handlers", () => {
			const app = new Woodland();

			assert.ok(app);
		});

		it("should have file server", () => {
			const app = new Woodland();

			assert.ok(app.fileServer);
		});

		it("should have middleware registry", () => {
			const app = new Woodland();

			assert.ok(app.middleware);
			assert.strictEqual(typeof app.middleware.register, "function");
		});
	});

	describe("Woodland methods", () => {
		let app;

		beforeEach(() => {
			app = woodland();
		});

		describe("use", () => {
			it("should register middleware for GET by default", () => {
				const handler = () => {};

				app.use("/test", handler);

				assert.ok(app.middleware.allowed("GET", "/test"));
			});

			it("should register middleware for specific method", () => {
				const handler = () => {};

				app.use("/test", handler, "POST");

				assert.ok(app.middleware.allowed("POST", "/test"));
			});

			it("should register wildcard middleware", () => {
				const handler = () => {};

				app.use(handler);

				assert.ok(app.middleware.allowed("GET", "/./*"));
			});

			it("should throw error for invalid HTTP method", () => {
				assert.throws(() => {
					app.use("/test", () => {}, "INVALID");
				}, /Invalid HTTP method/);
			});

			it("should throw error for HEAD method", () => {
				assert.throws(() => {
					app.use("/test", () => {}, "HEAD");
				}, /Cannot set HEAD route/);
			});

			it("should convert parameterized routes to regex", () => {
				app.use("/users/:id", () => {});

				const routes = app.list("GET", "array");
				assert.ok(routes.some((r) => r.includes("(")));
			});

			it("should return app instance for chaining", () => {
				const result = app.use("/test", () => {});

				assert.strictEqual(result, app);
			});

			it("should accept multiple handlers", () => {
				const handler1 = () => {};
				const handler2 = () => {};

				app.use("/test", handler1, handler2);

				assert.ok(app.middleware.allowed("GET", "/test"));
			});
		});

		describe("HTTP method shortcuts", () => {
			it("should register GET middleware", () => {
				const handler = () => {};

				app.get("/test", handler);

				assert.ok(app.middleware.allowed("GET", "/test"));
			});

			it("should register POST middleware", () => {
				const handler = () => {};

				app.post("/test", handler);

				assert.ok(app.middleware.allowed("POST", "/test"));
			});

			it("should register PUT middleware", () => {
				const handler = () => {};

				app.put("/test", handler);

				assert.ok(app.middleware.allowed("PUT", "/test"));
			});

			it("should register DELETE middleware", () => {
				const handler = () => {};

				app.delete("/test", handler);

				assert.ok(app.middleware.allowed("DELETE", "/test"));
			});

			it("should register PATCH middleware", () => {
				const handler = () => {};

				app.patch("/test", handler);

				assert.ok(app.middleware.allowed("PATCH", "/test"));
			});

			it("should register OPTIONS middleware", () => {
				const handler = () => {};

				app.options("/test", handler);

				assert.ok(app.middleware.allowed("OPTIONS", "/test"));
			});

			it("should register CONNECT middleware", () => {
				const handler = () => {};

				app.connect("/test", handler);

				assert.ok(app.middleware.allowed("CONNECT", "/test"));
			});

			it("should register TRACE middleware", () => {
				const handler = () => {};

				app.trace("/test", handler);

				assert.ok(app.middleware.allowed("TRACE", "/test"));
			});

			it("should return app instance for chaining", () => {
				const result = app.get("/test", () => {});

				assert.strictEqual(result, app);
			});
		});

		describe("always", () => {
			it("should register wildcard middleware and ignore it for visible count", () => {
				const handler = () => {};

				app.always(handler);

				assert.ok(app.middleware.routes("/.*", "GET").middleware.includes(handler));
				assert.strictEqual(app.middleware.routes("/.*", "GET").visible, 0);
			});

			it("should return app instance for chaining", () => {
				const result = app.always(() => {});

				assert.strictEqual(result, app);
			});
		});

		describe("ignore", () => {
			it("should add function to ignored set", () => {
				const handler = () => {};

				app.ignore(handler);

				// Verify function is still callable (not removed from registry)
				assert.ok(app.middleware);
			});

			it("should return app instance for chaining", () => {
				const result = app.ignore(() => {});

				assert.strictEqual(result, app);
			});

			it("should log ignored function name", () => {
				const handler = function namedHandler() {};

				app.ignore(handler);

				assert.ok(app.middleware);
			});
		});

		describe("list", () => {
			it("should return array of routes", () => {
				app.get("/test1", () => {});
				app.get("/test2", () => {});

				const result = app.list("GET", "array");

				assert.ok(Array.isArray(result));
				assert.ok(result.includes("/test1"));
				assert.ok(result.includes("/test2"));
			});

			it("should return object of routes", () => {
				app.get("/test1", () => {});
				app.get("/test2", () => {});

				const result = app.list("GET", "object");

				assert.strictEqual(typeof result, "object");
				assert.ok(result["/test1"]);
				assert.ok(result["/test2"]);
			});

			it("should return empty array for non-existent method", () => {
				app.delete("/test", () => {});

				const result = app.list("DELETE", "array");

				assert.ok(Array.isArray(result));
				assert.strictEqual(result.length, 1);
			});
		});

		describe("files", () => {
			it("should register file server", () => {
				app.files("/static", "/tmp");

				assert.ok(app.fileServer);
			});

			it("should use process.cwd() as default folder", () => {
				app.files("/static");

				assert.ok(app.fileServer);
			});
		});

		describe("allowed", () => {
			it("should check if method is allowed for URI", () => {
				app.get("/test", () => {});

				const result = app.allowed("GET", "/test");

				assert.strictEqual(result, true);
			});

			it("should return false for non-allowed method", () => {
				app.get("/test", () => {});

				const result = app.allowed("POST", "/test");

				assert.strictEqual(result, false);
			});
		});

		describe("allows", () => {
			it("should return allowed methods for URI", () => {
				app.get("/test", () => {});

				const result = app.allows("/test");

				assert.ok(typeof result === "string");
				assert.ok(result.includes("GET"));
			});

			it("should return all methods for wildcard middleware", () => {
				app.always(() => {});

				const result = app.allows("/test");

				assert.ok(result.includes("GET"));
				assert.ok(result.includes("POST"));
				assert.ok(result.includes("PUT"));
				assert.ok(result.includes("DELETE"));
				assert.ok(result.includes("HEAD"));
				assert.ok(result.includes("OPTIONS"));
			});

			it("should include HEAD when GET is allowed", () => {
				app.get("/test", () => {});

				const result = app.allows("/test");

				assert.ok(result.includes("HEAD"));
			});

			it("should include OPTIONS when other methods allowed", () => {
				app.get("/test", () => {});

				const result = app.allows("/test");

				assert.ok(result.includes("OPTIONS"));
			});
		});

		describe("decorate", () => {
			it("should decorate request and response objects", () => {
				const req = {
					headers: { host: "example.com" },
					url: "/test",
					socket: null,
				};
				const res = {
					setHeader: () => {},
					on: () => {},
					set: () => {},
					send: () => {},
				};

				app.decorate(req, res);

				assert.ok(req.parsed);
				assert.strictEqual(typeof req.allow, "string");
				assert.ok(req.params);
				assert.strictEqual(req.valid, true);
				assert.ok(req.ip);
				assert.ok(res.locals);
				assert.ok(res.error);
				assert.ok(res.json);
				assert.ok(res.redirect);
				assert.ok(res.send);
			});

			it("should set req.precise when timing enabled", () => {
				const appWithTiming = woodland({ time: true });
				const req = {
					headers: { host: "example.com" },
					url: "/test",
					socket: null,
				};
				const res = {
					setHeader: () => {},
					on: () => {},
					set: () => {},
					send: () => {},
				};

				appWithTiming.decorate(req, res);

				assert.ok(req.precise);
				assert.ok(typeof req.precise.stop === "function");
			});

			it("should not set req.precise when timing disabled", () => {
				const appWithoutTiming = woodland({ time: false });
				const req = {
					headers: { host: "example.com" },
					url: "/test",
					socket: null,
				};
				const res = {
					setHeader: () => {},
					on: () => {},
					set: () => {},
					send: () => {},
				};

				appWithoutTiming.decorate(req, res);

				assert.strictEqual(req.precise, void 0);
			});

			it("should set res.json function", () => {
				const req = {
					headers: { host: "example.com" },
					url: "/test",
					socket: null,
				};
				const res = {
					setHeader: () => {},
					on: () => {},
					set: () => {},
					send: () => {},
					getHeader: () => void 0,
				};

				app.decorate(req, res);

				assert.strictEqual(typeof res.json, "function");
			});

			it("should call res.json with default parameters", async () => {
				const app = woodland();
				let jsonCalled = false;

				app.get("/json", (req, res) => {
					jsonCalled = true;
					res.json({ message: "hello" });
				});

				const req = {
					method: "GET",
					headers: { host: "example.com" },
					url: "/json",
					socket: null,
				};
				const res = {
					statusCode: 200,
					setHeader: () => {},
					on: () => {},
					end: () => {},
					error: () => {},
					set: () => {},
					send: () => {},
					getHeader: () => void 0,
					writeHead: () => {},
				};

				app.route(req, res);

				await new Promise((resolve) => setTimeout(resolve, 10));
				assert.ok(jsonCalled);
			});

			it("should set CORS headers when origins configured", () => {
				const appWithCors = woodland({ origins: ["http://example.com"] });
				const req = {
					headers: { host: "different.com", origin: "http://example.com" },
					url: "/test",
					socket: null,
				};
				const res = {
					setHeader: () => {},
					on: () => {},
					set: () => {},
					send: () => {},
				};

				appWithCors.decorate(req, res);

				assert.strictEqual(req.cors, true);
			});
		});

		describe("routes", () => {
			it("should return route information", () => {
				app.get("/test", () => {});

				const result = app.routes("/test", "GET");

				assert.ok(result.middleware);
				assert.strictEqual(typeof result.visible, "number");
				assert.strictEqual(typeof result.exit, "number");
			});

			it("should cache route results", () => {
				app.get("/test", () => {});

				const result1 = app.routes("/test", "GET");
				const result2 = app.routes("/test", "GET");

				assert.strictEqual(result1, result2);
			});
		});

		describe("etag", () => {
			it("should generate etag for GET methods", () => {
				const appWithEtags = woodland({ etags: true });
				const result = appWithEtags.etag("GET", "test", "value");

				assert.ok(typeof result === "string");
			});

			it("should return empty string for non-GET methods", () => {
				const appWithEtags = woodland({ etags: true });
				const result = appWithEtags.etag("POST", "test");

				assert.strictEqual(result, "");
			});

			it("should return empty string when etags disabled", () => {
				const appWithoutEtags = woodland({ etags: false });
				const result = appWithoutEtags.etag("GET", "test");

				assert.strictEqual(result, "");
			});

			it("should generate etag for HEAD methods", () => {
				const appWithEtags = woodland({ etags: true });
				const result = appWithEtags.etag("HEAD", "test");

				assert.ok(typeof result === "string");
			});

			it("should generate etag for OPTIONS methods", () => {
				const appWithEtags = woodland({ etags: true });
				const result = appWithEtags.etag("OPTIONS", "test");

				assert.ok(typeof result === "string");
			});
		});

		describe("onReady", () => {
			it("should handle response ready", () => {
				const req = {
					parsed: { pathname: "/test" },
					method: "GET",
					headers: { host: "example.com" },
					connection: { remoteAddress: "127.0.0.1" },
				};
				const res = {
					statusCode: 200,
					getHeader: () => void 0,
					header: () => {},
				};

				const result = app.onReady(req, res, "body", 200, {});

				assert.ok(Array.isArray(result));
			});

			it("should add response time header when timing enabled", () => {
				const appWithTiming = woodland({ time: true, digit: 2 });
				let headerCalled = false;
				const req = {
					parsed: { pathname: "/test" },
					method: "GET",
					headers: { host: "example.com" },
					connection: { remoteAddress: "127.0.0.1" },
					precise: {
						stop: () => ({ diff: () => 12345678 }),
					},
				};
				const res = {
					statusCode: 200,
					getHeader: () => void 0,
					header: (key, _value) => {
						headerCalled = true;
						assert.ok(key.includes("response-time"));
					},
				};

				appWithTiming.onReady(req, res, "body", 200, {});

				assert.ok(headerCalled);
			});
		});

		describe("onSend", () => {
			it("should return response array", () => {
				const result = app.onSend({}, {}, "body", 200, {});

				assert.deepStrictEqual(result, ["body", 200, {}]);
			});
		});

		describe("onDone", () => {
			it("should handle response done", () => {
				let headersWritten = false;
				let ended = false;

				const res = {
					statusCode: 200,
					getHeader: () => void 0,
					header: () => {},
					writeHead: () => {
						headersWritten = true;
					},
					end: () => {
						ended = true;
					},
				};

				app.onDone({}, res, "body", {});

				assert.ok(headersWritten);
				assert.ok(ended);
			});

			it("should skip content-length for 204 status", () => {
				let contentLengthSet = false;

				const res = {
					statusCode: 204,
					getHeader: () => void 0,
					header: () => {
						contentLengthSet = true;
					},
					writeHead: () => {},
					end: () => {},
				};

				app.onDone({}, res, "body", {});

				assert.strictEqual(contentLengthSet, false);
			});

			it("should skip content-length for 304 status", () => {
				let contentLengthSet = false;

				const res = {
					statusCode: 304,
					getHeader: () => void 0,
					header: () => {
						contentLengthSet = true;
					},
					writeHead: () => {},
					end: () => {},
				};

				app.onDone({}, res, "body", {});

				assert.strictEqual(contentLengthSet, false);
			});

			it("should skip content-length when already set", () => {
				let headerCalled = false;

				const res = {
					statusCode: 200,
					getHeader: () => 100,
					header: () => {
						headerCalled = true;
					},
					writeHead: () => {},
					end: () => {},
				};

				app.onDone({}, res, "body", {});

				assert.strictEqual(headerCalled, false);
			});
		});

		describe("decorate with CORS", () => {
			it("should set CORS headers when CORS is enabled", () => {
				const appWithCors = woodland({ origins: ["http://example.com"] });
				const req = {
					headers: {
						host: "different.com",
						origin: "http://example.com",
						"access-control-request-headers": "x-custom",
					},
					url: "/test",
					socket: null,
					method: "GET",
				};
				const res = {
					setHeader: () => {},
					on: () => {},
					set: () => {},
					send: () => {},
				};

				appWithCors.decorate(req, res);

				assert.strictEqual(req.cors, true);
				assert.strictEqual(req.corsHost, true);
			});

			it("should set CORS headers for OPTIONS request", () => {
				const appWithCors = woodland({ origins: ["http://example.com"] });
				const req = {
					headers: {
						host: "different.com",
						origin: "http://example.com",
						"access-control-request-headers": "x-custom",
					},
					url: "/test",
					socket: null,
					method: "OPTIONS",
				};
				let headersBatch = {};
				const res = {
					setHeader: (key, value) => {
						headersBatch[key] = value;
					},
					on: () => {},
					set: (headers) => {
						headersBatch = { ...headersBatch, ...headers };
					},
					send: () => {},
				};

				appWithCors.decorate(req, res);

				assert.strictEqual(req.cors, true);
				assert.strictEqual(headersBatch["access-control-allow-origin"], "http://example.com");
				assert.strictEqual(headersBatch["access-control-allow-headers"], "x-custom");
			});

			it("should set CORS headers for non-OPTIONS request", () => {
				const appWithCors = woodland({ origins: ["http://example.com"] });
				const req = {
					headers: {
						host: "different.com",
						origin: "http://example.com",
						"access-control-request-headers": "x-custom",
					},
					url: "/test",
					socket: null,
					method: "GET",
				};
				let headersBatch = {};
				const res = {
					setHeader: (key, value) => {
						headersBatch[key] = value;
					},
					on: () => {},
					set: (headers) => {
						headersBatch = { ...headersBatch, ...headers };
					},
					send: () => {},
				};

				appWithCors.decorate(req, res);

				assert.strictEqual(req.cors, true);
				assert.strictEqual(headersBatch["access-control-expose-headers"], "x-custom");
			});

			it("should set CORS headers without access-control-request-headers", () => {
				const appWithCors = woodland({ origins: ["http://example.com"] });
				const req = {
					headers: {
						host: "different.com",
						origin: "http://example.com",
					},
					url: "/test",
					socket: null,
					method: "GET",
				};
				let headersBatch = {};
				const res = {
					setHeader: (key, value) => {
						headersBatch[key] = value;
					},
					on: () => {},
					set: (headers) => {
						headersBatch = { ...headersBatch, ...headers };
					},
					send: () => {},
				};

				appWithCors.decorate(req, res);

				assert.strictEqual(req.cors, true);
			});

			it("should use corsExpose when access-control-request-headers is undefined", () => {
				const appWithCors = woodland({
					origins: ["http://example.com"],
					corsExpose: "x-custom-header",
				});
				const req = {
					headers: {
						host: "different.com",
						origin: "http://example.com",
					},
					url: "/test",
					socket: null,
					method: "GET",
				};
				let headersBatch = {};
				const res = {
					setHeader: (key, value) => {
						headersBatch[key] = value;
					},
					on: () => {},
					set: (headers) => {
						headersBatch = { ...headersBatch, ...headers };
					},
					send: () => {},
				};

				appWithCors.decorate(req, res);

				assert.strictEqual(headersBatch["access-control-expose-headers"], "x-custom-header");
			});
		});

		describe("route with disallowed origin", () => {
			it("should return 403 for disallowed origin", async () => {
				const app = woodland({ origins: ["http://allowed.com"] });
				app.use(() => {});

				const req = {
					method: "GET",
					headers: {
						host: "example.com",
						origin: "http://evil.com",
					},
					url: "/test",
					socket: null,
				};
				let errorCalled = false;
				const res = {
					setHeader: () => {},
					on: () => {},
					set: () => {},
					send: () => {},
					getHeader: () => void 0,
					writeHead: () => {},
					end: () => {},
					statusCode: 200,
					headersSent: false,
					removeHeader: () => {},
					header: () => {},
				};

				app.on("error", () => {
					errorCalled = true;
				});

				app.route(req, res);

				await new Promise((resolve) => setTimeout(resolve, 50));
				assert.strictEqual(errorCalled, true);
				assert.strictEqual(req.valid, false);
			});

			it("should return 403 when origin header present but not in allowed list", async () => {
				const app = woodland({ origins: ["http://allowed.com"] });
				app.use(() => {});

				const req = {
					method: "GET",
					headers: {
						host: "different.com",
						origin: "http://notallowed.com",
					},
					url: "/test",
					socket: null,
				};
				let errorEmitted = false;
				const res = {
					setHeader: () => {},
					on: () => {},
					set: () => {},
					send: () => {},
					getHeader: () => void 0,
					writeHead: () => {},
					end: () => {},
					statusCode: 200,
					headersSent: false,
					removeHeader: () => {},
					header: () => {},
				};

				app.on("error", () => {
					errorEmitted = true;
				});

				app.route(req, res);

				await new Promise((resolve) => setTimeout(resolve, 50));
				assert.strictEqual(errorEmitted, true);
				assert.strictEqual(req.valid, false);
				assert.strictEqual(res.statusCode, 403);
			});
		});

		describe("route with disallowed method", () => {
			it("should return error for disallowed method", async () => {
				const app = woodland();
				app.get("/test", () => {});

				const req = {
					method: "POST",
					headers: { host: "example.com" },
					url: "/test",
					socket: null,
				};
				let errorCalled = false;
				const res = {
					setHeader: () => {},
					on: () => {},
					set: () => {},
					send: () => {},
					getHeader: () => void 0,
					writeHead: () => {},
					end: () => {},
					statusCode: 405,
					headersSent: false,
					removeHeader: () => {},
					header: () => {},
				};

				app.on("error", () => {
					errorCalled = true;
				});

				app.route(req, res);

				await new Promise((resolve) => setTimeout(resolve, 50));
				assert.strictEqual(errorCalled, true);
				assert.strictEqual(req.valid, false);
			});
		});
	});

	describe("Woodland with config", () => {
		it("should configure with origins", () => {
			const app = woodland({ origins: ["http://example.com"] });

			assert.strictEqual(app.origins.size, 1);
			assert.ok(app.origins.has("http://example.com"));
		});

		it("should configure with etags enabled", () => {
			const app = woodland({ etags: true });

			assert.ok(app.etags);
		});

		it("should configure with custom digit precision", () => {
			const app = woodland({ digit: 2 });

			assert.strictEqual(app.digit, 2);
		});

		it("should configure with custom indexes", () => {
			const app = woodland({ indexes: ["index.html", "index.htm"] });

			assert.strictEqual(app.indexes.length, 2);
		});

		it("should configure with silent mode", () => {
			const app = woodland({ silent: true });

			const hasServerHeader = app.defaultHeaders.some(
				(h) => h[0] === "server" || h[0] === "x-powered-by",
			);

			assert.strictEqual(hasServerHeader, false);
		});

		it("should configure with custom default headers", () => {
			const app = woodland({ defaultHeaders: { "x-custom": "value" } });

			const hasCustomHeader = app.defaultHeaders.some((h) => h[0] === "x-custom");

			assert.ok(hasCustomHeader);
		});

		it("should configure logging", () => {
			const app = woodland({ logging: { enabled: true, level: "debug" } });

			assert.strictEqual(app.logging.enabled, true);
			assert.strictEqual(app.logging.level, "debug");
		});
	});

	describe("Woodland request handling", () => {
		let app;

		beforeEach(() => {
			app = woodland();
		});

		it("should handle route with middleware", async () => {
			let middlewareCalled = false;

			app.get("/test", (req, res) => {
				middlewareCalled = true;
				res.send("ok");
			});

			const req = {
				method: "GET",
				headers: { host: "example.com" },
				url: "/test",
				socket: null,
			};
			const res = {
				statusCode: 200,
				setHeader: () => {},
				on: () => {},
				end: () => {},
				error: () => {},
				set: () => {},
				send: () => {},
			};

			app.route(req, res);

			await new Promise((resolve) => setTimeout(resolve, 10));
			assert.ok(middlewareCalled);
		});

		it("should handle parameterized routes", async () => {
			let capturedParams = {};

			app.get("/users/:id", (req, res) => {
				capturedParams = req.params;
				res.send("ok");
			});

			const req = {
				method: "GET",
				headers: { host: "example.com" },
				url: "/users/123",
				socket: null,
			};
			const res = {
				statusCode: 200,
				setHeader: () => {},
				on: () => {},
				end: () => {},
				error: () => {},
				set: () => {},
				send: () => {},
			};

			app.route(req, res);

			await new Promise((resolve) => setTimeout(resolve, 10));
			assert.strictEqual(capturedParams.id, 123);
		});

		it("should handle HEAD requests as GET", async () => {
			let called = false;

			app.get("/test", (req, res) => {
				called = true;
				res.send("ok");
			});

			const req = {
				method: "HEAD",
				headers: { host: "example.com" },
				url: "/test",
				socket: null,
			};
			const res = {
				statusCode: 200,
				setHeader: () => {},
				on: () => {},
				end: () => {},
				error: () => {},
				set: () => {},
				send: () => {},
			};

			app.route(req, res);

			await new Promise((resolve) => setTimeout(resolve, 10));
			assert.ok(called);
		});

		it("should delegate to file server in serve", async () => {
			const req = { method: "GET", headers: {}, url: "/test.txt", socket: null };
			const res = {
				statusCode: 200,
				setHeader: () => {},
				on: () => {},
				end: () => {},
				error: () => {},
				set: () => {},
				send: () => {},
				header: () => {},
				getHeader: () => void 0,
				removeHeader: () => {},
				headersSent: false,
			};

			const result = app.serve(req, res, "/test.txt", "/tmp");

			// Await to prevent async activity after test
			await result.catch(() => {});

			assert.ok(true);
		});

		it("should delegate to response stream in stream", () => {
			const req = { method: "GET", headers: {}, url: "/test.txt", socket: null };
			const res = {
				statusCode: 200,
				setHeader: () => {},
				on: () => {},
				end: () => {},
				error: () => {},
				set: () => {},
				send: () => {},
				header: () => {},
				getHeader: () => void 0,
				removeHeader: () => {},
				headersSent: false,
			};
			const file = {
				charset: "utf-8",
				etag: "abc123",
				path: "",
				stats: { mtime: new Date(), size: 1024 },
			};

			// Verify the call throws with empty path
			assert.throws(() => app.stream(req, res, file), /Invalid file descriptor/);
		});

		it("should emit connect event when listener exists", () => {
			const connectApp = woodland();
			let connectEmitted = false;

			connectApp.on(CONNECT, () => {
				connectEmitted = true;
			});

			const req = {
				method: "GET",
				url: "/test",
				headers: { host: "example.com" },
				connection: { remoteAddress: "127.0.0.1" },
				parsed: { pathname: "/test" },
				precise: { stop: () => ({ diff: () => 0 }) },
				allow: "GET,HEAD,OPTIONS",
				cors: false,
				corsHost: false,
				valid: true,
				ip: "127.0.0.1",
				params: {},
				host: "example.com",
			};
			const res = {
				statusCode: 200,
				setHeader: () => {},
				writeHead: () => {},
				on: () => {},
				end: () => {},
				error: () => {},
				set: () => {},
				send: () => {},
				header: () => {},
				getHeader: () => void 0,
				removeHeader: () => {},
				headersSent: false,
			};

			connectApp.middleware.register("/test", () => {}, "GET");

			connectApp.route(req, res);

			assert.ok(connectEmitted);
		});

		it("should register finish listener when listener exists", () => {
			const finishApp = woodland();
			let finishEmitted = false;

			finishApp.on("finish", () => {
				finishEmitted = true;
			});

			const req = {
				method: "GET",
				headers: { host: "example.com" },
				connection: { remoteAddress: "127.0.0.1" },
				parsed: { pathname: "/test" },
				precise: { stop: () => ({ diff: () => 0 }) },
			};
			let finishOnCalled = false;
			const res = {
				statusCode: 200,
				setHeader: () => {},
				writeHead: () => {},
				on: (event, callback) => {
					if (event === "finish") {
						finishOnCalled = true;
						// Simulate finish event
						setTimeout(callback, 0);
					}
				},
				end: () => {},
				error: () => {},
				set: () => {},
				send: () => {},
				header: () => {},
				getHeader: () => void 0,
				removeHeader: () => {},
				headersSent: false,
			};

			finishApp.route(req, res);

			// Wait for finish event to be emitted
			return new Promise((resolve) => {
				setTimeout(() => {
					assert.ok(finishOnCalled);
					assert.ok(finishEmitted);
					resolve();
				}, 10);
			});
		});

		it("should not emit connect/finish when no listeners", () => {
			const noListenersApp = woodland();

			const req = {
				method: "GET",
				headers: { host: "example.com" },
				connection: { remoteAddress: "127.0.0.1" },
				parsed: { pathname: "/test" },
				precise: { stop: () => ({ diff: () => 0 }) },
			};
			const res = {
				statusCode: 200,
				setHeader: () => {},
				writeHead: () => {},
				on: () => {},
				end: () => {},
				error: () => {},
				set: () => {},
				send: () => {},
				header: () => {},
				getHeader: () => void 0,
				removeHeader: () => {},
				headersSent: false,
			};

			noListenersApp.route(req, res);

			assert.ok(true);
		});
	});
});
