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
	ERROR,
	EVT_ERROR,
	EXTENSIONS,
	FUNCTION,
	GET,
	HEAD,
	HYPHEN,
	HTML_ESCAPES,
	INT_10,
	INT_200,
	INT_206,
	INT_307,
	INT_308,
	INT_400,
	INT_404,
	INT_405,
	INT_416,
	INT_500,
	KEY_BYTES,
	LAST_MODIFIED,
	LOCATION,
	OPTIONS,
	OPTIONS_BODY,
	RANGE,
	STRING,
	TO_STRING,
} from "./constants.js";

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

	// Check if range is valid
	const startValid = !isNaN(start) && start >= 0;
	const endValid = !isNaN(end) && end < size;
	const rangeOrderValid = start <= end;
	const rangeValid = startValid && endValid && rangeOrderValid;

	res.removeHeader(CONTENT_RANGE);
	res.removeHeader(CONTENT_LENGTH);
	res.removeHeader(ETAG);
	delete headers.etag;

	if (rangeValid) {
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
 * Determines the appropriate HTTP status code based on request and response state
 * @param {Object} req - The HTTP request object
 * @param {Object} res - The HTTP response object
 * @returns {number} The appropriate HTTP status code
 */
export function getStatus(req, res) {
	if (req.allow.length === 0) {
		return INT_404;
	}
	if (req.method !== GET) {
		return INT_405;
	}
	if (req.allow.includes(GET) === false) {
		return INT_404;
	}
	return res.statusCode > INT_500 ? res.statusCode : INT_500;
}

export function getStatusText(status) {
	return STATUS_CODES[status] || STATUS_CODES[INT_500];
}

/**
 * Error response handler
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {number} [status=res.statusCode] - HTTP status code (coerces to 500 if < 400)
 */
export function error(req, res, status = res.statusCode) {
	if (res.headersSent === false) {
		if (status < INT_400) {
			status = 500;
		}

		res.removeHeader(CONTENT_LENGTH);
		res.statusCode = status;
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
	status = res.statusCode,
	headers = { [CONTENT_TYPE]: `${APPLICATION_JSON}; charset=utf-8` },
) {
	res.send(JSON.stringify(arg), status, headers);
}

const PROTOCOL_PATTERN = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

/**
 * Validates if a URI is safe for redirection (relative or protocol-relative)
 * @param {string} uri - URI to validate
 * @returns {boolean} True if URI is safe
 */
function isSafeRedirectUri(uri) {
	if (!uri || typeof uri !== "string") {
		return false;
	}

	const trimmed = uri.trim();

	if (trimmed.length === 0) {
		return false;
	}

	if (PROTOCOL_PATTERN.test(trimmed)) {
		return false;
	}

	if (trimmed.startsWith("//")) {
		return false;
	}

	return true;
}

/**
 * Redirect response handler
 * @param {Object} res - Response object
 * @param {string} uri - Redirect URI
 * @param {boolean} [perm=true] - Permanent redirect
 */
export function redirect(res, uri, perm = true) {
	if (!isSafeRedirectUri(uri)) {
		res.error(INT_400, new Error("Invalid redirect URI"));
		return;
	}

	res.send(EMPTY, perm ? INT_308 : INT_307, { [LOCATION]: uri });
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
				body
					.on(ERROR, (_err) => {
						if (res.headersSent === false) {
							res.error(INT_500);
						}
					})
					.pipe(res);
			} else {
				if (res.headersSent === false) {
					res.error(INT_416);
				}
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
					res.error(INT_416);
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
	res.header(LAST_MODIFIED, file.stats.mtime.toUTCString());

	if (etags && file.etag.length > 0) {
		res.header(ETAG, file.etag);
		res.removeHeader(CACHE_CONTROL);
	}

	if (req.method === GET) {
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
	} else if (req.method === HEAD) {
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
	return str.replace(/[&<>"']/g, (match) => HTML_ESCAPES[match]);
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
		const err = body instanceof Error ? body : new Error(body ?? getStatusText(res.statusCode));
		emitter.emit(EVT_ERROR, req, res, err);
		if (req.headers) {
			delete req.headers.range;
		}
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
	return (body = EMPTY, status = res.statusCode, headers = {}) =>
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
	return (arg = INT_200) => status(res, arg);
}
