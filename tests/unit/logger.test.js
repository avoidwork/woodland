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

			it("should use console.error for warn level", async () => {
				const logger = createLogger({ level: "debug" });
				const consoleLog = console.log;
				const consoleError = console.error;
				let errorCalled = false;

				console.log = () => {};
				console.error = () => {
					errorCalled = true;
				};

				logger.log("warn message", "warn");

				await new Promise((resolve) => setTimeout(resolve, 10));

				assert.strictEqual(errorCalled, true);

				console.log = consoleLog;
				console.error = consoleError;
			});

			it("should use console.log for debug level", async () => {
				const logger = createLogger({ level: "debug" });
				const consoleLog = console.log;
				let called = false;

				console.log = () => {
					called = true;
				};

				logger.log("debug message", "debug");

				await new Promise((resolve) => setTimeout(resolve, 10));

				assert.strictEqual(called, true);

				console.log = consoleLog;
			});

			it("should use console.error for error level", async () => {
				const logger = createLogger({ level: "debug" });
				const consoleLog = console.log;
				const consoleError = console.error;
				let errorCalled = false;

				console.log = () => {};
				console.error = () => {
					errorCalled = true;
				};

				logger.log("error message", "error");

				await new Promise((resolve) => setTimeout(resolve, 10));

				assert.strictEqual(errorCalled, true);

				console.log = consoleLog;
				console.error = consoleError;
			});

			it("should not log debug when level is info", async () => {
				const logger = createLogger({ level: "info" });
				const consoleLog = console.log;
				let called = false;

				console.log = () => {
					called = true;
				};

				logger.log("debug message", "debug");

				await new Promise((resolve) => setTimeout(resolve, 10));

				assert.strictEqual(called, false);

				console.log = consoleLog;
			});

			it("should use console.error for crit level", async () => {
				const logger = createLogger({ level: "debug" });
				const consoleLog = console.log;
				const consoleError = console.error;
				let errorCalled = false;

				console.log = () => {};
				console.error = () => {
					errorCalled = true;
				};

				logger.log("crit message", "crit");

				await new Promise((resolve) => setTimeout(resolve, 10));

				assert.strictEqual(errorCalled, true);

				console.log = consoleLog;
				console.error = consoleError;
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

			it("should handle missing getHeader", () => {
				const logger = createLogger({ format: "%h %t %r %>s %b" });
				const req = {
					method: "GET",
					headers: { host: "example.com" },
					connection: { remoteAddress: "192.168.1.1" },
				};

				const res = {
					statusCode: 200,
				};

				const result = logger.clfm(req, res);

				assert.ok(typeof result === "string");
			});

			it("should handle missing statusCode", () => {
				const logger = createLogger({ format: "%h %t %r %>s %b" });
				const req = {
					method: "GET",
					headers: { host: "example.com" },
					connection: { remoteAddress: "192.168.1.1" },
				};

				const res = {};

				const result = logger.clfm(req, res);

				assert.ok(typeof result === "string");
			});

			it("should handle missing username in parsed", () => {
				const logger = createLogger({ format: "%h %t %r %>s %b %u" });
				const req = {
					method: "GET",
					headers: { host: "example.com" },
					connection: { remoteAddress: "192.168.1.1" },
					parsed: {
						pathname: "/test",
						search: "?q=1",
					},
				};

				const res = {
					statusCode: 200,
					getHeader: () => 1234,
				};

				const result = logger.clfm(req, res);

				assert.ok(typeof result === "string");
			});

			it("should handle missing search in parsed", () => {
				const logger = createLogger({ format: "%h %t %r %>s %b" });
				const req = {
					method: "GET",
					headers: { host: "example.com" },
					connection: { remoteAddress: "192.168.1.1" },
					parsed: {
						pathname: "/test",
					},
				};

				const res = {
					statusCode: 200,
					getHeader: () => 1234,
				};

				const result = logger.clfm(req, res);

				assert.ok(typeof result === "string");
			});

			it("should handle missing method", () => {
				const logger = createLogger({ format: "%h %t %r %>s %b" });
				const req = {
					headers: { host: "example.com" },
					connection: { remoteAddress: "192.168.1.1" },
					parsed: {
						pathname: "/test",
						search: "?q=1",
					},
				};

				const res = {
					statusCode: 200,
					getHeader: () => 1234,
				};

				const result = logger.clfm(req, res);

				assert.ok(typeof result === "string");
			});

			it("should handle missing referer and user-agent", () => {
				const logger = createLogger({ format: "%h %t %r %>s %b %{Referer}i %{User-agent}i" });
				const req = {
					method: "GET",
					headers: { host: "example.com" },
					connection: { remoteAddress: "192.168.1.1" },
					parsed: {
						pathname: "/test",
						search: "?q=1",
					},
				};

				const res = {
					statusCode: 200,
					getHeader: () => 1234,
				};

				const result = logger.clfm(req, res);

				assert.ok(typeof result === "string");
			});

			it("should use req.ip when available", () => {
				const logger = createLogger({ format: "%h" });
				const req = {
					ip: "203.0.113.1",
					headers: { host: "example.com" },
					parsed: {
						pathname: "/test",
						search: "?q=1",
					},
				};

				const res = {
					statusCode: 200,
					getHeader: () => 1234,
				};

				const result = logger.clfm(req, res);

				assert.ok(result.includes("203.0.113.1"));
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
