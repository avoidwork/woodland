import { Validator } from "jsonschema";
import {
	ARRAY,
	BOOLEAN,
	COMMA,
	EMPTY,
	FALSE,
	INFO,
	INDEX_HTM,
	INDEX_HTML,
	INT_0,
	INT_1,
	INT_10,
	INT_1e3,
	INT_1e4,
	INT_3,
	LOG_FORMAT,
	MSG_CONFIG_FIELD,
	MSG_MUST_BE_GREATER_THAN,
	MSG_MUST_BE_LESS_THAN,
	MSG_MUST_BE_TYPE,
	MSG_VALIDATION_FAILED,
	NUMBER,
	OBJECT,
	PERIOD,
	SEMICOLON_SPACE,
	STRING,
	TRUE,
	TYPE,
	UTF_8,
	VALID_LOG_LEVELS,
	WILDCARD,
} from "./constants.js";

const DEFAULTS = {
	autoIndex: false,
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
	type: OBJECT,
	properties: {
		autoIndex: { type: BOOLEAN },
		cacheSize: { type: NUMBER, minimum: INT_1 },
		cacheTTL: { type: NUMBER, minimum: INT_1 },
		charset: { type: STRING },
		corsExpose: { type: STRING },
		defaultHeaders: { type: OBJECT },
		digit: { type: NUMBER, minimum: INT_1, maximum: INT_10 },
		etags: { type: BOOLEAN },
		indexes: { type: ARRAY, items: { type: STRING } },
		logging: { type: OBJECT },
		origins: { type: ARRAY, items: { type: STRING } },
		silent: { type: BOOLEAN },
		time: { type: BOOLEAN },
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
				? err.path.join(PERIOD)
				: String(err.path).replace(/^\./, EMPTY);
			let msg = err.message;

			if (msg.includes(MSG_MUST_BE_TYPE)) {
				const types = msg.match(/type\(s\) ([a-z, ]+)/i);
				const type = types ? types[INT_1].split(COMMA)[INT_0].trim() : TYPE;
				msg = `must be ${type}`;
			} else if (msg.includes(MSG_MUST_BE_GREATER_THAN)) {
				const val = msg.match(/greater than or equal to (\d+)/);
				msg = val ? `must be >= ${val[INT_1]}` : msg;
			} else if (msg.includes(MSG_MUST_BE_LESS_THAN)) {
				const val = msg.match(/less than or equal to (\d+)/);
				msg = val ? `must be <= ${val[INT_1]}` : msg;
			}

			return `${MSG_CONFIG_FIELD}"${field}" ${msg}`;
		});
		throw new Error(`${MSG_VALIDATION_FAILED}${errors.join(SEMICOLON_SPACE)}`);
	}

	const validated = {};
	for (const [key] of Object.entries(CONFIG_SCHEMA.properties)) {
		const value = config[key];
		validated[key] = value === void 0 ? DEFAULTS[key] : value;
	}

	return validated;
}

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

	const enabled = logging.enabled ?? (envLogEnabled ?? TRUE) !== FALSE;

	const format = resolveLoggingValue(logging.format, envLogFormat, LOG_FORMAT);
	const level = resolveLoggingValue(logging.level, envLogLevel, INFO);

	if (!VALID_LOG_LEVELS.has(level)) {
		return Object.freeze({ enabled, format, level: INFO });
	}

	return Object.freeze({ enabled, format, level });
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
		if (typeof origin !== STRING) {
			return false;
		}
		if (origin === WILDCARD) {
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
