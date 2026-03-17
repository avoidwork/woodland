import assert from "node:assert";
import { describe, it } from "node:test";
import { cors, corsHost, corsRequest, extractIP, decorate, logClose } from "../../src/request.js";
import { isValidIP } from "../../src/utility.js";

describe("request", () => {
	describe("isValidIP", () => {
		describe("IPv4 validation", () => {
			it("should validate simple IPv4", () => {
				assert.strictEqual(isValidIP("192.168.1.1"), true);
			});

			it("should validate localhost", () => {
				assert.strictEqual(isValidIP("127.0.0.1"), true);
			});

			it("should validate all zeros", () => {
				assert.strictEqual(isValidIP("0.0.0.0"), true);
			});

			it("should validate all twos fifty five", () => {
				assert.strictEqual(isValidIP("255.255.255.255"), true);
			});

			it("should reject octet > 255", () => {
				assert.strictEqual(isValidIP("256.1.1.1"), false);
			});

			it("should reject octet > 255 in second position", () => {
				assert.strictEqual(isValidIP("192.256.1.1"), false);
			});

			it("should reject negative octet", () => {
				assert.strictEqual(isValidIP("-1.1.1.1"), false);
			});

			it("should reject incomplete IP", () => {
				assert.strictEqual(isValidIP("192.168.1"), false);
			});

			it("should reject extra octet", () => {
				assert.strictEqual(isValidIP("192.168.1.1.1"), false);
			});

			it("should reject non-numeric", () => {
				assert.strictEqual(isValidIP("abc.def.ghi.jkl"), false);
			});

			it("should reject empty string", () => {
				assert.strictEqual(isValidIP(""), false);
			});

			it("should reject null", () => {
				assert.strictEqual(isValidIP(null), false);
			});

			it("should reject undefined", () => {
				assert.strictEqual(isValidIP(void 0), false);
			});

			it("should reject number", () => {
				assert.strictEqual(isValidIP(123), false);
			});
		});

		describe("IPv6 validation", () => {
			it("should validate full IPv6", () => {
				assert.strictEqual(isValidIP("2001:0db8:85a3:0000:0000:8a2e:0370:7334"), true);
			});

			it("should reject full IPv6 with invalid hex", () => {
				assert.strictEqual(isValidIP("2001:0db8:85a3:0000:0000:8a2e:0370:zzzz"), false);
			});

			it("should validate compressed IPv6", () => {
				assert.strictEqual(isValidIP("2001:db8::1"), true);
			});

			it("should validate all zeros compressed", () => {
				assert.strictEqual(isValidIP("::"), true);
			});

			it("should validate localhost", () => {
				assert.strictEqual(isValidIP("::1"), true);
			});

			it("should validate IPv4-mapped", () => {
				assert.strictEqual(isValidIP("::ffff:192.168.1.1"), true);
			});

			it("should reject double compression", () => {
				assert.strictEqual(isValidIP("2001::db8::1"), false);
			});

			it("should reject too many groups", () => {
				assert.strictEqual(isValidIP("1:2:3:4:5:6:7:8:9"), false);
			});

			it("should reject invalid characters", () => {
				assert.strictEqual(isValidIP("2001:db8:xyz::1"), false);
			});

			it("should reject empty group", () => {
				assert.strictEqual(isValidIP("2001::db8::1"), false);
			});

			it("should reject incomplete compressed", () => {
				assert.strictEqual(isValidIP("2001:db8:::"), false);
			});

			it("should reject compressed IPv6 with 8+ total groups", () => {
				assert.strictEqual(isValidIP("1:2:3:4::5:6:7:8"), false);
			});

			it("should reject compressed IPv6 with invalid hex in left groups", () => {
				assert.strictEqual(isValidIP("gggg:db8::1"), false);
			});

			it("should reject compressed IPv6 with invalid hex in right groups", () => {
				assert.strictEqual(isValidIP("2001::hhhh"), false);
			});

			it("should reject compressed IPv6 with invalid hex in both sides", () => {
				assert.strictEqual(isValidIP("gggg::hhhh"), false);
			});

			it("should reject compressed IPv6 with invalid hex on left only", () => {
				assert.strictEqual(isValidIP("xyz1:2:3::5:6:7"), false);
			});

			it("should reject compressed IPv6 with invalid hex on right only", () => {
				assert.strictEqual(isValidIP("1:2:3::abc:xyz:7"), false);
			});

			it("should reject compressed IPv6 with invalid hex as first left group", () => {
				assert.strictEqual(isValidIP("zzzz::1"), false);
			});

			it("should reject compressed IPv6 with invalid hex as last right group", () => {
				assert.strictEqual(isValidIP("1::zzzz"), false);
			});

			it("should reject compressed IPv6 with valid first group but invalid second", () => {
				assert.strictEqual(isValidIP("2001:zzzz::1"), false);
			});

			it("should reject compressed IPv6 with valid first right but invalid second", () => {
				assert.strictEqual(isValidIP("1::2001:zzzz"), false);
			});

			it("should reject full IPv6 with invalid hex group", () => {
				assert.strictEqual(isValidIP("2001:0db8:85a3:0000:ZZZZ:8a2e:0370:7334"), false);
			});

			it("should reject full IPv6 with first group invalid", () => {
				assert.strictEqual(isValidIP("zzzz:0db8:85a3:0000:8a2e:0370:7334"), false);
			});

			it("should reject full IPv6 with last group invalid", () => {
				assert.strictEqual(isValidIP("2001:0db8:85a3:0000:8a2e:0370:zzzz"), false);
			});

			it("should reject full IPv6 with second group invalid", () => {
				assert.strictEqual(isValidIP("2001:zzzz:85a3:0000:8a2e:0370:7334"), false);
			});

			it("should reject full IPv6 with middle group invalid", () => {
				assert.strictEqual(isValidIP("2001:0db8:85a3:zzzz:8a2e:0370:7334"), false);
			});

			it("should reject full IPv6 with empty group at start", () => {
				assert.strictEqual(isValidIP(":0db8:85a3:0000:8a2e:0370:7334"), false);
			});

			it("should reject full IPv6 with empty group", () => {
				assert.strictEqual(isValidIP("2001:0db8:85a3:::8a2e:0370:7334"), false);
			});

			it("should reject full IPv6 with invalid hex group", () => {
				assert.strictEqual(isValidIP("2001:0db8:85a3:0000:8a2e:0370:733g"), false);
			});

			it("should reject compressed IPv6 with invalid hex in left groups during loop", () => {
				assert.strictEqual(isValidIP("zzzz::1"), false);
			});

			it("should reject compressed IPv6 with invalid hex in right groups during loop", () => {
				assert.strictEqual(isValidIP("::zzzz"), false);
			});

			it("should reject compressed IPv6 with invalid hex in middle of left side", () => {
				assert.strictEqual(isValidIP("1:zzzz:2::1"), false);
			});

			it("should reject compressed IPv6 with invalid hex in middle of right side", () => {
				assert.strictEqual(isValidIP("::1:zzzz:2"), false);
			});

			it("should reject full IPv6 with empty group triggering loop check", () => {
				assert.strictEqual(isValidIP("2001:0db8:85a3:0000:::7334"), false);
			});
		});
	});

	describe("cors", () => {
		it("should return false when origins is empty", () => {
			const req = { headers: { origin: "https://example.com" }, corsHost: true };
			assert.strictEqual(cors(req, []), false);
		});

		it("should return false when no origin header", () => {
			const req = { headers: {}, corsHost: false };
			assert.strictEqual(cors(req, ["https://example.com"]), false);
		});

		it("should return true for wildcard origin", () => {
			const req = {
				headers: { origin: "https://example.com" },
				corsHost: true,
			};
			assert.strictEqual(cors(req, ["*"]), true);
		});

		it("should return true for matching origin", () => {
			const req = {
				headers: { origin: "https://example.com" },
				corsHost: true,
			};
			assert.strictEqual(cors(req, ["https://example.com"]), true);
		});

		it("should return false for non-matching origin", () => {
			const req = {
				headers: { origin: "https://other.com" },
				corsHost: true,
			};
			assert.strictEqual(cors(req, ["https://example.com"]), false);
		});
	});

	describe("corsHost", () => {
		it("should return false when no origin header", () => {
			const req = { headers: { host: "example.com" } };
			assert.strictEqual(corsHost(req), false);
		});

		it("should return false when same host", () => {
			const req = {
				headers: {
					origin: "http://example.com",
					host: "example.com",
				},
			};
			assert.strictEqual(corsHost(req), false);
		});

		it("should return true when different host", () => {
			const req = {
				headers: {
					origin: "http://other.com",
					host: "example.com",
				},
			};
			assert.strictEqual(corsHost(req), true);
		});

		it("should handle https protocol", () => {
			const req = {
				headers: {
					origin: "https://other.com",
					host: "example.com",
				},
			};
			assert.strictEqual(corsHost(req), true);
		});
	});

	describe("corsRequest", () => {
		it("should create handler that sends 204", () => {
			let sentStatus = null;
			let sentBody = null;

			const handler = corsRequest();
			handler(
				{},
				{
					status: (status) => {
						sentStatus = status;
						return {
							send: (body) => {
								sentBody = body;
							},
						};
					},
				},
			);

			assert.strictEqual(sentStatus, 204);
			assert.strictEqual(sentBody, "");
		});
	});

	describe("extractIP", () => {
		it("should extract IP from connection", () => {
			const req = {
				connection: { remoteAddress: "192.168.1.1" },
				headers: {},
			};
			assert.strictEqual(extractIP(req), "192.168.1.1");
		});

		it("should fallback to socket when no connection", () => {
			const req = {
				socket: { remoteAddress: "10.0.0.1" },
				headers: {},
			};
			assert.strictEqual(extractIP(req), "10.0.0.1");
		});

		it("should fallback to 127.0.0.1 when no IP", () => {
			const req = { headers: {} };
			assert.strictEqual(extractIP(req), "127.0.0.1");
		});

		it("should extract IP from X-Forwarded-For header", () => {
			const req = {
				connection: { remoteAddress: "192.168.1.1" },
				headers: { "x-forwarded-for": "10.0.0.1" },
			};
			assert.strictEqual(extractIP(req), "10.0.0.1");
		});

		it("should extract first valid IP from X-Forwarded-For list", () => {
			const req = {
				connection: { remoteAddress: "192.168.1.1" },
				headers: { "x-forwarded-for": "10.0.0.1, 172.16.0.1, 192.168.1.1" },
			};
			assert.strictEqual(extractIP(req), "10.0.0.1");
		});

		it("should skip invalid IPs in X-Forwarded-For", () => {
			const req = {
				connection: { remoteAddress: "192.168.1.1" },
				headers: { "x-forwarded-for": "invalid, 10.0.0.1" },
			};
			assert.strictEqual(extractIP(req), "10.0.0.1");
		});

		it("should handle empty X-Forwarded-For", () => {
			const req = {
				connection: { remoteAddress: "192.168.1.1" },
				headers: { "x-forwarded-for": "" },
			};
			assert.strictEqual(extractIP(req), "192.168.1.1");
		});

		it("should handle whitespace in X-Forwarded-For", () => {
			const req = {
				connection: { remoteAddress: "192.168.1.1" },
				headers: { "x-forwarded-for": "  10.0.0.1  " },
			};
			assert.strictEqual(extractIP(req), "10.0.0.1");
		});

		it("should return fallback IP when all forwarded IPs are invalid", () => {
			const req = {
				connection: { remoteAddress: "192.168.1.1" },
				headers: { "x-forwarded-for": "invalid, not-an-ip" },
			};
			assert.strictEqual(extractIP(req), "192.168.1.1");
		});
	});

	describe("decorate", () => {
		const createMockReq = () => ({
			method: "GET",
			url: "/test",
			headers: {},
		});

		const createMockRes = () => ({
			set: () => {},
			on: () => {},
		});

		it("should set parsed URL", () => {
			const req = createMockReq();
			const res = createMockRes();

			decorate(req, res, {
				parsed: { pathname: "/test", hostname: "localhost", search: "" },
				allowString: "GET",
				timing: null,
				corsHostCheck: () => false,
				corsCheck: () => false,
				ipExtractor: () => "127.0.0.1",
				defaultHeaders: [],
				corsExpose: "",
				logDecorator: () => {},
				logClose,
			});

			assert.ok(req.parsed);
		});

		it("should set allow string", () => {
			const req = createMockReq();
			const res = createMockRes();

			decorate(req, res, {
				parsed: { pathname: "/test", hostname: "localhost", search: "" },
				allowString: "GET",
				timing: null,
				corsHostCheck: () => false,
				corsCheck: () => false,
				ipExtractor: () => "127.0.0.1",
				defaultHeaders: [],
				corsExpose: "",
				logDecorator: () => {},
				logClose,
			});

			assert.strictEqual(req.allow, "GET");
		});

		it("should set body to empty string", () => {
			const req = createMockReq();
			const res = createMockRes();

			decorate(req, res, {
				parsed: { pathname: "/test", hostname: "localhost", search: "" },
				allowString: "GET",
				timing: null,
				corsHostCheck: () => false,
				corsCheck: () => false,
				ipExtractor: () => "127.0.0.1",
				defaultHeaders: [],
				corsExpose: "",
				logDecorator: () => {},
				logClose,
			});

			assert.strictEqual(req.body, "");
		});

		it("should set params to empty object", () => {
			const req = createMockReq();
			const res = createMockRes();

			decorate(req, res, {
				parsed: { pathname: "/test", hostname: "localhost", search: "" },
				allowString: "GET",
				timing: null,
				corsHostCheck: () => false,
				corsCheck: () => false,
				ipExtractor: () => "127.0.0.1",
				defaultHeaders: [],
				corsExpose: "",
				logDecorator: () => {},
				logClose,
			});

			assert.deepStrictEqual(req.params, {});
		});

		it("should set valid to true", () => {
			const req = createMockReq();
			const res = createMockRes();

			decorate(req, res, {
				parsed: { pathname: "/test", hostname: "localhost", search: "" },
				allowString: "GET",
				timing: null,
				corsHostCheck: () => false,
				corsCheck: () => false,
				ipExtractor: () => "127.0.0.1",
				defaultHeaders: [],
				corsExpose: "",
				logDecorator: () => {},
				logClose,
			});

			assert.strictEqual(req.valid, true);
		});

		it("should set IP from extractor", () => {
			const req = createMockReq();
			const res = createMockRes();

			decorate(req, res, {
				parsed: { pathname: "/test", hostname: "localhost", search: "" },
				allowString: "GET",
				timing: null,
				corsHostCheck: () => false,
				corsCheck: () => false,
				ipExtractor: () => "192.168.1.1",
				defaultHeaders: [],
				corsExpose: "",
				logDecorator: () => {},
				logClose,
			});

			assert.strictEqual(req.ip, "192.168.1.1");
		});

		it("should set locals on response", () => {
			const req = createMockReq();
			const res = createMockRes();

			decorate(req, res, {
				parsed: { pathname: "/test", hostname: "localhost", search: "" },
				allowString: "GET",
				timing: null,
				corsHostCheck: () => false,
				corsCheck: () => false,
				ipExtractor: () => "127.0.0.1",
				defaultHeaders: [],
				corsExpose: "",
				logDecorator: () => {},
				logClose,
			});

			assert.deepStrictEqual(res.locals, {});
		});

		it("should set default headers", () => {
			const req = createMockReq();
			const headersSet = new Map();
			const res = {
				set: (headers) => {
					for (const [key, value] of Object.entries(headers)) {
						headersSet.set(key, value);
					}
				},
				on: () => {},
			};

			decorate(req, res, {
				parsed: { pathname: "/test", hostname: "localhost", search: "" },
				allowString: "GET",
				timing: null,
				corsHostCheck: () => false,
				corsCheck: () => false,
				ipExtractor: () => "127.0.0.1",
				defaultHeaders: [["x-custom", "value"]],
				corsExpose: "",
				logDecorator: () => {},
				logClose,
			});

			assert.ok(headersSet.has("allow"));
			assert.ok(headersSet.has("x-content-type-options"));
		});

		it("should set CORS headers when cors is true", () => {
			const req = {
				method: "GET",
				url: "/test",
				headers: {
					origin: "https://example.com",
					"access-control-request-headers": "x-custom",
				},
			};
			const headersSet = new Map();
			const res = {
				set: (headers) => {
					for (const [key, value] of Object.entries(headers)) {
						headersSet.set(key, value);
					}
				},
				on: () => {},
			};

			decorate(req, res, {
				parsed: { pathname: "/test", hostname: "localhost", search: "" },
				allowString: "GET",
				timing: null,
				corsHostCheck: () => true,
				corsCheck: () => true,
				ipExtractor: () => "127.0.0.1",
				defaultHeaders: [],
				corsExpose: "x-custom",
				logDecorator: () => {},
				logClose,
			});

			assert.ok(headersSet.has("access-control-allow-origin"));
			assert.ok(headersSet.has("access-control-expose-headers"));
		});

		it("should attach close listener", () => {
			const req = createMockReq();
			let closeListener = null;
			const res = {
				set: () => {},
				on: (event, fn) => {
					if (event === "close") {
						closeListener = fn;
					}
				},
			};

			decorate(req, res, {
				parsed: { pathname: "/test", hostname: "localhost", search: "" },
				allowString: "GET",
				timing: null,
				corsHostCheck: () => false,
				corsCheck: () => false,
				ipExtractor: () => "127.0.0.1",
				defaultHeaders: [],
				corsExpose: "",
				logDecorator: () => {},
				logClose,
			});

			assert.ok(closeListener);
		});

		it("should set precise timing when provided", () => {
			const req = createMockReq();
			const res = createMockRes();

			decorate(req, res, {
				parsed: { pathname: "/test", hostname: "localhost", search: "" },
				allowString: "GET",
				timing: 123.456,
				corsHostCheck: () => false,
				corsCheck: () => false,
				ipExtractor: () => "127.0.0.1",
				defaultHeaders: [],
				corsExpose: "",
				logDecorator: () => {},
				logClose,
			});

			assert.strictEqual(req.precise, 123.456);
		});

		it("should use ACCESS_CONTROL_ALLOW_HEADERS for OPTIONS method", () => {
			const req = {
				method: "OPTIONS",
				url: "/test",
				headers: {
					origin: "https://example.com",
					"access-control-request-headers": "x-custom",
				},
			};
			const headersSet = new Map();
			const res = {
				set: (headers) => {
					for (const [key, value] of Object.entries(headers)) {
						headersSet.set(key, value);
					}
				},
				on: () => {},
			};

			decorate(req, res, {
				parsed: { pathname: "/test", hostname: "localhost", search: "" },
				allowString: "GET",
				timing: null,
				corsHostCheck: () => true,
				corsCheck: () => true,
				ipExtractor: () => "127.0.0.1",
				defaultHeaders: [],
				corsExpose: "x-custom",
				logDecorator: () => {},
				logClose,
			});

			assert.ok(headersSet.has("access-control-allow-headers"));
			assert.strictEqual(headersSet.get("access-control-allow-headers"), "x-custom");
		});

		it("should not set CORS headers when corsHeaders is undefined", () => {
			const req = {
				method: "GET",
				url: "/test",
				headers: {
					origin: "https://example.com",
				},
			};
			const headersSet = new Map();
			const res = {
				set: (headers) => {
					for (const [key, value] of Object.entries(headers)) {
						headersSet.set(key, value);
					}
				},
				on: () => {},
			};

			decorate(req, res, {
				parsed: { pathname: "/test", hostname: "localhost", search: "" },
				allowString: "GET",
				timing: null,
				corsHostCheck: () => true,
				corsCheck: () => true,
				ipExtractor: () => "127.0.0.1",
				defaultHeaders: [],
				corsExpose: void 0,
				logDecorator: () => {},
				logClose,
			});

			assert.ok(!headersSet.has("access-control-expose-headers"));
		});
	});

	describe("logClose", () => {
		it("should be a no-op function", () => {
			assert.doesNotThrow(() => {
				logClose({}, {});
			});
		});
	});
});
