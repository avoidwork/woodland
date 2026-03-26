import { CONTENT_TYPE, INT_200 } from "./constants.js";
import { APPLICATION_JSON } from "./constants.js";
import { error, json, redirect, send, set, status as statusHandler } from "./response.js";

/**
 * Gets status text for a status code
 * @param {number} status - HTTP status code
 * @returns {string} Status text
 */
export function getStatusText(status) {
	const codes = {
		200: "OK",
		201: "Created",
		204: "No Content",
		301: "Moved Permanently",
		302: "Found",
		304: "Not Modified",
		307: "Temporary Redirect",
		308: "Permanent Redirect",
		400: "Bad Request",
		401: "Unauthorized",
		403: "Forbidden",
		404: "Not Found",
		405: "Method Not Allowed",
		416: "Range Not Satisfiable",
		500: "Internal Server Error",
	};
	return codes[status] || "Internal Server Error";
}

/**
 * Creates error response handler
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {EventEmitter} emitter - EventEmitter for error events
 * @returns {Function} Error handler function
 */
export function createErrorHandler(req, res, emitter) {
	return (status = res.statusCode, body) => {
		error(req, res, status);
		const err = body instanceof Error ? body : new Error(body ?? getStatusText(status));
		emitter.emit("error", req, res, err);
		res.send(err.message);
	};
}

/**
 * Creates JSON response handler
 * @param {Object} res - Response object
 * @returns {Function} JSON handler function
 */
export function createJsonHandler(res) {
	return (
		arg,
		status = res.statusCode,
		headers = { [CONTENT_TYPE]: `${APPLICATION_JSON}; charset=utf-8` },
	) => json(res, arg, status, headers);
}

/**
 * Creates redirect response handler
 * @param {Object} res - Response object
 * @returns {Function} Redirect handler function
 */
export function createRedirectHandler(res) {
	return (uri, perm = true) => redirect(res, uri, perm);
}

/**
 * Creates send response handler
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} onReady - Ready callback
 * @param {Function} onDone - Done callback
 * @returns {Function} Send handler function
 */
export function createSendHandler(req, res, onReady, onDone) {
	return (body = "", status = res.statusCode, headers = {}) =>
		send(req, res, body, status, headers, onReady, onDone);
}

/**
 * Creates set headers handler
 * @param {Object} res - Response object
 * @returns {Function} Set handler function
 */
export function createSetHandler(res) {
	return (arg = {}) => set(res, arg);
}

/**
 * Creates status handler
 * @param {Object} res - Response object
 * @returns {Function} Status handler function
 */
export function createStatusHandler(res) {
	return (arg = INT_200) => statusHandler(res, arg);
}
