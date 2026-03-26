import assert from "node:assert";
import { describe, it } from "node:test";
import {
	createErrorHandler,
	createJsonHandler,
	createRedirectHandler,
	createSendHandler,
	createSetHandler,
	createStatusHandler,
	getStatusText,
} from "../../src/response.js";

describe("responses", () => {
	describe("getStatusText", () => {
		it("should return status text for common codes", () => {
			assert.strictEqual(getStatusText(200), "OK");
			assert.strictEqual(getStatusText(201), "Created");
			assert.strictEqual(getStatusText(404), "Not Found");
			assert.strictEqual(getStatusText(500), "Internal Server Error");
		});

		it("should return default text for unknown codes", () => {
			assert.strictEqual(getStatusText(999), "Internal Server Error");
		});
	});

	describe("createErrorHandler", () => {
		it("should create error handler that calls send", () => {
			let sendCalled = false;
			let errorEmitted = false;
			let statusCode = 200;
			let contentLengthRemoved = false;

			const req = { parsed: { pathname: "/test" }, method: "GET", ip: "127.0.0.1" };
			const res = {
				statusCode: 200,
				headersSent: false,
				removeHeader: (name) => {
					if (name === "content-length") {
						contentLengthRemoved = true;
					}
				},
				send: () => {
					sendCalled = true;
				},
			};
			const emitter = {
				emit: () => {
					errorEmitted = true;
				},
			};

			const errorHandler = createErrorHandler(req, res, emitter);
			errorHandler(404, "Not found");

			assert.ok(sendCalled);
			assert.ok(errorEmitted);
			assert.strictEqual(statusCode, 200);
			assert.ok(contentLengthRemoved);
		});
	});

	describe("createJsonHandler", () => {
		it("should create json handler that calls send", () => {
			let sendCalled = false;

			const res = {
				statusCode: 200,
				send: () => {
					sendCalled = true;
				},
			};

			const jsonHandler = createJsonHandler(res);
			jsonHandler({ test: "data" });

			assert.ok(sendCalled);
		});
	});

	describe("createRedirectHandler", () => {
		it("should create redirect handler that calls send", () => {
			let sendCalled = false;

			const res = {
				send: () => {
					sendCalled = true;
				},
			};

			const redirectHandler = createRedirectHandler(res);
			redirectHandler("/new-location", true);

			assert.ok(sendCalled);
		});
	});

	describe("createSendHandler", () => {
		it("should create send handler", () => {
			let onReadyCalled = false;
			let onDoneCalled = false;

			const req = { method: "GET", headers: {} };
			const res = {
				statusCode: 200,
				headersSent: false,
			};

			const sendHandler = createSendHandler(
				req,
				res,
				() => {
					onReadyCalled = true;
					return ["body", 200, {}];
				},
				() => {
					onDoneCalled = true;
				},
			);

			sendHandler("test body");

			assert.ok(onReadyCalled);
			assert.ok(onDoneCalled);
		});
	});

	describe("createSetHandler", () => {
		it("should create set handler that calls setHeader", () => {
			let setHeaderCalled = false;

			const res = {
				setHeader: () => {
					setHeaderCalled = true;
				},
			};

			const setHandler = createSetHandler(res);
			setHandler({ "x-custom": "value" });

			assert.ok(setHeaderCalled);
		});
	});

	describe("createStatusHandler", () => {
		it("should create status handler that sets statusCode", () => {
			const res = {
				statusCode: 200,
			};

			const statusHandler = createStatusHandler(res);
			statusHandler(404);

			assert.strictEqual(res.statusCode, 404);
		});
	});
});
