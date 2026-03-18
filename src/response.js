import { extname } from "node:path";
import { STATUS_CODES } from "node:http";
import mimeDb from "mime-db";
import {
	APPLICATION_JSON,
	APPLICATION_OCTET_STREAM,
	CACHE_CONTROL,
	CONTENT_LENGTH,
	CONTENT_RANGE,
	CONTENT_TYPE,
	COMMA,
	EMPTY,
	ETAG,
	EXTENSIONS,
	FUNCTION,
	HEAD,
	HYPHEN,
	INT_10,
	INT_200,
	INT_206,
	INT_416,
	KEY_BYTES,
	LOCATION,
	OPTIONS,
	OPTIONS_BODY,
	RANGE,
	STRING,
	TO_STRING,
} from "./constants.js";

const htmlEscapes = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&#39;",
};

const valid = Object.entries(mimeDb).filter((i) => EXTENSIONS in i[1]),
	mimeExtensions = valid.reduce((a, v) => {
		const result = Object.assign({ type: v[0] }, v[1]);
		const extCount = result.extensions.length;
		for (let i = 0; i < extCount; i++) {
			a[`.${result.extensions[i]}`] = result;
		}
		return a;
	}, {});

/**
 * Handles partial content headers for HTTP range requests
 * @param {Object} req - The HTTP request object
 * @param {Object} res - The HTTP response object
 * @param {number} size - Total size of the content
 * @param {number} status - HTTP status code
 * @param {Object} [headers={}] - Response headers object
 * @param {Object} [options={}] - Options for range processing
 * @returns {Array} Array containing [headers, options]
 */
export function partialHeaders(req, res, size, status, headers = {}, options = {}) {
	const rangeHeader = req.headers.range;
	if (!rangeHeader || !rangeHeader.startsWith(KEY_BYTES)) {
		return [headers, options];
	}

	const rangePart = rangeHeader.substring(KEY_BYTES.length);
	const commaIndex = rangePart.indexOf(COMMA);
	const rangeSpec = commaIndex === -1 ? rangePart : rangePart.substring(0, commaIndex);
	const hyphenIndex = rangeSpec.indexOf(HYPHEN);
	if (hyphenIndex === -1) {
		return [headers, options];
	}

	const startStr = rangeSpec.substring(0, hyphenIndex);
	const endStr = rangeSpec.substring(hyphenIndex + 1);
	let start, end;

	if (startStr === EMPTY) {
		if (endStr === EMPTY) {
			return [headers, options];
		}
		end = parseInt(endStr, INT_10);
		if (isNaN(end)) {
			return [headers, options];
		}
		start = size - end;
		end = size - 1;
	} else {
		start = parseInt(startStr, INT_10);
		if (isNaN(start)) {
			return [headers, options];
		}

		if (endStr !== EMPTY) {
			end = parseInt(endStr, INT_10);
			if (isNaN(end)) {
				return [headers, options];
			}
		} else {
			end = size - 1;
		}
	}

	res.removeHeader(CONTENT_RANGE);
	res.removeHeader(CONTENT_LENGTH);
	res.removeHeader(ETAG);
	delete headers.etag;

	if (!isNaN(start) && !isNaN(end) && start <= end && start >= 0 && end < size) {
		const rangeOptions = { start, end };
		req.range = rangeOptions;
		const contentLength = end - start + 1;

		headers[CONTENT_RANGE] = `bytes ${start}-${end}/${size}`;
		headers[CONTENT_LENGTH] = contentLength;

		res.header(CONTENT_RANGE, headers[CONTENT_RANGE]);
		res.header(CONTENT_LENGTH, headers[CONTENT_LENGTH]);
		res.statusCode = INT_206;

		return [headers, rangeOptions];
	}

	headers[CONTENT_RANGE] = `bytes */${size}`;
	res.header(CONTENT_RANGE, headers[CONTENT_RANGE]);

	return [headers, options];
}

/**
 * Checks if an object is pipeable (has 'on' method and is not null)
 * @param {string} method - HTTP method
 * @param {*} arg - Object to check for pipeability
 * @returns {boolean} True if the object is pipeable
 */
export function pipeable(method, arg) {
	return method !== HEAD && arg !== null && arg !== undefined && typeof arg.on === FUNCTION;
}

/**
 * Writes HTTP response headers using writeHead method
 * @param {Object} res - The HTTP response object
 * @param {Object} [headers={}] - Headers object to write
 */
export function writeHead(res, headers = {}) {
	res.writeHead(res.statusCode, STATUS_CODES[res.statusCode], headers);
}

/**
 * Gets MIME type for file extension
 * @param {string} [arg=""] - File path or extension
 * @returns {string} MIME type string
 */
export function mime(arg = EMPTY) {
	const ext = extname(arg);

	return ext in mimeExtensions ? mimeExtensions[ext].type : APPLICATION_OCTET_STREAM;
}

/**
 * Gets HTTP status text for status code
 * @param {number} status - HTTP status code
 * @returns {string} Status text string
 */
export function getStatusText(status) {
	const statusTexts = {
		200: "OK",
		204: "No Content",
		307: "Temporary Redirect",
		308: "Permanent Redirect",
		400: "Bad Request",
		403: "Forbidden",
		404: "Not Found",
		405: "Method Not Allowed",
		416: "Range Not Satisfiable",
		500: "Internal Server Error",
	};

	return statusTexts[status] || "Error";
}

/**
 * No-op function for default parameters
 * @returns {void}
 */
export function noop() {}

/**
 * Error response handler
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} emitError - Error emit function
 * @param {Function} logError - Error log function
 * @param {number} [status=500] - HTTP status code
 * @param {*} [body] - Error body
 */
