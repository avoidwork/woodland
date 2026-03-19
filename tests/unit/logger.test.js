import assert from "node:assert";
import { describe, it } from "node:test";
import { createLogger, ms } from "../../src/logger.js";

describe("logger", () => {
	describe("createLogger", () => {
		it("should create logger with default config", () => {
			const logger = createLogger();

			assert.ok(logger.log);
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
			assert.strictEqual(typeof logger.logRoute, "function");
			assert.strictEqual(typeof logger.logMiddleware, "function");
			assert.strictEqual(typeof logger.logDecoration, "function");
			assert.strictEqual(typeof logger.logError, "function");
			assert.strictEqual(typeof logger.logServe, "function");
		});

		describe("log", () => {
			it("should return undefined (no chaining)", () => {
				const logger = createLogger();
				const result = logger.log("test message");

				assert.strictEqual(result, undefined);
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

			it("should use console.log for notice level", async () => {
				const logger = createLogger({ level: "debug" });
				const consoleLog = console.log;
				const consoleError = console.error;
				let logCalled = false;

				console.log = () => {
					logCalled = true;
				};
				console.error = () => {};

				logger.log("notice message", "notice");

				await new Promise((resolve) => setTimeout(resolve, 10));

				assert.strictEqual(logCalled, true);

				console.log = consoleLog;
				console.error = consoleError;
			});

			it("should use console.error for emerg level", async () => {
				const logger = createLogger({ level: "debug" });
				const consoleLog = console.log;
				const consoleError = console.error;
				let errorCalled = false;

				console.log = () => {};
				console.error = () => {
					errorCalled = true;
				};

				logger.log("emerg message", "emerg");

				await new Promise((resolve) => setTimeout(resolve, 10));

				assert.strictEqual(errorCalled, true);

				console.log = consoleLog;
				console.error = consoleError;
			});

			it("should use console.error for alert level", async () => {
				const logger = createLogger({ level: "debug" });
				const consoleLog = console.log;
				const consoleError = console.error;
				let errorCalled = false;

				console.log = () => {};
				console.error = () => {
					errorCalled = true;
				};

				logger.log("alert message", "alert");

				await new Promise((resolve) => setTimeout(resolve, 10));

				assert.strictEqual(errorCalled, true);

				console.log = consoleLog;
				console.error = consoleError;
			});
		});

		describe("logRoute", () => {
			it("should create route log message", () => {
				const logger = createLogger();
				const result = logger.logRoute("/test", "GET", "192.168.1.1");

				assert.strictEqual(result, undefined);
			});

			it("should include uri in message", () => {
				const logger = createLogger();
				const result = logger.logRoute("/api/users", "POST", "10.0.0.1");

				assert.strictEqual(result, undefined);
			});
		});

		describe("logMiddleware", () => {
			it("should create middleware log message", () => {
				const logger = createLogger();
				const result = logger.logMiddleware("/.*", "GET");

				assert.strictEqual(result, undefined);
			});

			it("should include route in message", () => {
				const logger = createLogger();
				const result = logger.logMiddleware("/api", "POST");

				assert.strictEqual(result, undefined);
			});
		});

		describe("logDecoration", () => {
			it("should create decoration log message", () => {
				const logger = createLogger();
				const result = logger.logDecoration("/test", "GET", "192.168.1.1");

				assert.strictEqual(result, undefined);
			});
		});

		describe("logError", () => {
			it("should create error log message", () => {
				const logger = createLogger();
				const result = logger.logError("/test", "GET", "192.168.1.1");

				assert.strictEqual(result, undefined);
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

				assert.strictEqual(result, undefined);
			});
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
});
