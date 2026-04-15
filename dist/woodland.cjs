/**
 * woodland
 *
 * @copyright 2026 Jason Mulligan <jason.mulligan@avoidwork.com>
 * @license BSD-3-Clause
 * @version 22.0.4
 */
'use strict';

var node_http = require('node:http');
var node_events = require('node:events');
var node_fs = require('node:fs');
var tinyEtag = require('tiny-etag');
var tinyLru = require('tiny-lru');
var precise = require('precise');
var node_module = require('node:module');
var node_path = require('node:path');
var node_url = require('node:url');
var mimeDb = require('mime-db');
var tinyCoerce = require('tiny-coerce');
var jsonschema = require('jsonschema');
var promises = require('node:fs/promises');

var _documentCurrentScript = typeof document !== 'undefined' ? document.currentScript : null;
const __dirname$2 = node_url.fileURLToPath(new node_url.URL(".", (typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === 'SCRIPT' && _documentCurrentScript.src || new URL('woodland.cjs', document.baseURI).href))));
const require$1 = node_module.createRequire((typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === 'SCRIPT' && _documentCurrentScript.src || new URL('woodland.cjs', document.baseURI).href)));
const { name, version } = require$1(node_path.join(__dirname$2, "..", "package.json"));

// =============================================================================
// HTTP METHODS
// =============================================================================
const CONNECT = "CONNECT";
const DELETE = "DELETE";
const GET = "GET";
const HEAD = "HEAD";
const OPTIONS = "OPTIONS";
const PATCH = "PATCH";
const POST = "POST";
const PUT = "PUT";
const TRACE = "TRACE";
const NODE_METHODS = [CONNECT, DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT, TRACE];

// =============================================================================
// HTTP STATUS CODES
// =============================================================================
const INT_200 = 200;
const INT_204 = 204;
const INT_206 = 206;
const INT_304 = 304;
const INT_307 = 307;
const INT_308 = 308;
const INT_400 = 400;
const INT_403 = 403;
const INT_404 = 404;
const INT_405 = 405;
const INT_416 = 416;
const INT_500 = 500;

// =============================================================================
// HTTP HEADERS
// =============================================================================
const ACCESS_CONTROL_ALLOW_CREDENTIALS = "access-control-allow-credentials";
const ACCESS_CONTROL_ALLOW_HEADERS = "access-control-allow-headers";
const ACCESS_CONTROL_ALLOW_METHODS = "access-control-allow-methods";
const ACCESS_CONTROL_ALLOW_ORIGIN = "access-control-allow-origin";
const ACCESS_CONTROL_EXPOSE_HEADERS = "access-control-expose-headers";
const ACCESS_CONTROL_REQUEST_HEADERS = "access-control-request-headers";
const ALLOW = "allow";
const CACHE_CONTROL = "cache-control";
const CONTENT_LENGTH = "content-length";
const CONTENT_RANGE = "content-range";
const CONTENT_TYPE = "content-type";
const ETAG = "etag";
const LAST_MODIFIED = "last-modified";
const LOCATION = "location";
const NO_SNIFF = "nosniff";
const ORIGIN = "origin";
const RANGE = "range";
const REFERER = "referer";
const SERVER = "server";
const TIMING_ALLOW_ORIGIN = "timing-allow-origin";
const USER_AGENT = "user-agent";
const X_CONTENT_TYPE_OPTIONS = "x-content-type-options";
const X_FORWARDED_FOR = "x-forwarded-for";
const X_POWERED_BY = "x-powered-by";
const X_RESPONSE_TIME = "x-response-time";

// =============================================================================
// CONTENT TYPES & MEDIA
// =============================================================================
const APPLICATION_JSON = "application/json";
const APPLICATION_OCTET_STREAM = "application/octet-stream";
const TEXT_HTML = "text/html";
const UTF8 = "utf8";
const UTF_8 = "utf-8";

// =============================================================================
// NUMERIC CONSTANTS
// =============================================================================
const INT_0 = 0;
const INT_1 = 1;
const INT_2 = 2;
const INT_3 = 3;
const INT_4 = 4;
const INT_5 = 5;
const INT_8 = 8;
const INT_10 = 10;
const INT_60 = 60;
const INT_255 = 255;
const INT_1e3 = 1e3;
const INT_1e4 = 1e4;
const INT_8000 = 8000;
const INT_NEG_1 = -1;

// =============================================================================
// STRING & CHARACTER CONSTANTS
// =============================================================================
const COMMA_SPACE = ", ";
const COMMA = ",";
const COLON = ":";
const DELIMITER = "|";
const DOUBLE_COLON = "::";
const EMPTY = "";
const HYPHEN = "-";
const LEFT_PAREN = "(";
const PERCENT = "%";
const PERIOD = ".";
const SLASH = "/";
const STRING_0 = "0";
const WILDCARD = "*";

// =============================================================================
// DATA TYPES
// =============================================================================
const ARRAY = "array";
const BOOLEAN = "boolean";
const FUNCTION = "function";
const NUMBER = "number";
const OBJECT = "object";
const STRING = "string";
const TYPE = "type";
const ERROR_HANDLER_LENGTH = 4;

// =============================================================================
// SERVER & SYSTEM INFO
// =============================================================================
const SERVER_VALUE = `${name}/${version}`;
const X_POWERED_BY_VALUE = `nodejs/${process.version}, ${process.platform}/${process.arch}`;
const LOCALHOST = "127.0.0.1";
const HTTP_PREFIX = "http://";

// =============================================================================
// FILE SYSTEM & ROUTING
// =============================================================================
const INDEX_HTM = "index.htm";
const INDEX_HTML = "index.html";
const EXTENSIONS = "extensions";
const PARENT_DIR = "..";
const CURRENT_DIR = ".";
const BACKSLASH = "\\";
const NEWLINE = "\n";
const ROUTE_PATTERN = "(/.*)?";
const MSG_USE_MIDDLEWARE_REQUIRED =
	"useMiddleware is required or config.use must be a function";
const EXTRACT_PATH_REPLACE = "(?<$1>[^/]+)";
const TPL_DIR = "tpl";
const INDEX_HTML_FILE = "index.html";

// =============================================================================
// LOGGING & DEBUGGING
// =============================================================================
const DEBUG = "debug";
const ERROR = "error";
const INFO = "info";

const LEVELS = Object.freeze({
	emerg: 0,
	alert: 1,
	crit: 2,
	error: 3,
	warn: 4,
	notice: 5,
	info: 6,
	debug: 7,
});

// Log format tokens
const LOG_B = "%b";
const LOG_FORMAT = '%h %l %u %t "%r" %>s %b';
const LOG_H = "%h";
const LOG_L = "%l";
const LOG_R = "%r";
const LOG_REFERRER = "%{Referer}i";
const LOG_S = "%>s";
const LOG_T = "%t";
const LOG_U = "%u";
const LOG_USER_AGENT = "%{User-agent}i";
const LOG_V = "%v";

