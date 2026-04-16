import { extname } from "node:path";
import { STATUS_CODES } from "node:http";
import mimeDb from "mime-db";
import {
	APPLICATION_JSON,
	APPLICATION_OCTET_STREAM,
	BACKSLASH,
	BYTES_SPACE,
	CACHE_CONTROL,
	CONTENT_LENGTH,
	CONTENT_RANGE,
	CONTENT_TYPE,
	COMMA,
	CONTROL_CHAR_PATTERN,
	EMPTY,
	ETAG,
	ERROR,
	EVT_ERROR,
	EXTENSIONS,
	FUNCTION,
	GET,
	HEAD,
	HTTP_PROTOCOL_PATTERN,
	HYPHEN,
	HTML_ESCAPES,
	INT_0,
	INT_1,
	INT_10,
	INT_NEG_1,
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
	MSG_INVALID_FILE_DESCRIPTOR,
	MSG_INVALID_REDIRECT_URI,
	OPTIONS,
	OPTIONS_BODY,
	RANGE,
	STRING,
	TO_STRING,
} from "./constants.js";

const valid = Object.entries(mimeDb).filter((i) => EXTENSIONS in i[INT_1]),
	mimeExtensions = valid.reduce((a, v) => {
		const result = Object.assign({ type: v[INT_0] }, v[INT_1]);
		const extCount = result.extensions.length;
		for (let i = INT_0; i < extCount; i++) {
			a[`.${result.extensions[i]}`] = result;
		}
		return a;
	}, {});

/**
 * Parses range header value into start and end positions
 * @param {string} rangeHeader - Range header value
 * @param {number} size - Total size
 * @returns {Object|null} Range object with start/end or null if invalid
 */
