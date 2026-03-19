import {
	DEBUG,
	ERROR,
	HYPHEN,
	INFO,
	CONTENT_LENGTH,
	MONTHS,
	INT_0,
	INT_2,
	INT_3,
	INT_4,
	INT_60,
	INT_1e6,
	INT_500,
	LEVELS,
	REFERER,
	TIME_MS,
	TOKEN_N,
	STRING_0,
	USER_AGENT,
	HTTP_VERSION,
	CONSOLE_LOG,
	CONSOLE_ERROR,
	VALID_LOG_LEVELS,
	EMPTY,
	LOG_B,
	LOG_H,
	LOG_L,
	LOG_R,
	LOG_REFERRER,
	LOG_S,
	LOG_T,
	LOG_U,
	LOG_USER_AGENT,
	LOG_V,
} from "./constants.js";
import { extractIP } from "./request.js";

/**
 * Generates common log format entry
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {string} format - Log format string
 * @returns {string} Common log format string
 */
export function clf(req, res, format) {
	const date = new Date();
	const month = MONTHS[date.getMonth()];
	const day = date.getDate();
	const year = date.getFullYear();
	const hours = String(date.getHours()).padStart(INT_2, STRING_0);
	const minutes = String(date.getMinutes()).padStart(INT_2, STRING_0);
	const seconds = String(date.getSeconds()).padStart(INT_2, STRING_0);
	const timezone = timeOffset(date.getTimezoneOffset());
	const dateStr = `[${day}/${month}/${year}:${hours}:${minutes}:${seconds} ${timezone}]`;
	const headers = req.headers;
	const host = headers && headers.host ? headers.host : HYPHEN;
	const clientIP = req.ip || extractIP(req);
	const ip = clientIP || HYPHEN;
	const logname = HYPHEN;
	const parsed = req.parsed;
	const username = parsed && parsed.username ? parsed.username : HYPHEN;
	const pathname = parsed && parsed.pathname ? parsed.pathname : req.url ? req.url : HYPHEN;
	const search = parsed && parsed.search !== undefined ? parsed.search : HYPHEN;
	const method = req.method ? req.method : HYPHEN;
	const requestLine = `${method} ${pathname}${search} ${HTTP_VERSION}`;
	const resStatusCode = res.statusCode;
	const statusCode = resStatusCode ? resStatusCode : INT_500;
	const getHeader = res.getHeader;
	const contentLength = getHeader ? getHeader.call(res, CONTENT_LENGTH) || HYPHEN : HYPHEN;
	const referer = headers && headers[REFERER] ? headers[REFERER] : HYPHEN;
	const userAgent = headers && headers[USER_AGENT] ? headers[USER_AGENT] : HYPHEN;

	let logEntry = format;

	logEntry = logEntry
		.replace(LOG_V, host)
		.replace(LOG_H, ip)
		.replace(LOG_L, logname)
		.replace(LOG_U, username)
		.replace(LOG_T, dateStr)
		.replace(LOG_R, requestLine)
		.replace(LOG_S, String(statusCode))
		.replace(LOG_B, contentLength)
		.replace(LOG_REFERRER, referer)
		.replace(LOG_USER_AGENT, userAgent);

	return logEntry;
}

/**
 * Creates route log message
 * @param {string} uri - Request URI
 * @param {string} method - HTTP method
 * @param {string} ip - Client IP
 * @param {Function} logFn - Log function
 * @returns {Object} Logger object for chaining
 */
export function logRoute(uri, method, ip, logFn) {
	return logFn(`type=route, uri=${uri}, method=${method}, ip=${ip}, message="Routing request"`);
}

/**
 * Creates middleware log message
 * @param {string} route - Route path
 * @param {string} method - HTTP method
 * @param {Function} logFn - Log function
 * @returns {Object} Logger object for chaining
 */
export function logMiddleware(route, method, logFn) {
	return logFn(`type=use, route=${route}, method=${method}, message="Registering middleware"`);
}

/**
 * Creates decoration log message
 * @param {string} uri - Request URI
 * @param {string} method - HTTP method
 * @param {string} ip - Client IP
 * @param {Function} logFn - Log function
 * @returns {Object} Logger object for chaining
 */
export function logDecoration(uri, method, ip, logFn) {
	return logFn(
		`type=decorate, uri=${uri}, method=${method}, ip=${ip}, message="Decorated request from ${ip}"`,
	);
}

