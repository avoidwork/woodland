import assert from "node:assert";
import { describe, it } from "node:test";
import { createFileServer, serve, register } from "../../src/fileserver.js";

describe("fileserver", () => {
	describe("createFileServer", () => {
		const createMockApp = () => ({
			charset: "utf-8",
			indexes: ["index.html", "index.htm"],
			autoindex: true,
			logger: {
				logServe: () => ({ log: () => {} }),
			},
			etag: () => "test-etag",
			stream: () => {},
		});

		it("should create file server with serve and register methods", () => {
			const app = createMockApp();
			const server = createFileServer(app);

			assert.ok(server.serve);
			assert.ok(server.register);
		});

		describe("serve", () => {
			const testFilesDir = process.cwd() + "/test-files";

			it("should block path traversal attempts", async () => {
				let errorCalled = false;
				const app = createMockApp();
				app.logger.logServe = () => ({ log: () => {} });
				const server = createFileServer(app);

				await server.serve(
					{ method: "GET", parsed: { pathname: "/test" } },
					{
						error: (status) => {
							errorCalled = true;
							assert.strictEqual(status, 403);
						},
					},
					"../../../etc/passwd",
					testFilesDir,
				);

				assert.strictEqual(errorCalled, true);
			});

			it("should return 404 for non-existent file", async () => {
				let errorCalled = false;
				const app = createMockApp();
				app.logger.logServe = () => ({ log: () => {} });
				const server = createFileServer(app);

				await server.serve(
					{ method: "GET", parsed: { pathname: "/nonexistent.txt" } },
					{
						error: (status) => {
							errorCalled = true;
							assert.strictEqual(status, 404);
						},
					},
					"nonexistent.txt",
					testFilesDir,
				);

				assert.strictEqual(errorCalled, true);
			});

			it("should redirect directory without trailing slash", async () => {
				const app = createMockApp();
				app.logger.logServe = () => ({ log: () => {} });
				const server = createFileServer(app);

				let redirected = false;
				let redirectPath = null;

				await server.serve(
					{
						method: "GET",
						parsed: { pathname: "/subdir", search: "" },
					},
					{
						error: () => {},
						redirect: (path) => {
							redirected = true;
							redirectPath = path;
						},
					},
					"subdir",
					testFilesDir,
				);

				assert.strictEqual(redirected, true);
				assert.strictEqual(redirectPath, "/subdir/");
			});

			it("should serve existing file", async () => {
				let streamed = false;
				const app = createMockApp();
				app.logger.logServe = () => ({ log: () => {} });
				app.stream = () => {
					streamed = true;
				};
				const server = createFileServer(app);

				await server.serve(
					{
						method: "GET",
						parsed: { pathname: "/small.txt", search: "" },
					},
					{
						error: () => {},
						redirect: () => {},
					},
					"small.txt",
					testFilesDir,
				);

				assert.strictEqual(streamed, true);
			});

			it("should return 404 for directory with no index and autoindex disabled", async () => {
				let errorCalled = false;
				const app = createMockApp();
				app.autoindex = false;
				app.indexes = [];
				app.logger.logServe = () => ({ log: () => {} });
				const server = createFileServer(app);

				await server.serve(
					{
						method: "GET",
						parsed: { pathname: "/subdir/", search: "" },
					},
					{
						error: (status) => {
							errorCalled = true;
							assert.strictEqual(status, 404);
						},
						redirect: () => {},
					},
					"subdir",
					testFilesDir,
				);

				assert.strictEqual(errorCalled, true);
			});

			it("should serve index file from directory", async () => {
				let streamed = false;
				const app = createMockApp();
				app.indexes = ["index.html"];
				app.logger.logServe = () => ({ log: () => {} });
				app.stream = () => {
					streamed = true;
				};
				const server = createFileServer(app);

				await server.serve(
					{
						method: "GET",
						parsed: { pathname: "/subdir-with-index/", search: "" },
					},
					{
						error: () => {},
						redirect: () => {},
					},
					"subdir-with-index",
					testFilesDir,
				);

				assert.strictEqual(streamed, true);
			});

			it("should serve directory listing with autoindex enabled", async () => {
				let sentBody = null;
				const app = createMockApp();
				app.autoindex = true;
				app.indexes = [];
				app.logger.logServe = () => ({ log: () => {} });
				const server = createFileServer(app);

				await server.serve(
					{
						method: "GET",
						parsed: { pathname: "/subdir/", search: "" },
					},
					{
						error: () => {},
						redirect: () => {},
						header: () => {},
						send: (body) => {
							sentBody = body;
						},
					},
					"subdir",
					testFilesDir,
				);

				assert.ok(sentBody !== null);
				assert.ok(sentBody.includes("<!doctype html>"));
			});
		});

		describe("register", () => {
			it("should register middleware for file serving", () => {
				let registeredPath = null;
				let registeredHandler = null;

				const app = createMockApp();
				app.logger.logServe = () => ({ log: () => {} });
				app.useMiddleware = (path, handler) => {
					registeredPath = path;
					registeredHandler = handler;
				};

				const server = createFileServer(app);
				server.register("/files", "/tmp", app.useMiddleware.bind(app));

				assert.strictEqual(registeredPath, "/files/(.*)?");
				assert.ok(typeof registeredHandler === "function");
			});

			it("should handle trailing slash in root", () => {
				let registeredPath = null;

				const app = createMockApp();
				app.logger.logServe = () => ({ log: () => {} });
				app.useMiddleware = (path) => {
					registeredPath = path;
				};

				const server = createFileServer(app);
				server.register("/files/", "/tmp", app.useMiddleware.bind(app));

				assert.strictEqual(registeredPath, "/files/(.*)?");
			});

			it("should use app.use.bind when useMiddleware is not provided", () => {
				let registeredPath = null;
				let registeredHandler = null;

				const app = createMockApp();
				app.logger.logServe = () => ({ log: () => {} });
				app.use = (path, handler) => {
					registeredPath = path;
					registeredHandler = handler;
				};

				const server = createFileServer(app);
				server.register("/files", "/tmp");

				assert.strictEqual(registeredPath, "/files/(.*)?");
				assert.ok(typeof registeredHandler === "function");
			});
		});
	});

	describe("serve", () => {
		const testFilesDir = process.cwd() + "/test-files";

		it("should be a function", () => {
			assert.strictEqual(typeof serve, "function");
		});

		it("should serve file with custom app", async () => {
			let streamed = false;
			const app = {
				charset: "utf-8",
				indexes: ["index.html"],
				autoindex: true,
				logger: { logServe: () => ({ log: () => {} }) },
				etag: () => "test-etag",
				stream: () => {
					streamed = true;
				},
			};

			await serve(
				app,
				{ method: "GET", parsed: { pathname: "/small.txt" } },
				{ error: () => {}, redirect: () => {} },
				"small.txt",
				testFilesDir,
			);

			assert.strictEqual(streamed, true);
		});

		it("should handle path traversal with custom app", async () => {
			let errorStatus = null;
			const app = {
				charset: "utf-8",
				indexes: ["index.html"],
				autoindex: true,
				logger: { logServe: () => {} },
				etag: () => "test-etag",
				stream: () => {},
			};

			await serve(
				app,
				{ method: "GET", parsed: { pathname: "/test" } },
				{
					error: (status) => {
						errorStatus = status;
					},
				},
				"../../../etc/passwd",
				testFilesDir,
			);

			assert.strictEqual(errorStatus, 403);
		});
	});

	describe("register", () => {
		it("should be a function", () => {
			assert.strictEqual(typeof register, "function");
		});

		it("should register middleware with custom useMiddleware", () => {
			let registeredPath = null;
			let registeredHandler = null;

			const app = {
				charset: "utf-8",
				indexes: ["index.html"],
				autoindex: true,
				logger: { logServe: () => ({ log: () => {} }) },
				etag: () => "test-etag",
				stream: () => {},
			};

			const useMiddleware = (path, handler) => {
				registeredPath = path;
				registeredHandler = handler;
			};

			register(app, "/test", "/tmp", useMiddleware);

			assert.strictEqual(registeredPath, "/test/(.*)?");
			assert.strictEqual(typeof registeredHandler, "function");
		});

		it("should handle root path without trailing slash", () => {
			let registeredPath = null;

			const app = {
				charset: "utf-8",
				indexes: ["index.html"],
				autoindex: true,
				logger: { logServe: () => ({ log: () => {} }) },
				etag: () => "test-etag",
				stream: () => {},
			};

			const useMiddleware = (path) => {
				registeredPath = path;
			};

			register(app, "/", "/tmp", useMiddleware);

			assert.strictEqual(registeredPath, "/(.*)?");
		});

		it("should execute registered middleware handler", async () => {
			let handlerExecuted = false;

			const app = {
				charset: "utf-8",
				indexes: ["index.html"],
				autoindex: true,
				logger: {
					logServe: () => ({ log: () => {} }),
				},
				etag: () => "test-etag",
				stream: () => {
					handlerExecuted = true;
				},
			};

			const useMiddleware = (path, handler) => {
				const result = handler(
					{
						method: "GET",
						parsed: { pathname: "/test/file.txt", search: "" },
					},
					{
						error: () => {
							handlerExecuted = true;
						},
						redirect: () => {},
					},
				);

				if (result && typeof result.then === "function") {
					result.catch(() => {});
				}
			};

			register(app, "/files", "/tmp", useMiddleware);

			await new Promise((resolve) => setTimeout(resolve, 10));

			assert.strictEqual(handlerExecuted, true);
		});
	});
});
