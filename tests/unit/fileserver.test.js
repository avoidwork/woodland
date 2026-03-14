import assert from "node:assert";
import { describe, it } from "node:test";
import { createFileServer } from "../../src/fileserver.js";

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
    });
  });
});
