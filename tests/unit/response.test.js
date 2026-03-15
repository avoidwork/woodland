import assert from "node:assert";
import { describe, it } from "node:test";
import { createResponseHandler } from "../../src/response.js";
import { EventEmitter } from "node:events";

const createMockStream = () => {
	const stream = new EventEmitter();
	stream.on = stream.on.bind(stream);
	return stream;
};

const mockApp = {
	digit: 3,
	etags: true,
	onReady: (_req, _res, body, status, headers) => [body, status, headers],
	onDone: (_req, _res, _body, _headers) => {},
	onSend: (_req, _res) => {},
	createReadStream: createMockStream,
};

describe("response", () => {
	describe("createResponseHandler", () => {
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

			it("should handle range header with valid range", () => {
				let onDoneCalled = false;
				const mockAppWithRange = {
					...mockApp,
					onDone: (_req, _res, _body, _headers) => {
						onDoneCalled = true;
					},
				};
				const handler = createResponseHandler(mockAppWithRange);
				const req = {
					method: "GET",
					headers: { range: "bytes=0-9" },
					range: { start: 0, end: 9 },
				};
				const res = {
					headersSent: false,
					statusCode: 200,
					header: () => {},
					removeHeader: () => {},
					error: () => {},
				};
				const sendHandler = handler.createSendHandler(req, res);
				sendHandler("0123456789");
				assert.strictEqual(onDoneCalled, true);
			});

			it("should handle range header with invalid range", () => {
				let errorCalled = false;
				const mockAppWithError = {
					...mockApp,
					onDone: () => {},
				};
				const handler = createResponseHandler(mockAppWithError);
				const req = {
					method: "GET",
					headers: { range: "bytes=999-1000" },
				};
				const res = {
					headersSent: false,
					statusCode: 200,
					header: () => {},
					removeHeader: () => {},
					error: (status) => {
						errorCalled = true;
						assert.strictEqual(status, 416);
					},
				};
				const sendHandler = handler.createSendHandler(req, res);
				sendHandler("test body");
				assert.strictEqual(errorCalled, true);
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

			it("should handle GET request with valid range", () => {
				let headersSet = {};
				let sentData = null;
				const req = {
					method: "GET",
					headers: { range: "bytes=0-99" },
					range: { start: 0, end: 99 },
				};
				const res = {
					headersSent: false,
					statusCode: 200,
					header: (name, value) => {
						headersSet[name] = value;
					},
					removeHeader: (name) => {
						delete headersSet[name];
					},
					send: (data) => {
						sentData = data;
					},
				};
				const file = {
					path: "/test.txt",
					etag: "",
					charset: "",
					stats: { size: 200, mtime: new Date() },
				};
				const handler = createResponseHandler(mockApp);
				handler.stream(req, res, file, () => {});
				assert.strictEqual(sentData instanceof EventEmitter, true);
				assert.strictEqual(headersSet["content-range"], "bytes 0-99/200");
			});

			it("should handle GET request with invalid range", () => {
				let headersSet = {};
				let sentData = null;
				const req = {
					method: "GET",
					headers: { range: "bytes=999-1000" },
				};
				const res = {
					headersSent: false,
					statusCode: 200,
					header: (name, value) => {
						headersSet[name] = value;
					},
					removeHeader: (name) => {
						delete headersSet[name];
					},
					send: (data) => {
						sentData = data;
					},
				};
				const file = {
					path: "/test.txt",
					etag: "",
					charset: "",
					stats: { size: 100, mtime: new Date() },
				};
				const handler = createResponseHandler(mockApp);
				handler.stream(req, res, file, () => {});
				assert.strictEqual(sentData instanceof EventEmitter, true);
				assert.strictEqual(headersSet["content-range"], "bytes */100");
			});

			it("should stream file with charset", () => {
				const handler = createResponseHandler(mockApp);
				let headersSet = {};
				const req = { method: "HEAD", headers: {} };
				const res = {
					headersSent: false,
					statusCode: 200,
					header: (name, value) => {
						headersSet[name] = value;
					},
					removeHeader: () => {},
					send: () => {},
				};
				const file = {
					path: "/test.html",
					etag: "",
					charset: "utf-8",
					stats: { size: 100, mtime: new Date() },
				};
				handler.stream(req, res, file, () => {});
				assert.ok(headersSet["content-type"].includes("charset=utf-8"));
			});

			it("should stream file with etag", () => {
				const mockAppWithEtags = {
					digit: 3,
					etags: { generate: () => "test-etag" },
					onReady: (_req, _res, body, status, headers) => [body, status, headers],
					onDone: (_req, _res, _body, _headers) => {},
					onSend: (_req, _res) => {},
					createReadStream: createMockStream,
				};
				const handler = createResponseHandler(mockAppWithEtags);
				let headersSet = {};
				const req = { method: "HEAD", headers: {} };
				const res = {
					headersSent: false,
					statusCode: 200,
					header: (name, value) => {
						headersSet[name] = value;
					},
					removeHeader: (name) => {
						delete headersSet[name];
					},
					send: () => {},
				};
				const file = {
					path: "/test.txt",
					etag: "test-etag",
					charset: "",
					stats: { size: 100, mtime: new Date() },
				};
				handler.stream(req, res, file, () => {});
				assert.strictEqual(headersSet["etag"], "test-etag");
			});

			it("should handle HEAD request", () => {
				const handler = createResponseHandler(mockApp);
				let sentData = null;
				const req = { method: "HEAD", headers: {} };
				const res = {
					headersSent: false,
					statusCode: 200,
					header: () => {},
					removeHeader: () => {},
					send: (data) => {
						sentData = data;
					},
				};
				const file = {
					path: "/test.txt",
					etag: "",
					charset: "",
					stats: { size: 100, mtime: new Date() },
				};
				handler.stream(req, res, file, () => {});
				assert.strictEqual(sentData, "");
			});

			it("should handle OPTIONS request", () => {
				const handler = createResponseHandler(mockApp);
				let sentData = null;
				const req = { method: "OPTIONS", headers: {} };
				const res = {
					headersSent: false,
					statusCode: 200,
					header: () => {},
					removeHeader: () => {},
					send: (data) => {
						sentData = data;
					},
				};
				const file = {
					path: "/test.txt",
					etag: "",
					charset: "",
					stats: { size: 100, mtime: new Date() },
				};
				handler.stream(req, res, file, () => {});
				assert.ok(sentData !== null);
			});
		});
	});
});
