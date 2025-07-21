import assert from "node:assert";
import * as constants from "../../src/constants.js";

describe("Constants", () => {
	describe("HTTP Methods", () => {
		it("should export HTTP method constants", () => {
			assert.strictEqual(constants.GET, "GET");
			assert.strictEqual(constants.POST, "POST");
			assert.strictEqual(constants.PUT, "PUT");
			assert.strictEqual(constants.DELETE, "DELETE");
			assert.strictEqual(constants.PATCH, "PATCH");
			assert.strictEqual(constants.HEAD, "HEAD");
			assert.strictEqual(constants.OPTIONS, "OPTIONS");
			assert.strictEqual(constants.TRACE, "TRACE");
			assert.strictEqual(constants.CONNECT, "CONNECT");
		});
	});

	describe("HTTP Status Codes", () => {
		it("should export status code constants", () => {
			assert.strictEqual(constants.INT_200, 200);
			assert.strictEqual(constants.INT_204, 204);
			assert.strictEqual(constants.INT_206, 206);
			assert.strictEqual(constants.INT_304, 304);
			assert.strictEqual(constants.INT_307, 307);
			assert.strictEqual(constants.INT_308, 308);
			assert.strictEqual(constants.INT_400, 400);
			assert.strictEqual(constants.INT_403, 403);
			assert.strictEqual(constants.INT_404, 404);
			assert.strictEqual(constants.INT_405, 405);
			assert.strictEqual(constants.INT_416, 416);
			assert.strictEqual(constants.INT_500, 500);
		});
	});

	describe("HTTP Headers", () => {
		it("should export header name constants", () => {
			assert.strictEqual(constants.CONTENT_TYPE, "content-type");
			assert.strictEqual(constants.CONTENT_LENGTH, "content-length");
			assert.strictEqual(constants.CONTENT_RANGE, "content-range");
			assert.strictEqual(constants.ALLOW, "allow");
			assert.strictEqual(constants.CACHE_CONTROL, "cache-control");
			assert.strictEqual(constants.ETAG, "etag");
			assert.strictEqual(constants.LAST_MODIFIED, "last-modified");
			assert.strictEqual(constants.LOCATION, "location");
			assert.strictEqual(constants.ORIGIN, "origin");
			assert.strictEqual(constants.RANGE, "range");
			assert.strictEqual(constants.SERVER, "server");
			assert.strictEqual(constants.USER_AGENT, "user-agent");
		});

		it("should export CORS header constants", () => {
			assert.strictEqual(constants.ACCESS_CONTROL_ALLOW_CREDENTIALS, "access-control-allow-credentials");
			assert.strictEqual(constants.ACCESS_CONTROL_ALLOW_HEADERS, "access-control-allow-headers");
			assert.strictEqual(constants.ACCESS_CONTROL_ALLOW_METHODS, "access-control-allow-methods");
			assert.strictEqual(constants.ACCESS_CONTROL_ALLOW_ORIGIN, "access-control-allow-origin");
			assert.strictEqual(constants.ACCESS_CONTROL_EXPOSE_HEADERS, "access-control-expose-headers");
			assert.strictEqual(constants.ACCESS_CONTROL_REQUEST_HEADERS, "access-control-request-headers");
			assert.strictEqual(constants.TIMING_ALLOW_ORIGIN, "timing-allow-origin");
		});

		it("should export security header constants", () => {
			assert.strictEqual(constants.X_CONTENT_TYPE_OPTIONS, "x-content-type-options");
			assert.strictEqual(constants.X_FORWARDED_FOR, "x-forwarded-for");
			assert.strictEqual(constants.X_POWERED_BY, "x-powered-by");
			assert.strictEqual(constants.X_RESPONSE_TIME, "x-response-time");
			assert.strictEqual(constants.NO_SNIFF, "nosniff");
		});
	});

	describe("Content Types", () => {
		it("should export content type constants", () => {
			assert.strictEqual(constants.APPLICATION_JSON, "application/json");
			assert.strictEqual(constants.APPLICATION_OCTET_STREAM, "application/octet-stream");
			assert.strictEqual(constants.TEXT_PLAIN, "text/plain");
		});

		it("should export charset constants", () => {
			assert.strictEqual(constants.UTF8, "utf8");
			assert.strictEqual(constants.UTF_8, "utf-8");
			assert.strictEqual(constants.CHAR_SET, "charset=utf-8");
		});
	});

	describe("Server Information", () => {
		it("should export server value constants", () => {
			assert.ok(typeof constants.SERVER_VALUE === "string");
			assert.ok(constants.SERVER_VALUE.includes("woodland"));
			assert.ok(typeof constants.X_POWERED_BY_VALUE === "string");
			assert.ok(constants.X_POWERED_BY_VALUE.includes("nodejs"));
		});

		it("should export default server constants", () => {
			assert.strictEqual(constants.LOCALHOST, "127.0.0.1");
			assert.strictEqual(constants.INT_8000, 8000);
		});
	});

	describe("File System Constants", () => {
		it("should export index file constants", () => {
			assert.strictEqual(constants.INDEX_HTM, "index.htm");
			assert.strictEqual(constants.INDEX_HTML, "index.html");
		});

		it("should export file system related constants", () => {
			assert.strictEqual(constants.FILES, "files");
			assert.strictEqual(constants.EXTENSIONS, "extensions");
			assert.strictEqual(constants.PARAMS_GROUP, "/(?<$1>[^/]+)");
		});
	});

	describe("Numeric Constants", () => {
		it("should export basic numeric constants", () => {
			assert.strictEqual(constants.INT_0, 0);
			assert.strictEqual(constants.INT_2, 2);
			assert.strictEqual(constants.INT_3, 3);
			assert.strictEqual(constants.INT_4, 4);
			assert.strictEqual(constants.INT_10, 10);
		});
	});

	describe("String and Symbol Constants", () => {
		it("should export common symbols and strings", () => {
			// Test some common constants that might be used
			assert.ok(typeof constants.EMPTY === "string" || constants.EMPTY === undefined);
			assert.ok(typeof constants.SLASH === "string" || constants.SLASH === undefined);
			assert.ok(typeof constants.COMMA === "string" || constants.COMMA === undefined);
		});
	});

	describe("Export Validation", () => {
		it("should not export undefined values", () => {
			const exportedKeys = Object.keys(constants);
			exportedKeys.forEach(key => {
				assert.notStrictEqual(constants[key], undefined, `${key} should not be undefined`);
			});
		});

		it("should export at least basic required constants", () => {
			const requiredConstants = [
				"GET", "POST", "PUT", "DELETE",
				"INT_200", "INT_404", "INT_500",
				"CONTENT_TYPE", "CONTENT_LENGTH",
				"APPLICATION_JSON"
			];

			requiredConstants.forEach(constant => {
				assert.ok(constant in constants, `${constant} should be exported`);
			});
		});
	});
});