/**
 * Creates error log message
 * @param {string} uri - Request URI
 * @param {string} method - HTTP method
 * @param {string} ip - Client IP
 * @param {Function} logFn - Log function
 * @returns {Object} Logger object for chaining
 */
export function logError(uri, method, ip, logFn) {
	return logFn(
		`type=error, uri=${uri}, method=${method}, ip=${ip}, message="Handled error response for ${ip}"`,
		ERROR,
	);
}

/**
 * Creates serve log message
 * @param {Object} req - Request object
 * @param {string} message - Log message
 * @param {Function} logFn - Log function
 * @returns {Object} Logger object for chaining
 */
export function logServe(req, message, logFn) {
	return logFn(
		`type=serve, uri=${req.parsed.pathname}, method=${req.method}, ip=${req.ip}, message="${message}"`,
		ERROR,
	);
}

/**
 * Main logging function - outputs log messages to console
 * @param {string} msg - Log message to output
 * @param {string} [logLevel='debug'] - Log level for message
 * @param {boolean} [enabled=true] - Enable/disable logging
 * @param {string} [actualLevel='info'] - Minimum log level to output
 * @returns {undefined} No return value (does not chain)
 */
export function log(msg, logLevel = DEBUG, enabled = true, actualLevel = INFO) {
	if (enabled) {
		const idx = LEVELS[logLevel];
		if (idx <= LEVELS[actualLevel]) {
			process.nextTick(() => {
				const consoleMethod = idx > INT_4 ? CONSOLE_LOG : CONSOLE_ERROR;
				console[consoleMethod](msg);
			});
		}
	}
}

/**
 * Creates logger with configurable format and level
 * @param {Object} [config={}] - Configuration object
 * @param {boolean} [config.enabled=true] - Enable/disable logging
 * @param {string} [config.format] - Custom log format string
 * @param {string} [config.level='info'] - Log level
 * @returns {Object} Logger with log, clf, logRoute, logMiddleware, logDecoration, logError, logServe methods
 */
export function createLogger(config = {}) {
	const { enabled = true, format, level = INFO } = config;
	const actualLevel = VALID_LOG_LEVELS.has(level) ? level : INFO;

	return {
		log: (msg, logLevel = DEBUG) => log(msg, logLevel, enabled, actualLevel),
		clf: (req, res) => clf(req, res, format),
		logRoute: (uri, method, ip) =>
			logRoute(uri, method, ip, (msg, lvl) => log(msg, lvl, enabled, actualLevel)),
		logMiddleware: (route, method) =>
			logMiddleware(route, method, (msg, lvl) => log(msg, lvl, enabled, actualLevel)),
		logDecoration: (uri, method, ip) =>
			logDecoration(uri, method, ip, (msg, lvl) => log(msg, lvl, enabled, actualLevel)),
		logError: (uri, method, ip) =>
			logError(uri, method, ip, (msg, lvl) => log(msg, lvl, enabled, actualLevel)),
		logServe: (req, message) =>
			logServe(req, message, (msg, lvl) => log(msg, lvl, enabled, actualLevel)),
	};
}

/**
 * Formats a time value in milliseconds with specified precision
 * @param {number} [arg=0] - The time value in nanoseconds
 * @param {number} [digits=3] - Number of decimal places for precision
 * @returns {string} Formatted time string with "ms" suffix
 */
export function ms(arg = INT_0, digits = INT_3) {
	return TIME_MS.replace(TOKEN_N, Number(arg / INT_1e6).toFixed(digits));
}

/**
 * Formats a time offset value into a string representation
 * @param {number} [arg=0] - Time offset value
 * @returns {string} Formatted time offset string
 */
export function timeOffset(arg = INT_0) {
	const isNegative = arg < INT_0;
	const absValue = isNegative ? -arg : arg;
	const offsetMinutes = absValue / INT_60;
	const hours = Math.floor(offsetMinutes);
	const minutes = Math.floor((offsetMinutes - hours) * INT_60);
	const sign = isNegative ? EMPTY : HYPHEN;
	const hoursStr = String(hours).padStart(INT_2, STRING_0);
	const minutesStr = String(minutes).padStart(INT_2, STRING_0);

	return `${sign}${hoursStr}${minutesStr}`;
}