// =============================================================================
// MESSAGES & RESPONSES
// =============================================================================
const MSG_CONFIG_FIELD = "Config ";
const MSG_INVALID_REDIRECT_URI = "Invalid redirect URI";
const MSG_INVALID_FILE_DESCRIPTOR = "Invalid file descriptor";
const MSG_INVALID_HTTP_METHOD = "Invalid HTTP method";
const MSG_CANNOT_SET_HEAD_ROUTE = "Cannot set HEAD route, use GET";
const MSG_REDOS_VULNERABILITY = "Invalid route pattern: potential ReDoS vulnerability";
const MSG_ROUTING_FILE = "Routing request to file system";
const MSG_SERVE_PATH_OUTSIDE = "Path outside allowed directory";
const MSG_VALIDATION_FAILED = "Configuration validation failed: ";
const MSG_MUST_BE_TYPE = "is not of a type(s)";
const MSG_MUST_BE_GREATER_THAN = "must be greater than or equal to";
const MSG_MUST_BE_LESS_THAN = "must be less than or equal to";
const SEMICOLON_SPACE = "; ";
const OPTIONS_BODY = "Make a GET request to retrieve the file";

// =============================================================================
// HTTP RANGE & CACHING
// =============================================================================
const KEY_BYTES = "bytes=";
const BYTES_SPACE = "bytes ";

// =============================================================================
// EVENT & STREAM CONSTANTS
// =============================================================================
const EVT_CLOSE = "close";
const EVT_FINISH = "finish";
const EVT_STREAM = "stream";
const EVT_CONNECT = "connect";
const EVT_ERROR = "error";

// =============================================================================
// UTILITY & MISC
// =============================================================================
const CONSOLE_ERROR = "error";
const CONSOLE_LOG = "log";
const COLLECTION = "collection";
const CRITICAL = "critical";
const EMERG = "emerg";
const EN_US = "en-US";
const FALSE = "false";
const HTTP_VERSION = "HTTP/1.1";
const ITEM = "item";
const NOTICE = "notice";
const SHORT = "short";
const TO_STRING = "toString";
const TRUE = "true";
const WARN = "warn";
const ALERT = "alert";

const MONTHS = Object.freeze(
	Array.from({ length: 12 }, (_, idx) => {
		const d = new Date();
		d.setMonth(idx);

		return Object.freeze(d.toLocaleString(EN_US, { month: SHORT }));
	}),
);

const VALID_LOG_LEVELS = new Set([DEBUG, INFO, WARN, ERROR, CRITICAL, ALERT, EMERG, NOTICE]);

// =============================================================================
// REGULAR EXPRESSION PATTERNS
// =============================================================================
const HTTP_PROTOCOL_PATTERN = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;
const CONTROL_CHAR_PATTERN = /[\r\n\t]/;
const QUANTIFIER_PATTERN = /([.*+?^${}()|[\\]])\1{3,}/;
const IPV4_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const IPV6_CHAR_PATTERN = /^[0-9a-fA-F:.]+$/;
const IPV4_MAPPED_PATTERN = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i;
const HEX_GROUP_PATTERN = /^[0-9a-fA-F]{1,4}$/;

