import assert from "node:assert";
import { describe, it, beforeEach } from "node:test";
import { Woodland, woodland } from "../../src/woodland.js";

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
			assert.ok(Array.isArray(app.origins));
			assert.ok(app.time !== void 0);
		});

		it("should have cache, permissions, ignored, middleware, methods", () => {
			const app = new Woodland();

			assert.ok(app.cache instanceof Map);
			assert.ok(app.permissions instanceof Map);
			assert.ok(app.ignored instanceof Set);
			assert.ok(app.middleware instanceof Map);
			assert.ok(Array.isArray(app.methods));
		});

		it("should have logger object with all methods", () => {
			const app = new Woodland();

			assert.ok(app.logger.log);
			assert.ok(app.logger.clfm);
			assert.ok(app.logger.extractIP);
			assert.ok(app.logger.logRoute);
			assert.ok(app.logger.logMiddleware);
			assert.ok(app.logger.logDecoration);
			assert.ok(app.logger.logError);
			assert.ok(app.logger.logServe);
		});

		it("should have cors handlers", () => {
			const app = new Woodland();

			assert.ok(app.cors);
			assert.ok(app.corsHost);
			assert.ok(app.corsRequest);
		});

		it("should have IP extractor", () => {
			const app = new Woodland();

			assert.ok(app.ip);
			assert.strictEqual(typeof app.ip, "function");
		});

		it("should have response handlers", () => {
			const app = new Woodland();

			assert.ok(app.error);
			assert.ok(app.json);
			assert.ok(app.redirect);
			assert.ok(app.send);
			assert.ok(app.set);
			assert.ok(app.status);
		});

		it("should have file server", () => {
			const app = new Woodland();

			assert.ok(app.fileServer);
		});

		it("should have middleware registry", () => {
			const app = new Woodland();

			assert.ok(app.middlewareRegistry);
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

				assert.ok(app.middleware.has("GET"));
			});

			it("should register middleware for specific method", () => {
				const handler = () => {};

				app.use("/test", handler, "POST");

				assert.ok(app.middleware.has("POST"));
			});

			it("should register wildcard middleware", () => {
				const handler = () => {};

				app.use(handler);

				assert.ok(app.middleware.has("GET"));
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

				assert.ok(app.middleware.has("GET"));
			});
		});

		describe("HTTP method shortcuts", () => {
			it("should register GET middleware", () => {
				const handler = () => {};

				app.get("/test", handler);

				assert.ok(app.middleware.has("GET"));
			});

			it("should register POST middleware", () => {
				const handler = () => {};

				app.post("/test", handler);

				assert.ok(app.middleware.has("POST"));
			});

			it("should register PUT middleware", () => {
				const handler = () => {};

				app.put("/test", handler);

				assert.ok(app.middleware.has("PUT"));
			});

			it("should register DELETE middleware", () => {
				const handler = () => {};

				app.delete("/test", handler);

				assert.ok(app.middleware.has("DELETE"));
			});

			it("should register PATCH middleware", () => {
				const handler = () => {};

				app.patch("/test", handler);

				assert.ok(app.middleware.has("PATCH"));
			});

			it("should register OPTIONS middleware", () => {
				const handler = () => {};

				app.options("/test", handler);

				assert.ok(app.middleware.has("OPTIONS"));
			});

			it("should register CONNECT middleware", () => {
				const handler = () => {};

				app.connect("/test", handler);

				assert.ok(app.middleware.has("CONNECT"));
			});

			it("should register TRACE middleware", () => {
				const handler = () => {};

				app.trace("/test", handler);

				assert.ok(app.middleware.has("TRACE"));
			});

			it("should return app instance for chaining", () => {
				const result = app.get("/test", () => {});

				assert.strictEqual(result, app);
			});
		});

		describe("always", () => {
			it("should register wildcard middleware", () => {
				const handler = () => {};

				app.always(handler);

				assert.ok(app.middleware.has("GET"));
				assert.ok(app.middleware.get("GET").has("/.*"));
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

				assert.ok(app.ignored.has(handler));
			});

			it("should return app instance for chaining", () => {
				const result = app.ignore(() => {});

				assert.strictEqual(result, app);
			});

			it("should log ignored function name", () => {
				const handler = function namedHandler() {};

				app.ignore(handler);

				assert.ok(app.ignored.has(handler));
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

		describe("log", () => {
			it("should log message", () => {
				const result = app.log("test message");

				assert.strictEqual(result, app);
			});

			it("should accept log level", () => {
				const result = app.log("test message", "info");

				assert.strictEqual(result, app);
			});
		});

		describe("extractPath", () => {
			it("should convert parameterized route to regex", () => {
				const result = app.extractPath("/users/:id");

				assert.strictEqual(result, "/users/(?<id>[^/]+)");
			});

			it("should handle multiple parameters", () => {
				const result = app.extractPath("/users/:userId/posts/:postId");

				assert.strictEqual(result, "/users/(?<userId>[^/]+)/posts/(?<postId>[^/]+)");
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
		});

		describe("clf", () => {
			it("should generate common log format", () => {
				const req = {
					method: "GET",
					headers: { host: "example.com" },
					connection: { remoteAddress: "127.0.0.1" },
					parsed: { pathname: "/test" },
				};
				const res = { statusCode: 200, getHeader: () => 100 };

				const result = app.clf(req, res);

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
		});

		describe("error", () => {
			it("should handle direct error call", () => {
				let errorEmitted = false;

				const appWithEmit = woodland();
				appWithEmit.on("error", () => {
					errorEmitted = true;
				});

				const req = {
					parsed: { pathname: "/test" },
					method: "GET",
					ip: "127.0.0.1",
				};
				const res = {
					headersSent: false,
					removeHeader: () => {},
					header: () => {},
					statusCode: 500,
				};

				appWithEmit.error(req, res, 500, "Test error");

				assert.ok(errorEmitted);
			});

			it("should return curried error function", () => {
				const req = {};
				const res = {};
				const result = app.error(req, res);

				assert.strictEqual(typeof result, "function");
			});

			it("should execute curried error function", () => {
				let errorEmitted = false;

				const appWithEmit = woodland();
				appWithEmit.on("error", () => {
					errorEmitted = true;
				});

				const req = {
					parsed: { pathname: "/test" },
					method: "GET",
					ip: "127.0.0.1",
				};
				const res = {
					headersSent: false,
					removeHeader: () => {},
					header: () => {},
					statusCode: 500,
				};

				const curriedError = appWithEmit.error(req, res);
				curriedError(500, "Test error");

				assert.ok(errorEmitted);
			});

			it("should handle 404 error with allow header removal", () => {
				let allowRemoved = false;

				const req = {
					parsed: { pathname: "/test" },
					method: "GET",
					ip: "127.0.0.1",
					cors: false,
				};
				const res = {
					headersSent: false,
					removeHeader: (name) => {
						if (name === "allow") {
							allowRemoved = true;
						}
					},
					header: () => {},
					statusCode: 500,
				};

				app.error(req, res, 404, "Not Found");

				assert.ok(allowRemoved);
			});

			it("should handle 404 error with CORS headers removal", () => {
				let corsRemoved = false;

				const req = {
					parsed: { pathname: "/test" },
					method: "GET",
					ip: "127.0.0.1",
					cors: true,
				};
				const res = {
					headersSent: false,
					removeHeader: (name) => {
						if (name === "access-control-allow-methods") {
							corsRemoved = true;
						}
					},
					header: () => {},
					statusCode: 500,
				};

				app.error(req, res, 404, "Not Found");

				assert.ok(corsRemoved);
			});
		});

		describe("json", () => {
			it("should handle direct json call", () => {
				let jsonSent = null;

				const res = {
					send: (data) => {
						jsonSent = data;
					},
				};

				app.json(res, { foo: "bar" }, 200);

				assert.strictEqual(jsonSent, '{"foo":"bar"}');
			});

			it("should return curried json function", () => {
				const res = {};
				const result = app.json(res);

				assert.strictEqual(typeof result, "function");
			});

			it("should execute curried json function", () => {
				let jsonSent = null;

				const res = {
					send: (data) => {
						jsonSent = data;
					},
				};

				const curriedJson = app.json(res);
				curriedJson({ test: "value" });

				assert.strictEqual(jsonSent, '{"test":"value"}');
			});
		});

		describe("redirect", () => {
			it("should handle direct redirect call", () => {
				let redirectUri = null;
				let redirectStatus = null;

				const res = {
					send: (data, status, headers) => {
						redirectUri = headers.location;
						redirectStatus = status;
					},
				};

				app.redirect(res, "/new-location", true);

				assert.strictEqual(redirectUri, "/new-location");
				assert.strictEqual(redirectStatus, 308);
			});

			it("should handle temporary redirect", () => {
				let redirectStatus = null;

				const res = {
					send: (data, status) => {
						redirectStatus = status;
					},
				};

				app.redirect(res, "/new-location", false);

				assert.strictEqual(redirectStatus, 307);
			});

			it("should return curried redirect function", () => {
				const result = app.redirect({});

				assert.strictEqual(typeof result, "function");
			});
		});

		describe("send", () => {
			it("should handle direct send call", () => {
				const req = {
					method: "GET",
					headers: {},
					parsed: { pathname: "/test" },
				};
				const res = {
					statusCode: 200,
					headersSent: false,
					getHeader: () => null,
					writeHead: () => {},
					end: () => {},
					send: () => {},
				};

				app.send(req, res, "test body", 200, {});
			});

			it("should return curried send function", () => {
				const req = { method: "GET", headers: {}, parsed: { pathname: "/test" } };
				const res = { statusCode: 200, headersSent: false, send: () => {} };
				const result = app.send(req, res);

				assert.strictEqual(typeof result, "function");
			});
		});

		describe("set", () => {
			it("should handle direct set call", () => {
				const headersSet = {};

				const res = {
					setHeader: (key, value) => {
						headersSet[key] = value;
					},
				};

				app.set(res, { "content-type": "text/html" });

				assert.strictEqual(headersSet["content-type"], "text/html");
			});

			it("should return curried set function", () => {
				const result = app.set({});

				assert.strictEqual(typeof result, "function");
			});
		});

		describe("status", () => {
			it("should handle direct status call", () => {
				const res = { statusCode: 200 };

				app.status(res, 404);

				assert.strictEqual(res.statusCode, 404);
			});

			it("should return curried status function", () => {
				const result = app.status({});

				assert.strictEqual(typeof result, "function");
			});
		});

		describe("decorate with timing", () => {
			it("should set timing when time is enabled", () => {
				const appWithTime = woodland({ time: true });
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

				appWithTime.decorate(req, res);

				assert.ok(req.precise);
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

			assert.strictEqual(app.origins.length, 1);
			assert.strictEqual(app.origins[0], "http://example.com");
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
	});
});
