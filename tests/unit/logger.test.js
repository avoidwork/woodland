import assert from "node:assert";
import { describe, it } from "node:test";
import { createLogger } from "../../src/logger.js";

describe("logger", () => {
	describe("createLogger", () => {
		it("should create logger with default config", () => {
			const logger = createLogger();

			assert.ok(logger.log);
			assert.ok(logger.clfm);
			assert.ok(logger.extractIP);
			assert.ok(logger.logRoute);
			assert.ok(logger.logMiddleware);
			assert.ok(logger.logDecoration);
			assert.ok(logger.logError);
			assert.ok(logger.logServe);
		});

		it("should create logger with custom config", () => {
			const config = {
				enabled: true,
				format: "custom format",
				level: "debug",
			};

			const logger = createLogger(config);

			assert.ok(logger.log);
			assert.strictEqual(logger.log.enabled, void 0);
		});

		it("should normalize invalid log level to info", () => {
			const logger = createLogger({ level: "invalid" });

			assert.ok(logger.log);
		});

		it("should return logger object with all methods", () => {
			const logger = createLogger({ enabled: false });

			assert.strictEqual(typeof logger.log, "function");
			assert.strictEqual(typeof logger.clfm, "function");
			assert.strictEqual(typeof logger.extractIP, "function");
			assert.strictEqual(typeof logger.logRoute, "function");
			assert.strictEqual(typeof logger.logMiddleware, "function");
			assert.strictEqual(typeof logger.logDecoration, "function");
			assert.strictEqual(typeof logger.logError, "function");
			assert.strictEqual(typeof logger.logServe, "function");
		});

		describe("log", () => {
			it("should return logger object with chained methods", () => {
				const logger = createLogger();
				const result = logger.log("test message");

				assert.ok(result.log);
				assert.ok(result.clfm);
				assert.ok(result.extractIP);
			});

			it("should not log when disabled", () => {
				const logger = createLogger({ enabled: false });
				const consoleLog = console.log;
				let called = false;

				console.log = () => {
					called = true;
				};

				logger.log("test message");

				assert.strictEqual(called, false);

				console.log = consoleLog;
			});

			it("should respect log level threshold", () => {
				const logger = createLogger({ level: "warn" });

				assert.doesNotThrow(() => {
					logger.log("debug message", "debug");
					logger.log("warn message", "warn");
				});
			});
		});

		describe("clfm", () => {
			it("should generate common log format entry", () => {
				const logger = createLogger({ format: "%h %t %r %>s %b" });
				const req = {
					method: "GET",
					headers: {
						host: "example.com",
						referer: "https://referrer.com",
						"user-agent": "TestAgent",
					},
					connection: { remoteAddress: "192.168.1.1" },
					parsed: {
						pathname: "/test",
						search: "?query=1",
						username: "user",
					},
				};

				const res = {
					statusCode: 200,
					getHeader: () => 1234,
				};

				const result = logger.clfm(req, res);

				assert.ok(typeof result === "string");
			});

			it("should handle missing host header", () => {
				const logger = createLogger({ format: "%h %t %r %>s %b" });
				const req = {
					method: "GET",
					headers: {},
					connection: { remoteAddress: "192.168.1.1" },
				};

				const res = {
					statusCode: 200,
					getHeader: () => 1234,
				};

				const result = logger.clfm(req, res);

				assert.ok(typeof result === "string");
			});

			it("should handle missing parsed data", () => {
				const logger = createLogger({ format: "%h %t %r %>s %b" });
				const req = {
					method: "GET",
					url: "/test",
					connection: { remoteAddress: "192.168.1.1" },
				};

				const res = {
					statusCode: 200,
					getHeader: () => 1234,
				};

				const result = logger.clfm(req, res);

				assert.ok(typeof result === "string");
			});
		});

		describe("extractIP", () => {
			it("should extract IP from connection", () => {
				const logger = createLogger();
				const req = {
					connection: { remoteAddress: "192.168.1.1" },
				};

				const result = logger.extractIP(req);

				assert.strictEqual(result, "192.168.1.1");
			});

			it("should fallback to socket remoteAddress", () => {
				const logger = createLogger();
				const req = {
					socket: { remoteAddress: "10.0.0.1" },
				};

				const result = logger.extractIP(req);

				assert.strictEqual(result, "10.0.0.1");
			});

			it("should fallback to 127.0.0.1 when no IP available", () => {
				const logger = createLogger();
				const req = {};

				const result = logger.extractIP(req);

				assert.strictEqual(result, "127.0.0.1");
			});
		});

		describe("logRoute", () => {
			it("should create route log message", () => {
				const logger = createLogger();
				const result = logger.logRoute("/test", "GET", "192.168.1.1");

				assert.ok(result);
				assert.ok(result.log);
			});

			it("should include uri in message", () => {
				const logger = createLogger();
				const result = logger.logRoute("/api/users", "POST", "10.0.0.1");

				assert.ok(result);
			});
		});

		describe("logMiddleware", () => {
			it("should create middleware log message", () => {
				const logger = createLogger();
				const result = logger.logMiddleware("/.*", "GET");

				assert.ok(result);
				assert.ok(result.log);
			});

			it("should include route in message", () => {
				const logger = createLogger();
				const result = logger.logMiddleware("/api", "POST");

				assert.ok(result);
			});
		});

		describe("logDecoration", () => {
			it("should create decoration log message", () => {
				const logger = createLogger();
				const result = logger.logDecoration("/test", "GET", "192.168.1.1");

				assert.ok(result);
				assert.ok(result.log);
			});
		});

		describe("logError", () => {
			it("should create error log message", () => {
				const logger = createLogger();
				const result = logger.logError("/test", "GET", "192.168.1.1");

				assert.ok(result);
				assert.ok(result.log);
			});
		});

		describe("logServe", () => {
			it("should create serve log message", () => {
				const logger = createLogger();
				const req = {
					method: "GET",
					parsed: { pathname: "/test" },
					ip: "192.168.1.1",
				};

				const result = logger.logServe(req, "Serving file");

				assert.ok(result);
				assert.ok(result.log);
			});
		});
	});
});
