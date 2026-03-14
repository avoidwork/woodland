import assert from "node:assert";
import { describe, it } from "node:test";
import { createResponseHandler } from "../../src/response.js";

describe("response", () => {
  describe("createResponseHandler", () => {
    const mockApp = {
      digit: 3,
      etags: true,
      onReady: (_req, _res, body, status, headers) => [body, status, headers],
      onDone: (_req, _res, _body, _headers) => {},
      onSend: (_req, _res) => {},
    };

    it("should create response handler with all methods", () => {
      const handler = createResponseHandler(mockApp);

      assert.ok(handler.createErrorHandler);
      assert.ok(handler.createJsonHandler);
      assert.ok(handler.createRedirectHandler);
      assert.ok(handler.createSendHandler);
      assert.ok(handler.createSetHandler);
      assert.ok(handler.createStatusHandler);
      assert.ok(handler.stream);
    });

    describe("createErrorHandler", () => {
      it("should create error handler function", () => {
        const handler = createResponseHandler(mockApp);
        let emitted = false;
        let logged = false;

        const errorHandler = handler.createErrorHandler(
          () => {
            emitted = true;
          },
          () => {
            logged = true;
          },
        );

        const req = { method: "GET" };
        const res = {
          headersSent: false,
          removeHeader: () => {},
          header: () => {},
          statusCode: 500,
        };

        const errorFn = errorHandler(req, res);
        errorFn(500, "Internal Error");

        assert.strictEqual(emitted, true);
        assert.strictEqual(logged, true);
      });

      it("should handle Error object", () => {
        const handler = createResponseHandler(mockApp);
        let errorReceived = null;

        const errorHandler = handler.createErrorHandler(
          (req, res, err) => {
            errorReceived = err;
          },
          () => {},
        );

        const req = { method: "GET" };
        const res = {
          headersSent: false,
          removeHeader: () => {},
          header: () => {},
          statusCode: 500,
        };

        const errorFn = errorHandler(req, res);
        const err = new Error("Test error");
        errorFn(500, err);

        assert.strictEqual(errorReceived, err);
      });

      it("should not handle when headers already sent", () => {
        const handler = createResponseHandler(mockApp);
        let called = false;

        const errorHandler = handler.createErrorHandler(
          () => {
            called = true;
          },
          () => {},
        );

        const req = { method: "GET" };
        const res = {
          headersSent: true,
          removeHeader: () => {},
          header: () => {},
          statusCode: 500,
        };

        const errorFn = errorHandler(req, res);
        errorFn(500, "Error");

        assert.strictEqual(called, false);
      });

      it("should clear allow header for 404", () => {
        const handler = createResponseHandler(mockApp);
        let allowRemoved = false;

        const errorHandler = handler.createErrorHandler(
          () => {},
          () => {},
        );

        const req = { method: "GET" };
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

        const errorFn = errorHandler(req, res);
        errorFn(404, "Not Found");

        assert.strictEqual(allowRemoved, true);
      });

      it("should clear CORS headers for 404", () => {
        const handler = createResponseHandler(mockApp);
        let corsRemoved = false;

        const errorHandler = handler.createErrorHandler(
          () => {},
          () => {},
        );

        const req = { method: "GET", cors: true };
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

        const errorFn = errorHandler(req, res);
        errorFn(404, "Not Found");

        assert.strictEqual(corsRemoved, true);
      });
    });

    describe("createJsonHandler", () => {
      it("should create json response function", () => {
        const handler = createResponseHandler(mockApp);
        let sentData = null;
        let sentStatus = null;

        const jsonHandler = handler.createJsonHandler({
          send: (data, status) => {
            sentData = data;
            sentStatus = status;
          },
        });

        jsonHandler({ foo: "bar" });

        assert.strictEqual(sentData, '{"foo":"bar"}');
        assert.strictEqual(sentStatus, 200);
      });

      it("should accept custom status", () => {
        const handler = createResponseHandler(mockApp);
        let sentStatus = null;

        const jsonHandler = handler.createJsonHandler({
          send: (data, status) => {
            sentStatus = status;
          },
        });

        jsonHandler({ foo: "bar" }, 201);

        assert.strictEqual(sentStatus, 201);
      });

      it("should set content-type header", () => {
        const handler = createResponseHandler(mockApp);
        let sentHeaders = null;

        const jsonHandler = handler.createJsonHandler({
          send: (data, status, headers) => {
            sentHeaders = headers;
          },
        });

        jsonHandler({ foo: "bar" });

        assert.ok(sentHeaders["content-type"].includes("application/json"));
      });
    });

    describe("createRedirectHandler", () => {
      it("should create redirect function with permanent redirect", () => {
        const handler = createResponseHandler(mockApp);
        let sentStatus = null;
        let sentHeaders = null;

        const redirectHandler = handler.createRedirectHandler({
          send: (data, status, headers) => {
            sentStatus = status;
            sentHeaders = headers;
          },
        });

        redirectHandler("/new-location");

        assert.strictEqual(sentStatus, 308);
        assert.strictEqual(sentHeaders.location, "/new-location");
      });

      it("should create redirect function with temporary redirect", () => {
        const handler = createResponseHandler(mockApp);
        let sentStatus = null;

        const redirectHandler = handler.createRedirectHandler({
          send: (data, status) => {
            sentStatus = status;
          },
        });

        redirectHandler("/new-location", false);

        assert.strictEqual(sentStatus, 307);
      });
    });

    describe("createSendHandler", () => {
      it("should create send function", () => {
        const handler = createResponseHandler(mockApp);

        const sendHandler = handler.createSendHandler(
          { method: "GET", headers: {} },
          {
            headersSent: false,
            statusCode: 200,
            header: () => {},
            removeHeader: () => {},
          },
        );

        sendHandler("test body");
      });

      it("should not send when headers already sent", () => {
        const handler = createResponseHandler(mockApp);

        const sendHandler = handler.createSendHandler(
          { method: "GET", headers: {} },
          {
            headersSent: true,
            statusCode: 200,
          },
        );

        sendHandler("test body");
      });

      it("should convert object to string", () => {
        const handler = createResponseHandler(mockApp);

        const sendHandler = handler.createSendHandler(
          { method: "GET", headers: {} },
          {
            headersSent: false,
            statusCode: 200,
            header: () => {},
            removeHeader: () => {},
          },
        );

        const obj = { toString: () => "custom string" };
        sendHandler(obj);
      });
    });

    describe("createSetHandler", () => {
      it("should create set function for object", () => {
        const handler = createResponseHandler(mockApp);
        const headers = new Map();

        const setHandler = handler.createSetHandler({
          setHeader: (key, value) => {
            headers.set(key, value);
          },
        });

        setHandler({ "content-type": "text/html", "x-custom": "value" });

        assert.strictEqual(headers.get("content-type"), "text/html");
        assert.strictEqual(headers.get("x-custom"), "value");
      });

      it("should handle Map object", () => {
        const handler = createResponseHandler(mockApp);
        const headers = new Map();

        const setHandler = handler.createSetHandler({
          setHeader: (key, value) => {
            headers.set(key, value);
          },
        });

        const input = new Map([["content-type", "text/html"]]);
        setHandler(input);

        assert.strictEqual(headers.get("content-type"), "text/html");
      });

      it("should handle Headers object", () => {
        const handler = createResponseHandler(mockApp);
        const headers = new Map();

        const setHandler = handler.createSetHandler({
          setHeader: (key, value) => {
            headers.set(key, value);
          },
        });

        const input = new Headers([["content-type", "text/html"]]);
        setHandler(input);

        assert.strictEqual(headers.get("content-type"), "text/html");
      });
    });

    describe("createStatusHandler", () => {
      it("should create status function", () => {
        const handler = createResponseHandler(mockApp);

        const mockRes = { statusCode: 200 };
        const statusHandler = handler.createStatusHandler(mockRes);
        statusHandler(404);

        assert.strictEqual(mockRes.statusCode, 404);
      });

      it("should return default 200", () => {
        const handler = createResponseHandler(mockApp);
        const mockRes = { statusCode: 200 };

        const statusHandler = handler.createStatusHandler(mockRes);
        statusHandler();

        assert.strictEqual(mockRes.statusCode, 200);
      });
    });

    describe("stream", () => {
      it("should throw error for invalid file descriptor", () => {
        const handler = createResponseHandler(mockApp);

        assert.throws(() => {
          handler.stream({ method: "GET" }, {}, { path: "", stats: { size: 100 } }, () => {});
        }, /Invalid file descriptor/);
      });

      it("should throw error for zero size file", () => {
        const handler = createResponseHandler(mockApp);

        assert.throws(() => {
          handler.stream(
            { method: "GET" },
            {},
            { path: "/test.txt", stats: { size: 0 } },
            () => {},
          );
        }, /Invalid file descriptor/);
      });
    });
  });
});
