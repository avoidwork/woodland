/**
 * woodland
 *
 * @copyright 2026 Jason Mulligan <jason.mulligan@avoidwork.com>
 * @license BSD-3-Clause
 * @version 21.0.7
 */
import {STATUS_CODES}from'node:http';import {EventEmitter}from'node:events';import {readFileSync,createReadStream}from'node:fs';import {etag}from'tiny-etag';import {lru}from'tiny-lru';import {precise}from'precise';import {createRequire}from'node:module';import {join,extname,resolve}from'node:path';import {fileURLToPath,URL as URL$1}from'node:url';import mimeDb from'mime-db';import {coerce}from'tiny-coerce';import {Validator}from'jsonschema';import {stat,readdir}from'node:fs/promises';const __dirname$2 = fileURLToPath(new URL$1(".", import.meta.url));
const require$1 = createRequire(import.meta.url);
const { name, version } = require$1(join(__dirname$2, "..", "package.json"));

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
const FUNCTION = "function";
const STRING = "string";

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
const MSG_ROUTING_FILE = "Routing request to file system";
const MSG_SERVE_PATH_OUTSIDE = "Path outside allowed directory";
const MSG_VALIDATION_FAILED = "Configuration validation failed: ";
const SEMICOLON_SPACE = "; ";
const OPTIONS_BODY = "Make a GET request to retrieve the file";

// =============================================================================
// HTTP RANGE & CACHING
// =============================================================================
const KEY_BYTES = "bytes=";

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

