import {
	DEBUG,
	ERROR,
	HYPHEN,
	INFO,
	MONTHS,
	INT_0,
	INT_3,
	INT_1e6,
	TIME_MS,
	TOKEN_N,
} from "./constants.js";
import { timeOffset } from "./utility.js";

const LEVELS = {
	emerg: 0,
	alert: 1,
	crit: 2,
	error: 3,
	warn: 4,
	notice: 5,
	info: 6,
	debug: 7,
};

/**
 * Extracts IP address from request object
 * @param {Object} req - Request object
 * @returns {string} IP address
 */
export function extractIP(req) {
	const connection = req.connection;
	const socket = req.socket;

	return (
		(connection && connection.remoteAddress) || (socket && socket.remoteAddress) || "127.0.0.1"
	);
}

/**
 * Generates common log format entry
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {string} format - Log format string
 * @returns {string} Common log format string
 */
export function clfm(req, res, format) {
	const date = new Date();
	const month = MONTHS[date.getMonth()];
	const day = date.getDate();
	const year = date.getFullYear();
	const hours = String(date.getHours()).padStart(2, "0");
	const minutes = String(date.getMinutes()).padStart(2, "0");
	const seconds = String(date.getSeconds()).padStart(2, "0");
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
	const search = parsed && parsed.search ? parsed.search : HYPHEN;
	const method = req.method ? req.method : HYPHEN;
	const requestLine = `${method} ${pathname}${search} HTTP/1.1`;

	const resStatusCode = res.statusCode;
	const statusCode = resStatusCode ? resStatusCode : 500;
	const getHeader = res.getHeader;
	const contentLength = getHeader ? getHeader.call(res, "content-length") : HYPHEN;

	const referer = headers && headers.referer ? headers.referer : HYPHEN;
	const userAgent = headers && headers["user-agent"] ? headers["user-agent"] : HYPHEN;

	let logEntry = format;

	logEntry = logEntry
		.replace("%v", host)
		.replace("%h", ip)
		.replace("%l", logname)
		.replace("%u", username)
		.replace("%t", dateStr)
		.replace("%r", requestLine)
		.replace("%>s", String(statusCode))
		.replace("%b", contentLength)
		.replace("%{Referer}i", referer)
		.replace("%{User-agent}i", userAgent);

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
 * Main logging function
 * @param {string} msg - Log message
 * @param {string} [logLevel='debug'] - Log level
 * @param {boolean} enabled - Enable/disable logging
 * @param {string} actualLevel - Actual log level
 * @returns {Object} Logger object for chaining
 */
export function log(msg, logLevel = DEBUG, enabled = true, actualLevel = INFO) {
	if (enabled) {
		const idx = LEVELS[logLevel];
		if (idx <= LEVELS[actualLevel]) {
			process.nextTick(() => {
				const consoleMethod = idx > 4 ? "log" : "error";
				console[consoleMethod](msg);
			});
		}
	}

	return {
		log,
		clfm,
		extractIP,
		logRoute,
		logMiddleware,
		logDecoration,
		logError,
		logServe,
	};
}

/**
 * Creates logger with configurable format and level
 * @param {Object} [config={}] - Configuration object
 * @param {boolean} [config.enabled=true] - Enable/disable logging
 * @param {string} [config.format] - Custom log format string
 * @param {string} [config.level='info'] - Log level
 * @returns {Object} Logger with log, clfm, extractIP, logRoute, logMiddleware, logDecoration, logError, logServe methods
 */
export function createLogger(config = {}) {
	const { enabled = true, format, level = INFO } = config;
	const validLevels = [DEBUG, INFO, "warn", "error", "critical", "alert", "emerg", "notice"];
	const actualLevel = validLevels.includes(level) ? level : INFO;

	return {
		log: (msg, logLevel = DEBUG) => log(msg, logLevel, enabled, actualLevel),
		clfm: (req, res) => clfm(req, res, format),
		extractIP,
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
