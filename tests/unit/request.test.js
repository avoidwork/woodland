import assert from "node:assert";
import { describe, it } from "node:test";
import {
  isValidIP,
  createCorsHandler,
  createIpExtractor,
  createRequestDecorator,
} from "../../src/request.js";

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
    });
  });

  describe("createCorsHandler", () => {
    it("should create cors handler with origins", () => {
      const handler = createCorsHandler(["https://example.com"]);

      assert.ok(handler.cors);
      assert.ok(handler.corsHost);
      assert.ok(handler.corsRequest);
    });

    describe("cors", () => {
      it("should return false when origins is empty", () => {
        const handler = createCorsHandler([]);
        const req = { headers: { origin: "https://example.com" } };

        assert.strictEqual(handler.cors(req), false);
      });

      it("should return false when no origin header", () => {
        const handler = createCorsHandler(["https://example.com"]);
        const req = { headers: {}, corsHost: false };

        assert.strictEqual(handler.cors(req), false);
      });

      it("should return true for wildcard origin", () => {
        const handler = createCorsHandler(["*"]);
        const req = {
          headers: { origin: "https://example.com" },
          corsHost: "example.com",
        };

        assert.strictEqual(handler.cors(req), true);
      });

      it("should return true for matching origin", () => {
        const handler = createCorsHandler(["https://example.com"]);
        const req = {
          headers: { origin: "https://example.com" },
          corsHost: "example.com",
        };

        assert.strictEqual(handler.cors(req), true);
      });

      it("should return false for non-matching origin", () => {
        const handler = createCorsHandler(["https://example.com"]);
        const req = {
          headers: { origin: "https://other.com" },
          corsHost: "other.com",
        };

        assert.strictEqual(handler.cors(req), false);
      });
    });

    describe("corsHost", () => {
      it("should return false when no origin header", () => {
        const handler = createCorsHandler([]);
        const req = { headers: { host: "example.com" } };

        assert.strictEqual(handler.corsHost(req), false);
      });

      it("should return false when same host", () => {
        const handler = createCorsHandler([]);
        const req = {
          headers: {
            origin: "http://example.com",
            host: "example.com",
          },
        };

        assert.strictEqual(handler.corsHost(req), false);
      });

      it("should return true when different host", () => {
        const handler = createCorsHandler([]);
        const req = {
          headers: {
            origin: "http://other.com",
            host: "example.com",
          },
        };

        assert.strictEqual(handler.corsHost(req), true);
      });

      it("should handle https protocol", () => {
        const handler = createCorsHandler([]);
        const req = {
          headers: {
            origin: "https://other.com",
            host: "example.com",
          },
        };

        assert.strictEqual(handler.corsHost(req), true);
      });
    });

    describe("corsRequest", () => {
      it("should create handler that sends 204", () => {
        const handler = createCorsHandler([]);
        let sentStatus = null;
        let sentBody = null;

        const corsHandler = handler.corsRequest();
        corsHandler(
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
  });

  describe("createIpExtractor", () => {
    it("should create ip extractor", () => {
      const extractor = createIpExtractor();

      assert.ok(extractor.extract);
    });

    describe("extract", () => {
      it("should extract IP from connection", () => {
        const extractor = createIpExtractor();
        const req = {
          connection: { remoteAddress: "192.168.1.1" },
          headers: {},
        };

        assert.strictEqual(extractor.extract(req), "192.168.1.1");
      });

      it("should fallback to socket when no connection", () => {
        const extractor = createIpExtractor();
        const req = {
          socket: { remoteAddress: "10.0.0.1" },
          headers: {},
        };

        assert.strictEqual(extractor.extract(req), "10.0.0.1");
      });

      it("should fallback to 127.0.0.1 when no IP", () => {
        const extractor = createIpExtractor();
        const req = { headers: {} };

        assert.strictEqual(extractor.extract(req), "127.0.0.1");
      });

      it("should extract IP from X-Forwarded-For header", () => {
        const extractor = createIpExtractor();
        const req = {
          connection: { remoteAddress: "192.168.1.1" },
          headers: { "x-forwarded-for": "10.0.0.1" },
        };

        assert.strictEqual(extractor.extract(req), "10.0.0.1");
      });

      it("should extract first valid IP from X-Forwarded-For list", () => {
        const extractor = createIpExtractor();
        const req = {
          connection: { remoteAddress: "192.168.1.1" },
          headers: { "x-forwarded-for": "10.0.0.1, 172.16.0.1, 192.168.1.1" },
        };

        assert.strictEqual(extractor.extract(req), "10.0.0.1");
      });

      it("should skip invalid IPs in X-Forwarded-For", () => {
        const extractor = createIpExtractor();
        const req = {
          connection: { remoteAddress: "192.168.1.1" },
          headers: { "x-forwarded-for": "invalid, 10.0.0.1" },
        };

        assert.strictEqual(extractor.extract(req), "10.0.0.1");
      });

      it("should handle empty X-Forwarded-For", () => {
        const extractor = createIpExtractor();
        const req = {
          connection: { remoteAddress: "192.168.1.1" },
          headers: { "x-forwarded-for": "" },
        };

        assert.strictEqual(extractor.extract(req), "192.168.1.1");
      });

      it("should handle whitespace in X-Forwarded-For", () => {
        const extractor = createIpExtractor();
        const req = {
          connection: { remoteAddress: "192.168.1.1" },
          headers: { "x-forwarded-for": "  10.0.0.1  " },
        };

        assert.strictEqual(extractor.extract(req), "10.0.0.1");
      });
    });
  });

  describe("createRequestDecorator", () => {
    const createMockApp = () => ({
      origins: [],
      time: false,
      defaultHeaders: [],
      etags: true,
      corsExpose: "",
      getAllows: () => "GET",
      corsHostCheck: () => false,
      corsCheck: () => false,
      ipExtractor: (req) => req.connection?.remoteAddress || "127.0.0.1",
      logDecorator: () => {},
    });

    it("should create request decorator", () => {
      const decorator = createRequestDecorator(createMockApp());

      assert.ok(decorator.decorate);
      assert.ok(decorator.logClose);
    });

    describe("decorate", () => {
      it("should set parsed URL", () => {
        const decorator = createRequestDecorator(createMockApp());
        const req = {
          method: "GET",
          url: "/test",
          headers: {},
        };
        const res = {
          set: () => {},
          on: () => {},
        };

        decorator.decorate(req, res);

        assert.ok(req.parsed);
      });

      it("should set allow string", () => {
        const decorator = createRequestDecorator(createMockApp());
        const req = {
          method: "GET",
          url: "/test",
          headers: {},
        };
        const res = {
          set: () => {},
          on: () => {},
        };

        decorator.decorate(req, res);

        assert.strictEqual(req.allow, "GET");
      });

      it("should set body to empty string", () => {
        const decorator = createRequestDecorator(createMockApp());
        const req = {
          method: "GET",
          url: "/test",
          headers: {},
        };
        const res = {
          set: () => {},
          on: () => {},
        };

        decorator.decorate(req, res);

        assert.strictEqual(req.body, "");
      });

      it("should set params to empty object", () => {
        const decorator = createRequestDecorator(createMockApp());
        const req = {
          method: "GET",
          url: "/test",
          headers: {},
        };
        const res = {
          set: () => {},
          on: () => {},
        };

        decorator.decorate(req, res);

        assert.deepStrictEqual(req.params, {});
      });

      it("should set valid to true", () => {
        const decorator = createRequestDecorator(createMockApp());
        const req = {
          method: "GET",
          url: "/test",
          headers: {},
        };
        const res = {
          set: () => {},
          on: () => {},
        };

        decorator.decorate(req, res);

        assert.strictEqual(req.valid, true);
      });

      it("should set IP from extractor", () => {
        const app = createMockApp();
        app.ipExtractor = () => "192.168.1.1";

        const decorator = createRequestDecorator(app);
        const req = {
          method: "GET",
          url: "/test",
          headers: {},
        };
        const res = {
          set: () => {},
          on: () => {},
        };

        decorator.decorate(req, res);

        assert.strictEqual(req.ip, "192.168.1.1");
      });

      it("should set locals on response", () => {
        const decorator = createRequestDecorator(createMockApp());
        const req = {
          method: "GET",
          url: "/test",
          headers: {},
        };
        const res = {
          set: () => {},
          on: () => {},
        };

        decorator.decorate(req, res);

        assert.deepStrictEqual(res.locals, {});
      });

      it("should set default headers", () => {
        const app = createMockApp();
        const headersSet = new Map();

        app.defaultHeaders = [["x-custom", "value"]];
        app.corsCheck = () => false;
        app.ipExtractor = () => "127.0.0.1";

        const decorator = createRequestDecorator(app);
        const req = {
          method: "GET",
          url: "/test",
          headers: {},
        };
        const res = {
          set: (headers) => {
            for (const [key, value] of Object.entries(headers)) {
              headersSet.set(key, value);
            }
          },
          on: () => {},
        };

        decorator.decorate(req, res);

        assert.ok(headersSet.has("allow"));
        assert.ok(headersSet.has("x-content-type-options"));
      });

      it("should set CORS headers when cors is true", () => {
        const app = createMockApp();
        const headersSet = new Map();

        app.origins = ["*"];
        app.corsCheck = () => true;
        app.corsExpose = "x-custom";
        app.ipExtractor = () => "127.0.0.1";

        const decorator = createRequestDecorator(app);
        const req = {
          method: "GET",
          url: "/test",
          headers: {
            origin: "https://example.com",
            "access-control-request-headers": "x-custom",
          },
        };
        const res = {
          set: (headers) => {
            for (const [key, value] of Object.entries(headers)) {
              headersSet.set(key, value);
            }
          },
          on: () => {},
        };

        decorator.decorate(req, res);

        assert.ok(headersSet.has("access-control-allow-origin"));
        assert.ok(headersSet.has("access-control-expose-headers"));
      });

      it("should attach close listener", () => {
        const decorator = createRequestDecorator(createMockApp());
        const req = {
          method: "GET",
          url: "/test",
          headers: {},
        };
        let closeListener = null;
        const res = {
          set: () => {},
          on: (event, fn) => {
            if (event === "close") {
              closeListener = fn;
            }
          },
        };

        decorator.decorate(req, res);

        assert.ok(closeListener);
      });
    });

    describe("logClose", () => {
      it("should be a no-op function", () => {
        const decorator = createRequestDecorator(createMockApp());

        assert.doesNotThrow(() => {
          decorator.logClose({}, {});
        });
      });
    });
  });
});