const VALID_LOG_LEVELS = new Set([DEBUG, INFO, WARN, ERROR, CRITICAL, ALERT, EMERG, NOTICE]);const htmlEscapes = {
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
function partialHeaders(req, res, size, status, headers = {}, options = {}) {
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
function pipeable(method, arg) {
	return method !== HEAD && arg !== null && arg !== undefined && typeof arg.on === FUNCTION;
}

/**
 * Writes HTTP response headers using writeHead method
 * @param {Object} res - The HTTP response object
 * @param {Object} [headers={}] - Headers object to write
 */
function writeHead(res, headers = {}) {
	res.writeHead(res.statusCode, STATUS_CODES[res.statusCode], headers);
}

/**
 * Gets MIME type for file extension
 * @param {string} [arg=""] - File path or extension
 * @returns {string} MIME type string
 */
function mime(arg = EMPTY) {
	const ext = extname(arg);

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
	if (req.allow.includes(GET) === false) {
		return INT_404;
	}
	return res.statusCode > INT_500 ? res.statusCode : INT_500;
}

function getStatusText(status) {
	return STATUS_CODES[status] || STATUS_CODES[INT_500];
}

/**
 * Error response handler
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {number} [status=500] - HTTP status code
 */
function error(req, res, status = res.statusCode) {
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
function json(
	res,
	arg,
	status = res.statusCode,
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
function redirect(res, uri, perm = true) {
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
function send(
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
				body.on(ERROR, (_err) => res.error(INT_500)).pipe(res);
			} else {
				res.error(INT_416);
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

	if (req.method === "GET") {
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
function escapeHtml(str = EMPTY) {
	return str.replace(/[&<>"']/g, (match) => htmlEscapes[match]);
}/**
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

	for (let i = 0; i < keyCount; i++) {
		const key = keys[i];
		const value = groups[key];

		if (value === null || value === undefined) {
			processedParams[key] = coerce(null);
		} else {
			let decoded;
			if (value.indexOf(PERCENT) === -1) {
				decoded = value;
			} else {
				try {
					decoded = decodeURIComponent(value);
				} catch {
					decoded = value;
				}
			}

			processedParams[key] = coerce(escapeHtml(decoded));
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
	return new URL(
		typeof arg === STRING
			? arg
			: `${HTTP_PREFIX}${arg.headers.host || `localhost:${arg.socket?.server?._connectionKey?.replace(/.*::/, EMPTY) || String(INT_8000)}`}${arg.url}`,
	);
}

/**
 * Converts parameterized route path to regex pattern
 * @param {string} path - Route path with parameters (e.g., "/users/:id")
 * @returns {string} Regex pattern string
 */
function extractPath(path) {
	return path.replace(/:([a-zA-Z_]\w*)/g, "(?<$1>[^/]+)");
}

const IPV4_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/,
	IPV6_CHAR_PATTERN = /^[0-9a-fA-F:.]+$/,
	IPV4_MAPPED_PATTERN = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i,
	HEX_GROUP_PATTERN = /^[0-9a-fA-F]{1,4}$/;

/**
 * Validates if an IP address is properly formatted
 * @param {string} ip - IP address to validate
 * @returns {boolean} True if IP is valid format
 */
function isValidIP(ip) {
	if (!ip || typeof ip !== "string") {
		return false;
	}

	if (ip.indexOf(COLON) === -1) {
		const match = IPV4_PATTERN.exec(ip);

		if (!match) {
			return false;
		}

		for (let i = 1; i < INT_5; i++) {
			const num = parseInt(match[i], INT_10);
			if (num > INT_255) {
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

	if (ip === DOUBLE_COLON) {
		return true;
	}

	const doubleColonIndex = ip.indexOf(DOUBLE_COLON);
	const isCompressed = doubleColonIndex !== -1;

	if (isCompressed) {
		if (ip.indexOf(DOUBLE_COLON, doubleColonIndex + INT_2) !== -1) {
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

		let leftGroups;
		if (beforeDoubleColon) {
			leftGroups = beforeDoubleColon.split(COLON);
		} else {
			leftGroups = [];
		}

		let rightGroups;
		if (afterDoubleColon) {
			rightGroups = afterDoubleColon.split(COLON);
		} else {
			rightGroups = [];
		}

		const nonEmptyLeft = leftGroups.filter((g) => g !== EMPTY);
		const nonEmptyRight = rightGroups.filter((g) => g !== EMPTY);
		const totalGroups = nonEmptyLeft.length + nonEmptyRight.length;

		if (totalGroups >= INT_8) {
			return false;
		}

		/* node:coverage ignore next 5 */
		for (let i = INT_0; i < nonEmptyLeft.length; i++) {
			if (!HEX_GROUP_PATTERN.test(nonEmptyLeft[i])) {
				return false;
			}
		}

		/* node:coverage ignore next 5 */
		for (let i = INT_0; i < nonEmptyRight.length; i++) {
			if (!HEX_GROUP_PATTERN.test(nonEmptyRight[i])) {
				return false;
			}
		}

		return true;
	} else {
		const groups = ip.split(COLON);
		if (groups.length !== INT_8) {
			return false;
		}

		/* node:coverage ignore next 5 */
		for (let i = INT_0; i < INT_8; i++) {
			if (!groups[i] || !HEX_GROUP_PATTERN.test(groups[i])) {
				return false;
			}
		}

		return true;
	}
}/**
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

	for (let i = 0; i < len; i++) {
		const middleware = values[i];
		middleware.regex.lastIndex = 0;

		if (middleware.regex.test(uri)) {
			const handlers = middleware.handlers;
			const handlerLen = handlers.length;

			if (handlerLen === 1) {
				middlewareArray.push(handlers[0]);
			} else {
				for (let j = 0; j < handlerLen; j++) {
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

const ERROR_HANDLER_LENGTH = 4;

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

		while (obj.done === false && obj.value && obj.value.length !== ERROR_HANDLER_LENGTH) {
			obj = middleware.next();
		}

		if (obj.done === false && obj.value) {
			obj.value(err, req, res, nextFn);
		} else {
			const newStatus = getStatus(req, res);
			res.error(newStatus, new Error(STATUS_CODES[newStatus]));
		}
	};

	/**
	 * Handles regular middleware execution
	 * @param {Function} nextFn - Next function for chain
	 */
	const handleMiddleware = (nextFn) => {
		const obj = middleware.next();

		if (obj.done === false) {
			const value = obj.value;
			if (typeof value === FUNCTION) {
				value(req, res, nextFn);
			} else {
				res.send(value);
			}
		} else {
			const newStatus = getStatus(req, res);
			res.error(newStatus, new Error(STATUS_CODES[newStatus]));
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
	const cached = override === false ? cache.get(key) : void 0;
	let result;

	if (cached !== void 0) {
		result = cached;
	} else {
		result = { getParams: null, middleware: [], params: false, visible: 0, exit: -1 };
		reduce(uri, middleware.get(WILDCARD) ?? new Map(), result);

		if (method !== WILDCARD) {
			result.exit = result.middleware.length;
			reduce(uri, middleware.get(method) ?? new Map(), result);
		}

		let visible = 0;
		for (let i = 0; i < result.middleware.length; i++) {
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
function listRoutes(middleware, method = GET.toLowerCase(), type = "array") {
	let result;
	const methodMap = middleware.get(method.toUpperCase());

	if (type === "array") {
		result = [...methodMap.keys()];
	} else if (type === "object") {
		result = {};
		const entries = Array.from(methodMap.entries());
		const entryCount = entries.length;

		for (let i = 0; i < entryCount; i++) {
			const [key, value] = entries[i];
			result[key] = value;
		}
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
 * @param {Array} methods - Array of registered HTTP methods
 * @param {Object|Map} cache - Cache for route results
 * @returns {Object} Registry object with ignore, allowed, routes, register, list methods
 */
function createMiddlewareRegistry(methods, cache) {
	const middleware = new Map();
	const ignored = new Set();

	return {
		ignore: (f) => {
			ignored.add(f);
		},
		allowed: (m, u, o) => checkAllowed(middleware, ignored, cache, m, u, o),
		routes: (u, m, o) => computeRoutes(middleware, ignored, u, m, cache, o),
		register: (p, ...fns) => registerMiddleware(middleware, ignored, methods, cache, p, ...fns),
		list: (m, t) => listRoutes(middleware, m, t),
	};
}

/**
 * Registers middleware for a route
 * @param {Map} middleware - Map of middleware by method
 * @param {Set} ignored - Set of ignored middleware functions
 * @param {Array} methods - Array of registered HTTP methods
 * @param {Object|Map} cache - Cache for route results
 * @param {string|Function} rpath - Route path or middleware function
 * @param {...Function} fn - Middleware functions to register
 */
function registerMiddleware(middleware, ignored, methods, cache, rpath, ...fn) {
	if (rpath === void 0) {
		return;
	}

	if (typeof rpath === FUNCTION) {
		fn = [rpath, ...fn];
		rpath = `/.${WILDCARD}`;
	}

	const method = typeof fn[fn.length - 1] === STRING ? fn.pop().toUpperCase() : GET;

	if (method !== WILDCARD && NODE_METHODS.includes(method) === false) {
		throw new TypeError("Invalid HTTP method");
	}

	if (method === HEAD) {
		throw new TypeError("Cannot set HEAD route, use GET");
	}

	if (middleware.has(method) === false) {
		if (method !== WILDCARD) {
			methods.push(method);
		}

		middleware.set(method, new Map());
	}

	const mmethod = middleware.get(method);
	let lrpath = rpath,
		lparams = false;

	if (lrpath.includes(`${SLASH}${LEFT_PAREN}`) === false && lrpath.includes(`${SLASH}:`)) {
		lparams = true;
		lrpath = extractPath(lrpath);
	}

	const current = mmethod.get(lrpath) ?? { handlers: [] };

	current.handlers.push(...fn);
	mmethod.set(lrpath, {
		handlers: current.handlers,
		params: lparams,
		regex: new RegExp(`^${lrpath}$`),
	});
}const DEFAULTS = {
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
	type: "object",
	properties: {
		autoIndex: { type: "boolean" },
		cacheSize: { type: "number", minimum: INT_1 },
		cacheTTL: { type: "number", minimum: INT_1 },
		charset: { type: "string" },
		corsExpose: { type: "string" },
		defaultHeaders: { type: "object" },
		digit: { type: "number", minimum: INT_1, maximum: INT_10 },
		etags: { type: "boolean" },
		indexes: { type: "array", items: { type: "string" } },
		logging: { type: "object" },
		origins: { type: "array", items: { type: "string" } },
		silent: { type: "boolean" },
		time: { type: "boolean" },
	},
	additionalProperties: false,
};

const validator = new Validator();

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

			if (msg.includes("is not of a type(s)")) {
				const types = msg.match(/type\(s\) ([a-z, ]+)/i);
				const type = types ? types[1].split(",")[0].trim() : "type";
				msg = `must be ${type}`;
			} else if (msg.includes("must be greater than or equal to")) {
				const val = msg.match(/greater than or equal to (\d+)/);
				msg = val ? `must be >= ${val[1]}` : msg;
			} else if (msg.includes("must be less than or equal to")) {
				const val = msg.match(/less than or equal to (\d+)/);
				msg = val ? `must be <= ${val[1]}` : msg;
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
		return { enabled, format, level: INFO };
	}

	return { enabled, format, level };
}/**
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
}const __dirname$1 = fileURLToPath(new URL(".", import.meta.url));
const html = readFileSync(join(__dirname$1, "..", "tpl", "index.html"), {
	encoding: UTF8,
});

/**
 * Generates an HTML index page for directory listings
 * @param {string} [title=""] - The title for the index page
 * @param {Array} [files=[]] - Array of file objects from fs.readdir with withFileTypes: true
 * @returns {string} The complete HTML string for the index page
 */
function autoIndex(title = EMPTY, files = []) {
	const safeTitle = escapeHtml(title);

	if (files.length === 0) {
		return html.replace(/\$\{\s*(TITLE|FILES)\s*\}/g, (match, key) => {
			return key === "TITLE" ? safeTitle : `    <li><a href=".." rel="${COLLECTION}">../</a></li>`;
		});
	}

	const listItems = Array.from({ length: files.length + 1 });
	listItems[0] = `    <li><a href=".." rel="${COLLECTION}">../</a></li>`;

	const fileCount = files.length;
	for (let i = 0; i < fileCount; i++) {
		const file = files[i];
		const fileName = file.name;
		const safeName = escapeHtml(fileName);
		const safeHref = encodeURIComponent(fileName);
		const isDir = file.isDirectory();

		listItems[i + 1] = isDir
			? `    <li><a href="${safeHref}/" rel="${COLLECTION}">${safeName}/</a></li>`
			: `    <li><a href="${safeHref}" rel="${ITEM}">${safeName}</a></li>`;
	}

	const safeFiles = listItems.join("\n");

	return html.replace(/\$\{\s*(TITLE|FILES)\s*\}/g, (match, key) =>
		key === "TITLE" ? safeTitle : safeFiles,
	);
}

/**
 * Serves files from filesystem
 * @param {Object} app - Woodland application instance
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {string} arg - File path argument
 * @param {string} [folder=process.cwd()] - Root folder to serve from
 */
async function serve(app, req, res, arg, folder = process.cwd()) {
	const fp = resolve(folder, arg);
	const resolvedFolder = resolve(folder);

	if (!fp.startsWith(resolvedFolder)) {
		app.logger.logServe(req, MSG_SERVE_PATH_OUTSIDE);
		res.error(INT_403, new Error(STATUS_CODES[INT_403]));

		return;
	}

	let valid = true;
	let stats;

	app.logger.logServe(req, MSG_ROUTING_FILE);

	try {
		stats = await stat(fp, { bigint: false });
	} catch {
		valid = false;
	}

	if (!valid) {
		res.error(INT_404, new Error(STATUS_CODES[INT_404]));
	} else if (!stats.isDirectory()) {
		app.stream(req, res, {
			charset: app.charset,
			etag: app.etag(req.method, stats.ino, stats.size, stats.mtimeMs),
			path: fp,
			stats: stats,
		});
	} else if (!req.parsed.pathname.endsWith(SLASH)) {
		res.redirect(`${req.parsed.pathname}/${req.parsed.search}`);
	} else {
		const files = await readdir(fp, { encoding: UTF8, withFileTypes: true });
		let result = EMPTY;

		const indexes = app.indexes;
		for (let i = 0; i < files.length; i++) {
			const file = files[i];
			if (indexes.includes(file.name)) {
				result = join(fp, file.name);
				break;
			}
		}

		if (!result.length) {
			if (!app.autoIndex) {
				res.error(INT_404, new Error(STATUS_CODES[INT_404]));
			} else {
				const body = autoIndex(decodeURIComponent(req.parsed.pathname), files);
				res.header(CONTENT_TYPE, `${TEXT_HTML}; charset=${app.charset}`);
				res.send(body);
			}
		} else {
			const rstats = await stat(result, { bigint: false });

			app.stream(req, res, {
				charset: app.charset,
				etag: app.etag(req.method, rstats.ino, rstats.size, rstats.mtimeMs),
				path: result,
				stats: rstats,
			});
		}
	}
}

/**
 * Registers file serving middleware for a root path
 * @param {Object} app - Woodland application instance
 * @param {string} root - Root path to register
 * @param {string} folder - Folder to serve files from
 * @param {Function} useMiddleware - Middleware registration function
 */
function register(app, root, folder, useMiddleware) {
	useMiddleware(`${root.replace(/\/$/, EMPTY)}/(.*)?`, (req, res) =>
		serve(app, req, res, req.parsed.pathname.substring(1), folder),
	);
}

/**
 * Creates file server middleware for serving static files
 * @param {Object} app - Woodland application instance
 * @returns {Object} File server with register, serve methods
 */
function createFileServer(app) {
	return {
		register: (root, folder, useMiddleware) =>
			register(app, root, folder, useMiddleware || app.use.bind(app)),
		serve: (req, res, arg, folder) => serve(app, req, res, arg, folder),
	};
}/**
 * Woodland HTTP server framework class extending EventEmitter
 * @class
 * @extends {EventEmitter}
 */
class Woodland extends EventEmitter {
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
		const {
			autoIndex,
			cacheSize,
			cacheTTL,
			charset,
			corsExpose,
			defaultHeaders,
			digit,
			etags,
			indexes,
			logging,
			origins,
			silent,
			time,
		} = validated;

		const finalHeaders = { ...defaultHeaders };
		if (!silent) {
			if (!(SERVER in finalHeaders)) {
				finalHeaders[SERVER] = SERVER_VALUE;
			}
			finalHeaders[X_POWERED_BY] = X_POWERED_BY_VALUE;
		}

		this.autoIndex = autoIndex;
		this.charset = charset;
		this.corsExpose = corsExpose;
		this.defaultHeaders = Reflect.ownKeys(finalHeaders).map((key) => [
			key.toLowerCase(),
			finalHeaders[key],
		]);
		this.digit = digit;
		this.etags = etags ? etag({ cacheSize, cacheTTL }) : null;
		this.indexes = [...indexes];
		this.logging = validateLogging(logging);
		this.origins = new Set(origins);
		this.time = time;
		this.cache = lru(cacheSize, cacheTTL);
		this.permissions = new Map();
		this.methods = [];
		this.logger = createLogger({
			enabled: this.logging.enabled,
			format: this.logging.format,
			level: this.logging.level,
		});
		this.fileServer = createFileServer(this);
		this.middleware = createMiddlewareRegistry(this.methods, this.cache);

		if (this.etags !== null) {
			this.get(this.etags.middleware).ignore(this.etags.middleware);
		}

		if (this.origins.size > INT_0) {
			const fnCorsRequest = corsRequest();
			this.options(fnCorsRequest).ignore(fnCorsRequest);
		}

		this.on(ERROR, (req, _res, _error) =>
			this.logger.logError(req.parsed.pathname, req.method, req.ip),
		);
	}

	/**
	 * Checks if a method is allowed for a URI
	 * @param {string} method - HTTP method
	 * @param {string} uri - URI to check
	 * @param {boolean} [override=false] - Override cache
	 * @returns {boolean} True if method is allowed
	 */
	allowed(method, uri, override = false) {
		return this.middleware.allowed(method, uri, override);
	}

	/**
	 * Determines allowed methods for a URI
	 * @param {string} uri - URI to check
	 * @param {boolean} [override=false] - Override cache
	 * @returns {string} Comma-separated list of allowed methods
	 */
	allows(uri, override = false) {
		let result = override === false ? this.permissions.get(uri) : void 0;

		if (override || result === void 0) {
			const methodSet = new Set();

			for (let i = 0; i < this.methods.length; i++) {
				if (this.allowed(this.methods[i], uri, override)) {
					methodSet.add(this.methods[i]);
				}
			}

			const list = [...methodSet];

			if (list.length > 0) {
				if (methodSet.has(GET) && !methodSet.has(HEAD)) {
					list.push(HEAD);
				}

				if (!methodSet.has(OPTIONS)) {
					list.push(OPTIONS);
				}
			}

			result = list.sort().join(COMMA_SPACE);
			this.permissions.set(uri, result);
			this.logger.log(
				`type=allows, uri=${uri}, override=${override}, message="Determined 'allow' header value"`,
			);
		}

		return result;
	}

	/**
	 * Registers wildcard middleware for all methods
	 * @param {...*} args - Middleware function(s)
	 * @returns {Woodland} Returns self for chaining
	 */
	always(...args) {
		for (let i = 0; i < args.length; i++) {
			this.middleware.ignore(args[i]);
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
	decorate(req, res) {
		const timing = this.time ? precise().start() : null;
		const parsed = parse(req);
		const allowString = this.allows(parsed.pathname);
		const clientIP = extractIP(req);
		const headersBatch = Object.create(null);
		headersBatch[ALLOW] = allowString;
		headersBatch[X_CONTENT_TYPE_OPTIONS] = NO_SNIFF;

		const defaultHeaders = this.defaultHeaders;
		const headerCount = defaultHeaders.length;
		for (let i = 0; i < headerCount; i++) {
			const [key, value] = defaultHeaders[i];
			headersBatch[key] = value;
		}

		req.corsHost = corsHost(req);
		req.cors = cors(req, this.origins);
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
			const origin = req.headers.origin;
			const corsHeaders = req.headers[ACCESS_CONTROL_REQUEST_HEADERS] ?? this.corsExpose;

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

		res.locals = {};
		res.error = (status = res.statusCode, body) => {
			error(req, res, status);
			const err = body instanceof Error ? body : new Error(body ?? getStatusText(status));
			this.emit(EVT_ERROR, req, res, err);
			res.send(err.message);
		};
		res.header = res.setHeader;
		res.json = (
			arg,
			status = res.statusCode,
			headers = { [CONTENT_TYPE]: `${APPLICATION_JSON}; charset=utf-8` },
		) => json(res, arg, status, headers);
		res.redirect = (uri, perm = true) => redirect(res, uri, perm);
		res.send = (body = EMPTY, status = res.statusCode, headers = {}) =>
			send(req, res, body, status, headers, this.onReady.bind(this), this.onDone.bind(this));
		res.set = (arg = {}) => set(res, arg);
		res.status = (arg = INT_200) => status(res, arg);

		res.set(headersBatch);
		res.on(EVT_CLOSE, () => this.logger.log(this.logger.clf(req, res), INFO));
		this.logger.log(
			`type=decorate, uri=${parsed.pathname}, method=${req.method}, ip=${clientIP}, message="Decorated request from ${clientIP}"`,
		);
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
		return (method === GET || method === HEAD || method === OPTIONS) && this.etags !== null
			? this.etags.create(
					args
						.map((i) => (typeof i !== STRING ? JSON.stringify(i).replace(/^"|"$/g, EMPTY) : i))
						.join(HYPHEN),
				)
			: EMPTY;
	}

	/**
	 * Registers file server middleware
	 * @param {string} [root='/'] - Root path
	 * @param {string} [folder=process.cwd()] - Folder to serve
	 * @returns {Woodland} Returns self for chaining
	 */
	files(root = SLASH, folder = process.cwd()) {
		this.fileServer.register(root, folder, this.use.bind(this));
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
		this.middleware.ignore(fn);
		this.logger.log(`type=ignore, message="Added function to ignored Set", name="${fn.name}"`);

		return this;
	}

	/**
	 * Lists middleware routes
	 * @param {string} [method='GET'] - HTTP method
	 * @param {string} [type='array'] - Return type (array or object)
	 * @returns {Array|Object} List of routes
	 */
	list(method = GET.toLowerCase(), type = "array") {
		const result = this.middleware.list(method, type);
		this.logger.log(`type=list, method=${method}, type=${type}`);

		return result;
	}

	/**
	 * Handles response done event
	 * @param {Object} req - HTTP request object
	 * @param {Object} res - HTTP response object
	 * @param {string} body - Response body
	 * @param {Object} headers - Response headers
	 */
	onDone(req, res, body, headers) {
		if (
			res.statusCode !== INT_204 &&
			res.statusCode !== INT_304 &&
			res.getHeader(CONTENT_LENGTH) === void 0
		) {
			res.header(CONTENT_LENGTH, Buffer.byteLength(body));
		}

		writeHead(res, headers);
		res.end(body, this.charset);
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
	onReady(req, res, body, status, headers) {
		if (this.time && res.getHeader(X_RESPONSE_TIME) === void 0) {
			const diff = req.precise.stop().diff();
			const msValue = Number(diff / 1e6).toFixed(this.digit);
			res.header(X_RESPONSE_TIME, `${msValue} ms`);
		}

		return this.onSend(req, res, body, status, headers);
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
	onSend(req, res, body, status, headers) {
		if (status === 404) {
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

		this.decorate(req, res);

		if (this.listenerCount(EVT_CONNECT) > INT_0) {
			this.emit(EVT_CONNECT, req, res);
		}

		if (this.listenerCount(EVT_FINISH) > INT_0) {
			res.on(EVT_FINISH, () => this.emit(EVT_FINISH, req, res));
		}

		this.logger.logRoute(req.parsed.pathname, req.method, req.ip);

		const hasOriginHeader = ORIGIN in req.headers;
		const origin = hasOriginHeader ? req.headers.origin : EMPTY;
		const isOriginAllowed = hasOriginHeader && this.origins.has(origin);

		if (req.cors === false && hasOriginHeader && req.corsHost && !isOriginAllowed) {
			req.valid = false;
			res.error(INT_403, new Error(STATUS_CODES[INT_403]));
		} else if (req.allow.includes(method)) {
			const result = this.middleware.routes(req.parsed.pathname, method);

			if (result.params) {
				params(req, result.getParams);
			}

			const middleware = result.middleware;
			const exitIndex = result.exit;
			req.exit = next(req, res, middleware.slice(exitIndex)[Symbol.iterator](), true);
			next(req, res, middleware[Symbol.iterator]())();
		} else {
			req.valid = false;
			const newStatus = getStatus(req, res);
			res.error(newStatus, new Error(STATUS_CODES[newStatus]));
		}
	}

	/**
	 * Gets route information
	 * @param {string} uri - URI to check
	 * @param {string} method - HTTP method
	 * @param {boolean} [override=false] - Override cache
	 * @returns {Object} Route information
	 */
	routes(uri, method, override = false) {
		return this.middleware.routes(uri, method, override);
	}

	/**
	 * Serves file from disk
	 * @param {Object} req - HTTP request object
	 * @param {Object} res - HTTP response object
	 * @param {string} arg - File path
	 * @param {string} [folder=process.cwd()] - Folder to serve from
	 * @returns {Promise} Promise that resolves when done
	 */
	async serve(req, res, arg, folder = process.cwd()) {
		return this.fileServer.serve(req, res, arg, folder);
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
			createReadStream,
			this.etags,
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
		this.middleware.register(rpath, ...fn);
		this.logger.logMiddleware(rpath, fn[fn.length - 1]);

		return this;
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
}export{Woodland,woodland};