// =============================================================================
// HTML ESCAPE MAPPING
// =============================================================================
const HTML_ESCAPES = Object.freeze({
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&#39;",
});

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
	const rangeSpec = commaIndex === -1 ? rangePart : rangePart.substring(0, commaIndex);
	const hyphenIndex = rangeSpec.indexOf(HYPHEN);
	if (hyphenIndex === -1) {
		return null;
	}

	const startStr = rangeSpec.substring(0, hyphenIndex);
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
function partialHeaders(req, res, size, status, headers = {}, options = {}) {
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
function pipeable(method, arg) {
	return method !== HEAD && arg !== null && arg !== undefined && typeof arg.on === FUNCTION;
}

/**
 * Writes HTTP response headers using writeHead method
 * @param {Object} res - The HTTP response object
 * @param {Object} [headers={}] - Headers object to write
 */
function writeHead(res, headers = {}) {
	res.writeHead(res.statusCode, node_http.STATUS_CODES[res.statusCode], headers);
}

/**
 * Gets MIME type for file extension
 * @param {string} [arg=""] - File path or extension
 * @returns {string} MIME type string
 */
function mime(arg = EMPTY) {
	const ext = node_path.extname(arg);

	return ext in mimeExtensions ? mimeExtensions[ext].type : APPLICATION_OCTET_STREAM;
}

/**
 * Determines the appropriate HTTP status code based on request and response state
 * @param {Object} req - The HTTP request object
 * @param {Object} res - The HTTP response object
 * @returns {number} The appropriate HTTP status code
 */
function getStatus(req, res) {
	if (req.allow.length === 0) {
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

function getStatusText(status) {
	return node_http.STATUS_CODES[status] || node_http.STATUS_CODES[INT_500];
}

/**
 * Error response handler
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {number} [status=res.statusCode] - HTTP status code (coerces to 500 if < 400)
 */
function error(req, res, status = res.statusCode) {
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
function json(
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
function redirect(res, uri, perm = true) {
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
function send(
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
function set(res, arg = {}) {
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
function status(res, arg = INT_200) {
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
function stream(req, res, file, emitStream, createReadStream, etags) {
	if (file.path === EMPTY || file.stats.size === INT_0) {
		throw new TypeError(MSG_INVALID_FILE_DESCRIPTOR);
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
			[headers, options] = partialHeaders(req, res, file.stats.size);

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
function escapeHtml(str = EMPTY) {
	return str.replace(/[&<>"']/g, (match) => HTML_ESCAPES[match]);
}

/**
 * Creates error response handler
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {EventEmitter} emitter - EventEmitter for error events
 * @returns {Function} Error handler function
 */
function createErrorHandler(req, res, emitter) {
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
function createJsonHandler(res) {
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
function createRedirectHandler(res) {
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
function createSendHandler(req, res, onReady, onDone) {
	return (body = EMPTY, status = res.statusCode, headers = {}) =>
		send(req, res, body, status, headers, onReady, onDone);
}

/**
 * Creates set headers handler
 * @param {Object} res - Response object
 * @returns {Function} Set handler function
 */
function createSetHandler(res) {
	return (arg = {}) => set(res, arg);
}

/**
 * Creates status handler
 * @param {Object} res - Response object
 * @returns {Function} Status handler function
 */
function createStatusHandler(res) {
	return (arg = INT_200) => status(res, arg);
}

/**
 * Checks if request origin is allowed for CORS
 * @param {Object} req - Request object
 * @param {Set} origins - Set of allowed origins
 * @returns {boolean} True if CORS is allowed
 */
function cors(req, origins) {
	if (origins.size === 0) {
		return false;
	}

	const origin = req.headers.origin;
	const corsWildcard = origins.has(WILDCARD);
	return req.corsHost && (corsWildcard || origins.has(origin));
}

/**
 * Checks if request origin host differs from request host
 * @param {Object} req - Request object
 * @returns {boolean} True if hosts differ
 */
function corsHost(req) {
	return (
		ORIGIN in req.headers &&
		req.headers.origin.replace(/^http(s)?:\/\//, EMPTY) !== req.headers.host
	);
}

/**
 * Creates CORS request handler that sends 204 No Content
 * @returns {Function} Request handler function
 */
function corsRequest() {
	return (req, res) => res.status(INT_204).send(EMPTY);
}

/**
 * Extracts client IP address from request
 * @param {Object} req - Request object
 * @returns {string} Client IP address
 */
function extractIP(req) {
	const connection = req.connection;
	const socket = req.socket;
	const fallbackIP =
		(connection && connection.remoteAddress) || (socket && socket.remoteAddress) || LOCALHOST;

	const forwardedHeader = req.headers[X_FORWARDED_FOR];
	if (!forwardedHeader || !forwardedHeader.trim()) {
		return fallbackIP;
	}

	const forwardedIPs = forwardedHeader.split(COMMA);
	const ipCount = forwardedIPs.length;

	for (let i = INT_0; i < ipCount; i++) {
		const ip = forwardedIPs[i].trim();
		if (isValidIP(ip)) {
			return ip;
		}
	}

	return fallbackIP;
}

/**
 * Extracts URL parameters from request pathname using regex groups
 * @param {Object} req - HTTP request object with parsed pathname
 * @param {RegExp} getParams - Regular expression with named capture groups
 */
function params(req, getParams) {
	getParams.lastIndex = INT_0;
	const match = getParams.exec(req.parsed.pathname);
	const groups = match?.groups;

	if (!groups) {
		req.params = {};
		return;
	}

	const processedParams = Object.create(null);
	const keys = Object.keys(groups);
	const keyCount = keys.length;

	for (let i = INT_0; i < keyCount; i++) {
		const key = keys[i];
		const value = groups[key];

		if (value === null || value === undefined) {
			processedParams[key] = tinyCoerce.coerce(null);
		} else {
			let decoded;
			if (value.indexOf(PERCENT) === INT_NEG_1) {
				decoded = value;
			} else {
				try {
					decoded = decodeURIComponent(value);
				} catch {
					decoded = value;
				}
			}

			const coerced = tinyCoerce.coerce(decoded);
			processedParams[key] = typeof coerced === STRING ? escapeHtml(coerced) : coerced;
		}
	}

	req.params = processedParams;
}

/**
 * Parses a URL string or request object into a URL object with security checks
 * @param {string|Object} arg - URL string or request object to parse
 * @returns {URL} Parsed URL object
 */
function parse(arg) {
	const urlString =
		typeof arg === STRING
			? arg
			: `${HTTP_PREFIX}${arg.headers?.host || `localhost:${arg.socket?.server?._connectionKey?.replace(/.*::/, EMPTY) || String(INT_8000)}`}${arg.url}`;

	/* node:coverage ignore next 6 */
	try {
		return new URL(urlString);
	} catch {
		return new URL(`${HTTP_PREFIX}localhost${arg.url || SLASH}`);
	}
}

/**
 * Converts parameterized route path to regex pattern
 * @param {string} path - Route path with parameters (e.g., "/users/:id")
 * @returns {string} Regex pattern string
 */
function extractPath(path) {
	return path.replace(/:([a-zA-Z_]\w*)/g, EXTRACT_PATH_REPLACE);
}

/**
 * Validates IPv4 address format
 * @param {string} ip - IPv4 address to validate
 * @returns {boolean} True if valid IPv4
 */
function isValidIPv4(ip) {
	const match = IPV4_PATTERN.exec(ip);
	if (!match) {
		return false;
	}

	for (let i = INT_1; i < INT_5; i++) {
		const num = parseInt(match[i], INT_10);
		if (num > INT_255) {
			return false;
		}
	}

	return true;
}

/**
 * Validates IPv6 address format
 * @param {string} ip - IPv6 address to validate
 * @returns {boolean} True if valid IPv6
 */
function isValidIPv6(ip) {
	if (!IPV6_CHAR_PATTERN.test(ip)) {
		return false;
	}

	const ipv4MappedMatch = IPV4_MAPPED_PATTERN.exec(ip);
	if (ipv4MappedMatch) {
		return isValidIPv4(ipv4MappedMatch[INT_1]);
	}

	if (ip === DOUBLE_COLON) {
		return true;
	}

	const doubleColonIndex = ip.indexOf(DOUBLE_COLON);
	const isCompressed = doubleColonIndex !== INT_NEG_1;

	if (isCompressed) {
		return validateCompressedIPv6(ip, doubleColonIndex);
	}

	return validateUncompressedIPv6(ip);
}

/**
 * Validates compressed IPv6 address (with ::)
 * @param {string} ip - IPv6 address
 * @param {number} doubleColonIndex - Position of ::
 * @returns {boolean} True if valid
 */
function validateCompressedIPv6(ip, doubleColonIndex) {
	if (ip.indexOf(DOUBLE_COLON, doubleColonIndex + INT_2) !== INT_NEG_1) {
		return false;
	}

	if (
		(doubleColonIndex > INT_0 && ip.charAt(doubleColonIndex - INT_1) === COLON) ||
		(doubleColonIndex + INT_2 < ip.length && ip.charAt(doubleColonIndex + INT_2) === COLON)
	) {
		return false;
	}

	const beforeDoubleColon = ip.substring(INT_0, doubleColonIndex);
	const afterDoubleColon = ip.substring(doubleColonIndex + INT_2);

	const leftGroups = beforeDoubleColon ? beforeDoubleColon.split(COLON) : [];
	const rightGroups = afterDoubleColon ? afterDoubleColon.split(COLON) : [];

	const totalGroups =
		leftGroups.filter((g) => g !== EMPTY).length + rightGroups.filter((g) => g !== EMPTY).length;

	if (totalGroups >= INT_8) {
		return false;
	}

	return validateHexGroups(leftGroups) && validateHexGroups(rightGroups);
}

/**
 * Validates uncompressed IPv6 address
 * @param {string} ip - IPv6 address
 * @returns {boolean} True if valid
 */
function validateUncompressedIPv6(ip) {
	const groups = ip.split(COLON);
	if (groups.length !== INT_8) {
		return false;
	}

	return validateHexGroups(groups);
}

/**
 * Validates hex groups in IPv6 address
 * @param {Array} groups - Array of hex group strings
 * @returns {boolean} True if all groups are valid
 */
function validateHexGroups(groups) {
	const groupCount = groups.length;

	for (let i = INT_0; i < groupCount; i++) {
		/* node:coverage ignore next 3 */
		if (!groups[i] || !HEX_GROUP_PATTERN.test(groups[i])) {
			return false;
		}
	}
	return true;
}

/**
 * Validates if an IP address is properly formatted
 * @param {string} ip - IP address to validate
 * @returns {boolean} True if IP is valid format
 */
function isValidIP(ip) {
	if (!ip || typeof ip !== STRING) {
		return false;
	}

	if (ip.indexOf(COLON) === INT_NEG_1) {
		return isValidIPv4(ip);
	}

	return isValidIPv6(ip);
}

/**
 * Processes middleware map for a given URI and populates middleware array
 * @param {string} uri - The URI to match against
 * @param {Map} [map=new Map()] - Map of middleware handlers
 * @param {Object} [arg={}] - Object containing middleware array and parameters
 */
function reduce(uri, map = new Map(), arg = {}) {
	if (!map.size) {
		return;
	}

	const middlewareArray = arg.middleware;
	let paramsFound = arg.params;
	const values = Array.from(map.values());
	const len = values.length;

	for (let i = INT_0; i < len; i++) {
		const middleware = values[i];
		middleware.regex.lastIndex = INT_0;

		if (middleware.regex.test(uri)) {
			const handlers = middleware.handlers;
			const handlerLen = handlers.length;

			if (handlerLen === 1) {
				middlewareArray.push(handlers[INT_0]);
			} else {
				for (let j = INT_0; j < handlerLen; j++) {
					middlewareArray.push(handlers[j]);
				}
			}

			if (middleware.params && !paramsFound) {
				arg.params = true;
				arg.getParams = middleware.regex;
				paramsFound = true;
			}
		}
	}
}

/**
 * Creates a next function for middleware processing with error handling
 * @param {Object} req - The HTTP request object
 * @param {Object} res - The HTTP response object
 * @param {Iterator} middleware - The middleware iterator
 * @param {boolean} [immediate=false] - Whether to execute immediately or on next tick
 * @returns {Function} The next function for middleware chain
 */
function next(req, res, middleware, immediate = false) {
	/**
	 * Handles errors by finding error handler middleware
	 * @param {Error} err - The error to handle
	 * @param {Function} nextFn - Next function for chain
	 */
	const handleError = (err, nextFn) => {
		let obj = middleware.next();

		while (!obj.done && obj.value && obj.value.length !== ERROR_HANDLER_LENGTH) {
			obj = middleware.next();
		}

		if (!obj.done && obj.value) {
			obj.value(err, req, res, nextFn);
		} else {
			const newStatus = getStatus(req, res);
			res.error(newStatus, new Error(getStatusText(newStatus)));
		}
	};

	/**
	 * Handles regular middleware execution
	 * @param {Function} nextFn - Next function for chain
	 */
	const handleMiddleware = (nextFn) => {
		const obj = middleware.next();

		if (!obj.done) {
			const value = obj.value;
			if (typeof value === FUNCTION) {
				value(req, res, nextFn);
			} else {
				res.send(value);
			}
		} else {
			const newStatus = getStatus(req, res);
			res.error(newStatus, new Error(getStatusText(newStatus)));
		}
	};

	/**
	 * Executes middleware chain with error handling
	 * @param {Error} [err] - Optional error to trigger error handling
	 */
	const execute = (err) => {
		if (err !== void 0) {
			handleError(err, execute);
		} else {
			handleMiddleware(execute);
		}
	};

	return immediate ? execute : (err) => process.nextTick(() => execute(err));
}

/**
 * Computes route information for a given URI and method
 * @param {Map} middleware - Map of middleware by method
 * @param {Set} ignored - Set of ignored middleware functions
 * @param {string} uri - The URI to match
 * @param {string} method - HTTP method
 * @param {Object|Map} cache - Cache for route results
 * @param {boolean} [override=false] - Whether to override cache
 * @returns {Object} Route information object
 */
function computeRoutes(middleware, ignored, uri, method, cache, override = false) {
	const key = `${method}${DELIMITER}${uri}`;
	const cached = !override ? cache.get(key) : void 0;
	let result;

	if (cached !== void 0) {
		result = cached;
	} else {
		result = { getParams: null, middleware: [], params: false, visible: INT_0, exit: INT_NEG_1 };
		reduce(uri, middleware.get(WILDCARD) ?? new Map(), result);

		if (method !== WILDCARD) {
			result.exit = result.middleware.length;
			reduce(uri, middleware.get(method) ?? new Map(), result);
		}

		let visible = INT_0;
		const middlewareLength = result.middleware.length;
		for (let i = INT_0; i < middlewareLength; i++) {
			if (!ignored.has(result.middleware[i])) {
				visible++;
			}
		}
		result.visible = visible;
		cache.set(key, result);
	}

	return result;
}

/**
 * Lists middleware routes for a given method
 * @param {Map} middleware - Map of middleware by method
 * @param {string} [method=get] - HTTP method to list
 * @param {string} [type=array] - Return type (array or object)
 * @returns {Array|Object} List of routes
 */
function listRoutes(middleware, method = GET.toLowerCase(), type = ARRAY) {
	const methodMap = middleware.get(method.toUpperCase());

	if (!methodMap) {
		return type === ARRAY ? [] : {};
	}

	if (type === ARRAY) {
		return [...methodMap.keys()];
	}

	const result = {};
	const entries = Array.from(methodMap.entries());
	const entryCount = entries.length;

	for (let i = INT_0; i < entryCount; i++) {
		const [key, value] = entries[i];
		result[key] = value;
	}

	return result;
}

/**
 * Checks if a method is allowed for a given URI
 * @param {Map} middleware - Map of middleware by method
 * @param {Set} ignored - Set of ignored middleware functions
 * @param {Object|Map} cache - Cache for route results
 * @param {string} method - HTTP method
 * @param {string} uri - The URI to check
 * @param {boolean} [override=false] - Whether to override cache
 * @returns {boolean} True if allowed
 */
function checkAllowed(middleware, ignored, cache, method, uri, override = false) {
	return computeRoutes(middleware, ignored, uri, method, cache, override).visible > INT_0;
}

/**
 * Creates a registry object with middleware management methods
 * @param {Set} methods - Set of registered HTTP methods
 * @param {Object|Map} cache - Cache for route results
 * @returns {Object} Registry object with ignore, allowed, routes, register, list methods
 */
function createMiddlewareRegistry(methods, cache) {
	const middleware = new Map();
	const ignored = new Set();

	return Object.freeze({
		ignore: (f) => {
			ignored.add(f);
		},
		allowed: (m, u, o) => checkAllowed(middleware, ignored, cache, m, u, o),
		routes: (u, m, o) => computeRoutes(middleware, ignored, u, m, cache, o),
		register: (p, ...fns) => registerMiddleware(middleware, ignored, methods, p, ...fns),
		list: (m, t) => listRoutes(middleware, m, t),
	});
}

/**
 * Validates HTTP method for middleware registration
 * @param {string} method - HTTP method to validate
 * @throws {TypeError} If method is invalid or HEAD
 */
function validateMethod(method) {
	if (method !== WILDCARD && !NODE_METHODS.includes(method)) {
		throw new TypeError(MSG_INVALID_HTTP_METHOD);
	}

	if (method === HEAD) {
		throw new TypeError(MSG_CANNOT_SET_HEAD_ROUTE);
	}
}

/**
 * Validates route pattern for security issues
 * @param {string} path - Route path to validate
 * @throws {TypeError} If pattern has potential ReDoS vulnerability
 */
function validateRoutePattern(path) {
	/* node:coverage ignore next 3 */
	if (QUANTIFIER_PATTERN.test(path)) {
		throw new TypeError(MSG_REDOS_VULNERABILITY);
	}
}

/**
 * Registers middleware for a route
 * @param {Map} middleware - Map of middleware by method
 * @param {Set} ignored - Set of ignored middleware functions
 * @param {Set} methods - Set of registered HTTP methods
 * @param {string|Function} rpath - Route path or middleware function
 * @param {...Function} fn - Middleware functions to register
 */
function registerMiddleware(middleware, ignored, methods, rpath, ...fn) {
	if (rpath === void 0) {
		return;
	}

	if (typeof rpath === FUNCTION) {
		fn = [rpath, ...fn];
		rpath = `/.${WILDCARD}`;
	}

	const method = typeof fn[fn.length - 1] === STRING ? fn.pop().toUpperCase() : GET;

	validateMethod(method);

	if (!middleware.has(method)) {
		if (method !== WILDCARD) {
			methods.add(method);
		}

		middleware.set(method, new Map());
	}

	const mmethod = middleware.get(method);
	let lrpath = rpath,
		lparams = false;

	if (!lrpath.includes(`${SLASH}${LEFT_PAREN}`) && lrpath.includes(`${SLASH}:`)) {
		lparams = true;
		lrpath = extractPath(lrpath);
	}

	validateRoutePattern(lrpath);

	const current = mmethod.get(lrpath) ?? { handlers: [] };
	current.handlers.push(...fn);
	mmethod.set(lrpath, {
		handlers: current.handlers,
		params: lparams,
		regex: new RegExp(`^${lrpath}$`),
	});
}

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

const validator = new jsonschema.Validator();

/**
 * Validates configuration object against schema
 * @param {Object} [config={}] - Configuration object to validate
 * @returns {Object} Validated configuration object with defaults
 * @throws {Error} When configuration validation fails
 */
function validateConfig(config = {}) {
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
function resolveLoggingValue(configValue, envValue, defaultValue) {
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
function validateLogging(logging = {}) {
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
 * Generates common log format entry
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {string} format - Log format string
 * @returns {string} Common log format string
 */
function clf(req, res, format) {
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
function logRoute(uri, method, ip, logFn) {
	return logFn(`type=route, uri=${uri}, method=${method}, ip=${ip}, message="Routing request"`);
}

/**
 * Creates middleware log message
 * @param {string} route - Route path
 * @param {string} method - HTTP method
 * @param {Function} logFn - Log function
 * @returns {Object} Logger object for chaining
 */
function logMiddleware(route, method, logFn) {
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
function logDecoration(uri, method, ip, logFn) {
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
function logError(uri, method, ip, logFn) {
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
function logServe(req, message, logFn) {
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
function log(msg, logLevel = DEBUG, enabled = true, actualLevel = INFO) {
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
function createLogger(config = {}) {
	const { enabled = true, format = LOG_FORMAT, level = INFO } = config;
	const actualLevel = VALID_LOG_LEVELS.has(level) ? level : INFO;

	return Object.freeze({
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
	});
}

/**
 * Formats a time offset value into a string representation
 * @param {number} [arg=0] - Time offset value
 * @returns {string} Formatted time offset string
 */
function timeOffset(arg = INT_0) {
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

const __dirname$1 = node_url.fileURLToPath(new URL(CURRENT_DIR, (typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === 'SCRIPT' && _documentCurrentScript.src || new URL('woodland.cjs', document.baseURI).href))));
const html = node_fs.readFileSync(node_path.join(__dirname$1, PARENT_DIR, TPL_DIR, INDEX_HTML_FILE), {
	encoding: UTF8,
});

/**
 * Generates HTML list item for a file entry
 * @param {Object} file - File object from fs.readdir
 * @returns {string} HTML list item
 */
function renderFileItem(file) {
	const fileName = file.name;
	const safeName = escapeHtml(fileName);
	const safeHref = encodeURIComponent(fileName);
	const isDir = file.isDirectory();

	return isDir
		? `    <li><a href="${safeHref}/" rel="${COLLECTION}">${safeName}/</a></li>`
		: `    <li><a href="${safeHref}" rel="${ITEM}">${safeName}</a></li>`;
}

/**
 * Generates an HTML index page for directory listings
 * @param {string} [title=""] - The title for the index page
 * @param {Array} [files=[]] - Array of file objects from fs.readdir with withFileTypes: true
 * @returns {string} The complete HTML string for the index page
 */
function autoIndex(title = EMPTY, files = []) {
	const safeTitle = escapeHtml(title);
	const parentDirItem = `    <li><a href="${PARENT_DIR}" rel="${COLLECTION}">${PARENT_DIR}/</a></li>`;

	const fileItems = files.map((file) => renderFileItem(file));
	const safeFiles = [parentDirItem, ...fileItems].join(NEWLINE);

	return html.replace(/\$\{\s*FILES\s*\}/g, safeFiles).replace(/\$\{\s*TITLE\s*\}/g, safeTitle);
}

/**
 * Serves files from filesystem
 * @param {Object} config - File server config (autoIndex, charset, indexes, logger, stream, etag)
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {string} arg - File path argument
 * @param {string} [folder=process.cwd()] - Root folder to serve from
 */
async function serve(config, req, res, arg, folder = process.cwd()) {
	const fp = node_path.resolve(folder, arg);
	const resolvedFolder = node_path.resolve(folder);

	const realFp = await promises.realpath(fp).catch(() => fp);
	const realFolder = await promises.realpath(resolvedFolder).catch(() => resolvedFolder);

	const isRoot =
		realFolder === node_path.sep ||
		(realFolder.length === INT_3 && realFolder[INT_1] === COLON && realFolder.endsWith(BACKSLASH));
	const isWithin = isRoot
		? realFp.startsWith(realFolder)
		: realFp === realFolder || (realFp.startsWith(realFolder) && realFp[realFolder.length] === node_path.sep);

	if (!isWithin) {
		config.logger.logServe(req, MSG_SERVE_PATH_OUTSIDE);
		res.error(INT_403, new Error(node_http.STATUS_CODES[INT_403]));

		return;
	}

	let valid = true;
	let stats;

	config.logger.logServe(req, MSG_ROUTING_FILE);

	try {
		stats = await promises.stat(realFp, { bigint: false });
	} catch {
		valid = false;
	}

	if (!valid) {
		res.error(INT_404, new Error(node_http.STATUS_CODES[INT_404]));
	} else if (!stats.isDirectory()) {
		config.stream(req, res, {
			charset: config.charset,
			etag: config.etag(req.method, stats.ino, stats.size, stats.mtimeMs),
			path: realFp,
			stats: stats,
		});
	} else if (!req.parsed.pathname.endsWith(SLASH)) {
		res.redirect(`${req.parsed.pathname}${SLASH}${req.parsed.search}`);
	} else {
		let files;
		/* node:coverage ignore next 7 */
		try {
			files = await promises.readdir(realFp, { encoding: UTF8, withFileTypes: true });
		} catch {
			res.error(INT_404, new Error(node_http.STATUS_CODES[INT_404]));
			return;
		}

		let result = EMPTY;
		const fileCount = files.length;

		for (let i = INT_0; i < fileCount; i++) {
			const file = files[i];
			if (config.indexes.includes(file.name)) {
				result = node_path.join(realFp, file.name);
				break;
			}
		}

		if (!result.length) {
			if (!config.autoIndex) {
				res.error(INT_404, new Error(node_http.STATUS_CODES[INT_404]));
			} else {
				try {
					const body = autoIndex(decodeURIComponent(req.parsed.pathname), files);
					res.header(CONTENT_TYPE, `${TEXT_HTML}; charset=${config.charset}`);
					res.send(body);
				} catch {
					res.error(INT_400, new Error(node_http.STATUS_CODES[INT_400]));
				}
			}
		} else {
			let rstats;
			/* node:coverage ignore next 7 */
			try {
				rstats = await promises.stat(result, { bigint: false });
			} catch {
				res.error(INT_404, new Error(node_http.STATUS_CODES[INT_404]));
				return;
			}

			config.stream(req, res, {
				charset: config.charset,
				etag: config.etag(req.method, rstats.ino, rstats.size, rstats.mtimeMs),
				path: result,
				stats: rstats,
			});
		}
	}
}

/**
 * Registers file serving middleware for a root path
 * @param {Object} config - File server config
 * @param {string} root - Root path to register
 * @param {string} folder - Folder to serve files from
 * @param {Function} useMiddleware - Middleware registration function
 */
function register(config, root, folder, useMiddleware) {
	const normalizedRoot = root.replace(/\/$/, EMPTY) || SLASH;
	// Match mount root and any path beneath it: /static, /static/, /static/foo
	const rootPattern =
		normalizedRoot === SLASH ? ROUTE_PATTERN : `${normalizedRoot}${ROUTE_PATTERN}`;

	useMiddleware(rootPattern, (req, res) => {
		const pathname = decodeURIComponent(req.parsed.pathname);
		// For root mount "/", strip leading "/" (slice(1))
		// For other mounts like "/static", strip "/static" prefix
		const relativePath =
			pathname === normalizedRoot
				? EMPTY
				: normalizedRoot === SLASH
					? pathname.slice(INT_1)
					: pathname.slice(normalizedRoot.length + INT_1);
		return serve(config, req, res, relativePath, folder);
	});
}

/**
 * Creates file server middleware for serving static files
 * @param {Object} config - File server config (autoIndex, charset, indexes, logger, stream, etag)
 * @returns {Object} File server with register, serve methods
 */
function createFileServer(config) {
	return Object.freeze({
		register: (root, folder, useMiddleware) => {
			const fn = useMiddleware ?? config.use;
			if (typeof fn !== "function") {
				throw new TypeError(MSG_USE_MIDDLEWARE_REQUIRED);
			}
			register(config, root, folder, fn);
		},
		serve: (req, res, arg, folder) => serve(config, req, res, arg, folder),
	});
}

/**
 * Woodland HTTP server framework class extending EventEmitter
 * @class
 * @extends {EventEmitter}
 */
class Woodland extends node_events.EventEmitter {
	#autoIndex;
	#charset;
	#corsExpose;
	#defaultHeaders;
	#digit;
	#etags;
	#indexes;
	#logging;
	#origins;
	#time;
	#cache;
	#methods;
	#logger;
	#fileServer;
	#middleware;

	/**
	 * Creates a new Woodland instance
	 * @param {Object} [config={}] - Configuration object
	 * @param {boolean} [config.autoIndex=false] - Enable automatic directory indexing
	 * @param {number} [config.cacheSize=1000] - Size of internal cache
	 * @param {number} [config.cacheTTL=10000] - Cache TTL in milliseconds
	 * @param {string} [config.charset='utf-8'] - Default charset
	 * @param {string} [config.corsExpose=''] - CORS expose headers
	 * @param {Object} [config.defaultHeaders={}] - Default headers to set
	 * @param {number} [config.digit=3] - Digit precision for timing
	 * @param {boolean} [config.etags=true] - Enable ETags
	 * @param {Array} [config.indexes=['index.htm','index.html']] - Index files
	 * @param {Object} [config.logging={}] - Logging configuration
	 * @param {Array} [config.origins=[]] - Allowed CORS origins
	 * @param {boolean} [config.silent=false] - Silent mode
	 * @param {boolean} [config.time=false] - Enable timing
	 */
	constructor(config = {}) {
		super();

		const validated = validateConfig(config);

		this.#autoIndex = validated.autoIndex;
		this.#charset = validated.charset;
		this.#corsExpose = validated.corsExpose;
		this.#defaultHeaders = this.#buildFinalHeaders(validated.defaultHeaders, validated.silent);
		this.#digit = validated.digit;
		this.#etags = validated.etags
			? Object.freeze(tinyEtag.etag({ cacheSize: validated.cacheSize, cacheTTL: validated.cacheTTL }))
			: null;
		this.#indexes = [...validated.indexes];
		this.#logging = Object.freeze(validateLogging(validated.logging));
		this.#origins = new Set(validated.origins);
		this.#time = validated.time;
		this.#cache = tinyLru.lru(validated.cacheSize, validated.cacheTTL);
		this.#methods = new Set();
		this.#logger = this.#createLogger();
		this.#fileServer = this.#createFileServer();
		this.#middleware = createMiddlewareRegistry(this.#methods, this.#cache);

		this.#setupMiddleware();
		this.#setupErrorHandling();
	}

	/**
	 * Builds final headers object from defaults
	 * @param {Object} defaultHeaders - Default headers from config
	 * @param {boolean} silent - Silent mode flag
	 * @returns {Array} Array of [key, value] pairs
	 */
	#buildFinalHeaders(defaultHeaders, silent) {
		const finalHeaders = { ...defaultHeaders };
		if (!silent) {
			if (!(SERVER in finalHeaders)) {
				finalHeaders[SERVER] = SERVER_VALUE;
			}
			finalHeaders[X_POWERED_BY] = X_POWERED_BY_VALUE;
		}

		return Reflect.ownKeys(finalHeaders)
			.filter((key) => typeof key === STRING)
			.map((key) => [key.toLowerCase(), finalHeaders[key]]);
	}

	/**
	 * Creates logger instance
	 * @returns {Object} Logger instance
	 */
	#createLogger() {
		return createLogger({
			enabled: this.#logging.enabled,
			format: this.#logging.format,
			level: this.#logging.level,
		});
	}

	/**
	 * Creates file server instance
	 * @returns {Object} File server instance
	 */
	#createFileServer() {
		return createFileServer({
			autoIndex: this.#autoIndex,
			charset: this.#charset,
			indexes: this.#indexes,
			logger: this.#logger,
			stream: this.stream.bind(this),
			etag: this.etag.bind(this),
		});
	}

	/**
	 * Sets up middleware and CORS handling
	 */
	#setupMiddleware() {
		if (this.#etags !== null) {
			this.get(this.#etags.middleware).ignore(this.#etags.middleware);
		}

		if (this.#origins.size > INT_0) {
			const fnCorsRequest = corsRequest();
			this.options(fnCorsRequest).ignore(fnCorsRequest);
		}
	}

	/**
	 * Sets up error handling event listener
	 */
	#setupErrorHandling() {
		this.on(ERROR, (req, _res, _error) =>
			this.#logger.logError(req.parsed.pathname, req.method, req.ip),
		);
	}

	/**
	 * Determines allowed methods for a URI
	 * @param {string} uri - URI to check
	 * @param {boolean} [override=false] - Override cache
	 * @param {boolean} [isCorsRequest=false] - Whether this is a CORS request
	 * @returns {string} Comma-separated list of allowed methods
	 */
	#allows(uri, override = false, isCorsRequest = false) {
		const key = `perm${DELIMITER}${uri}${DELIMITER}${isCorsRequest ? INT_1 : INT_0}`;
		let result = !override ? this.#cache.get(key) : void 0;

		if (override || result === void 0) {
			const methodSet = new Set();

			for (const method of this.#methods) {
				if (this.#middleware.allowed(method, uri, override)) {
					methodSet.add(method);
				}
			}

			const list = this.#buildAllowedList(methodSet, isCorsRequest);
			result = list.sort().join(COMMA_SPACE);
			this.#cache.set(key, result);
			this.#logger.log(
				`type=allows, uri=${uri}, override=${override}, message="Determined 'allow' header value"`,
			);
		}

		return result ?? EMPTY;
	}

	/**
	 * Builds the list of allowed methods including implicit HEAD and OPTIONS
	 * @param {Set} methodSet - Set of explicitly registered methods
	 * @param {boolean} isCorsRequest - Whether this is a CORS request
	 * @returns {Array} Array of allowed methods
	 */
	#buildAllowedList(methodSet, isCorsRequest = false) {
		const list = [...methodSet];

		if (list.length > 0) {
			if (methodSet.has(GET) && !methodSet.has(HEAD)) {
				list.push(HEAD);
			}

			/* node:coverage ignore next 3 */
			if (!methodSet.has(OPTIONS) && isCorsRequest) {
				list.push(OPTIONS);
			}
		}

		return list;
	}

	/**
	 * Registers wildcard middleware for all methods
	 * @param {...*} args - Middleware function(s)
	 * @returns {Woodland} Returns self for chaining
	 */
	always(...args) {
		const argsLength = args.length;

		for (let i = INT_0; i < argsLength; i++) {
			this.#middleware.ignore(args[i]);
		}

		return this.use(...args, WILDCARD);
	}

	/**
	 * Registers CONNECT middleware
	 * @param {...*} args - Middleware function(s)
	 * @returns {Woodland} Returns self for chaining
	 */
	connect(...args) {
		return this.use(...args, CONNECT);
	}

	/**
	 * Decorates request and response objects with framework utilities
	 * @param {Object} req - HTTP request object
	 * @param {Object} res - HTTP response object
	 */
	#decorate(req, res) {
		const timing = this.#time ? precise.precise().start() : null;
		const parsed = parse(req);
		const clientIP = extractIP(req);
		const allowString = this.#allows(parsed.pathname, false, req.cors);
		const headersBatch = this.#buildDefaultHeaders(allowString);

		req.corsHost = corsHost(req);
		req.cors = cors(req, this.#origins);
		req.parsed = parsed;
		req.allow = allowString;
		req.ip = clientIP;
		req.body = EMPTY;
		req.host = parsed.hostname;
		req.params = {};
		req.valid = true;

		if (timing) {
			req.precise = timing;
		}

		if (req.cors) {
			this.#addCorsHeaders(req, headersBatch);
		}

		this.#decorateResponse(res, req, headersBatch);
		this.#logger.log(
			`type=decorate, uri=${parsed.pathname}, method=${req.method}, ip=${clientIP}, message="Decorated request from ${clientIP}"`,
		);
	}

	/**
	 * Builds default headers batch
	 * @param {string} allowString - Allow header value
	 * @returns {Object} Headers batch object
	 */
	#buildDefaultHeaders(allowString) {
		const headersBatch = Object.create(null);
		headersBatch[ALLOW] = allowString;
		headersBatch[X_CONTENT_TYPE_OPTIONS] = NO_SNIFF;

		const defaultHeaders = this.#defaultHeaders;
		const headerCount = defaultHeaders.length;
		for (let i = INT_0; i < headerCount; i++) {
			const [key, value] = defaultHeaders[i];
			if (
				typeof key === STRING &&
				(typeof value === STRING || typeof value === NUMBER || Array.isArray(value))
			) {
				headersBatch[key] = value;
			}
		}

		return headersBatch;
	}

	/**
	 * Decorates response object with methods and event handlers
	 * @param {Object} res - HTTP response object
	 * @param {Object} req - HTTP request object
	 * @param {Object} headersBatch - Headers batch to set
	 */
	#decorateResponse(res, req, headersBatch) {
		res.locals = {};
		res.error = createErrorHandler(req, res, this);
		res.header = res.setHeader;
		res.json = createJsonHandler(res);
		res.redirect = createRedirectHandler(res);
		res.send = createSendHandler(req, res, this.#onReady.bind(this), this.#onDone.bind(this));
		res.set = createSetHandler(res);
		res.status = createStatusHandler(res);

		res.set(headersBatch);
		res.on(EVT_CLOSE, () => this.#logger.log(this.#logger.clf(req, res), INFO));
	}

	/**
	 * Adds CORS headers to the headers batch
	 * @param {Object} req - HTTP request object
	 * @param {Object} headersBatch - Headers batch object
	 */
	#addCorsHeaders(req, headersBatch) {
		const origin = req.headers.origin;
		const corsHeaders = req.headers[ACCESS_CONTROL_REQUEST_HEADERS] ?? this.#corsExpose;
		const originAllowed = this.#origins.has(origin);
		const hasWildcard = this.#origins.has(WILDCARD);

		/* node:coverage ignore next 9 */
		if (originAllowed) {
			headersBatch[ACCESS_CONTROL_ALLOW_ORIGIN] = origin;
			headersBatch[TIMING_ALLOW_ORIGIN] = origin;
			headersBatch[ACCESS_CONTROL_ALLOW_CREDENTIALS] = TRUE;
			headersBatch[ACCESS_CONTROL_ALLOW_METHODS] = req.allow;

			if (corsHeaders !== void 0) {
				headersBatch[
					req.method === OPTIONS ? ACCESS_CONTROL_ALLOW_HEADERS : ACCESS_CONTROL_EXPOSE_HEADERS
				] = corsHeaders;
			}
		} else if (hasWildcard) {
			headersBatch[ACCESS_CONTROL_ALLOW_ORIGIN] = WILDCARD;
			headersBatch[ACCESS_CONTROL_ALLOW_METHODS] = req.allow;

			if (corsHeaders !== void 0) {
				headersBatch[
					req.method === OPTIONS ? ACCESS_CONTROL_ALLOW_HEADERS : ACCESS_CONTROL_EXPOSE_HEADERS
				] = corsHeaders;
			}
		}
	}

	/**
	 * Registers DELETE middleware
	 * @param {...*} args - Middleware function(s)
	 * @returns {Woodland} Returns self for chaining
	 */
	delete(...args) {
		return this.use(...args, DELETE);
	}

	/**
	 * Generates ETag for response caching
	 * @param {string} method - HTTP method
	 * @param {...*} args - Values to hash
	 * @returns {string} ETag string or empty string
	 */
	etag(method, ...args) {
		if (!this.#isHashableMethod(method) || !this.#etagsEnabled()) {
			return EMPTY;
		}

		const hashed = this.#hashArgs(args);
		return this.#etags.create(hashed);
	}

	/**
	 * Checks if a method can be hashed for ETag generation
	 * @param {string} method - HTTP method
	 * @returns {boolean} True if method is GET, HEAD, or OPTIONS
	 */
	#isHashableMethod(method) {
		return method === GET || method === HEAD || method === OPTIONS;
	}

	/**
	 * Checks if ETags are enabled
	 * @returns {boolean} True if ETags are enabled
	 */
	#etagsEnabled() {
		return this.#etags !== null;
	}

	/**
	 * Hashes arguments for ETag generation
	 * @param {Array} args - Arguments to hash
	 * @returns {string} Hashed string
	 */
	#hashArgs(args) {
		return args
			.map((i) => (typeof i !== STRING ? JSON.stringify(i).replace(/^"|"$/g, EMPTY) : i))
			.join(HYPHEN);
	}

	/**
	 * Registers file server middleware
	 * @param {string} [root='/'] - Root path
	 * @param {string} [folder=process.cwd()] - Folder to serve
	 * @returns {Woodland} Returns self for chaining
	 */
	files(root = SLASH, folder = process.cwd()) {
		this.#fileServer.register(root, folder, this.use.bind(this));

		return this;
	}

	/**
	 * Registers GET middleware
	 * @param {...*} args - Middleware function(s)
	 * @returns {Woodland} Returns self for chaining
	 */
	get(...args) {
		return this.use(...args, GET);
	}

	/**
	 * Adds function to ignored set
	 * @param {Function} fn - Function to ignore
	 * @returns {Woodland} Returns self for chaining
	 */
	ignore(fn) {
		this.#middleware.ignore(fn);
		this.#logger.log(`type=ignore, message="Added function to ignored Set", name="${fn.name}"`);

		return this;
	}

	/**
	 * Lists middleware routes
	 * @param {string} [method='GET'] - HTTP method
	 * @param {string} [type='array'] - Return type (array or object)
	 * @returns {Array|Object} List of routes
	 */
	list(method = GET.toLowerCase(), type = "array") {
		const result = this.#middleware.list(method, type);
		this.#logger.log(`type=list, method=${method}, type=${type}`);

		return result;
	}

	/**
	 * Handles response done event
	 * @param {Object} req - HTTP request object
	 * @param {Object} res - HTTP response object
	 * @param {string} body - Response body
	 * @param {Object} headers - Response headers
	 */
	#onDone(req, res, body, headers) {
		const isNoContent = res.statusCode === INT_204 || res.statusCode === INT_304;
		const hasContentLength = res.getHeader(CONTENT_LENGTH) !== void 0;

		if (!isNoContent && !hasContentLength) {
			res.header(CONTENT_LENGTH, Buffer.byteLength(body));
		}

		writeHead(res, headers);
		res.end(body, this.#charset);
	}

	/**
	 * Handles response ready event
	 * @param {Object} req - HTTP request object
	 * @param {Object} res - HTTP response object
	 * @param {string} body - Response body
	 * @param {number} status - HTTP status code
	 * @param {Object} headers - Response headers
	 * @returns {Array} Response array
	 */
	#onReady(req, res, body, status, headers) {
		/* node:coverage ignore next 5 */
		if (this.#time && res.getHeader(X_RESPONSE_TIME) === void 0) {
			const diff = req.precise.stop().diff();
			const msValue = Number(diff / 1e6).toFixed(this.#digit);
			res.header(X_RESPONSE_TIME, `${msValue} ms`);
		}

		return this.#onSend(req, res, body, status, headers);
	}

	/**
	 * Handles response send event
	 * @param {Object} req - HTTP request object
	 * @param {Object} res - HTTP response object
	 * @param {string} body - Response body
	 * @param {number} status - HTTP status code
	 * @param {Object} headers - Response headers
	 * @returns {Array} Response array
	 */
	#onSend(req, res, body, status, headers) {
		if (status === INT_404) {
			delete headers[ALLOW];
			delete headers[ACCESS_CONTROL_ALLOW_METHODS];
			res.removeHeader(ALLOW);
			res.removeHeader(ACCESS_CONTROL_ALLOW_METHODS);
		}

		return [body, status, headers];
	}

	/**
	 * Registers OPTIONS middleware
	 * @param {...*} args - Middleware function(s)
	 * @returns {Woodland} Returns self for chaining
	 */
	options(...args) {
		return this.use(...args, OPTIONS);
	}

	/**
	 * Registers PATCH middleware
	 * @param {...*} args - Middleware function(s)
	 * @returns {Woodland} Returns self for chaining
	 */
	patch(...args) {
		return this.use(...args, PATCH);
	}

	/**
	 * Registers POST middleware
	 * @param {...*} args - Middleware function(s)
	 * @returns {Woodland} Returns self for chaining
	 */
	post(...args) {
		return this.use(...args, POST);
	}

	/**
	 * Registers PUT middleware
	 * @param {...*} args - Middleware function(s)
	 * @returns {Woodland} Returns self for chaining
	 */
	put(...args) {
		return this.use(...args, PUT);
	}

	/**
	 * Routes request to middleware
	 * @param {Object} req - HTTP request object
	 * @param {Object} res - HTTP response object
	 */
	route(req, res) {
		const method = req.method === HEAD ? GET : req.method;

		this.#decorate(req, res);

		if (this.listenerCount(EVT_CONNECT) > INT_0) {
			this.emit(EVT_CONNECT, req, res);
		}

		if (this.listenerCount(EVT_FINISH) > INT_0) {
			res.on(EVT_FINISH, () => this.emit(EVT_FINISH, req, res));
		}

		this.#logger.logRoute(req.parsed.pathname, req.method, req.ip);

		if (!req.cors && req.corsHost) {
			req.valid = false;
			res.error(INT_403, new Error(node_http.STATUS_CODES[INT_403]));
		} else if (req.allow.includes(method)) {
			this.#handleAllowedRoute(req, res, method);
		} else {
			req.valid = false;
			const newStatus = getStatus(req, res);
			res.error(newStatus, new Error(node_http.STATUS_CODES[newStatus]));
		}
	}

	/**
	 * Handles routing for allowed methods
	 * @param {Object} req - HTTP request object
	 * @param {Object} res - HTTP response object
	 * @param {string} method - Normalized HTTP method
	 */
	#handleAllowedRoute(req, res, method) {
		const result = this.#middleware.routes(req.parsed.pathname, method);

		if (result.params) {
			params(req, result.getParams);
		}

		const middleware = result.middleware;
		const exitIndex = result.exit;
		req.exit = next(req, res, middleware.slice(exitIndex)[Symbol.iterator](), true);
		next(req, res, middleware[Symbol.iterator]())();
	}

	/**
	 * Gets route information
	 * @param {string} uri - URI to check
	 * @param {string} method - HTTP method
	 * @param {boolean} [override=false] - Override cache
	 * @returns {Object} Route information
	 */
	routes(uri, method, override = false) {
		return this.#middleware.routes(uri, method, override);
	}

	/**
	 * Serves file from disk
	 * @param {Object} req - HTTP request object
	 * @param {Object} res - HTTP response object
	 * @param {string} arg - File path
	 * @param {string} [folder=process.cwd()] - Folder to serve from
	 * @returns {Promise} Promise that resolves when done
	 */
	/* node:coverage ignore next 3 */
	async serve(req, res, arg, folder = process.cwd()) {
		return this.#fileServer.serve(req, res, arg, folder);
	}

	/**
	 * Streams file to response
	 * @param {Object} req - HTTP request object
	 * @param {Object} res - HTTP response object
	 * @param {Object} file - File descriptor object
	 * @param {string} file.path - File path
	 * @param {string} file.etag - File ETag
	 * @param {string} file.charset - File charset
	 * @param {Object} file.stats - File statistics
	 * @param {number} file.stats.size - File size
	 * @param {Date} file.stats.mtime - File modification time
	 */
	stream(
		req,
		res,
		file = {
			charset: EMPTY,
			etag: EMPTY,
			path: EMPTY,
			stats: { mtime: new Date(), size: INT_0 },
		},
	) {
		stream(
			req,
			res,
			file,
			(req, res) => this.emit(EVT_STREAM, req, res),
			node_fs.createReadStream,
			this.#etags,
		);
	}

	/**
	 * Registers TRACE middleware
	 * @param {...*} args - Middleware function(s)
	 * @returns {Woodland} Returns self for chaining
	 */
	trace(...args) {
		return this.use(...args, TRACE);
	}

	/**
	 * Registers middleware for a route
	 * @param {string|Function} rpath - Route path or middleware function
	 * @param {...Function} fn - Middleware function(s)
	 * @param {string} [method='GET'] - HTTP method
	 * @returns {Woodland} Returns self for chaining
	 */
	use(rpath, ...fn) {
		this.#middleware.register(rpath, ...fn);
		this.#logger.logMiddleware(rpath, fn[fn.length - INT_1]);

		return this;
	}

	get logger() {
		return this.#logger;
	}
}

/**
 * Factory function to create a new Woodland instance
 * @param {Object} [arg={}] - Configuration object
 * @returns {Woodland} New Woodland instance
 */
function woodland(arg) {
	const app = new Woodland(arg);

	app.route = app.route.bind(app);

	return app;
}

exports.Woodland = Woodland;
exports.woodland = woodland;
