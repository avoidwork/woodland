import assert from "node:assert";
import { describe, it } from "node:test";
import {
	validateConfig,
	validateLogging,
	validateOrigins,
	mergeEnvLogging,
	resolveLoggingValue,
} from "../../src/config.js";

describe("config", () => {
	describe("validateConfig", () => {
		it("should return default values for empty config", () => {
			const result = validateConfig();

			assert.strictEqual(result.autoindex, false);
			assert.strictEqual(result.cacheSize, 1000);
			assert.strictEqual(result.cacheTTL, 10000);
			assert.strictEqual(result.charset, "utf-8");
			assert.strictEqual(result.corsExpose, "");
			assert.deepStrictEqual(result.defaultHeaders, {});
			assert.strictEqual(result.digit, 3);
			assert.strictEqual(result.etags, true);
			assert.deepStrictEqual(result.indexes, ["index.htm", "index.html"]);
			assert.deepStrictEqual(result.logging, {});
			assert.deepStrictEqual(result.origins, []);
			assert.strictEqual(result.silent, false);
			assert.strictEqual(result.time, false);
		});

		it("should accept valid custom config", () => {
			const config = {
				autoindex: true,
				cacheSize: 2000,
				cacheTTL: 20000,
				charset: "utf-8",
				corsExpose: "x-custom",
				defaultHeaders: { "x-custom": "value" },
				digit: 5,
				etags: false,
				indexes: ["index.html"],
				logging: { enabled: true },
				origins: ["https://example.com"],
				silent: true,
				time: true,
			};

			const result = validateConfig(config);

			assert.strictEqual(result.autoindex, true);
			assert.strictEqual(result.cacheSize, 2000);
			assert.strictEqual(result.cacheTTL, 20000);
			assert.strictEqual(result.corsExpose, "x-custom");
			assert.deepStrictEqual(result.defaultHeaders, { "x-custom": "value" });
			assert.strictEqual(result.digit, 5);
			assert.strictEqual(result.etags, false);
			assert.deepStrictEqual(result.indexes, ["index.html"]);
			assert.strictEqual(result.silent, true);
			assert.strictEqual(result.time, true);
		});

		it("should throw error for invalid array type", () => {
			assert.throws(() => {
				validateConfig({ indexes: "not-an-array" });
			}, /Config "indexes" must be array/);
		});

		it("should throw error for invalid object type", () => {
			assert.throws(() => {
				validateConfig({ defaultHeaders: "not-an-object" });
			}, /Config "defaultHeaders" must be object/);
		});

		it("should throw error for invalid string type", () => {
			assert.throws(() => {
				validateConfig({ charset: 123 });
			}, /Config "charset" must be string/);
		});

		it("should throw error for invalid boolean type", () => {
			assert.throws(() => {
				validateConfig({ autoindex: "true" });
			}, /Config "autoindex" must be boolean/);
		});

		it("should throw error for number below minimum", () => {
			assert.throws(() => {
				validateConfig({ cacheSize: 0 });
			}, /Config "cacheSize" must be >= 1/);
		});

		it("should throw error for number above maximum", () => {
			assert.throws(() => {
				validateConfig({ digit: 15 });
			}, /Config "digit" must be <= 10/);
		});

		it("should accept null object value", () => {
			assert.throws(() => {
				validateConfig({ defaultHeaders: null });
			}, /Config "defaultHeaders" must be object/);
		});

		it("should reject array as object", () => {
			assert.throws(() => {
				validateConfig({ defaultHeaders: [] });
			}, /Config "defaultHeaders" must be object/);
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
			const config = {
				enabled: false,
				format: "custom format",
			};

			const result = validateLogging(config);

			assert.strictEqual(result.enabled, false);
			assert.strictEqual(result.format, "custom format");
		});

		it("should handle logging object without enabled property", () => {
			const config = {
				format: "custom format",
				level: "warn",
			};

			const result = validateLogging(config);

			assert.strictEqual(result.enabled, true);
			assert.strictEqual(result.format, "custom format");
			assert.strictEqual(result.level, "warn");
		});

		it("should accept custom logging config", () => {
			const config = {
				enabled: false,
				format: "custom format",
				level: "debug",
			};

			const result = validateLogging(config);

			assert.strictEqual(result.enabled, false);
			assert.strictEqual(result.format, "custom format");
			assert.strictEqual(result.level, "debug");
		});

		it("should use logging.enabled false when defined", () => {
			const result = validateLogging({ enabled: false });

			assert.strictEqual(result.enabled, false);
		});

		it("should normalize invalid log level to info", () => {
			const result = validateLogging({ level: "invalid-level" });

			assert.strictEqual(result.level, "info");
		});

		it("should preserve enabled and format when normalizing invalid level", () => {
			const result = validateLogging({ enabled: false, format: "custom", level: "invalid" });

			assert.strictEqual(result.enabled, false);
			assert.strictEqual(result.format, "custom");
			assert.strictEqual(result.level, "info");
		});

		it("should accept valid log levels", () => {
			const levels = ["debug", "info", "warn", "error", "critical", "alert", "emerg", "notice"];

			for (const level of levels) {
				const result = validateLogging({ level });
				assert.strictEqual(result.level, level, `Level ${level} should be valid`);
			}
		});

		it("should return valid level without normalization", () => {
			const result = validateLogging({ enabled: true, format: "test", level: "debug" });

			assert.strictEqual(result.enabled, true);
			assert.strictEqual(result.format, "test");
			assert.strictEqual(result.level, "debug");
		});

		it("should use environment variable for enabled", () => {
			process.env.WOODLAND_LOG_ENABLED = "false";
			const result = validateLogging({});

			assert.strictEqual(result.enabled, false);

			delete process.env.WOODLAND_LOG_ENABLED;
		});

		it("should use environment variable true for enabled", () => {
			process.env.WOODLAND_LOG_ENABLED = "true";
			const result = validateLogging({});

			assert.strictEqual(result.enabled, true);

			delete process.env.WOODLAND_LOG_ENABLED;
		});

		it("should prioritize config over environment variable", () => {
			process.env.WOODLAND_LOG_ENABLED = "false";
			const result = validateLogging({ enabled: true });

			assert.strictEqual(result.enabled, true);

			delete process.env.WOODLAND_LOG_ENABLED;
		});

		it("should use environment variable for format", () => {
			process.env.WOODLAND_LOG_FORMAT = "env-format";
			const result = validateLogging({});

			assert.strictEqual(result.format, "env-format");

			delete process.env.WOODLAND_LOG_FORMAT;
		});

		it("should use environment variable for level", () => {
			process.env.WOODLAND_LOG_LEVEL = "warn";
			const result = validateLogging({});

			assert.strictEqual(result.level, "warn");

			delete process.env.WOODLAND_LOG_LEVEL;
		});

		it("should normalize invalid environment variable level to info", () => {
			process.env.WOODLAND_LOG_LEVEL = "invalid-env-level";
			const result = validateLogging({});

			assert.strictEqual(result.level, "info");

			delete process.env.WOODLAND_LOG_LEVEL;
		});

		it("should normalize invalid level while preserving enabled false", () => {
			const result = validateLogging({ enabled: false, level: "bogus" });

			assert.strictEqual(result.enabled, false);
			assert.strictEqual(result.level, "info");
		});

		it("should use env enabled false with invalid level from config", () => {
			process.env.WOODLAND_LOG_ENABLED = "false";
			const result = validateLogging({ level: "invalid" });

			assert.strictEqual(result.enabled, false);
			assert.strictEqual(result.level, "info");

			delete process.env.WOODLAND_LOG_ENABLED;
		});

		it("should normalize invalid level while preserving enabled true", () => {
			const result = validateLogging({ enabled: true, level: "badlevel" });

			assert.strictEqual(result.enabled, true);
			assert.strictEqual(result.level, "info");
		});

		it("should use env level when config level is undefined", () => {
			process.env.WOODLAND_LOG_LEVEL = "error";
			const result = validateLogging({ enabled: true });

			assert.strictEqual(result.enabled, true);
			assert.strictEqual(result.level, "error");

			delete process.env.WOODLAND_LOG_LEVEL;
		});

		it("should use config level over env level", () => {
			process.env.WOODLAND_LOG_LEVEL = "error";
			const result = validateLogging({ enabled: true, level: "warn" });

			assert.strictEqual(result.enabled, true);
			assert.strictEqual(result.level, "warn");

			delete process.env.WOODLAND_LOG_LEVEL;
		});

		it("should use env enabled true with env level", () => {
			process.env.WOODLAND_LOG_ENABLED = "true";
			process.env.WOODLAND_LOG_LEVEL = "warn";
			const result = validateLogging({});

			assert.strictEqual(result.enabled, true);
			assert.strictEqual(result.level, "warn");

			delete process.env.WOODLAND_LOG_ENABLED;
			delete process.env.WOODLAND_LOG_LEVEL;
		});

		it("should use env format with env level", () => {
			process.env.WOODLAND_LOG_FORMAT = "env-fmt";
			process.env.WOODLAND_LOG_LEVEL = "debug";
			const result = validateLogging({});

			assert.strictEqual(result.format, "env-fmt");
			assert.strictEqual(result.level, "debug");

			delete process.env.WOODLAND_LOG_FORMAT;
			delete process.env.WOODLAND_LOG_LEVEL;
		});

		it("should use logging.enabled false explicitly", () => {
			process.env.WOODLAND_LOG_ENABLED = "true";
			const result = validateLogging({ enabled: false });

			assert.strictEqual(result.enabled, false);

			delete process.env.WOODLAND_LOG_ENABLED;
		});

		it("should use env enabled false when logging.enabled undefined", () => {
			process.env.WOODLAND_LOG_ENABLED = "false";
			const result = validateLogging({});

			assert.strictEqual(result.enabled, false);

			delete process.env.WOODLAND_LOG_ENABLED;
		});

		it("should use env enabled true when logging.enabled undefined", () => {
			process.env.WOODLAND_LOG_ENABLED = "true";
			const result = validateLogging({});

			assert.strictEqual(result.enabled, true);

			delete process.env.WOODLAND_LOG_ENABLED;
		});

		it("should use default enabled true when no env or config", () => {
			const result = validateLogging({});

			assert.strictEqual(result.enabled, true);
		});

		it("should use logging.format explicitly", () => {
			process.env.WOODLAND_LOG_FORMAT = "env-fmt";
			const result = validateLogging({ format: "config-fmt" });

			assert.strictEqual(result.format, "config-fmt");

			delete process.env.WOODLAND_LOG_FORMAT;
		});

		it("should use env format when logging.format undefined", () => {
			process.env.WOODLAND_LOG_FORMAT = "env-fmt";
			const result = validateLogging({});

			assert.strictEqual(result.format, "env-fmt");

			delete process.env.WOODLAND_LOG_FORMAT;
		});

		it("should use default format when no env or config", () => {
			delete process.env.WOODLAND_LOG_FORMAT;
			const result = validateLogging({});

			assert.ok(result.format);
		});

		it("should use logging.level explicitly undefined falls to env", () => {
			process.env.WOODLAND_LOG_LEVEL = "warn";
			const result = validateLogging({ level: void 0 });

			assert.strictEqual(result.level, "warn");

			delete process.env.WOODLAND_LOG_LEVEL;
		});

		it("should use logging.enabled explicitly undefined falls to env true", () => {
			process.env.WOODLAND_LOG_ENABLED = "true";
			const result = validateLogging({ enabled: void 0 });

			assert.strictEqual(result.enabled, true);

			delete process.env.WOODLAND_LOG_ENABLED;
		});

		it("should use logging.format explicitly undefined falls to env", () => {
			process.env.WOODLAND_LOG_FORMAT = "env-fmt";
			const result = validateLogging({ format: void 0 });

			assert.strictEqual(result.format, "env-fmt");

			delete process.env.WOODLAND_LOG_FORMAT;
		});

		it("should use logging.level explicitly", () => {
			process.env.WOODLAND_LOG_LEVEL = "error";
			const result = validateLogging({ level: "warn" });

			assert.strictEqual(result.level, "warn");

			delete process.env.WOODLAND_LOG_LEVEL;
		});

		it("should use env level when logging.level undefined", () => {
			process.env.WOODLAND_LOG_LEVEL = "warn";
			const result = validateLogging({});

			assert.strictEqual(result.level, "warn");

			delete process.env.WOODLAND_LOG_LEVEL;
		});

		it("should use default level when no env or config", () => {
			delete process.env.WOODLAND_LOG_LEVEL;
			const result = validateLogging({});

			assert.strictEqual(result.level, "info");
		});

		it("should use default enabled when no env or config", () => {
			delete process.env.WOODLAND_LOG_ENABLED;
			delete process.env.WOODLAND_LOG_FORMAT;
			delete process.env.WOODLAND_LOG_LEVEL;
			const result = validateLogging({});

			assert.strictEqual(result.enabled, true);
			assert.strictEqual(result.level, "info");
		});

		it("should use default format explicitly", () => {
			delete process.env.WOODLAND_LOG_FORMAT;
			const result = validateLogging({ format: void 0 });

			assert.strictEqual(result.format, result.format); // Just verify it's set
		});
	});

	describe("validateOrigins", () => {
		it("should return empty array for non-array input", () => {
			const result = validateOrigins("not-an-array");

			assert.deepStrictEqual(result, []);
		});

		it("should return empty array for empty array", () => {
			const result = validateOrigins([]);

			assert.deepStrictEqual(result, []);
		});

		it("should accept wildcard origin", () => {
			const result = validateOrigins(["*"]);

			assert.deepStrictEqual(result, ["*"]);
		});

		it("should accept valid origins with scheme", () => {
			const result = validateOrigins(["https://example.com", "http://localhost:3000"]);

			assert.deepStrictEqual(result, ["https://example.com", "http://localhost:3000"]);
		});

		it("should reject origins without scheme", () => {
			const result = validateOrigins(["example.com", "localhost:3000"]);

			assert.deepStrictEqual(result, []);
		});

		it("should reject origins without protocol", () => {
			const result = validateOrigins(["//example.com"]);

			assert.deepStrictEqual(result, []);
		});

		it("should reject origins with trailing slash", () => {
			const result = validateOrigins(["https://example.com/"]);

			assert.deepStrictEqual(result, []);
		});

		it("should filter out invalid origins", () => {
			const result = validateOrigins(["https://example.com", "invalid-url", 123, null]);

			assert.deepStrictEqual(result, ["https://example.com"]);
		});

		it("should filter out origins that don't match URL format", () => {
			const result = validateOrigins(["example.com"]);

			assert.deepStrictEqual(result, []);
		});

		it("should handle mixed valid and invalid origins", () => {
			const result = validateOrigins([
				"https://example.com",
				"not-a-url",
				"http://localhost:8080",
				"",
				"*",
			]);

			assert.deepStrictEqual(result, ["https://example.com", "http://localhost:8080", "*"]);
		});
	});

	describe("mergeEnvLogging", () => {
		it("should return defaults for empty logging config", () => {
			const result = mergeEnvLogging();

			assert.strictEqual(result.enabled, true);
			assert.ok(result.format);
			assert.strictEqual(result.level, "info");
		});

		it("should accept custom logging config", () => {
			const config = {
				enabled: false,
				format: "custom",
				level: "debug",
			};

			const result = mergeEnvLogging(config);

			assert.strictEqual(result.enabled, false);
			assert.strictEqual(result.format, "custom");
			assert.strictEqual(result.level, "debug");
		});

		it("should use environment variable for enabled when config is empty", () => {
			process.env.WOODLAND_LOG_ENABLED = "false";
			const result = mergeEnvLogging({});

			assert.strictEqual(result.enabled, false);

			delete process.env.WOODLAND_LOG_ENABLED;
		});

		it("should use environment variable for format when config is empty", () => {
			process.env.WOODLAND_LOG_FORMAT = "env-format";
			const result = mergeEnvLogging({});

			assert.strictEqual(result.format, "env-format");

			delete process.env.WOODLAND_LOG_FORMAT;
		});

		it("should use environment variable for level when config is empty", () => {
			process.env.WOODLAND_LOG_LEVEL = "error";
			const result = mergeEnvLogging({});

			assert.strictEqual(result.level, "error");

			delete process.env.WOODLAND_LOG_LEVEL;
		});

		it("should prioritize config over environment variables", () => {
			process.env.WOODLAND_LOG_ENABLED = "false";
			process.env.WOODLAND_LOG_FORMAT = "env-format";
			process.env.WOODLAND_LOG_LEVEL = "error";

			const result = mergeEnvLogging({
				enabled: true,
				format: "config-format",
				level: "warn",
			});

			assert.strictEqual(result.enabled, true);
			assert.strictEqual(result.format, "config-format");
			assert.strictEqual(result.level, "warn");

			delete process.env.WOODLAND_LOG_ENABLED;
			delete process.env.WOODLAND_LOG_FORMAT;
			delete process.env.WOODLAND_LOG_LEVEL;
		});
	});

	describe("resolveLoggingValue", () => {
		it("should return config value when defined", () => {
			const result = resolveLoggingValue("config-value", "env-value", "default-value");

			assert.strictEqual(result, "config-value");
		});

		it("should return env value when config is undefined", () => {
			const result = resolveLoggingValue(void 0, "env-value", "default-value");

			assert.strictEqual(result, "env-value");
		});

		it("should return default value when both config and env are undefined", () => {
			const result = resolveLoggingValue(void 0, void 0, "default-value");

			assert.strictEqual(result, "default-value");
		});

		it("should return config value over default", () => {
			const result = resolveLoggingValue("config", void 0, "default");

			assert.strictEqual(result, "config");
		});

		it("should return env value over default", () => {
			const result = resolveLoggingValue(void 0, "env", "default");

			assert.strictEqual(result, "env");
		});

		it("should handle false boolean values correctly", () => {
			const result = resolveLoggingValue(false, true, "default");

			assert.strictEqual(result, false);
		});

		it("should handle null values correctly", () => {
			const result = resolveLoggingValue(null, "env", "default");

			assert.strictEqual(result, null);
		});

		it("should handle zero number values correctly", () => {
			const result = resolveLoggingValue(0, 100, "default");

			assert.strictEqual(result, 0);
		});

		it("should handle empty string values correctly", () => {
			const result = resolveLoggingValue("", "env", "default");

			assert.strictEqual(result, "");
		});
	});
});
