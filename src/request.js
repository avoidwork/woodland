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
import { isValidIP } from "./utility.js";

/**
 * Checks if request origin is allowed for CORS
 * @param {Object} req - Request object
 * @param {Array} origins - Array of allowed origins
 * @returns {boolean} True if CORS is allowed
 */
export function cors(req, origins) {
	if (origins.length === 0) {
		return false;
	}

	return req.corsHost && (origins.includes(WILDCARD) || origins.includes(req.headers.origin));
}

/**
 * Checks if request origin host differs from request host
 * @param {Object} req - Request object
 * @returns {boolean} True if hosts differ
 */
export function corsHost(req) {
	return (
		ORIGIN in req.headers && req.headers.origin.replace(/^http(s)?:\/\//, "") !== req.headers.host
	);
}

/**
 * Creates CORS request handler that sends 204 No Content
 * @returns {Function} Request handler function
 */
export function corsRequest() {
	return (req, res) => res.status(204).send(EMPTY);
}

/**
 * Extracts client IP address from request
 * @param {Object} req - Request object
 * @returns {string} Client IP address
 */
export function extractIP(req) {
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

/**
 * Decorates request and response objects with framework utilities
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Object} config - Configuration object
 */
export function decorate(req, res, config) {
	const {
		parsed,
		allowString,
		timing,
		corsHostCheck,
		corsCheck,
		ipExtractor,
		defaultHeaders,
		corsExpose,
		logDecorator,
		logClose,
	} = config;

	const pathname = parsed.pathname;

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

/**
 * Placeholder for log close handler (no-op)
 * @param {Object} _req - Request object (unused)
 * @param {Object} _res - Response object (unused)
 */
export function logClose(_req, _res) {
	// Placeholder for log close handler
}
