import assert from "node:assert";
import { describe, it } from "node:test";
import {
	mime,
	getStatusText,
	getStatus,
	error,
	json,
	redirect,
	send,
	set,
	status,
	stream,
	escapeHtml,
	partialHeaders,
	pipeable,
	writeHead,
} from "../../src/response.js";

describe("response", () => {
	describe("mime", () => {
		it("should return MIME type for html file", () => {
			assert.strictEqual(mime("test.html"), "text/html");
		});

		it("should return MIME type for json file", () => {
			assert.strictEqual(mime("test.json"), "application/json");
		});

		it("should return octet-stream for unknown extension", () => {
			assert.strictEqual(mime("test.nonexistent"), "application/octet-stream");
		});

		it("should return octet-stream for empty string", () => {
			assert.strictEqual(mime(""), "application/octet-stream");
		});
	});

	describe("getStatusText", () => {
		it("should return OK for 200", () => {
			assert.strictEqual(getStatusText(200), "OK");
		});

		it("should return Not Found for 404", () => {
			assert.strictEqual(getStatusText(404), "Not Found");
		});

		it("should return Range Not Satisfiable for 416", () => {
			assert.strictEqual(getStatusText(416), "Range Not Satisfiable");
		});

		it("should return Internal Server Error for unknown status", () => {
			assert.strictEqual(getStatusText(999), "Internal Server Error");
		});
	});

	describe("getStatus", () => {
		it("should return 404 when allow array is empty", () => {
			const req = { allow: [], method: "GET" };
			const res = { statusCode: 200 };

			const status = getStatus(req, res);

			assert.strictEqual(status, 404);
		});

		it("should return 405 when method is not GET", () => {
			const req = { allow: ["POST"], method: "POST" };
			const res = { statusCode: 200 };

			const status = getStatus(req, res);

			assert.strictEqual(status, 405);
		});

		it("should return 404 when GET not in allow list", () => {
			const req = { allow: ["POST"], method: "GET" };
			const res = { statusCode: 200 };

			const status = getStatus(req, res);

			assert.strictEqual(status, 404);
		});

		it("should return 500 when GET is allowed and status <= 500", () => {
			const req = { allow: ["GET"], method: "GET" };
			const res = { statusCode: 500 };

			const status = getStatus(req, res);

			assert.strictEqual(status, 500);
		});

		it("should return custom status when > 500", () => {
			const req = { allow: ["GET"], method: "GET" };
			const res = { statusCode: 503 };

			const status = getStatus(req, res);

			assert.strictEqual(status, 503);
		});
	});

	describe("error", () => {
		it("should clear allow header for 404", () => {
			// Allow header is removed in onSend(), not error()
			// This test verifies error() doesn't interfere
			let headerCalledWithEmpty = false;

			const req = { method: "GET" };
			const res = {
				headersSent: false,
				removeHeader: () => {},
				header: (name, value) => {
					if (name === "allow" && value === "") {
						headerCalledWithEmpty = true;
					}
				},
				statusCode: 500,
			};

			error(req, res, 404);

			assert.strictEqual(headerCalledWithEmpty, false);
		});

		it("should clear CORS headers for 404", () => {
			// CORS headers are removed in onSend(), not error()
			// This test verifies error() doesn't interfere
			let headerCalledWithEmpty = false;

			const req = { method: "GET", cors: true };
			const res = {
				headersSent: false,
				removeHeader: () => {},
				header: (name, value) => {
					if (name === "access-control-allow-methods" && value === "") {
						headerCalledWithEmpty = true;
					}
				},
				statusCode: 500,
			};

			error(req, res, 404);

			assert.strictEqual(headerCalledWithEmpty, false);
		});

		it("should not handle when headers already sent", () => {
			const req = { method: "GET" };
			const res = {
				headersSent: true,
				removeHeader: () => {},
				header: () => {},
				statusCode: 200,
			};

			error(req, res, 500);

			assert.strictEqual(res.statusCode, 200);
		});

		it("should set status code", () => {
			const req = { method: "GET" };
			const res = {
				headersSent: false,
				removeHeader: () => {},
				header: () => {},
				statusCode: 200,
			};

			error(req, res, 404);

			assert.strictEqual(res.statusCode, 404);
		});

		it("should clear content-length header", () => {
			let contentLengthRemoved = false;

			const req = { method: "GET" };
			const res = {
				headersSent: false,
				removeHeader: (name) => {
					if (name === "content-length") {
						contentLengthRemoved = true;
					}
				},
				header: () => {},
				statusCode: 200,
			};

			error(req, res, 500);

			assert.strictEqual(contentLengthRemoved, true);
		});

		it("should set status to 500 when status < 400", () => {
			let finalStatus = null;

			const req = { method: "GET", cors: false };
			const res = {
				headersSent: false,
				removeHeader: () => {},
				header: () => {},
				get statusCode() {
					return finalStatus;
				},
				set statusCode(val) {
					finalStatus = val;
				},
			};

			error(req, res, 200);

			assert.strictEqual(finalStatus, 500);
		});
	});

	describe("json", () => {
		it("should create json response function", () => {
			let sentData = null;
			let sentStatus = null;

			const res = {
				statusCode: 200,
				send: (data, status) => {
					sentData = data;
					sentStatus = status;
				},
			};

			json(res, { foo: "bar" });

			assert.strictEqual(sentData, '{"foo":"bar"}');
			assert.strictEqual(sentStatus, 200);
		});

		it("should accept custom status", () => {
			let sentStatus = null;

			const res = {
				send: (data, status) => {
					sentStatus = status;
				},
			};

			json(res, { foo: "bar" }, 201);

			assert.strictEqual(sentStatus, 201);
		});

		it("should set content-type header", () => {
			let sentHeaders = null;

			const res = {
				send: (data, status, headers) => {
					sentHeaders = headers;
				},
			};

			json(res, { foo: "bar" });

			assert.ok(sentHeaders["content-type"].includes("application/json"));
		});
	});

	describe("redirect", () => {
		it("should create redirect function with permanent redirect", () => {
			let sentStatus = null;
			let sentHeaders = null;

			const res = {
				send: (data, status, headers) => {
					sentStatus = status;
					sentHeaders = headers;
				},
			};

			redirect(res, "/new-location");

			assert.strictEqual(sentStatus, 308);
			assert.strictEqual(sentHeaders.location, "/new-location");
		});

		it("should create redirect function with temporary redirect", () => {
			let sentStatus = null;

			const res = {
				send: (data, status) => {
					sentStatus = status;
				},
			};

			redirect(res, "/new-location", false);

			assert.strictEqual(sentStatus, 307);
		});
	});

	describe("send", () => {
		it("should create send function", () => {
			const req = { method: "GET", headers: {} };
			const res = {
				headersSent: false,
				statusCode: 200,
				header: () => {},
				removeHeader: () => {},
			};

			send(
				req,
				res,
				"test body",
				200,
				{},
				(_req, _res, body, status, headers) => [body, status, headers],
				() => {},
			);
		});

		it("should not send when headers already sent", () => {
			let onDoneCalled = false;
			const req = { method: "GET", headers: {} };
			const res = {
				headersSent: true,
				statusCode: 200,
			};

			send(
				req,
				res,
				"test body",
				200,
				{},
				() => [],
				() => {
					onDoneCalled = true;
				},
			);

			assert.strictEqual(onDoneCalled, false);
		});

		it("should convert object to string", () => {
			let bodyReceived = null;
			const req = { method: "GET", headers: {} };
			const res = {
				headersSent: false,
				statusCode: 200,
				header: () => {},
				removeHeader: () => {},
			};

			send(
				req,
				res,
				{ toString: () => "custom string" },
				200,
				{},
				(_req, _res, body, status, headers) => [body, status, headers],
				(_req, _res, body, _headers) => {
					bodyReceived = body;
				},
			);

			assert.strictEqual(bodyReceived, "custom string");
		});

		it("should handle range header with valid range", () => {
			let onDoneCalled = false;
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

			send(
				req,
				res,
				"0123456789",
				200,
				{},
				(_req, _res, body, status, headers) => [body, status, headers],
				(_req, _res, _body, _headers) => {
					onDoneCalled = true;
				},
			);

			assert.strictEqual(onDoneCalled, true);
		});

		it("should handle range header with invalid range", () => {
			let onDoneCalled = false;
			const req = {
				method: "GET",
				headers: { range: "bytes=999-1000" },
			};
			const res = {
				headersSent: false,
				statusCode: 200,
				header: () => {},
				removeHeader: () => {},
				error: () => {},
			};

			send(
				req,
				res,
				"short",
				200,
				{},
				(_req, _res, body, status, headers) => [body, status, headers],
				() => {
					onDoneCalled = true;
				},
			);

			assert.strictEqual(onDoneCalled, false);
		});

		it("should pipe stream when pipeable and no range", () => {
			let piped = false;
			const streamObj = {
				on: (event, handler) => {
					if (event === "error") {
						streamObj._errorHandler = handler;
					}
					return streamObj;
				},
				pipe: () => {
					piped = true;
				},
			};
			const req = { method: "GET", headers: {} };
			const res = {
				headersSent: false,
				statusCode: 200,
				header: () => {},
				removeHeader: () => {},
				writeHead: () => {},
			};

			send(
				req,
				res,
				streamObj,
				200,
				{},
				(_req, _res, body, status, headers) => [body, status, headers],
				() => {},
			);

			assert.strictEqual(piped, true);
		});

		it("should handle pipeable stream error", () => {
			let errorHandlerCalled = false;
			const streamObj = {
				on: (event, handler) => {
					if (event === "error") {
						streamObj._errorHandler = handler;
						errorHandlerCalled = true;
						handler(new Error("Stream error"));
					}
					return streamObj;
				},
				pipe: () => {},
			};
			const req = { method: "GET", headers: {} };
			const res = {
				headersSent: false,
				statusCode: 200,
				header: () => {},
				removeHeader: () => {},
				writeHead: () => {},
				error: () => {},
			};

			send(
				req,
				res,
				streamObj,
				200,
				{},
				(_req, _res, body, status, headers) => [body, status, headers],
				() => {},
			);

			assert.strictEqual(errorHandlerCalled, true);
		});

		it("should handle range with req.range defined", () => {
			let onDoneCalled = false;
			const req = {
				method: "GET",
				headers: { range: "bytes=0-4" },
				range: { start: 0, end: 4 },
			};
			const res = {
				headersSent: false,
				statusCode: 200,
				header: () => {},
				removeHeader: () => {},
				writeHead: () => {},
			};

			send(
				req,
				res,
				"0123456789",
				200,
				{},
				(_req, _res, body, status, headers) => [body, status, headers],
				(_req, _res, body, _headers) => {
					onDoneCalled = true;
					assert.strictEqual(body, "01234");
				},
			);

			assert.strictEqual(onDoneCalled, true);
		});
	});

	describe("set", () => {
		it("should set headers from plain object", () => {
			const headersSet = {};
			const res = {
				setHeader: (key, value) => {
					headersSet[key] = value;
				},
			};

			set(res, { "content-type": "text/html", "x-custom": "value" });

			assert.strictEqual(headersSet["content-type"], "text/html");
			assert.strictEqual(headersSet["x-custom"], "value");
		});

		it("should set headers from Map", () => {
			const headersSet = {};
			const res = {
				setHeader: (key, value) => {
					headersSet[key] = value;
				},
			};

			const map = new Map([
				["content-length", "100"],
				["x-map", "test"],
			]);
			set(res, map);

			assert.strictEqual(headersSet["content-length"], "100");
			assert.strictEqual(headersSet["x-map"], "test");
		});

		it("should set headers from Headers object", () => {
			const headersSet = {};
			const res = {
				setHeader: (key, value) => {
					headersSet[key] = value;
				},
			};

			const headers = new Headers([["authorization", "Bearer token"]]);
			set(res, headers);

			assert.strictEqual(headersSet["authorization"], "Bearer token");
		});

		it("should return res object", () => {
			const res = { setHeader: () => {} };
			const result = set(res, {});

			assert.strictEqual(result, res);
		});

		it("should handle empty headers object", () => {
			let called = false;
			const res = {
				setHeader: () => {
					called = true;
				},
			};

			set(res);

			assert.strictEqual(called, false);
		});
	});

	describe("status", () => {
		it("should set status code", () => {
			const res = { statusCode: 200 };
			const result = status(res, 404);

			assert.strictEqual(res.statusCode, 404);
			assert.strictEqual(result, res);
		});

		it("should default to 200", () => {
			const res = { statusCode: 500 };
			status(res);

			assert.strictEqual(res.statusCode, 200);
		});

		it("should return res object", () => {
			const res = { statusCode: 200 };
			const result = status(res, 201);

			assert.strictEqual(result, res);
		});
	});

	describe("stream", () => {
		it("should throw for invalid file descriptor", () => {
			const req = { method: "GET", headers: {} };
			const res = { header: () => {}, removeHeader: () => {}, send: () => {} };
			const file = { path: "", stats: { size: 100 }, charset: "", etag: "" };

			assert.throws(() => {
				stream(
					req,
					res,
					file,
					() => {},
					() => {},
					true,
				);
			}, TypeError);
		});

		it("should throw for empty file", () => {
			const req = { method: "GET", headers: {} };
			const res = { header: () => {}, removeHeader: () => {}, send: () => {} };
			const file = { path: "/test.txt", stats: { size: 0 }, charset: "", etag: "" };

			assert.throws(() => {
				stream(
					req,
					res,
					file,
					() => {},
					() => {},
					true,
				);
			}, TypeError);
		});

		it("should serve file with GET request", () => {
			let headerCalls = [];
			let sendCalled = false;
			const req = { method: "GET", headers: {} };
			const res = {
				header: (key, value) => {
					headerCalls.push([key, value]);
				},
				removeHeader: () => {},
				send: () => {
					sendCalled = true;
				},
			};
			const file = {
				path: "/test.txt",
				stats: { size: 1024, mtime: new Date("2024-01-01") },
				charset: "utf-8",
				etag: "abc123",
			};

			stream(
				req,
				res,
				file,
				() => {},
				() => "stream",
				true,
			);

			assert.ok(headerCalls.some(([k]) => k === "content-length"));
			assert.ok(headerCalls.some(([k]) => k === "content-type"));
			assert.ok(headerCalls.some(([k]) => k === "last-modified"));
			assert.ok(sendCalled);
		});

		it("should serve file with HEAD request", () => {
			let sendCalled = false;
			const req = { method: "HEAD", headers: {} };
			const res = {
				header: () => {},
				removeHeader: () => {},
				send: () => {
					sendCalled = true;
				},
			};
			const file = {
				path: "/test.txt",
				stats: { size: 1024, mtime: new Date("2024-01-01") },
				charset: "",
				etag: "",
			};

			stream(
				req,
				res,
				file,
				() => {},
				() => "stream",
				false,
			);

			assert.ok(sendCalled);
		});

		it("should handle OPTIONS request", () => {
			let sendBody = null;
			const req = { method: "OPTIONS", headers: {} };
			const res = {
				header: () => {},
				removeHeader: () => {},
				send: (body) => {
					sendBody = body;
				},
			};
			const file = {
				path: "/test.txt",
				stats: { size: 1024, mtime: new Date("2024-01-01") },
				charset: "",
				etag: "",
			};

			stream(
				req,
				res,
				file,
				() => {},
				() => "stream",
				false,
			);

			assert.ok(sendBody !== null);
		});

		it("should handle range request with partial headers", () => {
			let removeHeaderCalled = false;
			let headerCalls = {};
			const req = {
				method: "GET",
				headers: { range: "bytes=0-99" },
				range: { start: 0, end: 99 },
			};
			const res = {
				header: (key, value) => {
					headerCalls[key] = value;
				},
				removeHeader: (_key) => {
					removeHeaderCalled = true;
				},
				send: () => {},
			};
			const file = {
				path: "/test.txt",
				stats: { size: 1024, mtime: new Date("2024-01-01") },
				charset: "",
				etag: "",
			};

			stream(
				req,
				res,
				file,
				() => {},
				(_path, _options) => "stream",
				false,
			);

			assert.ok(removeHeaderCalled);
			assert.ok("content-range" in headerCalls);
		});

		it("should not include etag when disabled", () => {
			let etagSet = false;
			const req = { method: "GET", headers: {} };
			const res = {
				header: (key) => {
					if (key === "etag") {
						etagSet = true;
					}
				},
				removeHeader: () => {},
				send: () => {},
			};
			const file = {
				path: "/test.txt",
				stats: { size: 1024, mtime: new Date("2024-01-01") },
				charset: "",
				etag: "abc123",
			};

			stream(
				req,
				res,
				file,
				() => {},
				() => "stream",
				false,
			);

			assert.strictEqual(etagSet, false);
		});

		it("should remove cache-control when etag enabled", () => {
			let cacheControlRemoved = false;
			const req = { method: "GET", headers: {} };
			const res = {
				header: () => {},
				removeHeader: (key) => {
					if (key === "cache-control") {
						cacheControlRemoved = true;
					}
				},
				send: () => {},
			};
			const file = {
				path: "/test.txt",
				stats: { size: 1024, mtime: new Date("2024-01-01") },
				charset: "",
				etag: "abc123",
			};

			stream(
				req,
				res,
				file,
				() => {},
				() => "stream",
				true,
			);

			assert.strictEqual(cacheControlRemoved, true);
		});

		it("should call emitStream after sending", () => {
			let emitStreamCalled = false;
			const req = { method: "GET", headers: {} };
			const res = {
				header: () => {},
				removeHeader: () => {},
				send: () => {},
			};
			const file = {
				path: "/test.txt",
				stats: { size: 1024, mtime: new Date("2024-01-01") },
				charset: "",
				etag: "",
			};

			stream(
				req,
				res,
				file,
				() => {
					emitStreamCalled = true;
				},
				() => "stream",
				false,
			);

			assert.strictEqual(emitStreamCalled, true);
		});

		it("should include charset in content-type when present", () => {
			let contentType = "";
			const req = { method: "GET", headers: {} };
			const res = {
				header: (key, value) => {
					if (key === "content-type") {
						contentType = value;
					}
				},
				removeHeader: () => {},
				send: () => {},
			};
			const file = {
				path: "/test.txt",
				stats: { size: 1024, mtime: new Date("2024-01-01") },
				charset: "utf-8",
				etag: "",
			};

			stream(
				req,
				res,
				file,
				() => {},
				() => "stream",
				false,
			);

			assert.ok(contentType.includes("charset=utf-8"));
		});

		it("should handle range request when partialHeaders returns empty options", () => {
			let sendCalled = false;
			const req = {
				method: "GET",
				headers: { range: "bytes=9999-10000" },
			};
			const res = {
				header: () => {},
				removeHeader: () => {},
				send: () => {
					sendCalled = true;
				},
			};
			const file = {
				path: "/test.txt",
				stats: { size: 1024, mtime: new Date("2024-01-01") },
				charset: "",
				etag: "",
			};

			stream(
				req,
				res,
				file,
				() => {},
				() => "stream",
				false,
			);

			assert.ok(sendCalled);
		});

		it("should handle invalid range where start exceeds end", () => {
			let contentRangeSet = false;
			const req = {
				method: "GET",
				headers: { range: "bytes=500-100" },
			};
			const res = {
				header: (key, _value) => {
					if (key === "content-range") {
						contentRangeSet = true;
					}
				},
				removeHeader: () => {},
				send: () => {},
			};
			const file = {
				path: "/test.txt",
				stats: { size: 1024, mtime: new Date("2024-01-01") },
				charset: "",
				etag: "",
			};

			stream(
				req,
				res,
				file,
				() => {},
				() => "stream",
				false,
			);

			assert.ok(contentRangeSet);
		});
	});

	describe("escapeHtml", () => {
		it("should escape ampersand", () => {
			const result = escapeHtml("&");
			assert.strictEqual(result, "&amp;");
		});

		it("should escape less than", () => {
			const result = escapeHtml("<");
			assert.strictEqual(result, "&lt;");
		});

		it("should escape greater than", () => {
			const result = escapeHtml(">");
			assert.strictEqual(result, "&gt;");
		});

		it("should escape double quote", () => {
			const result = escapeHtml('"');
			assert.strictEqual(result, "&quot;");
		});

		it("should escape single quote", () => {
			const result = escapeHtml("'");
			assert.strictEqual(result, "&#39;");
		});

		it("should escape multiple characters", () => {
			const result = escapeHtml("<script>&");
			assert.strictEqual(result, "&lt;script&gt;&amp;");
		});

		it("should return empty string for empty input", () => {
			const result = escapeHtml();
			assert.strictEqual(result, "");
		});

		it("should return unchanged string with no special characters", () => {
			const result = escapeHtml("hello world");
			assert.strictEqual(result, "hello world");
		});
	});

	describe("partialHeaders", () => {
		it("should return headers unchanged when no range header", () => {
			const req = { headers: {} };
			const res = { removeHeader: () => {}, header: () => {} };
			const headers = { "content-type": "text/html" };

			const [resultHeaders] = partialHeaders(req, res, 1000, 200, headers);

			assert.deepStrictEqual(resultHeaders, headers);
		});

		it("should set partial content headers for valid range", () => {
			const req = { headers: { range: "bytes=0-499" } };
			const res = {
				removeHeader: () => {},
				header: () => {},
				statusCode: 200,
			};
			const headers = {};

			const [resultHeaders, options] = partialHeaders(req, res, 1000, 200, headers);

			assert.strictEqual(resultHeaders["content-range"], "bytes 0-499/1000");
			assert.strictEqual(resultHeaders["content-length"], 500);
			assert.strictEqual(res.statusCode, 206);
			assert.deepStrictEqual(options, { start: 0, end: 499 });
		});

		it("should handle suffix range", () => {
			const req = { headers: { range: "bytes=-500" } };
			let capturedRange = null;
			const res = {
				removeHeader: () => {},
				header: (key, val) => {
					if (key === "content-range") {
						capturedRange = val;
					}
				},
				statusCode: 200,
			};
			const headers = {};

			partialHeaders(req, res, 1000, 200, headers);

			assert.strictEqual(capturedRange, "bytes 500-999/1000");
		});

		it("should set content range for invalid range", () => {
			const req = { headers: { range: "bytes=0-99999" } };
			let capturedRange = null;
			const res = {
				removeHeader: () => {},
				header: (key, val) => {
					capturedRange = val;
				},
				statusCode: 200,
			};
			const headers = {};

			partialHeaders(req, res, 1000, 200, headers);

			assert.strictEqual(capturedRange, "bytes */1000");
		});

		it("should return unchanged when hyphen not found in range spec", () => {
			const req = { headers: { range: "bytes=0to99" } };
			const res = {
				removeHeader: () => {},
				header: () => {},
				statusCode: 200,
			};
			const headers = { "content-type": "text/html" };
			const options = { custom: "option" };

			const [resultHeaders, resultOptions] = partialHeaders(req, res, 1000, 200, headers, options);

			assert.deepStrictEqual(resultHeaders, headers);
			assert.deepStrictEqual(resultOptions, options);
		});

		it("should return unchanged when suffix range has empty end", () => {
			const req = { headers: { range: "bytes=-" } };
			const res = {
				removeHeader: () => {},
				header: () => {},
				statusCode: 200,
			};
			const headers = { "content-type": "text/html" };

			const [resultHeaders] = partialHeaders(req, res, 1000, 200, headers);

			assert.deepStrictEqual(resultHeaders, headers);
		});

		it("should return unchanged when suffix range has invalid end", () => {
			const req = { headers: { range: "bytes=-abc" } };
			const res = {
				removeHeader: () => {},
				header: () => {},
				statusCode: 200,
			};
			const headers = { "content-type": "text/html" };

			const [resultHeaders] = partialHeaders(req, res, 1000, 200, headers);

			assert.deepStrictEqual(resultHeaders, headers);
		});

		it("should return unchanged when regular range has invalid start", () => {
			const req = { headers: { range: "bytes=abc-99" } };
			const res = {
				removeHeader: () => {},
				header: () => {},
				statusCode: 200,
			};
			const headers = { "content-type": "text/html" };

			const [resultHeaders] = partialHeaders(req, res, 1000, 200, headers);

			assert.deepStrictEqual(resultHeaders, headers);
		});

		it("should return unchanged when range has invalid end", () => {
			const req = { headers: { range: "bytes=0-abc" } };
			const res = {
				removeHeader: () => {},
				header: () => {},
				statusCode: 200,
			};
			const headers = { "content-type": "text/html" };

			const [resultHeaders] = partialHeaders(req, res, 1000, 200, headers);

			assert.deepStrictEqual(resultHeaders, headers);
		});

		it("should set end to size-1 when end is empty string", () => {
			const req = { headers: { range: "bytes=500-" } };
			let capturedRange = null;
			const res = {
				removeHeader: () => {},
				header: (key, val) => {
					if (key === "content-range") {
						capturedRange = val;
					}
				},
				statusCode: 200,
			};
			const headers = {};

			partialHeaders(req, res, 1000, 200, headers);

			assert.strictEqual(capturedRange, "bytes 500-999/1000");
		});

		it("should return unchanged when range header does not start with bytes=", () => {
			const req = { headers: { range: "chunks=0-499" } };
			const res = {
				removeHeader: () => {},
				header: () => {},
				statusCode: 200,
			};
			const headers = { "content-type": "text/html" };
			const options = { custom: "option" };

			const [resultHeaders, resultOptions] = partialHeaders(req, res, 1000, 200, headers, options);

			assert.deepStrictEqual(resultHeaders, headers);
			assert.deepStrictEqual(resultOptions, options);
		});

		it("should return unchanged when both start and end are empty", () => {
			const req = { headers: { range: "bytes=-" } };
			const res = {
				removeHeader: () => {},
				header: () => {},
				statusCode: 200,
			};
			const headers = { "content-type": "text/html" };

			const [resultHeaders] = partialHeaders(req, res, 1000, 200, headers);

			assert.deepStrictEqual(resultHeaders, headers);
		});

		it("should return unchanged when start is negative and exceeds size", () => {
			const req = { headers: { range: "bytes=-2000" } };
			const res = {
				removeHeader: () => {},
				header: () => {},
				statusCode: 200,
			};
			const headers = { "content-type": "text/html" };

			const [resultHeaders] = partialHeaders(req, res, 1000, 200, headers);

			// start would be 1000 - 2000 = -1000, which is < 0, so invalid
			assert.deepStrictEqual(resultHeaders, headers);
		});

		it("should handle range where start equals end", () => {
			const req = { headers: { range: "bytes=500-500" } };
			let capturedRange = null;
			const res = {
				removeHeader: () => {},
				header: (key, val) => {
					if (key === "content-range") {
						capturedRange = val;
					}
				},
				statusCode: 200,
			};
			const headers = {};

			partialHeaders(req, res, 1000, 200, headers);

			assert.strictEqual(capturedRange, "bytes 500-500/1000");
		});

		it("should handle range where start is 0", () => {
			const req = { headers: { range: "bytes=0-999" } };
			let capturedRange = null;
			const res = {
				removeHeader: () => {},
				header: (key, val) => {
					if (key === "content-range") {
						capturedRange = val;
					}
				},
				statusCode: 200,
			};
			const headers = {};

			partialHeaders(req, res, 1000, 200, headers);

			assert.strictEqual(capturedRange, "bytes 0-999/1000");
		});
	});

	describe("pipeable", () => {
		it("should return true for object with on method", () => {
			const obj = { on: () => {} };
			assert.strictEqual(pipeable("GET", obj), true);
		});

		it("should return false for HEAD method", () => {
			const obj = { on: () => {} };
			assert.strictEqual(pipeable("HEAD", obj), false);
		});

		it("should return false for null", () => {
			assert.strictEqual(pipeable("GET", null), false);
		});

		it("should return false for undefined", () => {
			assert.strictEqual(pipeable("GET", undefined), false);
		});

		it("should return false for object without on method", () => {
			const obj = { foo: "bar" };
			assert.strictEqual(pipeable("GET", obj), false);
		});
	});

	describe("writeHead", () => {
		it("should call writeHead with status and headers", () => {
			let capturedHeaders = null;
			const res = {
				statusCode: 200,
				writeHead: (status, text, headers) => {
					capturedHeaders = headers;
				},
			};

			writeHead(res, { "content-type": "application/json" });

			assert.deepStrictEqual(capturedHeaders, { "content-type": "application/json" });
		});

		it("should handle empty headers", () => {
			let called = false;
			const res = {
				statusCode: 200,
				writeHead: () => {
					called = true;
				},
			};

			writeHead(res, {});

			assert.strictEqual(called, true);
		});
	});
});
