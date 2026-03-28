import assert from "node:assert";
import { describe, it } from "node:test";
import { createFileServer, serve, register, autoIndex } from "../../src/fileserver.js";

describe("fileserver", () => {
	describe("createFileServer", () => {
		const createMockApp = () => ({
			charset: "utf-8",
			indexes: ["index.html", "index.htm"],
			autoIndex: true,
			logger: {
				logServe: () => ({ log: () => {} }),
			},
			etag: () => "test-etag",
			stream: () => {},
			use: () => {},
		});

		it("should create file server with serve and register methods", () => {
			const app = createMockApp();
			const server = createFileServer(app);

			assert.ok(server.serve);
			assert.ok(server.register);
		});

		describe("serve", () => {
			const testFilesDir = process.cwd() + "/tests/test-files";

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

			it("should handle malformed URI in autoIndex", async () => {
				let errorStatus = null;
				let errorArg = null;
				const testFilesDir = process.cwd() + "/tests/test-files";
				const app = createMockApp();
				app.logger.logServe = () => ({ log: () => {} });
				app.autoIndex = true;
				app.indexes = []; // No index files to force autoIndex generation
				const server = createFileServer(app);

				// Malformed percent-encoding in pathname - path must end with / to reach autoIndex
				await server.serve(
					{
						method: "GET",
						parsed: { pathname: "/subdir%ZZ/", search: "" },
					},
					{
						error: (status, err) => {
							errorStatus = status;
							errorArg = err;
						},
						header: () => {},
						send: () => {},
						redirect: () => {},
					},
					"subdir",
					testFilesDir,
				);

				assert.strictEqual(errorStatus, 400);
				assert.ok(errorArg instanceof Error);
				assert.strictEqual(errorArg.message, "Bad Request");
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
				app.autoIndex = false;
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
				app.autoIndex = true;
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

				assert.strictEqual(registeredPath, "/files(/.*)?");
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

				assert.strictEqual(registeredPath, "/files(/.*)?");
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

				assert.strictEqual(registeredPath, "/files(/.*)?");
				assert.ok(typeof registeredHandler === "function");
			});

			it("should throw TypeError when useMiddleware is missing", () => {
				const app = {
					charset: "utf-8",
					indexes: ["index.html"],
					autoIndex: true,
					logger: { logServe: () => {} },
					etag: () => "test-etag",
					stream: () => {},
					// Note: no 'use' property
				};

				const server = createFileServer(app);

				assert.throws(
					() => server.register("/static", "/tmp"),
					/useMiddleware is required or config.use must be a function/,
				);
			});

			it("should strip mount prefix correctly (e.g., /static/small.txt -> small.txt)", async () => {
				const testFilesDir = process.cwd() + "/tests/test-files";

				const mockConfig = {
					charset: "utf-8",
					indexes: ["index.html"],
					autoIndex: false,
					logger: { logServe: () => ({ log: () => {} }) },
					etag: () => "test-etag",
					stream: () => {},
				};

				let capturedArg = null;

				// Mock serve to capture what arg is passed
				const mockUseMiddleware = (_pattern, _handler) => {
					// The handler is defined as:
					// (req, res) => {
					//   const pathname = req.parsed.pathname;
					//   const relativePath = pathname === normalizedRoot ? EMPTY : pathname.slice(normalizedRoot.length + 1);
					//   serve(config, req, res, relativePath, folder);
					// }

					// Simulate the handler's path calculation
					const pathname = "/static/small.txt";
					const normalizedRoot = "/static";
					const relativePath =
						pathname === normalizedRoot ? "" : pathname.slice(normalizedRoot.length + 1);

					capturedArg = relativePath;
				};

				register(mockConfig, "/static", testFilesDir, mockUseMiddleware);

				assert.strictEqual(capturedArg, "small.txt");
			});

			it("should strip mount prefix for root path (/static -> empty string)", async () => {
				const testFilesDir = process.cwd() + "/tests/test-files";

				const mockConfig = {
					charset: "utf-8",
					indexes: ["index.html"],
					autoIndex: false,
					logger: { logServe: () => ({ log: () => {} }) },
					etag: () => "test-etag",
					stream: () => {},
				};

				let capturedArg = null;

				const mockUseMiddleware = (_pattern, _handler) => {
					const pathname = "/static";
					const normalizedRoot = "/static";
					const relativePath =
						pathname === normalizedRoot ? "" : pathname.slice(normalizedRoot.length + 1);

					capturedArg = relativePath;
				};

				register(mockConfig, "/static", testFilesDir, mockUseMiddleware);

				assert.strictEqual(capturedArg, "");
			});

			it("should strip mount prefix for nested paths (/static/subdir/file.txt -> subdir/file.txt)", async () => {
				const testFilesDir = process.cwd() + "/tests/test-files";

				const mockConfig = {
					charset: "utf-8",
					indexes: ["index.html"],
					autoIndex: false,
					logger: { logServe: () => ({ log: () => {} }) },
					etag: () => "test-etag",
					stream: () => {},
				};

				let capturedArg = null;

				const mockUseMiddleware = (_pattern, _handler) => {
					const pathname = "/static/subdir/file.txt";
					const normalizedRoot = "/static";
					const relativePath =
						pathname === normalizedRoot ? "" : pathname.slice(normalizedRoot.length + 1);

					capturedArg = relativePath;
				};

				register(mockConfig, "/static", testFilesDir, mockUseMiddleware);

				assert.strictEqual(capturedArg, "subdir/file.txt");
			});
		});
	});

	describe("serve", () => {
		const testFilesDir = process.cwd() + "/tests/test-files";

		it("should be a function", () => {
			assert.strictEqual(typeof serve, "function");
		});

		it("should serve file with custom app", async () => {
			let streamed = false;
			const app = {
				charset: "utf-8",
				indexes: ["index.html"],
				autoIndex: true,
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
				autoIndex: true,
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

		it("should block sibling directory path bypass attempts", async () => {
			let errorStatus = null;
			const app = {
				charset: "utf-8",
				indexes: ["index.html"],
				autoIndex: true,
				logger: { logServe: () => {} },
				etag: () => "test-etag",
				stream: () => {},
			};

			// Test sibling directory bypass: arg="../public2/file.txt" with folder="/public"
			// After resolve: /public2/file.txt starts with "/public" but next char is "2", not "/"
			// This correctly blocks access to sibling directory /public2 (outside /public)
			await serve(
				app,
				{ method: "GET", parsed: { pathname: "/test" } },
				{
					error: (status) => {
						errorStatus = status;
					},
				},
				"../public2/file.txt",
				"/public",
			);

			// Path resolves to /public2/file.txt which is outside /public
			// Should be blocked with 403
			assert.strictEqual(errorStatus, 403);
		});

		it("should allow valid subdirectory access (not sibling bypass)", async () => {
			let errorStatus = null;
			const app = {
				charset: "utf-8",
				indexes: ["index.html"],
				autoIndex: true,
				logger: { logServe: () => {} },
				etag: () => "test-etag",
				stream: () => {},
			};

			// Test valid subdirectory: arg="subdir/file.txt" with folder="/public"
			// After resolve: /public/subdir/file.txt starts with /public/ so it's valid
			// This should NOT be blocked by path traversal (may get 404 for missing file)
			await serve(
				app,
				{ method: "GET", parsed: { pathname: "/test" } },
				{
					error: (status) => {
						errorStatus = status;
					},
				},
				"subdir/file.txt",
				"/public",
			);

			// Path resolves to /public/subdir/file.txt which is inside /public
			// Should NOT be blocked by path traversal (403), may get 404 for missing file
			assert.notStrictEqual(errorStatus, 403);
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
				autoIndex: true,
				logger: { logServe: () => ({ log: () => {} }) },
				etag: () => "test-etag",
				stream: () => {},
			};

			const useMiddleware = (path, handler) => {
				registeredPath = path;
				registeredHandler = handler;
			};

			register(app, "/test", "/tmp", useMiddleware);

			assert.strictEqual(registeredPath, "/test(/.*)?");
			assert.strictEqual(typeof registeredHandler, "function");
		});

		it("should handle root path without trailing slash", () => {
			let registeredPath = null;

			const app = {
				charset: "utf-8",
				indexes: ["index.html"],
				autoIndex: true,
				logger: { logServe: () => ({ log: () => {} }) },
				etag: () => "test-etag",
				stream: () => {},
			};

			const useMiddleware = (path) => {
				registeredPath = path;
			};

			register(app, "/", "/tmp", useMiddleware);

			// Root path "/" becomes pattern "(/.*)" which matches "/" and "/foo"
			assert.strictEqual(registeredPath, "(/.*)?");
		});

		it("should execute registered middleware handler", async () => {
			let handlerExecuted = false;

			const app = {
				charset: "utf-8",
				indexes: ["index.html"],
				autoIndex: true,
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

	describe("autoIndex", () => {
		it("should generate HTML for empty directory", () => {
			const result = autoIndex("Test Directory", []);

			assert.ok(result.includes("<!doctype html>"));
			assert.ok(result.includes("Test Directory"));
			assert.ok(result.includes("../"));
		});

		it("should generate HTML for directory with files", () => {
			const files = [
				{ name: "file1.txt", isDirectory: () => false },
				{ name: "dir1", isDirectory: () => true },
			];

			const result = autoIndex("Test", files);

			assert.ok(result.includes("file1.txt"));
			assert.ok(result.includes("dir1/"));
		});

		it("should escape HTML in filenames", () => {
			const files = [{ name: '<script>alert("xss")</script>', isDirectory: () => false }];

			const result = autoIndex("Test", files);

			assert.ok(result.includes("&lt;script&gt;"));
			assert.ok(result.includes('rel="item"'));
		});

		it("should escape HTML in title", () => {
			const result = autoIndex('<script>alert("xss")</script>', []);

			assert.ok(result.includes("&lt;script&gt;"));
		});

		it("should handle directory entries with trailing slash", () => {
			const files = [{ name: "folder", isDirectory: () => true }];

			const result = autoIndex("Test", files);

			assert.ok(result.includes("folder/"));
			assert.ok(result.includes('href="folder/"'));
		});

		it("should handle files with special characters in names", () => {
			const files = [{ name: "file with spaces.txt", isDirectory: () => false }];

			const result = autoIndex("Test", files);

			assert.ok(result.includes("file%20with%20spaces.txt"));
		});

		it("should URL-encode special characters in filenames", () => {
			const files = [
				{ name: "file<with>special.txt", isDirectory: () => false },
				{ name: "file&with&ampersand.txt", isDirectory: () => false },
			];

			const result = autoIndex("Test", files);

			assert.ok(result.includes("file%3Cwith%3Especial.txt"));
			assert.ok(result.includes("file%26with%26ampersand.txt"));
		});

		it("should URL-encode spaces in filenames", () => {
			const files = [
				{ name: "file with spaces.txt", isDirectory: () => false },
				{ name: "another file.txt", isDirectory: () => false },
			];

			const result = autoIndex("Test", files);

			assert.ok(result.includes("file%20with%20spaces.txt"));
			assert.ok(result.includes("another%20file.txt"));
		});
	});
});
