import assert from "node:assert";
import { describe, it } from "node:test";
import { mime, getStatusText, error, json, redirect, send } from "../../src/response.js";

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

		it("should return Error for unknown status", () => {
			assert.strictEqual(getStatusText(999), "Error");
		});
	});

	describe("error", () => {
		it("should handle string error", () => {
			let emitted = false;
			let logged = false;

			const req = { method: "GET" };
			const res = {
				headersSent: false,
				removeHeader: () => {},
				header: () => {},
				statusCode: 500,
			};

			error(
				req,
				res,
				(_req, _res, _err) => {
					emitted = true;
				},
				(_req, _status) => {
					logged = true;
				},
				500,
				"Internal Error",
			);

			assert.strictEqual(emitted, true);
			assert.strictEqual(logged, true);
		});

		it("should handle Error object", () => {
			let errorReceived = null;

			const req = { method: "GET" };
			const res = {
				headersSent: false,
				removeHeader: () => {},
				header: () => {},
				statusCode: 500,
			};

			const err = new Error("Test error");
			error(
				req,
				res,
				(req, res, err) => {
					errorReceived = err;
				},
				() => {},
				500,
				err,
			);

			assert.strictEqual(errorReceived, err);
		});

		it("should not handle when headers already sent", () => {
			let called = false;

			const req = { method: "GET" };
			const res = {
				headersSent: true,
				removeHeader: () => {},
				header: () => {},
				statusCode: 500,
			};

			error(
				req,
				res,
				() => {
					called = true;
				},
				() => {},
				500,
				"Error",
			);

			assert.strictEqual(called, false);
		});

		it("should clear allow header for 404", () => {
			let allowRemoved = false;

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

			error(
				req,
				res,
				() => {},
				() => {},
				404,
				"Not Found",
			);

			assert.strictEqual(allowRemoved, true);
		});

		it("should clear CORS headers for 404", () => {
			let corsRemoved = false;

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

			error(
				req,
				res,
				() => {},
				() => {},
				404,
				"Not Found",
			);

			assert.strictEqual(corsRemoved, true);
		});

		it("should create Error from undefined body", () => {
			let errorReceived = null;

			const req = { method: "GET" };
			const res = {
				headersSent: false,
				removeHeader: () => {},
				header: () => {},
				statusCode: 500,
			};

			error(
				req,
				res,
				(req, res, err) => {
					errorReceived = err;
				},
				() => {},
				500,
				void 0,
			);

			assert.strictEqual(errorReceived instanceof Error, true);
		});
	});

	describe("json", () => {
		it("should create json response function", () => {
			let sentData = null;
			let sentStatus = null;

			const res = {
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
	});
});
