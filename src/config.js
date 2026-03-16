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

const CONFIG_SCHEMA = {
	autoindex: { type: "boolean", default: false },
	cacheSize: { type: "number", default: INT_1e3, min: 1 },
	cacheTTL: { type: "number", default: INT_1e4, min: 1 },
	charset: { type: "string", default: UTF_8 },
	corsExpose: { type: "string", default: EMPTY },
	defaultHeaders: { type: "object", default: {} },
	digit: { type: "number", default: INT_3, min: 1, max: 10 },
	etags: { type: "boolean", default: true },
	indexes: { type: "array", default: [INDEX_HTM, INDEX_HTML] },
	logging: { type: "object", default: {} },
	origins: { type: "array", default: [] },
	silent: { type: "boolean", default: false },
	time: { type: "boolean", default: false },
};

/**
 * Validates a single configuration value against schema
 * @param {string} key - Configuration key
 * @param {*} value - Value to validate
 * @param {Object} schema - Schema definition
 * @returns {string|null} Error message or null if valid
 */
export function validateValue(key, value, schema) {
	if (schema.type === "array") {
		if (!Array.isArray(value)) {
			return `Config "${key}" must be an array`;
		}
	} else if (schema.type === "object") {
		if (value === null || typeof value !== "object" || Array.isArray(value)) {
			return `Config "${key}" must be an object`;
		}
	} else if (typeof value !== schema.type) {
		return `Config "${key}" must be ${schema.type}`;
	}

	if (schema.type === "number") {
		if (schema.min !== void 0 && value < schema.min) {
			return `Config "${key}" must be >= ${schema.min}`;
		}
		if (schema.max !== void 0 && value > schema.max) {
			return `Config "${key}" must be <= ${schema.max}`;
		}
	}

	return null;
}

/**
 * Validates configuration object against schema
 * @param {Object} [config={}] - Configuration object to validate
 * @returns {Object} Validated configuration object with defaults
 * @throws {Error} When configuration validation fails
 */
export function validateConfig(config = {}) {
	const validated = {};
	const errors = [];

	for (const [key, schema] of Object.entries(CONFIG_SCHEMA)) {
		const value = config[key];

		if (value === void 0) {
			validated[key] = schema.default;
		} else {
			const error = validateValue(key, value, schema);
			if (error) {
				errors.push(error);
			} else {
				validated[key] = value;
			}
		}
	}

	if (errors.length > 0) {
		throw new Error(`Configuration validation failed: ${errors.join("; ")}`);
	}

	return validated;
}

/**
 * Validates and merges logging configuration with environment variables
 * @param {Object} [logging={}] - Logging configuration object
 * @returns {Object} Logging configuration with enabled, format, level
 */
export function validateLogging(logging = {}) {
	const envLogEnabled = process.env.WOODLAND_LOG_ENABLED;
	const envLogFormat = process.env.WOODLAND_LOG_FORMAT;
	const envLogLevel = process.env.WOODLAND_LOG_LEVEL;

	const enabled = logging?.enabled ?? (envLogEnabled ? envLogEnabled !== "false" : true);
	const format = logging?.format ?? envLogFormat ?? LOG_FORMAT;
	const level = logging?.level ?? envLogLevel ?? INFO;

	const validLevels = [DEBUG, INFO, "warn", "error", "critical", "alert", "emerg", "notice"];
	if (!validLevels.includes(level)) {
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
 * @returns {Object} Merged logging configuration
 */
export function mergeEnvLogging(logging = {}) {
	const envLogEnabled = process.env.WOODLAND_LOG_ENABLED;
	const envLogFormat = process.env.WOODLAND_LOG_FORMAT;
	const envLogLevel = process.env.WOODLAND_LOG_LEVEL;

	return {
		enabled: logging?.enabled ?? (envLogEnabled ? envLogEnabled !== "false" : true),
		format: logging?.format ?? envLogFormat ?? LOG_FORMAT,
		level: logging?.level ?? envLogLevel ?? INFO,
	};
}
