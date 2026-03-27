import assert from "node:assert";
import { describe, it } from "node:test";
import {
	validateConfig,
	validateLogging,
	validateOrigins,
	resolveLoggingValue,
} from "../../src/config.js";

describe("config", () => {
	describe("validateConfig", () => {
		it("should return default values for empty config", () => {
			const result = validateConfig();

			assert.strictEqual(result.autoIndex, false);
			assert.strictEqual(result.cacheSize, 1000);
			assert.strictEqual(result.etags, true);
			assert.deepStrictEqual(result.indexes, ["index.htm", "index.html"]);
			assert.deepStrictEqual(result.origins, []);
		});

		it("should accept valid custom config", () => {
			const config = {
				autoIndex: true,
				cacheSize: 2000,
				corsExpose: "x-custom",
				defaultHeaders: { "x-custom": "value" },
				digit: 5,
				etags: false,
				indexes: ["index.html"],
				silent: true,
				time: true,
			};

			const result = validateConfig(config);

			assert.strictEqual(result.autoIndex, true);
			assert.strictEqual(result.cacheSize, 2000);
			assert.strictEqual(result.digit, 5);
		});

		it("should throw error for invalid types", () => {
			assert.throws(() => validateConfig({ indexes: "not-an-array" }), /indexes.*array/);
			assert.throws(
				() => validateConfig({ defaultHeaders: "not-an-object" }),
				/defaultHeaders.*object/,
			);
			assert.throws(() => validateConfig({ charset: 123 }), /charset.*string/);
			assert.throws(() => validateConfig({ autoIndex: "true" }), /autoIndex.*boolean/);
		});

		it("should throw error for out-of-range numbers", () => {
			assert.throws(() => validateConfig({ cacheSize: 0 }), /cacheSize.*>= 1/);
			assert.throws(() => validateConfig({ digit: 15 }), /digit.*<= 10/);
		});
	});

	describe("validateLogging", () => {
		it("should return defaults for empty logging config", () => {
			const result = validateLogging();

			assert.strictEqual(result.enabled, true);
			assert.ok(result.format);
			assert.strictEqual(result.level, "info");
		});

		it("should accept custom logging config", () => {
			const result = validateLogging({ enabled: false, format: "custom", level: "debug" });

			assert.strictEqual(result.enabled, false);
			assert.strictEqual(result.format, "custom");
			assert.strictEqual(result.level, "debug");
		});

		it("should normalize invalid log level to info", () => {
			const result = validateLogging({ level: "invalid-level" });

			assert.strictEqual(result.level, "info");
		});

		it("should accept valid log levels", () => {
			const levels = ["debug", "info", "warn", "error", "critical", "alert", "emerg", "notice"];

			for (const level of levels) {
				assert.strictEqual(validateLogging({ level }).level, level);
			}
		});

		it("should use environment variables when config is empty", () => {
			process.env.WOODLAND_LOG_ENABLED = "false";
			process.env.WOODLAND_LOG_FORMAT = "env-format";
			process.env.WOODLAND_LOG_LEVEL = "warn";

			const result = validateLogging({});

			assert.strictEqual(result.enabled, false);
			assert.strictEqual(result.format, "env-format");
			assert.strictEqual(result.level, "warn");

			delete process.env.WOODLAND_LOG_ENABLED;
			delete process.env.WOODLAND_LOG_FORMAT;
			delete process.env.WOODLAND_LOG_LEVEL;
		});

		it("should prioritize config over environment variables", () => {
			process.env.WOODLAND_LOG_ENABLED = "false";
			process.env.WOODLAND_LOG_FORMAT = "env-format";
			process.env.WOODLAND_LOG_LEVEL = "warn";

			const result = validateLogging({ enabled: true, format: "config", level: "error" });

			assert.strictEqual(result.enabled, true);
			assert.strictEqual(result.format, "config");
			assert.strictEqual(result.level, "error");

			delete process.env.WOODLAND_LOG_ENABLED;
			delete process.env.WOODLAND_LOG_FORMAT;
			delete process.env.WOODLAND_LOG_LEVEL;
		});

		it("should handle undefined config values falling back to env", () => {
			process.env.WOODLAND_LOG_LEVEL = "error";
			const result = validateLogging({ enabled: true, level: void 0 });

			assert.strictEqual(result.enabled, true);
			assert.strictEqual(result.level, "error");

			delete process.env.WOODLAND_LOG_LEVEL;
		});
	});

	describe("validateOrigins", () => {
		it("should return empty array for non-array or empty input", () => {
			assert.deepStrictEqual(validateOrigins("not-an-array"), []);
			assert.deepStrictEqual(validateOrigins([]), []);
		});

		it("should accept wildcard and valid origins with scheme", () => {
			const result = validateOrigins(["*", "https://example.com", "http://localhost:3000"]);

			assert.deepStrictEqual(result, ["*", "https://example.com", "http://localhost:3000"]);
		});

		it("should reject origins without scheme or with trailing slash", () => {
			assert.deepStrictEqual(validateOrigins(["example.com", "https://example.com/"]), []);
		});

		it("should filter out invalid origins", () => {
			const result = validateOrigins(["https://example.com", "invalid", 123, null]);

			assert.deepStrictEqual(result, ["https://example.com"]);
		});
	});

	describe("resolveLoggingValue", () => {
		it("should return config value when defined", () => {
			assert.strictEqual(resolveLoggingValue("config", "env", "default"), "config");
		});

		it("should return env value when config is undefined", () => {
			assert.strictEqual(resolveLoggingValue(void 0, "env", "default"), "env");
		});

		it("should return default value when both config and env are undefined", () => {
			assert.strictEqual(resolveLoggingValue(void 0, void 0, "default"), "default");
		});

		it("should handle falsy values correctly", () => {
			assert.strictEqual(resolveLoggingValue(false, true, "default"), false);
			assert.strictEqual(resolveLoggingValue(0, 100, "default"), 0);
			assert.strictEqual(resolveLoggingValue("", "env", "default"), "");
		});
	});
});
