import assert from "node:assert";
import { describe, it } from "node:test";
import {
	cors,
	corsHost,
	corsRequest,
	extractIP,
	params,
	parse,
	extractPath,
} from "../../src/request.js";
import { isValidIP } from "../../src/request.js";

describe("request", () => {
	describe("isValidIP", () => {
		describe("IPv4 validation", () => {
			it("should validate valid IPv4 addresses", () => {
				assert.strictEqual(isValidIP("192.168.1.1"), true);
				assert.strictEqual(isValidIP("127.0.0.1"), true);
				assert.strictEqual(isValidIP("0.0.0.0"), true);
				assert.strictEqual(isValidIP("255.255.255.255"), true);
			});

			it("should reject invalid IPv4 addresses", () => {
				assert.strictEqual(isValidIP("256.1.1.1"), false);
				assert.strictEqual(isValidIP("192.168.1"), false);
				assert.strictEqual(isValidIP("192.168.1.1.1"), false);
				assert.strictEqual(isValidIP("abc.def.ghi.jkl"), false);
				assert.strictEqual(isValidIP(""), false);
				assert.strictEqual(isValidIP(null), false);
				assert.strictEqual(isValidIP(void 0), false);
				assert.strictEqual(isValidIP(123), false);
			});
		});

		describe("IPv6 validation", () => {
			it("should validate valid IPv6 addresses", () => {
				assert.strictEqual(isValidIP("2001:0db8:85a3:0000:0000:8a2e:0370:7334"), true);
				assert.strictEqual(isValidIP("2001:db8::1"), true);
				assert.strictEqual(isValidIP("::"), true);
				assert.strictEqual(isValidIP("::1"), true);
				assert.strictEqual(isValidIP("::ffff:192.168.1.1"), true);
				assert.strictEqual(isValidIP("2001:db8::"), true);
			});

			it("should reject invalid IPv6 addresses", () => {
				assert.strictEqual(isValidIP("2001:0db8:85a3:0000:0000:8a2e:0370:zzzz"), false);
				assert.strictEqual(isValidIP("2001::db8::1"), false);
				assert.strictEqual(isValidIP("1:2:3:4:5:6:7:8:9"), false);
				assert.strictEqual(isValidIP("2001:db8:xyz::1"), false);
				assert.strictEqual(isValidIP(":::"), false);
				assert.strictEqual(isValidIP("1:2:3:4::5:6:7:8"), false);
				assert.strictEqual(isValidIP("gggg::1"), false);
				assert.strictEqual(isValidIP("1::zzzz"), false);
			});
		});
	});

	describe("cors", () => {
		it("should return false when origins is empty or no origin header", () => {
			assert.strictEqual(
				cors({ headers: { origin: "https://example.com" }, corsHost: true }, new Set()),
				false,
			);
			assert.strictEqual(
				cors({ headers: {}, corsHost: false }, new Set(["https://example.com"])),
				false,
			);
		});

		it("should return true for wildcard or matching origin", () => {
			assert.strictEqual(
				cors({ headers: { origin: "https://example.com" }, corsHost: true }, new Set(["*"])),
				true,
			);
			assert.strictEqual(
				cors(
					{ headers: { origin: "https://example.com" }, corsHost: true },
					new Set(["https://example.com"]),
				),
				true,
			);
		});

		it("should return false for non-matching origin", () => {
			assert.strictEqual(
				cors(
					{ headers: { origin: "https://other.com" }, corsHost: true },
					new Set(["https://example.com"]),
				),
				false,
			);
		});
	});

	describe("corsHost", () => {
		it("should return false when no origin or same host", () => {
			assert.strictEqual(corsHost({ headers: { host: "example.com" } }), false);
			assert.strictEqual(
				corsHost({ headers: { origin: "http://example.com", host: "example.com" } }),
				false,
			);
		});

		it("should return true when different host", () => {
			assert.strictEqual(
				corsHost({ headers: { origin: "http://other.com", host: "example.com" } }),
				true,
			);
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
		it("should extract IP from connection or socket", () => {
			assert.strictEqual(
				extractIP({ connection: { remoteAddress: "192.168.1.1" }, headers: {} }),
				"192.168.1.1",
			);
			assert.strictEqual(
				extractIP({ socket: { remoteAddress: "10.0.0.1" }, headers: {} }),
				"10.0.0.1",
			);
			assert.strictEqual(extractIP({ headers: {} }), "127.0.0.1");
		});

		it("should extract IP from X-Forwarded-For header", () => {
			const req = {
				connection: { remoteAddress: "192.168.1.1" },
				headers: { "x-forwarded-for": "10.0.0.1, 172.16.0.1, 192.168.1.1" },
			};
			assert.strictEqual(extractIP(req), "10.0.0.1");
		});

		it("should skip invalid IPs in X-Forwarded-For", () => {
			const req = {
				connection: { remoteAddress: "192.168.1.1" },
				headers: { "x-forwarded-for": "invalid, not-an-ip" },
			};
			assert.strictEqual(extractIP(req), "192.168.1.1");
		});
	});

	describe("params", () => {
		it("should extract parameters from pathname", () => {
			const req = { parsed: { pathname: "/users/123" }, params: {} };
			params(req, /\/users\/(?<id>[^/]+)/);
			assert.strictEqual(req.params.id, 123);
		});

		it("should handle multiple parameters", () => {
			const req = { parsed: { pathname: "/users/456/posts/789" }, params: {} };
			params(req, /\/users\/(?<userId>[^/]+)\/posts\/(?<postId>[^/]+)/);
			assert.strictEqual(req.params.userId, 456);
			assert.strictEqual(req.params.postId, 789);
		});

		it("should decode URI components", () => {
			const req = { parsed: { pathname: "/users/john%20doe" }, params: {} };
			params(req, /\/users\/(?<name>[^/]+)/);
			assert.strictEqual(req.params.name, "john doe");
		});

		it("should handle null/undefined values and reset when no match", () => {
			const req1 = { parsed: { pathname: "/test" }, params: {} };
			params(req1, /\/test(?:\/(?<id>[^/]+))?/);
			assert.strictEqual(req1.params.id, null);

			const req2 = { parsed: { pathname: "/other" }, params: { old: "value" } };
			params(req2, /\/users\/(?<id>[^/]+)/);
			assert.deepStrictEqual(req2.params, {});
		});
	});

	describe("parse", () => {
		it("should parse URL string", () => {
			const result = parse("http://localhost:3000/test");
			assert.strictEqual(result.pathname, "/test");
			assert.strictEqual(result.hostname, "localhost");
		});

		it("should parse request object", () => {
			const req = { headers: { host: "localhost:3000" }, url: "/test?foo=bar" };
			const result = parse(req);
			assert.strictEqual(result.pathname, "/test");
			assert.strictEqual(result.search, "?foo=bar");
		});

		it("should handle missing host header", () => {
			const req = {
				headers: {},
				url: "/test",
				socket: { server: { _connectionKey: "::8000" } },
			};
			const result = parse(req);
			assert.strictEqual(result.hostname, "localhost");
			assert.strictEqual(result.port, "8000");
		});
	});

	describe("extractPath", () => {
		it("should convert parameterized route to regex", () => {
			assert.strictEqual(extractPath("/users/:id"), "/users/(?<id>[^/]+)");
			assert.strictEqual(
				extractPath("/users/:userId/posts/:postId"),
				"/users/(?<userId>[^/]+)/posts/(?<postId>[^/]+)",
			);
			assert.strictEqual(
				extractPath("/api/:version/users/:userId"),
				"/api/(?<version>[^/]+)/users/(?<userId>[^/]+)",
			);
		});
	});
});
