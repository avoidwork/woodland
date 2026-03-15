import {
	ACCESS_CONTROL_ALLOW_CREDENTIALS,
	ACCESS_CONTROL_ALLOW_METHODS,
	ACCESS_CONTROL_ALLOW_HEADERS,
	ACCESS_CONTROL_EXPOSE_HEADERS,
	ACCESS_CONTROL_REQUEST_HEADERS,
	ACCESS_CONTROL_ALLOW_ORIGIN,
	ALLOW,
	EMPTY,
	OPTIONS,
	ORIGIN,
	TRUE,
	TIMING_ALLOW_ORIGIN,
	WILDCARD,
	X_CONTENT_TYPE_OPTIONS,
	NO_SNIFF,
} from "./constants.js";
import { parse as parseUrl } from "./utility.js";

const IPV4_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const IPV6_CHAR_PATTERN = /^[0-9a-fA-F:.]+$/;
const IPV4_MAPPED_PATTERN = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i;
const HEX_GROUP_PATTERN = /^[0-9a-fA-F]{1,4}$/;

/**
 * Validates if an IP address is properly formatted
 * @param {string} ip - IP address to validate
 * @returns {boolean} True if IP is valid format
 */
export function isValidIP(ip) {
	if (!ip || typeof ip !== "string") {
		return false;
	}

	if (ip.indexOf(":") === -1) {
		const match = IPV4_PATTERN.exec(ip);

		if (!match) {
			return false;
		}

		for (let i = 1; i < 5; i++) {
			const num = parseInt(match[i], 10);
			if (num > 255) {
				return false;
			}
		}

		return true;
	}

	if (!IPV6_CHAR_PATTERN.test(ip)) {
		return false;
	}

	const ipv4MappedMatch = IPV4_MAPPED_PATTERN.exec(ip);
	if (ipv4MappedMatch) {
		return isValidIP(ipv4MappedMatch[1]);
	}

	if (ip === "::") {
		return true;
	}

	const doubleColonIndex = ip.indexOf("::");
	const isCompressed = doubleColonIndex !== -1;

	if (isCompressed) {
		if (ip.indexOf("::", doubleColonIndex + 2) !== -1) {
			return false;
		}

		const beforeDoubleColon = ip.substring(0, doubleColonIndex);
		const afterDoubleColon = ip.substring(doubleColonIndex + 2);

		if (
			afterDoubleColon === ":" ||
			(afterDoubleColon && afterDoubleColon.endsWith(":")) ||
			(afterDoubleColon && afterDoubleColon.startsWith(":"))
		) {
			return false;
		}

		const leftGroups = beforeDoubleColon ? beforeDoubleColon.split(":") : [];
		const rightGroups = afterDoubleColon ? afterDoubleColon.split(":") : [];

		const nonEmptyLeft = leftGroups.filter((g) => g !== "");
		const nonEmptyRight = rightGroups.filter((g) => g !== "");
		const totalGroups = nonEmptyLeft.length + nonEmptyRight.length;

		if (totalGroups >= 8) {
			return false;
		}

		for (let i = 0; i < nonEmptyLeft.length; i++) {
			if (!HEX_GROUP_PATTERN.test(nonEmptyLeft[i])) {
				return false;
			}
		}
		for (let i = 0; i < nonEmptyRight.length; i++) {
			if (!HEX_GROUP_PATTERN.test(nonEmptyRight[i])) {
				return false;
			}
		}

		return true;
	} else {
		const groups = ip.split(":");
		if (groups.length !== 8) {
			return false;
		}

		for (let i = 0; i < 8; i++) {
			if (!groups[i] || !HEX_GROUP_PATTERN.test(groups[i])) {
				return false;
			}
		}

		return true;
	}
}

/**
 * Creates CORS handler for checking and handling CORS requests
 * @param {Array} origins - Array of allowed origins
 * @returns {Object} CORS handler with cors, corsHost, corsRequest methods
 */
