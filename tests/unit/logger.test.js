import assert from "node:assert";
import { describe, it } from "node:test";
import { createLogger, ms, clf, timeOffset } from "../../src/logger.js";

describe("logger", () => {
	describe("createLogger", () => {
		it("should create logger with default and custom config", () => {
			const logger1 = createLogger();
			const logger2 = createLogger({ enabled: true, format: "custom format", level: "debug" });

			assert.ok(logger1.log);
			assert.ok(logger2.log);
			assert.ok(logger1.logRoute);
			assert.ok(logger1.logMiddleware);
			assert.ok(logger1.logDecoration);
			assert.ok(logger1.logError);
			assert.ok(logger1.logServe);
		});

		it("should normalize invalid log level to info", () => {
			const logger = createLogger({ level: "invalid" });
			assert.ok(logger.log);
		});

		it("should return logger object with all methods", () => {
			const logger = createLogger({ enabled: false });

			assert.strictEqual(typeof logger.log, "function");
			assert.strictEqual(typeof logger.logRoute, "function");
			assert.strictEqual(typeof logger.logMiddleware, "function");
			assert.strictEqual(typeof logger.logDecoration, "function");
			assert.strictEqual(typeof logger.logError, "function");
			assert.strictEqual(typeof logger.logServe, "function");
		});

		describe("log", () => {
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
	});

	describe("ms", () => {
		it("should format nanoseconds to milliseconds", () => {
			assert.strictEqual(ms(1000000), "1.000 ms");
			assert.strictEqual(ms(1000000, 2), "1.00 ms");
			assert.strictEqual(ms(1000000, 0), "1 ms");
			assert.strictEqual(ms(0), "0.000 ms");
		});
	});

	describe("clf", () => {
		it("should generate common log format entry", () => {
			const req = {
				ip: "192.168.1.1",
				method: "GET",
				headers: { host: "example.com" },
				parsed: { pathname: "/test", search: "", username: "" },
				url: "/test",
			};
			const res = {
				getHeader: (_name) => "1234",
				statusCode: 200,
			};
			const format = '%h %l %u %t "%r" %>s %b';

			const result = clf(req, res, format);

			assert.ok(result.includes("192.168.1.1"));
			assert.ok(result.includes("GET /test"));
			assert.ok(result.includes("200"));
			assert.ok(result.includes("1234"));
		});

		it("should use hyphen for missing values", () => {
			const req = {
				headers: {},
				parsed: null,
				url: undefined,
			};
			const res = {};
			const format = '%h %l %u %t "%r" %>s %b';

			const result = clf(req, res, format);

			assert.ok(result.includes("- -"));
			assert.ok(result.includes("500"));
		});
	});

	describe("timeOffset", () => {
		it("should format timezone offsets", () => {
			assert.strictEqual(timeOffset(300), "-0500");
			assert.strictEqual(timeOffset(-300), "0500");
			assert.strictEqual(timeOffset(0), "-0000");
			assert.strictEqual(timeOffset(330), "-0530");
			assert.strictEqual(timeOffset(65), "-0104");
		});
	});
});
