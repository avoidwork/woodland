import { DEBUG, ERROR, HYPHEN, INFO, MONTHS } from "./constants.js";
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

	let logFn, clfmFn, logRouteFn, logMiddlewareFn, logDecorationFn, logErrorFn, logServeFn;

	/**
	 * Extracts IP address from request object
	 * @private
	 * @param {Object} req - Request object
	 * @returns {string} IP address
	 */
	function extractIP(req) {
		const connection = req.connection;
		const socket = req.socket;

		return (
			(connection && connection.remoteAddress) || (socket && socket.remoteAddress) || "127.0.0.1"
		);
	}

	/**
	 * Main logging function
	 * @private
	 * @param {string} msg - Log message
	 * @param {string} [logLevel=debug] - Log level
	 * @returns {Object} Logger object for chaining
	 */
	logFn = function (msg, logLevel = DEBUG) {
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
			log: logFn,
			clfm: clfmFn,
			extractIP,
			logRoute: logRouteFn,
			logMiddleware: logMiddlewareFn,
			logDecoration: logDecorationFn,
			logError: logErrorFn,
			logServe: logServeFn,
		};
	};

	/**
	 * Generates common log format entry
	 * @private
	 * @param {Object} req - Request object
	 * @param {Object} res - Response object
	 * @returns {string} Common log format string
	 */
	clfmFn = function (req, res) {
		const date = new Date();
		const month = MONTHS[date.getMonth()];
		const day = date.getDate();
		const year = date.getFullYear();
		const hours = String(date.getHours()).padStart(2, "0");
		const minutes = String(date.getMinutes()).padStart(2, "0");
		const seconds = String(date.getSeconds()).padStart(2, "0");
		const timezone = timeOffset(date.getTimezoneOffset());
		const dateStr = `[${day}/${month}/${year}:${hours}:${minutes}:${seconds} ${timezone}]`;

		const host = req.headers?.host ?? HYPHEN;
		const clientIP = req.ip || extractIP(req);
		const ip = clientIP || HYPHEN;
		const logname = HYPHEN;
		const username = req?.parsed?.username ?? HYPHEN;

		const parsed = req?.parsed;
		const pathname = parsed?.pathname ?? req.url ?? HYPHEN;
		const search = parsed?.search ?? HYPHEN;
		const requestLine = `${req.method ?? HYPHEN} ${pathname}${search} HTTP/1.1`;

		const statusCode = res?.statusCode ?? 500;
		const contentLength = res?.getHeader("content-length") ?? HYPHEN;

		const referer = req.headers?.referer ?? HYPHEN;
		const userAgent = req.headers?.["user-agent"] ?? HYPHEN;

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
	};

	/**
	 * Creates route log message
	 * @private
	 * @param {string} uri - Request URI
	 * @param {string} method - HTTP method
	 * @param {string} ip - Client IP
	 * @returns {Object} Logger object for chaining
	 */
	logRouteFn = function (uri, method, ip) {
		return logFn(`type=route, uri=${uri}, method=${method}, ip=${ip}, message="Routing request"`);
	};

	/**
	 * Creates middleware log message
	 * @private
	 * @param {string} route - Route path
	 * @param {string} method - HTTP method
	 * @returns {Object} Logger object for chaining
	 */
	logMiddlewareFn = function (route, method) {
		return logFn(`type=use, route=${route}, method=${method}, message="Registering middleware"`);
	};

	/**
	 * Creates decoration log message
	 * @private
	 * @param {string} uri - Request URI
	 * @param {string} method - HTTP method
	 * @param {string} ip - Client IP
	 * @returns {Object} Logger object for chaining
	 */
	logDecorationFn = function (uri, method, ip) {
		return logFn(
			`type=decorate, uri=${uri}, method=${method}, ip=${ip}, message="Decorated request from ${ip}"`,
		);
	};

	/**
	 * Creates error log message
	 * @private
	 * @param {string} uri - Request URI
	 * @param {string} method - HTTP method
	 * @param {string} ip - Client IP
	 * @returns {Object} Logger object for chaining
	 */
	logErrorFn = function (uri, method, ip) {
		return logFn(
			`type=error, uri=${uri}, method=${method}, ip=${ip}, message="Handled error response for ${ip}"`,
			ERROR,
		);
	};

	/**
	 * Creates serve log message
	 * @private
	 * @param {Object} req - Request object
	 * @param {string} message - Log message
	 * @returns {Object} Logger object for chaining
	 */
	logServeFn = function (req, message) {
		return logFn(
			`type=serve, uri=${req.parsed.pathname}, method=${req.method}, ip=${req.ip}, message="${message}"`,
			ERROR,
		);
	};

	return {
		log: logFn,
		clfm: clfmFn,
		extractIP,
		logRoute: logRouteFn,
		logMiddleware: logMiddlewareFn,
		logDecoration: logDecorationFn,
		logError: logErrorFn,
		logServe: logServeFn,
	};
}