export function error(req, res, emitError, logError, status = 500, body) {
	if (res.headersSent === false) {
		const err = body instanceof Error ? body : new Error(body ?? getStatusText(status));

		if (status === 404) {
			res.removeHeader("allow");
			res.header("allow", EMPTY);

			if (req.cors) {
				res.removeHeader("access-control-allow-methods");
				res.header("access-control-allow-methods", EMPTY);
			}
		}

		res.removeHeader(CONTENT_LENGTH);
		res.statusCode = status;

		emitError(req, res, err);
		logError(req, status);
	}
}

/**
 * JSON response handler
 * @param {Object} res - Response object
 * @param {*} arg - Response data
 * @param {number} [status=200] - HTTP status code
 * @param {Object} [headers={}] - Response headers
 */
export function json(
	res,
	arg,
	status = 200,
	headers = { [CONTENT_TYPE]: `${APPLICATION_JSON}; charset=utf-8` },
) {
	res.send(JSON.stringify(arg), status, headers);
}

/**
 * Redirect response handler
 * @param {Object} res - Response object
 * @param {string} uri - Redirect URI
 * @param {boolean} [perm=true] - Permanent redirect
 */
export function redirect(res, uri, perm = true) {
	res.send(EMPTY, perm ? 308 : 307, { [LOCATION]: uri });
}

/**
 * Send response handler
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {*} [body=""] - Response body
 * @param {number} [status=res.statusCode] - HTTP status code
 * @param {Object} [headers={}] - Response headers
 * @param {Function} onReady - Ready handler
 * @param {Function} onDone - Done handler
 */
export function send(
	req,
	res,
	body = EMPTY,
	status = res.statusCode,
	headers = {},
	onReady,
	onDone,
) {
	if (res.headersSent === false) {
		[body, status, headers] = onReady(req, res, body, status, headers);

		const method = req.method;
		const rangeHeader = req.headers.range;
		const isPipeable = pipeable(method, body);

		if (isPipeable) {
			if (rangeHeader === void 0 || req.range !== void 0) {
				writeHead(res, headers);
				body.on("error", (err) => error(req, res, noop, noop, 500, err)).pipe(res);
			} else {
				error(req, res, noop, noop, INT_416);
			}
		} else {
			if (body !== null && typeof body !== STRING && typeof body[TO_STRING] === "function") {
				body = body.toString();
			}

			if (rangeHeader !== void 0) {
				const buffered = Buffer.from(body);
				const byteLength = buffered.length;

				[headers] = partialHeaders(req, res, byteLength, status, headers);
				if (req.range !== void 0) {
					const rangeBuffer = buffered.slice(req.range.start, req.range.end + 1);
					onDone(req, res, rangeBuffer.toString(), headers);
				} else {
					error(req, res, noop, noop, INT_416);
				}
			} else {
				res.statusCode = status;
				onDone(req, res, body, headers);
			}
		}
	}
}

/**
 * Set headers handler
 * @param {Object} res - Response object
 * @param {Object|Map|Headers} [arg={}] - Headers to set
 * @returns {Object} Response object
 */
export function set(res, arg = {}) {
	const headers = arg instanceof Map || arg instanceof Headers ? arg : new Headers(arg);
	const entries = Array.from(headers);
	const entryCount = entries.length;

	for (let i = 0; i < entryCount; i++) {
		const [key, value] = entries[i];
		res.setHeader(key, value);
	}

	return res;
}

/**
 * Status handler
 * @param {Object} res - Response object
 * @param {number} [arg=200] - Status code
 * @returns {Object} Response object
 */
export function status(res, arg = INT_200) {
	res.statusCode = arg;

	return res;
}

/**
 * Streams file to response
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Object} file - File descriptor
 * @param {Function} emitStream - Stream emit function
 * @param {Function} createReadStream - Stream factory function
 * @param {boolean} etags - ETag support enabled
 */
export function stream(req, res, file, emitStream, createReadStream, etags) {
	if (file.path === EMPTY || file.stats.size === 0) {
		throw new TypeError("Invalid file descriptor");
	}

	res.header(CONTENT_LENGTH, file.stats.size);
	res.header(
		CONTENT_TYPE,
		file.charset.length > 0 ? `${mime(file.path)}; charset=${file.charset}` : mime(file.path),
	);
	res.header("last-modified", file.stats.mtime.toUTCString());

	if (etags && file.etag.length > 0) {
		res.header(ETAG, file.etag);
		res.removeHeader(CACHE_CONTROL);
	}

	if (req.method === "GET") {
		let status = INT_200;
		let options = {};
		let headers = {};

		if (RANGE in req.headers) {
			[headers, options] = partialHeaders(req, res, file.stats.size, status);

			if (Object.keys(options).length > 0) {
				res.removeHeader(CONTENT_LENGTH);
				res.header(CONTENT_RANGE, headers[CONTENT_RANGE]);

				if (CONTENT_LENGTH in headers) {
					res.header(CONTENT_LENGTH, headers[CONTENT_LENGTH]);
				}
			} else {
				options = {};
			}
		}

		res.send(
			createReadStream(file.path, Object.keys(options).length > 0 ? options : undefined),
			status,
		);
	} else if (req.method === "HEAD") {
		res.send(EMPTY);
	} else if (req.method === OPTIONS) {
		res.removeHeader(CONTENT_LENGTH);
		res.send(OPTIONS_BODY);
	}

	emitStream(req, res);
}

/**
 * Escapes HTML special characters to prevent XSS attacks
 * @param {string} [str=""] - The string to escape
 * @returns {string} The escaped string with HTML entities
 */
export function escapeHtml(str = EMPTY) {
	return str.replace(/[&<>"']/g, (match) => htmlEscapes[match]);
}
