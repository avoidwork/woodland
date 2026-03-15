import assert from "node:assert";
import { describe, it } from "node:test";
import {
	autoindex,
	getStatus,
	mime,
	ms,
	next,
	params,
	parse,
	partialHeaders,
	pipeable,
	reduce,
	timeOffset,
	writeHead,
	isValidIP,
	extractPath,
	mimeExtensions,
} from "../../src/utility.js";

describe("utility", () => {
	describe("autoindex", () => {
		it("should generate HTML for empty directory", () => {
			const result = autoindex("Test Directory", []);

			assert.ok(result.includes("<!doctype html>"));
			assert.ok(result.includes("Test Directory"));
			assert.ok(result.includes("../"));
		});

		it("should generate HTML for directory with files", () => {
			const files = [
				{ name: "file1.txt", isDirectory: () => false },
				{ name: "dir1", isDirectory: () => true },
			];

			const result = autoindex("Test", files);

			assert.ok(result.includes("file1.txt"));
			assert.ok(result.includes("dir1/"));
		});

		it("should escape HTML in filenames", () => {
			const files = [{ name: '<script>alert("xss")</script>', isDirectory: () => false }];

			const result = autoindex("Test", files);

			assert.ok(result.includes("&lt;script&gt;"));
			assert.ok(result.includes('rel="item"'));
		});

		it("should escape HTML in title", () => {
			const result = autoindex('<script>alert("xss")</script>', []);

			assert.ok(result.includes("&lt;script&gt;"));
		});

		it("should handle directory entries with trailing slash", () => {
			const files = [{ name: "folder", isDirectory: () => true }];

			const result = autoindex("Test", files);

			assert.ok(result.includes("folder/"));
			assert.ok(result.includes('href="folder/"'));
		});

		it("should handle files with special characters in names", () => {
			const files = [{ name: "file with spaces.txt", isDirectory: () => false }];

			const result = autoindex("Test", files);

			assert.ok(result.includes("file%20with%20spaces.txt"));
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

	describe("mime", () => {
		it("should return MIME type for .html file", () => {
			const result = mime("test.html");

			assert.strictEqual(result, "text/html");
		});

		it("should return MIME type for .json file", () => {
			const result = mime("test.json");

			assert.strictEqual(result, "application/json");
		});

		it("should return MIME type for .png file", () => {
			const result = mime("test.png");

			assert.strictEqual(result, "image/png");
		});

		it("should return MIME type for .js file", () => {
			const result = mime("test.js");

			assert.strictEqual(result, "text/javascript");
		});

		it("should return octet-stream for unknown extension", () => {
			const result = mime("test.nonexistent123");

			assert.strictEqual(result, "application/octet-stream");
		});

		it("should return octet-stream for no extension", () => {
			const result = mime("testfile");

			assert.strictEqual(result, "application/octet-stream");
		});

		it("should return octet-stream for empty string", () => {
			const result = mime();

			assert.strictEqual(result, "application/octet-stream");
		});
	});

	describe("ms", () => {
		it("should format nanoseconds to milliseconds with default precision", () => {
			const result = ms(1000000);

			assert.strictEqual(result, "1.000 ms");
		});

		it("should format with custom precision", () => {
			const result = ms(1000000, 2);

			assert.strictEqual(result, "1.00 ms");
		});

		it("should format with zero precision", () => {
			const result = ms(1000000, 0);

			assert.strictEqual(result, "1 ms");
		});

		it("should handle zero input", () => {
			const result = ms(0);

			assert.strictEqual(result, "0.000 ms");
		});

		it("should handle fractional milliseconds", () => {
			const result = ms(1500);

			assert.strictEqual(result, "0.002 ms");
		});
	});

	describe("next", () => {
		it("should create next function", () => {
			const req = { allow: [], method: "GET" };
			const res = { statusCode: 500, error: () => {} };
			const middleware = { next: () => ({ done: true }) };

			const fn = next(req, res, middleware);

			assert.strictEqual(typeof fn, "function");
		});

		it("should call error handler when middleware is done", async () => {
			let errorCalled = false;
			const req = { allow: [], method: "GET" };
			const res = {
				statusCode: 500,
				error: () => {
					errorCalled = true;
				},
			};
			const middleware = { next: () => ({ done: true }) };

			const fn = next(req, res, middleware);
			fn();

			await new Promise((resolve) => setTimeout(resolve, 10));
			assert.strictEqual(errorCalled, true);
		});

		it("should execute middleware when not done", async () => {
			let middlewareExecuted = false;
			const req = { allow: ["GET"], method: "GET" };
			const res = { statusCode: 200, error: () => {} };
			const handler = () => {
				middlewareExecuted = true;
			};
			const middleware = {
				next: () => ({ done: false, value: handler }),
			};

			const fn = next(req, res, middleware);
			fn();

			await new Promise((resolve) => setTimeout(resolve, 10));
			assert.strictEqual(middlewareExecuted, true);
		});

		it("should create immediate next function when immediate is true", () => {
			const req = { allow: [], method: "GET" };
			const res = { statusCode: 500, error: () => {} };
			const middleware = { next: () => ({ done: true }) };

			const fn = next(req, res, middleware, true);

			assert.strictEqual(typeof fn, "function");
		});

		it("should find error handler when error is passed", async () => {
			let errorHandlerCalled = false;
			const req = { allow: [], method: "GET" };
			const res = { statusCode: 500, error: () => {} };
			const errorHandler = (_err, _req, _res, _fn) => {
				errorHandlerCalled = true;
			};
			const middleware = {
				next: () => ({ done: false, value: errorHandler }),
			};

			const fn = next(req, res, middleware);
			fn(new Error("test"));

			await new Promise((resolve) => setTimeout(resolve, 10));
			assert.strictEqual(errorHandlerCalled, true);
		});

		it("should send value when middleware returns non-function", async () => {
			let sentValue = null;
			const req = { allow: ["GET"], method: "GET" };
			const res = {
				statusCode: 200,
				error: () => {},
				send: (value) => {
					sentValue = value;
				},
			};
			const middleware = {
				next: () => ({ done: false, value: { message: "hello" } }),
			};

			const fn = next(req, res, middleware);
			fn();

			await new Promise((resolve) => setTimeout(resolve, 10));
			assert.deepStrictEqual(sentValue, { message: "hello" });
		});

		it("should skip non-error-handlers when error is passed", async () => {
			let errorCalled = false;
			const req = { allow: [], method: "GET" };
			const res = {
				statusCode: 500,
				error: () => {
					errorCalled = true;
				},
			};
			let callCount = 0;
			const middleware = {
				next: () => {
					callCount++;
					if (callCount === 1) {
						return { done: false, value: () => {} };
					}
					return { done: true };
				},
			};

			const fn = next(req, res, middleware);
			fn(new Error("test"));

			await new Promise((resolve) => setTimeout(resolve, 10));
			assert.strictEqual(errorCalled, true);
		});
	});

	describe("params", () => {
		it("should extract parameters from URL", () => {
			const req = {
				parsed: { pathname: "/users/123" },
				params: {},
			};
			const getParams = /\/users\/(?<id>[^/]+)/;

			params(req, getParams);

			assert.strictEqual(req.params.id, 123);
		});

		it("should extract multiple parameters", () => {
			const req = {
				parsed: { pathname: "/users/123/posts/456" },
				params: {},
			};
			const getParams = /\/users\/(?<userId>[^/]+)\/posts\/(?<postId>[^/]+)/;

			params(req, getParams);

			assert.strictEqual(req.params.userId, 123);
			assert.strictEqual(req.params.postId, 456);
		});

		it("should set empty params object when no match", () => {
			const req = {
				parsed: { pathname: "/other" },
				params: { existing: "value" },
			};
			const getParams = /\/users\/(?<id>[^/]+)/;

			params(req, getParams);

			assert.deepStrictEqual(req.params, {});
		});

		it("should handle null parameter values", () => {
			const req = {
				parsed: { pathname: "/users/" },
				params: {},
			};
			const getParams = /\/users\/(?<id>[^/]*)/;

			params(req, getParams);

			assert.strictEqual(req.params.id, "");
		});

		it("should handle undefined parameter values", () => {
			const req = {
				parsed: { pathname: "/users/" },
				params: {},
			};
			const getParams = /\/users\/(?<id>[^/]*)?/;

			params(req, getParams);

			assert.strictEqual(req.params.id, null);
		});

		it("should decode URL-encoded parameters", () => {
			const req = {
				parsed: { pathname: "/users/john%20doe" },
				params: {},
			};
			const getParams = /\/users\/(?<id>[^/]+)/;

			params(req, getParams);

			assert.strictEqual(req.params.id, "john doe");
		});

		it("should escape HTML in parameters", () => {
			const req = {
				parsed: { pathname: "/users/<script>" },
				params: {},
			};
			const getParams = /\/users\/(?<id>[^/]+)/;

			params(req, getParams);

			assert.strictEqual(req.params.id, "&lt;script&gt;");
		});

		it("should handle malformed URL encoding gracefully", () => {
			const req = {
				parsed: { pathname: "/users/%ZZ" },
				params: {},
			};
			const getParams = /\/users\/(?<id>[^/]+)/;

			params(req, getParams);

			assert.strictEqual(req.params.id, "%ZZ");
		});
	});

	describe("parse", () => {
		it("should parse URL string", () => {
			const result = parse("http://example.com/test");

			assert.ok(result instanceof URL);
			assert.strictEqual(result.hostname, "example.com");
			assert.strictEqual(result.pathname, "/test");
		});

		it("should parse request object with host header", () => {
			const req = {
				headers: { host: "example.com" },
				url: "/test",
				socket: null,
			};

			const result = parse(req);

			assert.ok(result instanceof URL);
			assert.strictEqual(result.hostname, "example.com");
			assert.strictEqual(result.pathname, "/test");
		});

		it("should parse request object with IPv6 host", () => {
			const req = {
				headers: { host: "[::1]:8000" },
				url: "/test",
				socket: null,
			};

			const result = parse(req);

			assert.ok(result instanceof URL);
			assert.strictEqual(result.hostname, "[::1]");
		});

		it("should use localhost:8000 as default when no host", () => {
			const req = {
				headers: {},
				url: "/test",
				socket: null,
			};

			const result = parse(req);

			assert.ok(result instanceof URL);
			assert.strictEqual(result.hostname, "localhost");
			assert.strictEqual(result.port, "8000");
		});
	});

	describe("partialHeaders", () => {
		it("should return original headers when no range header", () => {
			const req = { headers: {} };
			const res = { removeHeader: () => {}, header: () => {} };
			const size = 1000;

			const [headers, options] = partialHeaders(req, res, size, 200);

			assert.deepStrictEqual(headers, {});
			assert.deepStrictEqual(options, {});
		});

		it("should handle valid byte range", () => {
			const req = { headers: { range: "bytes=0-499" } };
			const res = {
				removeHeader: () => {},
				header: () => {},
				statusCode: 200,
			};

			const [headers, options] = partialHeaders(req, res, 1000, 200);

			assert.strictEqual(headers["content-range"], "bytes 0-499/1000");
			assert.strictEqual(headers["content-length"], 500);
			assert.strictEqual(res.statusCode, 206);
			assert.strictEqual(options.start, 0);
			assert.strictEqual(options.end, 499);
		});

		it("should handle suffix range", () => {
			const req = { headers: { range: "bytes=-500" } };
			const res = {
				removeHeader: () => {},
				header: () => {},
				statusCode: 200,
			};

			const [headers, options] = partialHeaders(req, res, 1000, 200);

			assert.strictEqual(headers["content-range"], "bytes 500-999/1000");
			assert.strictEqual(options.start, 500);
			assert.strictEqual(options.end, 999);
		});

		it("should handle open-ended range", () => {
			const req = { headers: { range: "bytes=500-" } };
			const res = {
				removeHeader: () => {},
				header: () => {},
				statusCode: 200,
			};

			const [headers, options] = partialHeaders(req, res, 1000, 200);

			assert.strictEqual(headers["content-range"], "bytes 500-999/1000");
			assert.strictEqual(options.start, 500);
			assert.strictEqual(options.end, 999);
		});

		it("should return Content-Range: */size for invalid range", () => {
			const req = { headers: { range: "bytes=9999-10000" } };
			const res = {
				removeHeader: () => {},
				header: () => {},
				statusCode: 200,
			};

			const [headers] = partialHeaders(req, res, 1000, 200);

			assert.strictEqual(headers["content-range"], "bytes */1000");
		});

		it("should handle invalid range with no hyphen", () => {
			const req = { headers: { range: "bytes=12345" } };
			const res = {
				removeHeader: () => {},
				header: () => {},
				statusCode: 200,
			};

			const [headers, options] = partialHeaders(req, res, 1000, 200);

			assert.deepStrictEqual(headers, {});
			assert.deepStrictEqual(options, {});
		});

		it("should handle invalid range with non-numeric start", () => {
			const req = { headers: { range: "bytes=abc-500" } };
			const res = {
				removeHeader: () => {},
				header: () => {},
				statusCode: 200,
			};

			const [headers, options] = partialHeaders(req, res, 1000, 200);

			assert.deepStrictEqual(headers, {});
			assert.deepStrictEqual(options, {});
		});

		it("should handle invalid range with non-numeric end", () => {
			const req = { headers: { range: "bytes=0-abc" } };
			const res = {
				removeHeader: () => {},
				header: () => {},
				statusCode: 200,
			};

			const [headers, options] = partialHeaders(req, res, 1000, 200);

			assert.deepStrictEqual(headers, {});
			assert.deepStrictEqual(options, {});
		});

		it("should handle invalid suffix range with empty end", () => {
			const req = { headers: { range: "bytes=-" } };
			const res = {
				removeHeader: () => {},
				header: () => {},
				statusCode: 200,
			};

			const [headers, options] = partialHeaders(req, res, 1000, 200);

			assert.deepStrictEqual(headers, {});
			assert.deepStrictEqual(options, {});
		});

		it("should handle invalid suffix range with non-numeric end", () => {
			const req = { headers: { range: "bytes=-abc" } };
			const res = {
				removeHeader: () => {},
				header: () => {},
				statusCode: 200,
			};

			const [headers, options] = partialHeaders(req, res, 1000, 200);

			assert.deepStrictEqual(headers, {});
			assert.deepStrictEqual(options, {});
		});

		it("should ignore multiple range specifications", () => {
			const req = { headers: { range: "bytes=0-100, 200-300" } };
			const res = {
				removeHeader: () => {},
				header: () => {},
				statusCode: 200,
			};

			const [headers] = partialHeaders(req, res, 1000, 200);

			assert.strictEqual(headers["content-range"], "bytes 0-100/1000");
		});
	});

	describe("pipeable", () => {
		it("should return true for object with on method", () => {
			const result = pipeable("GET", { on: () => {} });

			assert.strictEqual(result, true);
		});

		it("should return false for HEAD method", () => {
			const result = pipeable("HEAD", { on: () => {} });

			assert.strictEqual(result, false);
		});

		it("should return false for null", () => {
			const result = pipeable("GET", null);

			assert.strictEqual(result, false);
		});

		it("should return false for undefined", () => {
			const result = pipeable("GET", undefined);

			assert.strictEqual(result, false);
		});

		it("should return false for object without on method", () => {
			const result = pipeable("GET", {});

			assert.strictEqual(result, false);
		});
	});

	describe("reduce", () => {
		it("should return undefined for empty map", () => {
			const result = reduce("/test", new Map(), { middleware: [], params: false });

			assert.strictEqual(result, void 0);
		});

		it("should collect middleware for matching route", () => {
			const middleware = new Map();
			const middlewareArray = [];

			middleware.set("/", {
				regex: /^\/$/,
				handlers: [() => {}],
				params: false,
			});

			reduce("/", middleware, { middleware: middlewareArray, params: false });

			assert.strictEqual(middlewareArray.length, 1);
		});

		it("should collect multiple handlers for matching route", () => {
			const middleware = new Map();
			const middlewareArray = [];

			middleware.set("/", {
				regex: /^\/$/,
				handlers: [() => {}, () => {}],
				params: false,
			});

			reduce("/", middleware, { middleware: middlewareArray, params: false });

			assert.strictEqual(middlewareArray.length, 2);
		});

		it("should set params flag when parameterized route matches", () => {
			const middleware = new Map();
			const arg = { middleware: [], params: false };

			middleware.set("/:id", {
				regex: /^\/([^/]+)$/,
				handlers: [() => {}],
				params: true,
			});

			reduce("/123", middleware, arg);

			assert.strictEqual(arg.params, true);
			assert.ok(arg.getParams);
		});

		it("should not override params flag once set", () => {
			const middleware = new Map();
			const arg = { middleware: [], params: true };

			middleware.set("/test", {
				regex: /^\/test$/,
				handlers: [() => {}],
				params: true,
			});

			reduce("/test", middleware, arg);

			assert.strictEqual(arg.params, true);
		});

		it("should handle wildcard middleware", () => {
			const middleware = new Map();
			const middlewareArray = [];

			middleware.set(".*", {
				regex: /^.*$/,
				handlers: [() => {}],
				params: false,
			});

			reduce("/any/path", middleware, { middleware: middlewareArray, params: false });

			assert.strictEqual(middlewareArray.length, 1);
		});
	});

	describe("timeOffset", () => {
		it("should format positive offset", () => {
			const result = timeOffset(300);

			assert.strictEqual(result, "-0500");
		});

		it("should format negative offset", () => {
			const result = timeOffset(-300);

			assert.strictEqual(result, "0500");
		});

		it("should format zero offset", () => {
			const result = timeOffset(0);

			assert.strictEqual(result, "-0000");
		});

		it("should format offset with minutes", () => {
			const result = timeOffset(330);

			assert.strictEqual(result, "-0530");
		});

		it("should format large offset", () => {
			const result = timeOffset(540);

			assert.strictEqual(result, "-0900");
		});
	});

	describe("writeHead", () => {
		it("should write headers to response", () => {
			let writtenHeaders = null;
			let writtenStatus = null;
			let writtenStatusText = null;

			const res = {
				statusCode: 200,
				writeHead: (status, statusText, headers) => {
					writtenStatus = status;
					writtenStatusText = statusText;
					writtenHeaders = headers;
				},
			};

			writeHead(res, { "content-type": "application/json" });

			assert.strictEqual(writtenStatus, 200);
			assert.ok(writtenStatusText);
			assert.strictEqual(writtenHeaders["content-type"], "application/json");
		});
	});

	describe("isValidIP", () => {
		it("should validate IPv4 addresses", () => {
			assert.strictEqual(isValidIP("192.168.1.1"), true);
			assert.strictEqual(isValidIP("127.0.0.1"), true);
			assert.strictEqual(isValidIP("255.255.255.255"), true);
			assert.strictEqual(isValidIP("0.0.0.0"), true);
		});

		it("should reject invalid IPv4 addresses", () => {
			assert.strictEqual(isValidIP("256.1.1.1"), false);
			assert.strictEqual(isValidIP("1.1.1"), false);
			assert.strictEqual(isValidIP("1.1.1.1.1"), false);
			assert.strictEqual(isValidIP("abc.def.ghi.jkl"), false);
		});

		it("should validate IPv6 addresses", () => {
			assert.strictEqual(isValidIP("2001:0db8:85a3:0000:0000:8a2e:0370:7334"), true);
			assert.strictEqual(isValidIP("2001:db8:85a3:0:0:8a2e:370:7334"), true);
			assert.strictEqual(isValidIP("::1"), true);
			assert.strictEqual(isValidIP("::"), true);
		});

		it("should validate IPv6 compressed addresses", () => {
			assert.strictEqual(isValidIP("2001:db8::"), true);
			assert.strictEqual(isValidIP("2001:db8:85a3::8a2e:370:7334"), true);
			assert.strictEqual(isValidIP("::ffff:192.168.1.1"), true);
		});

		it("should reject invalid IPv6 addresses", () => {
			assert.strictEqual(isValidIP("2001:db8:85a3:0:0:8a2e:370:7334:extra"), false);
			assert.strictEqual(isValidIP("12345::1"), false);
		});

		it("should reject IPv6 with multiple :: compression", () => {
			assert.strictEqual(isValidIP("2001::db8::1"), false);
			assert.strictEqual(isValidIP("::1::"), false);
		});

		it("should reject IPv6 compressed with too many groups", () => {
			assert.strictEqual(isValidIP("1:2:3:4:5:6:7:8::"), false);
			assert.strictEqual(isValidIP("::1:2:3:4:5:6:7:8"), false);
		});

		it("should reject IPv6 with invalid hex groups", () => {
			assert.strictEqual(isValidIP("2001:db8:85a3:xxxx:0:0:8a2e:370:7334"), false);
			assert.strictEqual(isValidIP("gggg::1"), false);
		});

		it("should reject IPv6 full notation with wrong group count", () => {
			assert.strictEqual(isValidIP("2001:db8:85a3:0:0:8a2e:370"), false);
			assert.strictEqual(isValidIP("2001:db8:85a3:0:0:8a2e:370:7334:extra"), false);
		});

		it("should reject IPv6 with empty groups in full notation", () => {
			assert.strictEqual(isValidIP("2001:db8::85a3:0:0:8a2e:370:7334"), false);
		});

		it("should accept valid compressed IPv6 with empty left side", () => {
			assert.strictEqual(isValidIP("::85a3:0:0:8a2e:370:7334"), true);
		});

		it("should accept valid compressed IPv6 with empty right side", () => {
			assert.strictEqual(isValidIP("2001:db8:85a3:0:0:8a2e::"), true);
		});

		it("should reject compressed IPv6 with 8+ groups when expanded", () => {
			// 6 groups + ::1:2 expands to 8 groups, which is valid, but 6 + ::1:2:3 = 9 which is invalid
			assert.strictEqual(isValidIP("2001:db8:85a3:0:0:8a2e::1:2:3"), false);
		});

		it("should reject compressed IPv6 with too many groups", () => {
			// This has 7 explicit groups + at least 1 from compression = 9+, which should be rejected
			assert.strictEqual(isValidIP("1:2:3:4:5:6:7::8:9"), false);
		});

		it("should reject compressed IPv6 with invalid hex group on right", () => {
			assert.strictEqual(isValidIP("2001::gggg"), false);
		});

		it("should reject compressed IPv6 with invalid hex group in middle of right side", () => {
			// Right side has multiple groups, invalid one at index 1
			assert.strictEqual(isValidIP("2001::1:gggg:3"), false);
		});

		it("should reject full IPv6 with invalid hex group", () => {
			assert.strictEqual(isValidIP("2001:db8:85a3:0:0:8a2e:370:gggg"), false);
		});

		it("should reject full IPv6 with invalid hex group at position 3", () => {
			// Invalid group at index 3 to ensure loop coverage
			assert.strictEqual(isValidIP("2001:db8:85a3:gggg:0:8a2e:370:1234"), false);
		});

		it("should reject empty or invalid input", () => {
			assert.strictEqual(isValidIP(""), false);
			assert.strictEqual(isValidIP(null), false);
			assert.strictEqual(isValidIP(undefined), false);
			assert.strictEqual(isValidIP(123), false);
		});

		it("should validate IPv4-mapped IPv6 addresses", () => {
			assert.strictEqual(isValidIP("::ffff:127.0.0.1"), true);
			assert.strictEqual(isValidIP("::FFFF:192.168.1.1"), true);
		});
	});

	describe("extractPath", () => {
		it("should convert parameterized route to regex", () => {
			const result = extractPath("/users/:id");

			assert.strictEqual(result, "/users/(?<id>[^/]+)");
		});

		it("should handle multiple parameters", () => {
			const result = extractPath("/users/:userId/posts/:postId");

			assert.strictEqual(result, "/users/(?<userId>[^/]+)/posts/(?<postId>[^/]+)");
		});

		it("should handle routes without parameters", () => {
			const result = extractPath("/static/path");

			assert.strictEqual(result, "/static/path");
		});

		it("should handle empty string", () => {
			const result = extractPath();

			assert.strictEqual(result, "");
		});

		it("should not modify already converted routes", () => {
			const result = extractPath("/users/(?<id>[^/]+)");

			assert.strictEqual(result, "/users/(?<id>[^/]+)");
		});
	});

	describe("mimeExtensions", () => {
		it("should be an object", () => {
			assert.strictEqual(typeof mimeExtensions, "object");
		});

		it("should contain .html extension", () => {
			assert.ok(".html" in mimeExtensions);
			assert.strictEqual(mimeExtensions[".html"].type, "text/html");
		});

		it("should contain .json extension", () => {
			assert.ok(".json" in mimeExtensions);
			assert.strictEqual(mimeExtensions[".json"].type, "application/json");
		});

		it("should contain .png extension", () => {
			assert.ok(".png" in mimeExtensions);
			assert.strictEqual(mimeExtensions[".png"].type, "image/png");
		});
	});
});
