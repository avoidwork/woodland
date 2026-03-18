import { Validator } from "jsonschema";
import {
	INT_1e3,
	INT_1e4,
	INT_3,
	UTF_8,
	INDEX_HTM,
	INDEX_HTML,
	EMPTY,
	INFO,
	DEBUG,
	LOG_FORMAT,
} from "./constants.js";

const DEFAULTS = {
	autoindex: false,
	cacheSize: INT_1e3,
	cacheTTL: INT_1e4,
	charset: UTF_8,
	corsExpose: EMPTY,
	defaultHeaders: {},
	digit: INT_3,
	etags: true,
	indexes: [INDEX_HTM, INDEX_HTML],
	logging: {},
	origins: [],
	silent: false,
	time: false,
};

const CONFIG_SCHEMA = {
	$schema: "http://json-schema.org/draft-07/schema#",
	type: "object",
	properties: {
		autoindex: { type: "boolean" },
		cacheSize: { type: "number", minimum: 1 },
		cacheTTL: { type: "number", minimum: 1 },
		charset: { type: "string" },
		corsExpose: { type: "string" },
		defaultHeaders: { type: "object" },
		digit: { type: "number", minimum: 1, maximum: 10 },
		etags: { type: "boolean" },
		indexes: { type: "array", items: { type: "string" } },
		logging: { type: "object" },
		origins: { type: "array", items: { type: "string" } },
		silent: { type: "boolean" },
		time: { type: "boolean" },
	},
	additionalProperties: false,
};

const validator = new Validator();

/**
 * Validates configuration object against schema
 * @param {Object} [config={}] - Configuration object to validate
 * @returns {Object} Validated configuration object with defaults
 * @throws {Error} When configuration validation fails
 */
export function validateConfig(config = {}) {
	const result = validator.validate(config, CONFIG_SCHEMA);

	if (!result.valid) {
		const errors = result.errors.map((err) => {
			const field = Array.isArray(err.path)
				? err.path.join(".")
				: String(err.path).replace(/^\./, "");
			let msg = err.message;

			if (msg.includes("is not of a type(s)")) {
				const types = msg.match(/type\(s\) ([a-z, ]+)/i);
				const type = types ? types[1].split(",")[0].trim() : "type";
				msg = `must be ${type}`;
			} else if (msg.includes("must be greater than or equal to")) {
				const val = msg.match(/greater than or equal to (\d+)/);
				msg = val ? `must be >= ${val[1]}` : msg;
			} else if (msg.includes("must be less than or equal to")) {
				const val = msg.match(/less than or equal to (\d+)/);
				msg = val ? `must be <= ${val[1]}` : msg;
			}

			return `Config "${field}" ${msg}`;
		});
		throw new Error(`Configuration validation failed: ${errors.join("; ")}`);
	}

	const validated = {};
	for (const [key] of Object.entries(CONFIG_SCHEMA.properties)) {
		const value = config[key];
		validated[key] = value === void 0 ? DEFAULTS[key] : value;
	}

	return validated;
}

const VALID_LOG_LEVELS = new Set([
	DEBUG,
	INFO,
	"warn",
	"error",
	"critical",
	"alert",
	"emerg",
	"notice",
]);

/**
 * Resolves logging value from config, environment, or default
 * @param {*} configValue - Value from configuration object
 * @param {*} envValue - Value from environment variable
 * @param {*} defaultValue - Default fallback value
 * @returns {*} Resolved value following priority: config > env > default
 */
export function resolveLoggingValue(configValue, envValue, defaultValue) {
	if (configValue !== void 0) {
		return configValue;
	}
	if (envValue !== void 0) {
		return envValue;
	}
	return defaultValue;
}

/**
 * Validates and normalizes logging configuration
 * @param {Object} [logging={}] - Logging configuration object
 * @param {boolean} [logging.enabled] - Whether logging is enabled
 * @param {string} [logging.format] - Custom log format string
 * @param {string} [logging.level] - Log level (debug, info, warn, error, etc.)
 * @returns {Object} Validated logging configuration with resolved values
 */
export function validateLogging(logging = {}) {
	const envLogEnabled = process.env.WOODLAND_LOG_ENABLED;
	const envLogFormat = process.env.WOODLAND_LOG_FORMAT;
	const envLogLevel = process.env.WOODLAND_LOG_LEVEL;

	const enabled = logging.enabled ?? (envLogEnabled ?? "true") !== "false";

	const format = resolveLoggingValue(logging.format, envLogFormat, LOG_FORMAT);
	const level = resolveLoggingValue(logging.level, envLogLevel, INFO);

	if (!VALID_LOG_LEVELS.has(level)) {
		return { enabled, format, level: INFO };
	}

	return { enabled, format, level };
}

/**
 * Validates and filters array of CORS origins
 * @param {Array} [origins=[]] - Array of origin strings to validate
 * @returns {Array} Filtered array of valid origins
 */
export function validateOrigins(origins = []) {
	if (!Array.isArray(origins)) {
		return [];
	}

	return origins.filter((origin) => {
		if (typeof origin !== "string") {
			return false;
		}
		if (origin === "*") {
			return true;
		}
		try {
			const url = new URL(origin);

			return url.origin === origin;
		} catch {
			return false;
		}
	});
}

/**
 * Merges logging configuration with environment variables
 * @param {Object} [logging={}] - Logging configuration object
 * @returns {Object} Merged logging configuration with enabled, format, and level
 */
export function mergeEnvLogging(logging = {}) {
	const envLogEnabled = process.env.WOODLAND_LOG_ENABLED;
	const envLogFormat = process.env.WOODLAND_LOG_FORMAT;
	const envLogLevel = process.env.WOODLAND_LOG_LEVEL;

	const enabled = logging.enabled ?? (envLogEnabled ?? "true") !== "false";

	const format = resolveLoggingValue(logging.format, envLogFormat, LOG_FORMAT);
	const level = resolveLoggingValue(logging.level, envLogLevel, INFO);

	return { enabled, format, level };
}