function parseRangeHeader(rangeHeader, size) {
	if (!rangeHeader || !rangeHeader.startsWith(KEY_BYTES)) {
		return null;
	}

	const rangePart = rangeHeader.substring(KEY_BYTES.length);
	const commaIndex = rangePart.indexOf(COMMA);
	const rangeSpec = commaIndex === INT_NEG_1 ? rangePart : rangePart.substring(INT_0, commaIndex);
	const hyphenIndex = rangeSpec.indexOf(HYPHEN);
	if (hyphenIndex === INT_NEG_1) {
		return null;
	}

	const startStr = rangeSpec.substring(INT_0, hyphenIndex);
	const endStr = rangeSpec.substring(hyphenIndex + 1);
	let start, end;

	if (startStr === EMPTY) {
		if (endStr === EMPTY) {
			return null;
		}
		end = parseInt(endStr, INT_10);
		if (isNaN(end)) {
			return null;
		}
		start = size - end;
		end = size - INT_1;
	} else {
		start = parseInt(startStr, INT_10);
		if (isNaN(start)) {
			return null;
		}

		if (endStr !== EMPTY) {
			end = parseInt(endStr, INT_10);
			if (isNaN(end)) {
				return null;
			}
		} else {
			end = size - INT_1;
		}
	}

	const startValid = !isNaN(start) && start >= INT_0;
	const endValid = !isNaN(end) && end < size;
	const rangeOrderValid = start <= end;

	if (startValid && endValid && rangeOrderValid) {
		return { start, end };
	}

	return null;
}

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
	const range = parseRangeHeader(rangeHeader, size);

	res.removeHeader(CONTENT_RANGE);
	res.removeHeader(CONTENT_LENGTH);
	res.removeHeader(ETAG);
	delete headers.etag;

	if (range) {
		const contentLength = range.end - range.start + 1;

		headers[CONTENT_RANGE] = BYTES_SPACE + `${range.start}-${range.end}/${size}`;
		headers[CONTENT_LENGTH] = contentLength;

		res.header(CONTENT_RANGE, headers[CONTENT_RANGE]);
		res.header(CONTENT_LENGTH, headers[CONTENT_LENGTH]);
		res.statusCode = INT_206;

		req.range = range;
		return [headers, range];
	}

	headers[CONTENT_RANGE] = BYTES_SPACE + `*/${size}`;
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
	if (req.allow.length === INT_0) {
		return INT_404;
	}
	if (req.method !== GET) {
		return INT_405;
	}
	if (!req.allow.includes(GET)) {
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
	if (!res.headersSent) {
		if (status < INT_400) {
			status = INT_500;
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

const PROTOCOL_PATTERN = HTTP_PROTOCOL_PATTERN;
const CONTROL_CHAR_PATTERN_LOCAL = CONTROL_CHAR_PATTERN;

/**
 * Validates if a URI is safe for redirection (relative only)
 * @param {string} uri - URI to validate
 * @returns {boolean} True if URI is safe
 */
function isSafeRedirectUri(uri) {
	/* node:coverage ignore next 10 */
	if (!uri || typeof uri !== STRING) {
		return false;
	}

	const trimmed = uri.trim();

	if (trimmed.length === INT_0) {
		return false;
	}

	// Block control characters that could cause header injection
	if (CONTROL_CHAR_PATTERN_LOCAL.test(trimmed)) {
		return false;
	}

	if (PROTOCOL_PATTERN.test(trimmed)) {
		return false;
	}

	// Block protocol-relative URLs including percent-encoded variants
	const decoded = decodeURIComponent(trimmed);
	if (
		trimmed.startsWith("//") ||
		trimmed.startsWith(BACKSLASH) ||
		trimmed.startsWith("/" + BACKSLASH) ||
		decoded.startsWith("//") ||
		decoded.startsWith(BACKSLASH) ||
		decoded.startsWith("/" + BACKSLASH)
	) {
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
		res.error(INT_400, new Error(MSG_INVALID_REDIRECT_URI));
		return;
	}

	const trimmed = uri.trim();
	res.send(EMPTY, perm ? INT_308 : INT_307, { [LOCATION]: trimmed });
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
	if (!res.headersSent) {
		[body, status, headers] = onReady(req, res, body, status, headers);

		const method = req.method;
		const rangeHeader = req.headers.range;
		const isPipeable = pipeable(method, body);

		if (isPipeable) {
			if (rangeHeader === void 0 || req.range !== void 0) {
				if (req.range === void 0) {
					res.statusCode = status;
				}
				writeHead(res, headers);
				body
					.on(ERROR, (_err) => {
						if (!res.headersSent) {
							res.error(INT_500);
						} else {
							// Headers already sent, destroy stream and end response
							body.destroy();
							if (!res.writableEnded) {
								res.end();
							}
						}
					})
					.pipe(res);
			} else {
				if (!res.headersSent) {
					res.error(INT_416);
				} else {
					body.destroy();
					if (!res.writableEnded) {
						res.end();
					}
				}
			}
		} else {
			if (body !== null && typeof body !== STRING && typeof body[TO_STRING] === FUNCTION) {
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

	for (let i = INT_0; i < entryCount; i++) {
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
	if (file.path === EMPTY || file.stats.size === INT_0) {
		throw new TypeError(MSG_INVALID_FILE_DESCRIPTOR);
	}

	res.header(CONTENT_LENGTH, file.stats.size);
	res.header(
		CONTENT_TYPE,
		file.charset.length > INT_0 ? `${mime(file.path)}; charset=${file.charset}` : mime(file.path),
	);
	res.header(LAST_MODIFIED, file.stats.mtime.toUTCString());

	if (etags && file.etag.length > INT_0) {
		res.header(ETAG, file.etag);
		res.removeHeader(CACHE_CONTROL);
	}

	if (req.method === GET) {
		let status = INT_200;
		let options = {};
		let headers = {};

		if (RANGE in req.headers) {
			[headers, options] = partialHeaders(req, res, file.stats.size, status);

			if (Object.keys(options).length > INT_0) {
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
			createReadStream(file.path, Object.keys(options).length > INT_0 ? options : undefined),
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
		res.send(err.message || getStatusText(res.statusCode));
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