export function createCorsHandler(origins) {
	/**
	 * Checks if request origin is allowed for CORS
	 * @private
	 * @param {Object} req - Request object
	 * @returns {boolean} True if CORS is allowed
	 */
	function cors(req) {
		if (origins.length === 0) {
			return false;
		}

		return req.corsHost && (origins.includes(WILDCARD) || origins.includes(req.headers.origin));
	}

	/**
	 * Checks if request origin host differs from request host
	 * @private
	 * @param {Object} req - Request object
	 * @returns {boolean} True if hosts differ
	 */
	function corsHost(req) {
		return (
			ORIGIN in req.headers && req.headers.origin.replace(/^http(s)?:\/\//, "") !== req.headers.host
		);
	}

	/**
	 * Creates CORS request handler that sends 204 No Content
	 * @private
	 * @returns {Function} Request handler function
	 */
	function corsRequest() {
		return (req, res) => res.status(204).send(EMPTY);
	}

	return { cors, corsHost, corsRequest };
}

/**
 * Creates IP extractor for extracting client IP from request
 * @returns {Object} IP extractor with extract method
 */
export function createIpExtractor() {
	/**
	 * Extracts client IP address from request
	 * @private
	 * @param {Object} req - Request object
	 * @returns {string} Client IP address
	 */
	function extract(req) {
		const connection = req.connection;
		const socket = req.socket;
		const fallbackIP =
			(connection && connection.remoteAddress) || (socket && socket.remoteAddress) || "127.0.0.1";

		const forwardedHeader = req.headers["x-forwarded-for"];
		if (!forwardedHeader || !forwardedHeader.trim()) {
			return fallbackIP;
		}

		const forwardedIPs = forwardedHeader.split(",");

		for (let i = 0; i < forwardedIPs.length; i++) {
			const ip = forwardedIPs[i].trim();
			if (isValidIP(ip)) {
				return ip;
			}
		}

		return fallbackIP;
	}

	return { extract };
}

/**
 * Creates request decorator for adding framework utilities to request/response objects
 * @param {Object} config - Configuration object
 * @param {Array} config.origins - CORS origins
 * @param {boolean} config.time - Enable timing
 * @param {Array} config.defaultHeaders - Default headers
 * @param {Object} config.etags - ETag generator
 * @param {string} config.corsExpose - CORS expose headers
 * @param {Function} config.getAllows - Function to get allowed methods
 * @param {Function} config.corsHostCheck - CORS host check function
 * @param {Function} config.corsCheck - CORS check function
 * @param {Function} config.ipExtractor - IP extractor function
 * @param {Function} config.logDecorator - Log decoration function
 * @returns {Object} Request decorator with decorate, logClose methods
 */
export function createRequestDecorator({
	origins: _origins,
	time: _time,
	defaultHeaders,
	etags: _etags,
	corsExpose,
	getAllows,
	corsHostCheck,
	corsCheck,
	ipExtractor,
	logDecorator,
}) {
	/**
	 * Placeholder for log close handler (no-op)
	 * @private
	 * @param {Object} _req - Request object (unused)
	 * @param {Object} _res - Response object (unused)
	 */
	function logClose(_req, _res) {
		// Placeholder for log close handler
	}

	/**
	 * Decorates request and response objects with framework utilities
	 * @private
	 * @param {Object} req - Request object
	 * @param {Object} res - Response object
	 * @param {number} [timing=null] - Optional timing value
	 */
	function decorate(req, res, timing = null) {
		const parsed = parseUrl(req);
		const pathname = parsed.pathname;
		const allowString = getAllows(pathname);

		req.parsed = parsed;
		req.allow = allowString;
		req.body = EMPTY;
		req.host = parsed.hostname;
		req.params = {};
		req.valid = true;

		if (timing) {
			req.precise = timing;
		}

		req.corsHost = corsHostCheck(req);
		req.cors = corsCheck(req);

		const clientIP = ipExtractor(req);
		req.ip = clientIP;

		res.locals = {};

		const headersBatch = Object.create(null);
		headersBatch[ALLOW] = allowString;
		headersBatch[X_CONTENT_TYPE_OPTIONS] = NO_SNIFF;

		for (let i = 0; i < defaultHeaders.length; i++) {
			const [key, value] = defaultHeaders[i];
			headersBatch[key] = value;
		}

		if (req.cors) {
			const corsHeaders = req.headers[ACCESS_CONTROL_REQUEST_HEADERS] ?? corsExpose;
			const origin = req.headers.origin;

			headersBatch[ACCESS_CONTROL_ALLOW_ORIGIN] = origin;
			headersBatch[TIMING_ALLOW_ORIGIN] = origin;
			headersBatch[ACCESS_CONTROL_ALLOW_CREDENTIALS] = TRUE;
			headersBatch[ACCESS_CONTROL_ALLOW_METHODS] = allowString;

			if (corsHeaders !== void 0) {
				headersBatch[
					req.method === OPTIONS ? ACCESS_CONTROL_ALLOW_HEADERS : ACCESS_CONTROL_EXPOSE_HEADERS
				] = corsHeaders;
			}
		}

		res.set(headersBatch);

		logDecorator(pathname, req.method, clientIP);
		res.on("close", () => logClose(req, res));
	}

	return { decorate, logClose };
}
