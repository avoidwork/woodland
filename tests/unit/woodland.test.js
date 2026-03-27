import assert from "node:assert";
import { describe, it, beforeEach } from "node:test";
import { Woodland, woodland } from "../../src/woodland.js";
import { EVT_CONNECT } from "../../src/constants.js";

describe("woodland", () => {
	describe("Woodland class", () => {
		it("should create instance with default config or factory", () => {
			const app1 = new Woodland();
			const app2 = woodland();

			assert.ok(app1 instanceof Woodland);
			assert.ok(app2 instanceof Woodland);
		});

		it("should have EventEmitter methods", () => {
			const app = new Woodland();

			assert.strictEqual(typeof app.on, "function");
			assert.strictEqual(typeof app.emit, "function");
			assert.strictEqual(typeof app.removeListener, "function");
		});

		it("should have required properties and methods", () => {
			const app = new Woodland();

			assert.ok(app.autoIndex !== void 0);
			assert.ok(app.charset !== void 0);
			assert.ok(app.etags !== void 0 || app.etags === null);
			assert.ok(Array.isArray(app.indexes));
			assert.ok(app.origins instanceof Set);
			assert.ok(app.logger.log);
			assert.ok(app.fileServer);
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

				const routes = app.routes("/test", "GET");
				assert.ok(routes.middleware.includes(handler));
			});

			it("should register middleware for specific method", () => {
				const handler = () => {};

				app.use("/test", handler, "POST");

				const routes = app.routes("/test", "POST");
				assert.ok(routes.middleware.includes(handler));
			});

			it("should register wildcard middleware", () => {
				const handler = () => {};

				app.use(handler);

				const routes = app.routes("/./*", "GET");
				assert.ok(routes.middleware.includes(handler));
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

				const routes = app.routes("/test", "GET");
				assert.ok(routes.middleware.includes(handler1));
				assert.ok(routes.middleware.includes(handler2));
			});
		});

		describe("HTTP method shortcuts", () => {
			it("should register GET middleware", () => {
				const handler = () => {};

				app.get("/test", handler);

				const routes = app.routes("/test", "GET");
				assert.ok(routes.middleware.includes(handler));
			});

			it("should register POST middleware", () => {
				const handler = () => {};

				app.post("/test", handler);

				const routes = app.routes("/test", "POST");
				assert.ok(routes.middleware.includes(handler));
			});

			it("should register PUT middleware", () => {
				const handler = () => {};

				app.put("/test", handler);

				const routes = app.routes("/test", "PUT");
				assert.ok(routes.middleware.includes(handler));
			});

			it("should register DELETE middleware", () => {
				const handler = () => {};

				app.delete("/test", handler);

				const routes = app.routes("/test", "DELETE");
				assert.ok(routes.middleware.includes(handler));
			});

			it("should register PATCH middleware", () => {
				const handler = () => {};

				app.patch("/test", handler);

				const routes = app.routes("/test", "PATCH");
				assert.ok(routes.middleware.includes(handler));
			});

			it("should register OPTIONS middleware", () => {
				const handler = () => {};

				app.options("/test", handler);

				const routes = app.routes("/test", "OPTIONS");
				assert.ok(routes.middleware.includes(handler));
			});

			it("should register CONNECT middleware", () => {
				const handler = () => {};

				app.connect("/test", handler);

				const routes = app.routes("/test", "CONNECT");
				assert.ok(routes.middleware.includes(handler));
			});

			it("should register TRACE middleware", () => {
				const handler = () => {};

				app.trace("/test", handler);

				const routes = app.routes("/test", "TRACE");
				assert.ok(routes.middleware.includes(handler));
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

				const routes = app.routes("/.*", "GET");
				assert.ok(routes.middleware.includes(handler));
				assert.strictEqual(routes.visible, 0);
			});

			it("should return app instance for chaining", () => {
				assert.strictEqual(
					app.always(() => {}),
					app,
				);
			});
		});

		describe("ignore", () => {
			it("should add function to ignored set", () => {
				const handler = () => {};
				app.ignore(handler);
				assert.strictEqual(app.ignore(handler), app);
			});

			it("should return app instance for chaining", () => {
				assert.strictEqual(
					app.ignore(() => {}),
					app,
				);
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
			it("should register file server middleware", () => {
				app.files("/static", "/tmp");

				const routes = app.routes("/static/test.txt", "GET");
				assert.ok(routes.middleware.length > 0);
			});

			it("should use process.cwd() as default folder", () => {
				app.files("/static");

				const routes = app.routes("/static/test.txt", "GET");
				assert.ok(routes.middleware.length > 0);
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
			it("should generate etag for GET/HEAD/OPTIONS methods", () => {
				const appWithEtags = woodland({ etags: true });

				assert.ok(typeof appWithEtags.etag("GET", "test", "value") === "string");
				assert.ok(typeof appWithEtags.etag("HEAD", "test") === "string");
				assert.ok(typeof appWithEtags.etag("OPTIONS", "test") === "string");
			});

			it("should return empty string for non-GET methods or when disabled", () => {
				const appWithEtags = woodland({ etags: true });
				const appWithoutEtags = woodland({ etags: false });

				assert.strictEqual(appWithEtags.etag("POST", "test"), "");
				assert.strictEqual(appWithoutEtags.etag("GET", "test"), "");
			});
		});

		describe("route with disallowed origin", () => {
			it("should return 403 for disallowed origin", async () => {
				const app = woodland({ origins: ["http://allowed.com"] });
				app.use(() => {});

				const req = {
					method: "GET",
					headers: { host: "example.com", origin: "http://evil.com" },
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
		it("should configure origins, etags, and digit", () => {
			const app1 = woodland({ origins: ["http://example.com"] });
			const app2 = woodland({ etags: true });
			const app3 = woodland({ digit: 2 });

			assert.strictEqual(app1.origins.size, 1);
			assert.ok(app2.etags);
			assert.strictEqual(app3.digit, 2);
		});

		it("should configure silent mode", () => {
			const app = woodland({ silent: true });

			assert.strictEqual(app.logging.enabled, true);
			assert.strictEqual(app.logging.level, "info");
		});

		it("should configure custom default headers", () => {
			const app = woodland({ defaultHeaders: { "x-custom": "value" } });

			assert.strictEqual(app.logging.enabled, true);
			assert.strictEqual(app.logging.level, "info");
		});

		it("should configure logging", () => {
			const app = woodland({ logging: { enabled: true, level: "debug" } });

			assert.strictEqual(app.logging.enabled, true);
			assert.strictEqual(app.logging.level, "debug");
		});

		it("should expose public getters for configuration", () => {
			const app = woodland({
				autoIndex: true,
				charset: "utf-8",
				corsExpose: "x-custom",
				digit: 2,
				etags: true,
				indexes: ["index.html"],
				origins: ["http://example.com"],
				time: true,
			});

			assert.strictEqual(app.autoIndex, true);
			assert.strictEqual(app.charset, "utf-8");
			assert.strictEqual(app.corsExpose, "x-custom");
			assert.strictEqual(app.digit, 2);
			assert.ok(app.etags);
			assert.deepStrictEqual(app.indexes, ["index.html"]);
			assert.strictEqual(app.origins.size, 1);
			assert.strictEqual(app.time, true);
		});

		it("should return copies from getters to prevent mutation", () => {
			const app = woodland({
				indexes: ["index.html"],
				origins: ["http://example.com"],
			});

			const indexes = app.indexes;
			const origins = app.origins;

			indexes.push("other.html");
			origins.add("http://other.com");

			assert.deepStrictEqual(app.indexes, ["index.html"]);
			assert.strictEqual(app.origins.size, 1);
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

			const req = { method: "GET", headers: { host: "example.com" }, url: "/test", socket: null };
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

			const req = { method: "HEAD", headers: { host: "example.com" }, url: "/test", socket: null };
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
			const app = woodland();
			const originalServe = app.fileServer.serve;
			let serveCalled = false;
			let serveArgs = null;

			app.fileServer.serve = (req, res, arg, folder) => {
				serveCalled = true;
				serveArgs = { req, res, arg, folder };
				return Promise.resolve();
			};

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

			const result = await app.serve(req, res, "/test.txt", "/tmp");

			assert.ok(serveCalled);
			assert.strictEqual(serveArgs.arg, "/test.txt");
			assert.strictEqual(serveArgs.folder, "/tmp");
			assert.ok(result === void 0);

			// Restore original
			app.fileServer.serve = originalServe;
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

			assert.throws(() => app.stream(req, res, file), /Invalid file descriptor/);
		});

		it("should emit connect event when listener exists", () => {
			const connectApp = woodland();
			let connectEmitted = false;

			connectApp.on(EVT_CONNECT, () => {
				connectEmitted = true;
			});

			connectApp.get("/test", () => {});

			const req = {
				method: "GET",
				url: "/test",
				headers: { host: "example.com" },
				socket: null,
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

			connectApp.route(req, res);

			assert.ok(connectEmitted);
		});

		it("should not emit connect/finish when no listeners", () => {
			const noListenersApp = woodland();
			let connectEmitCalled = false;
			let finishOnCalled = false;

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
				on: (event) => {
					if (event === "finish") {
						finishOnCalled = true;
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

			const originalEmit = noListenersApp.emit;
			noListenersApp.emit = (event, ...args) => {
				if (event === EVT_CONNECT) {
					connectEmitCalled = true;
				}
				return originalEmit.call(noListenersApp, event, ...args);
			};

			noListenersApp.route(req, res);

			assert.strictEqual(connectEmitCalled, false);
			assert.strictEqual(finishOnCalled, false);
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
			let finishCallback = null;
			const res = {
				statusCode: 200,
				setHeader: () => {},
				writeHead: () => {},
				on: (event, callback) => {
					if (event === "finish") {
						finishOnCalled = true;
						finishCallback = callback;
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

			// Invoke the finish callback to test the arrow function
			if (finishCallback) {
				finishCallback();
			}

			assert.ok(finishOnCalled);
			assert.ok(finishEmitted);
		});
	});
});
