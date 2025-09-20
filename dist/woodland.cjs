/**
 * woodland
 *
 * @copyright 2025 Jason Mulligan <jason.mulligan@avoidwork.com>
 * @license BSD-3-Clause
 * @version 20.2.10
 */
'use strict';

var node_http = require('node:http');
var node_path = require('node:path');
var node_events = require('node:events');
var promises = require('node:fs/promises');
var node_fs = require('node:fs');
var tinyEtag = require('tiny-etag');
var precise = require('precise');
var tinyLru = require('tiny-lru');
var node_module = require('node:module');
var node_url = require('node:url');
var tinyCoerce = require('tiny-coerce');
var mimeDb = require('mime-db');

var _documentCurrentScript = typeof document !== 'undefined' ? document.currentScript : null;
const __dirname$2 = node_url.fileURLToPath(new node_url.URL(".", (typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === 'SCRIPT' && _documentCurrentScript.src || new URL('woodland.cjs', document.baseURI).href))));
const require$1 = node_module.createRequire((typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === 'SCRIPT' && _documentCurrentScript.src || new URL('woodland.cjs', document.baseURI).href)));
const {name, version} = require$1(node_path.join(__dirname$2, "..", "package.json"));

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

// =============================================================================
// HTTP STATUS CODES
// =============================================================================
const INT_200 = 200;
const INT_204 = 204;
const INT_206 = 206;
const INT_304 = 304;
const INT_307 = 307;
const INT_308 = 308;
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
const UTF8 = "utf8";
const UTF_8 = "utf-8";

// =============================================================================
// SERVER & SYSTEM INFO
// =============================================================================
const SERVER_VALUE = `${name}/${version}`;
const X_POWERED_BY_VALUE = `nodejs/${process.version}, ${process.platform}/${process.arch}`;

// =============================================================================
// FILE SYSTEM & ROUTING
// =============================================================================
const INDEX_HTM = "index.htm";
const INDEX_HTML = "index.html";
const EXTENSIONS = "extensions";
const PARAMS_GROUP = "/(?<$1>[^/]+)";

// =============================================================================
// NUMERIC CONSTANTS
// =============================================================================
const INT_0 = 0;
const INT_2 = 2;
const INT_3 = 3;
const INT_4 = 4;
const INT_10 = 10;
const INT_60 = 60;
const INT_1e3 = 1e3;
const INT_1e4 = 1e4;
const INT_1e6 = 1e6;

// =============================================================================
// STRING & CHARACTER CONSTANTS
// =============================================================================
const COLON = ":";
const COMMA = ",";
const COMMA_SPACE = ", ";
const DELIMITER = "|";
const EMPTY = "";
const HYPHEN = "-";
const LEFT_PAREN = "(";
const SLASH = "/";
const STRING_0 = "0";
const WILDCARD = "*";

// =============================================================================
// DATA TYPES
// =============================================================================
const ARRAY = "array";
const FUNCTION = "function";
const OBJECT = "object";
const STRING = "string";

// =============================================================================
// LOGGING & DEBUGGING
// =============================================================================
const DEBUG = "debug";
const ERROR = "error";
const INFO = "info";
const LOG = "log";

const LEVELS = Object.freeze({
	emerg: 0,
	alert: 1,
	crit: 2,
	error: 3,
	warn: 4,
	notice: 5,
	info: 6,
	debug: 7
});

// Log format tokens
const LOG_B = "%b";
const LOG_FORMAT = "%h %l %u %t \"%r\" %>s %b";
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
const MSG_DECORATED_IP = "Decorated request from %IP";
const MSG_DETERMINED_ALLOW = "Determined 'allow' header value";
const MSG_ERROR_HEAD_ROUTE = "Cannot set HEAD route, use GET";
const MSG_ERROR_INVALID_METHOD = "Invalid HTTP method";
const MSG_ERROR_IP = "Handled error response for %IP";
const MSG_IGNORED_FN = "Added function to ignored Set";
const MSG_REGISTERING_MIDDLEWARE = "Registering middleware";
const MSG_RETRIEVED_MIDDLEWARE = "Retrieved middleware for request";
const MSG_ROUTING = "Routing request";
const MSG_ROUTING_FILE = "Routing request to file system";
const MSG_SENDING_BODY = "Sending response body";

const OPTIONS_BODY = "Make a GET request to retrieve the file";

// =============================================================================
// HTTP RANGE & CACHING
// =============================================================================
const KEY_BYTES = "bytes=";

// =============================================================================
// EVENT & STREAM CONSTANTS
// =============================================================================
const CLOSE = "close";
const FINISH = "finish";
const STREAM = "stream";

// =============================================================================
// UTILITY & MISC
// =============================================================================
const EN_US = "en-US";
const IP_TOKEN = "%IP";
const SHORT = "short";
const TIME_MS = "%N ms";
const TOKEN_N = "%N";
const TO_STRING = "toString";
const TRUE = "true";

const MONTHS = Object.freeze(Array.from(Array(12).values()).map((i, idx) => {
	const d = new Date();
	d.setMonth(idx);

	return Object.freeze(d.toLocaleString(EN_US, {month: SHORT}));
}));

const __dirname$1 = node_url.fileURLToPath(new node_url.URL(".", (typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === 'SCRIPT' && _documentCurrentScript.src || new URL('woodland.cjs', document.baseURI).href)))),
	html = node_fs.readFileSync(node_path.join(__dirname$1, "..", "tpl", "autoindex.html"), {encoding: UTF8}),
	valid = Object.entries(mimeDb).filter(i => EXTENSIONS in i[1]),
	extensions = valid.reduce((a, v) => {
		const result = Object.assign({type: v[0]}, v[1]);

		for (const key of result.extensions) {
			a[`.${key}`] = result;
		}

		return a;
	}, {});

/**
 * Escapes HTML special characters to prevent XSS attacks
 * @param {string} [str=""] - The string to escape
 * @returns {string} The escaped string with HTML entities
 */
function escapeHtml (str = EMPTY) {
	// Use lookup table for single-pass replacement
	const htmlEscapes = {
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		'"': "&quot;",
		"'": "&#39;"
	};

	return str.replace(/[&<>"']/g, match => htmlEscapes[match]);
}

/**
 * Generates an HTML autoindex page for directory listings
 * @param {string} [title=""] - The title for the autoindex page
 * @param {Array} [files=[]] - Array of file objects from fs.readdir with withFileTypes: true
 * @returns {string} The complete HTML string for the autoindex page
 */
function autoindex (title = EMPTY, files = []) {
	const safeTitle = escapeHtml(title);

	// Optimized: Fast path for empty files array
	if (files.length === 0) {
		return html.replace(/\$\{\s*(TITLE|FILES)\s*\}/g, (match, key) => {
			return key === "TITLE" ? safeTitle : "    <li><a href=\"..\" rel=\"collection\">../</a></li>";
		});
	}

	// Pre-allocate array for better performance
	const listItems = new Array(files.length + 1);
	listItems[0] = "    <li><a href=\"..\" rel=\"collection\">../</a></li>";

	// Optimized: Cache file count and optimize loop
	const fileCount = files.length;
	for (let i = 0; i < fileCount; i++) {
		const file = files[i];
		const fileName = file.name;
		const safeName = escapeHtml(fileName);
		const safeHref = encodeURIComponent(fileName);
		const isDir = file.isDirectory();

		// Optimized: Use ternary operator for better performance
		listItems[i + 1] = isDir ?
			`    <li><a href="${safeHref}/" rel="collection">${safeName}/</a></li>` :
			`    <li><a href="${safeHref}" rel="item">${safeName}</a></li>`;
	}

	const safeFiles = listItems.join("\n");

	// Optimized: Cache replace callback for reuse
	const replaceCallback = (match, key) => key === "TITLE" ? safeTitle : safeFiles;

	return html.replace(/\$\{\s*(TITLE|FILES)\s*\}/g, replaceCallback);
}

/**
 * Determines the appropriate HTTP status code based on request and response state
 * @param {Object} req - The HTTP request object
 * @param {Object} res - The HTTP response object
 * @returns {number} The appropriate HTTP status code
 */
function getStatus (req, res) {
	// No allowed methods - always 404
	if (req.allow.length === INT_0) {
		return INT_404;
	}

	// Method not allowed
	if (req.method !== GET) {
		return INT_405;
	}

	// GET method not allowed
	if (!req.allow.includes(GET)) {
		return INT_404;
	}

	// Return existing error status or default 500
	return res.statusCode > INT_500 ? res.statusCode : INT_500;
}

/**
 * Gets the MIME type for a file based on its extension
 * @param {string} [arg=""] - The filename or path to get the MIME type for
 * @returns {string} The MIME type or application/octet-stream as default
 */
function mime (arg = EMPTY) {
	const ext = node_path.extname(arg);

	return ext in extensions ? extensions[ext].type : APPLICATION_OCTET_STREAM;
}

/**
 * Formats a time value in milliseconds with specified precision
 * @param {number} [arg=0] - The time value in nanoseconds
 * @param {number} [digits=3] - Number of decimal places for precision
 * @returns {string} Formatted time string with "ms" suffix
 */
function ms (arg = INT_0, digits = INT_3) {
	return TIME_MS.replace(TOKEN_N, Number(arg / INT_1e6).toFixed(digits));
}

/**
 * Creates a next function for middleware processing with error handling
 * @param {Object} req - The HTTP request object
 * @param {Object} res - The HTTP response object
 * @param {Iterator} middleware - The middleware iterator
 * @param {boolean} [immediate=false] - Whether to execute immediately or on next tick
 * @returns {Function} The next function for middleware chain
 */
function next (req, res, middleware, immediate = false) {
	// Optimized: Pre-calculate getStatus to avoid repeated function calls
	const errorStatus = getStatus(req, res);

	const internalFn = (err, fn) => {
		let obj = middleware.next();

		if (obj.done === false) {
			if (err !== void 0) {
				// Optimized: Find error handler more efficiently
				while (obj.done === false && obj.value && obj.value.length < 4) {
					obj = middleware.next();
				}

				if (obj.done === false && obj.value) {
					obj.value(err, req, res, fn);
				} else {
					res.error(errorStatus);
				}
			} else {
				const value = obj.value;
				// Optimized: Check function type once and reuse result
				if (typeof value === FUNCTION) {
					value(req, res, fn);
				} else {
					res.send(value);
				}
			}
		} else {
			res.error(errorStatus);
		}
	};

	// Optimized: Create function based on immediate flag without conditional in hot path
	const fn = immediate ?
		err => internalFn(err, fn) :
		err => process.nextTick(() => internalFn(err, fn));

	return fn;
}

/**
 * Pads a number with leading zeros to make it 2 digits
 * @param {number} [arg=0] - The number to pad
 * @returns {string} The padded string representation
 */
function pad (arg = INT_0) {
	return String(arg).padStart(INT_2, STRING_0);
}

/**
 * Extracts and processes URL parameters from request path
 * @param {Object} req - The HTTP request object
 * @param {RegExp} getParams - Regular expression for parameter extraction
 */
function params (req, getParams) {
	getParams.lastIndex = INT_0;
	const match = getParams.exec(req.parsed.pathname);
	const groups = match?.groups;

	if (!groups) {
		req.params = {};

		return;
	}

	// Optimized: Use Object.create(null) for faster parameter object
	const processedParams = Object.create(null);
	const keys = Object.keys(groups);
	const keyCount = keys.length;

	// Optimized: Use standard for loop for better performance
	for (let i = 0; i < keyCount; i++) {
		const key = keys[i];
		const value = groups[key];

		// Optimized: Avoid repeated calls to escapeHtml and coerce
		if (value === null || value === undefined) {
			processedParams[key] = tinyCoerce.coerce(null);
		} else {
			// Optimized URL decoding with fast path for common cases
			let decoded;
			if (value.indexOf("%") === -1) {
				// Fast path: no URL encoding
				decoded = value;
			} else {
				try {
					decoded = decodeURIComponent(value);
				} catch {
					decoded = value;
				}
			}

			processedParams[key] = tinyCoerce.coerce(escapeHtml(decoded));
		}
	}

	req.params = processedParams;
}

/**
 * Parses a URL string or request object into a URL object with security checks
 * @param {string|Object} arg - URL string or request object to parse
 * @returns {URL} Parsed URL object
 */
function parse (arg) {
	return new node_url.URL(typeof arg === STRING ? arg : `http://${arg.headers.host || `localhost:${arg.socket?.server?._connectionKey?.replace(/.*::/, EMPTY) || "8000"}`}${arg.url}`);
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
function partialHeaders (req, res, size, status, headers = {}, options = {}) {
	const rangeHeader = req.headers.range;

	if (!rangeHeader || !rangeHeader.startsWith(KEY_BYTES)) {
		return [headers, options];
	}

	// Optimized range parsing - avoid multiple splits
	const rangePart = rangeHeader.substring(KEY_BYTES.length);
	const commaIndex = rangePart.indexOf(COMMA);
	const rangeSpec = commaIndex === -1 ? rangePart : rangePart.substring(0, commaIndex);
	const hyphenIndex = rangeSpec.indexOf(HYPHEN);

	let start, end;

	if (hyphenIndex === -1) {
		// No hyphen found, invalid range
		return [headers, options];
	}

	const startStr = rangeSpec.substring(0, hyphenIndex);
	const endStr = rangeSpec.substring(hyphenIndex + 1);

	// Parse numbers with optimized logic
	if (startStr === EMPTY) {
		// Suffix-byte-range-spec (e.g., "-500")
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

		if (endStr === EMPTY) {
			end = size - 1;
		} else {
			end = parseInt(endStr, INT_10);
			if (isNaN(end)) {
				return [headers, options];
			}
		}
	}


	// Clean up headers once
	res.removeHeader(CONTENT_RANGE);
	res.removeHeader(CONTENT_LENGTH);
	res.removeHeader(ETAG);
	delete headers.etag;

	// Validate range
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
	} else {
		// Invalid range
		headers[CONTENT_RANGE] = `bytes */${size}`;
		res.header(CONTENT_RANGE, headers[CONTENT_RANGE]);

		return [headers, options];
	}
}

/**
 * Checks if an object is pipeable (has 'on' method and is not null)
 * @param {string} method - HTTP method
 * @param {*} arg - Object to check for pipeability
 * @returns {boolean} True if the object is pipeable
 */
function pipeable (method, arg) {
	return method !== HEAD && arg !== null && arg !== undefined && typeof arg.on === FUNCTION;
}

/**
 * Processes middleware map for a given URI and populates middleware array
 * @param {string} uri - The URI to match against
 * @param {Map} [map=new Map()] - Map of middleware handlers
 * @param {Object} [arg={}] - Object containing middleware array and parameters
 */
function reduce (uri, map = new Map(), arg = {}) {
	// Optimized: Early return if map is empty
	if (map.size === 0) {
		return;
	}

	// Optimized: Cache middleware array reference to avoid property access
	const middlewareArray = arg.middleware;
	let paramsFound = arg.params;

	// Iterate directly over map values without creating intermediate array
	for (const middleware of map.values()) {
		// Optimized: Reset lastIndex only when needed
		middleware.regex.lastIndex = INT_0;

		if (middleware.regex.test(uri)) {
			// Optimized: Use Array.prototype.push.apply for better performance with large arrays
			const handlers = middleware.handlers;
			const handlerCount = handlers.length;

			if (handlerCount === 1) {
				// Fast path for single handler
				middlewareArray.push(handlers[0]);
			} else if (handlerCount > 1) {
				// Use push.apply for multiple handlers
				middlewareArray.push.apply(middlewareArray, handlers);
			}

			// Set params info if needed (only check once)
			if (middleware.params && paramsFound === false) {
				arg.params = true;
				arg.getParams = middleware.regex;
				paramsFound = true; // Avoid redundant checks
			}
		}
	}
}

/**
 * Formats a time offset value into a string representation
 * @param {number} [arg=0] - Time offset value
 * @returns {string} Formatted time offset string
 */
function timeOffset (arg = INT_0) {
	const isNegative = arg < INT_0;
	const absValue = isNegative ? -arg : arg;
	const offsetMinutes = absValue / INT_60;

	// Convert to hours and minutes
	const hours = Math.floor(offsetMinutes);
	const minutes = Math.floor((offsetMinutes - hours) * INT_60);

	// Format with zero padding
	const sign = isNegative ? EMPTY : HYPHEN;
	const hoursStr = pad(hours);
	const minutesStr = pad(minutes);

	return `${sign}${hoursStr}${minutesStr}`;
}

/**
 * Writes HTTP response headers using writeHead method
 * @param {Object} res - The HTTP response object
 * @param {Object} [headers={}] - Headers object to write
 */
function writeHead (res, headers = {}) {
	res.writeHead(res.statusCode, node_http.STATUS_CODES[res.statusCode], headers);
}

// Pre-compiled regex patterns for better performance
const IPV4_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const IPV6_CHAR_PATTERN = /^[0-9a-fA-F:.]+$/;
const IPV4_MAPPED_PATTERN = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i;
const HEX_GROUP_PATTERN = /^[0-9a-fA-F]{1,4}$/;

/**
 * Validates if an IP address is properly formatted
 * @param {string} ip - IP address to validate
 * @returns {boolean} True if IP is valid format
 */
function isValidIP (ip) {
	if (!ip || typeof ip !== "string") {
		return false;
	}

	// IPv4 validation - optimize with early character check
	if (ip.indexOf(":") === -1) {
		const match = IPV4_PATTERN.exec(ip);

		if (!match) {
			return false;
		}

		// Optimized octet validation - avoid array methods
		for (let i = 1; i < 5; i++) {
			const num = parseInt(match[i], 10);
			if (num > 255) {
				return false;
			}
		}

		return true;
	}

	// IPv6 validation
	// Quick character validation
	if (!IPV6_CHAR_PATTERN.test(ip)) {
		return false;
	}

	// Handle IPv4-mapped IPv6 addresses
	const ipv4MappedMatch = IPV4_MAPPED_PATTERN.exec(ip);
	if (ipv4MappedMatch) {
		return isValidIP(ipv4MappedMatch[1]);
	}

	// Special case for "::" alone
	if (ip === "::") {
		return true;
	}

	// Handle "::" compression - optimize split operations
	const doubleColonIndex = ip.indexOf("::");
	const isCompressed = doubleColonIndex !== -1;

	if (isCompressed) {
		// Check for multiple "::" which is invalid
		if (ip.indexOf("::", doubleColonIndex + 2) !== -1) {
			return false;
		}

		const beforeDoubleColon = ip.substring(0, doubleColonIndex);
		const afterDoubleColon = ip.substring(doubleColonIndex + 2);

		const leftGroups = beforeDoubleColon ? beforeDoubleColon.split(":") : [];
		const rightGroups = afterDoubleColon ? afterDoubleColon.split(":") : [];

		// Filter out empty groups and validate total count
		const nonEmptyLeft = leftGroups.filter(g => g !== "");
		const nonEmptyRight = rightGroups.filter(g => g !== "");
		const totalGroups = nonEmptyLeft.length + nonEmptyRight.length;

		// Must be compressed (less than 8 groups)
		if (totalGroups >= 8) {
			return false;
		}

		// Validate each group
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
		// Full notation must have exactly 8 groups
		if (groups.length !== 8) {
			return false;
		}

		// Validate each group
		for (let i = 0; i < 8; i++) {
			if (!groups[i] || !HEX_GROUP_PATTERN.test(groups[i])) {
				return false;
			}
		}

		return true;
	}
}

// Optimized: Cache regex for corsHost method to avoid recompilation
const PROTOCOL_REGEX = /^http(s)?:\/\//;

/**
 * Woodland HTTP server framework class extending EventEmitter
 * @class
 * @extends {EventEmitter}
 */
class Woodland extends node_events.EventEmitter {
	/**
	 * Creates a new Woodland instance
	 * @param {Object} [config={}] - Configuration object
	 * @param {boolean} [config.autoindex=false] - Enable automatic directory indexing
	 * @param {number} [config.cacheSize=1000] - Size of internal cache
	 * @param {number} [config.cacheTTL=10000] - Cache time-to-live in milliseconds
	 * @param {string} [config.charset='utf-8'] - Default character encoding
	 * @param {string} [config.corsExpose=''] - CORS headers to expose to the client
	 * @param {Object} [config.defaultHeaders={}] - Default HTTP headers
	 * @param {number} [config.digit=3] - Number of digits for timing precision
	 * @param {boolean} [config.etags=true] - Enable ETag generation
	 * @param {string[]} [config.indexes=['index.htm', 'index.html']] - Index file names
	 * @param {Object} [config.logging={}] - Logging configuration
	 * @param {string[]} [config.origins=[]] - Allowed CORS origins (empty array denies all cross-origin requests)
	 * @param {boolean} [config.silent=false] - Disable default headers
	 * @param {boolean} [config.time=false] - Enable response time tracking
	 */
	constructor ({
		autoindex = false,
		cacheSize = INT_1e3,
		cacheTTL = INT_1e4,
		charset = UTF_8,
		corsExpose = EMPTY,
		defaultHeaders = {},
		digit = INT_3,
		etags = true,
		indexes = [
			INDEX_HTM,
			INDEX_HTML
		],
		logging = {},
		origins = [],
		silent = false,
		time = false
	} = {}) {
		super();

		if (silent === false) {
			if (SERVER in defaultHeaders === false) {
				defaultHeaders[SERVER] = SERVER_VALUE;
			}

			defaultHeaders[X_POWERED_BY] = X_POWERED_BY_VALUE;
		}

		this.autoindex = autoindex;
		this.ignored = new Set();
		this.cache = tinyLru.lru(cacheSize, cacheTTL);
		this.charset = charset;
		this.corsExpose = corsExpose;
		this.defaultHeaders = Reflect.ownKeys(defaultHeaders).map(key => [key.toLowerCase(), defaultHeaders[key]]);
		this.digit = digit;
		this.etags = etags ? tinyEtag.etag({cacheSize, cacheTTL}) : null;
		this.indexes = structuredClone(indexes);
		this.permissions = tinyLru.lru(cacheSize, cacheTTL);
		this.logging = {
			enabled: (logging?.enabled ?? true) !== false,
			format: logging?.format ?? LOG_FORMAT,
			level: logging?.level ?? INFO
		};
		this.methods = [];
		this.middleware = new Map();
		this.origins = structuredClone(origins);
		this.time = time;

		if (this.etags !== null) {
			this.get(this.etags.middleware).ignore(this.etags.middleware);
		}

		if (this.origins.length > INT_0) {
			const fnCorsRequest = this.corsRequest();
			this.options(fnCorsRequest).ignore(fnCorsRequest);
		}
	}

	/**
	 * Checks if a method is allowed for a specific URI
	 * @param {string} method - HTTP method
	 * @param {string} uri - Request URI
	 * @param {boolean} [override=false] - Skip cache lookup
	 * @returns {boolean} True if method is allowed
	 */
	allowed (method, uri, override = false) {
		return this.routes(uri, method, override).visible > INT_0;
	}

	/**
	 * Gets allowed methods for a URI as a comma-separated string
	 * @param {string} uri - Request URI
	 * @param {boolean} [override=false] - Skip cache lookup
	 * @returns {string} Comma-separated list of allowed methods
	 */
	allows (uri, override = false) {
		let result = override === false ? this.permissions.get(uri) : void 0;

		if (override || result === void 0) {
			const allMethods = this.routes(uri, WILDCARD, override).visible > INT_0;
			let list;

			if (allMethods) {
				// Optimized: Use array spread instead of structuredClone for simple array
				list = [...node_http.METHODS];
			} else {
				// Optimized: Use Set for faster lookups and dedupe, then convert to array
				const methodSet = new Set();

				for (const method of this.methods) {
					if (this.allowed(method, uri, override)) {
						methodSet.add(method);
					}
				}

				list = Array.from(methodSet);
			}

			// Optimized: Use Set for O(1) lookup instead of includes()
			const methodSet = new Set(list);

			// Add HEAD when GET is present
			if (methodSet.has(GET) && !methodSet.has(HEAD)) {
				list.push(HEAD);
			}

			// Add OPTIONS for any route that has methods defined
			if (list.length > INT_0 && !methodSet.has(OPTIONS)) {
				list.push(OPTIONS);
			}

			result = list.sort().join(COMMA_SPACE);
			this.permissions.set(uri, result);
			this.log(`type=allows, uri=${uri}, override=${override}, message="${MSG_DETERMINED_ALLOW}"`);
		}

		return result;
	}

	/**
	 * Registers middleware that runs for all HTTP methods
	 * @param {...Function} args - Middleware functions followed by optional method
	 * @returns {Woodland} This instance for chaining
	 */
	always (...args) {
		return this.use(...args, WILDCARD);
	}

	/**
	 * Registers middleware for CONNECT method
	 * @param {...Function} args - Middleware functions
	 * @returns {Woodland} This instance for chaining
	 */
	connect (...args) {
		return this.use(...args, CONNECT);
	}

	/**
	 * Generates a Common Log Format entry for a request/response
	 * @param {Object} req - HTTP request object
	 * @param {Object} res - HTTP response object
	 * @returns {string} Formatted log entry
	 */
	clf (req, res) {
		const date = new Date();

		// Optimized: Cache date parts and avoid repeated property access
		const month = MONTHS[date.getMonth()];
		const day = date.getDate();
		const year = date.getFullYear();
		const hours = pad(date.getHours());
		const minutes = pad(date.getMinutes());
		const seconds = pad(date.getSeconds());
		const timezone = timeOffset(date.getTimezoneOffset());
		const dateStr = `[${day}/${month}/${year}:${hours}:${minutes}:${seconds} ${timezone}]`;

		const host = req.headers?.host ?? HYPHEN;
		const ip = req?.ip ?? HYPHEN;
		const username = req?.parsed?.username ?? HYPHEN;
		const requestLine = `${req.method} ${req.parsed.pathname}${req.parsed.search} HTTP/1.1`;
		const contentLength = res?.getHeader(CONTENT_LENGTH) ?? HYPHEN;
		const referer = req.headers?.referer ?? HYPHEN;
		const userAgent = req.headers?.[USER_AGENT] ?? HYPHEN;

		return this.logging.format
			.replace(LOG_V, host)
			.replace(LOG_H, ip)
			.replace(LOG_L, HYPHEN)
			.replace(LOG_U, username)
			.replace(LOG_T, dateStr)
			.replace(LOG_R, requestLine)
			.replace(LOG_S, res.statusCode)
			.replace(LOG_B, contentLength)
			.replace(LOG_REFERRER, referer)
			.replace(LOG_USER_AGENT, userAgent);
	}

	/**
	 * Checks if a request should be handled with CORS
	 * @param {Object} req - HTTP request object
	 * @returns {boolean} True if CORS should be applied
	 */
	cors (req) {
		// Security: Only allow CORS if origins are explicitly configured
		if (this.origins.length === 0) {
			return false;
		}

		return req.corsHost && (this.origins.includes(WILDCARD) || this.origins.includes(req.headers.origin));
	}

	/**
	 * Determines if the request origin differs from the host
	 * @param {Object} req - HTTP request object
	 * @returns {boolean} True if cross-origin request
	 */
	corsHost (req) {
		// Optimized: Use cached regex instead of creating new one each time
		return ORIGIN in req.headers && req.headers.origin.replace(PROTOCOL_REGEX, "") !== req.headers.host;
	}

	/**
	 * Creates a CORS preflight request handler middleware
	 * @returns {Function} Middleware function that responds to OPTIONS requests with 204 No Content
	 */
	corsRequest () {
		return (req, res) => res.status(INT_204).send(EMPTY);
	}

	/**
	 * Decorates request and response objects with additional properties and methods
	 * @param {Object} req - HTTP request object
	 * @param {Object} res - HTTP response object
	 */
	decorate (req, res) {
		// Optimized: Start timing before any other operations if needed
		let timing = null;
		if (this.time) {
			timing = precise.precise().start();
		}

		// Optimized: Parse URL once and cache pathname for multiple uses
		const parsed = parse(req);
		const pathname = parsed.pathname;

		// Optimized: Get allow string early to avoid recalculation
		const allowString = this.allows(pathname);

		// Optimized: Batch request property assignments
		req.parsed = parsed;
		req.allow = allowString;
		req.body = EMPTY;
		req.host = parsed.hostname;
		req.params = {};
		req.valid = true;

		// Optimized: Only assign timing if enabled
		if (timing) {
			req.precise = timing;
		}

		// Optimized: Calculate CORS properties efficiently
		req.corsHost = this.corsHost(req);
		req.cors = this.cors(req);

		// Optimized: Get IP early for logging
		const clientIP = this.ip(req);
		req.ip = clientIP;

		// Optimized: Batch response property assignments
		res.locals = {};
		res.error = this.error(req, res);
		res.header = res.setHeader;
		res.json = this.json(res);
		res.redirect = this.redirect(res);
		res.send = this.send(req, res);
		res.set = this.set(res);
		res.status = this.status(res);

		// Optimized: Use null prototype for faster property access
		const headersBatch = Object.create(null);

		// Required headers
		headersBatch[ALLOW] = allowString;
		headersBatch[X_CONTENT_TYPE_OPTIONS] = NO_SNIFF;

		// Optimized: Use for loop for default headers (faster than for..of)
		for (let i = 0; i < this.defaultHeaders.length; i++) {
			const [key, value] = this.defaultHeaders[i];
			headersBatch[key] = value;
		}

		// Optimized: Only add CORS headers if needed
		if (req.cors) {
			const corsHeaders = req.headers[ACCESS_CONTROL_REQUEST_HEADERS] ?? this.corsExpose;
			const origin = req.headers.origin;

			headersBatch[ACCESS_CONTROL_ALLOW_ORIGIN] = origin;
			headersBatch[TIMING_ALLOW_ORIGIN] = origin;
			headersBatch[ACCESS_CONTROL_ALLOW_CREDENTIALS] = TRUE;
			headersBatch[ACCESS_CONTROL_ALLOW_METHODS] = allowString;

			if (corsHeaders !== void 0) {
				headersBatch[req.method === OPTIONS ? ACCESS_CONTROL_ALLOW_HEADERS : ACCESS_CONTROL_EXPOSE_HEADERS] = corsHeaders;
			}
		}

		// Set all headers in one batch operation
		res.set(headersBatch);

		this.log(`type=decorate, uri=${pathname}, method=${req.method}, ip=${clientIP}, message="${MSG_DECORATED_IP.replace(IP_TOKEN, clientIP)}"`);
		res.on(CLOSE, () => this.log(this.clf(req, res), INFO));
	}

	/**
	 * Registers middleware for DELETE method
	 * @param {...Function} args - Middleware functions
	 * @returns {Woodland} This instance for chaining
	 */
	delete (...args) {
		return this.use(...args, DELETE);
	}

	/**
	 * Creates an error handler function for the response
	 * @param {Object} req - HTTP request object
	 * @param {Object} res - HTTP response object
	 * @returns {Function} Error handler function
	 */
	error (req, res) {
		return (status = INT_500, body) => {
			if (res.headersSent === false) {
				const err = body instanceof Error ? body : new Error(body ?? node_http.STATUS_CODES[status]);
				let output = err.message,
					headers = {};

				[output, status, headers] = this.onReady(req, res, output, status, headers);

				if (status === INT_404) {
					res.removeHeader(ALLOW);
					res.header(ALLOW, EMPTY);

					if (req.cors) {
						res.removeHeader(ACCESS_CONTROL_ALLOW_METHODS);
						res.header(ACCESS_CONTROL_ALLOW_METHODS, EMPTY);
					}
				}

				res.removeHeader(CONTENT_LENGTH);
				res.statusCode = status;

				if (this.listenerCount(ERROR) > INT_0) {
					this.emit(ERROR, req, res, err);
				}

				this.log(`type=error, uri=${req.parsed.pathname}, method=${req.method}, ip=${req.ip}, message="${MSG_ERROR_IP.replace(IP_TOKEN, req.ip)}"`);
				this.onDone(req, res, output, headers);
			}
		};
	}

	/**
	 * Generates an ETag for the given method and arguments
	 * @param {string} method - HTTP method
	 * @param {...*} args - Arguments to generate ETag from
	 * @returns {string} Generated ETag or empty string
	 */
	etag (method, ...args) {
		return (method === GET || method === HEAD || method === OPTIONS) && this.etags !== null ? this.etags.create(args.map(i => typeof i !== STRING ? JSON.stringify(i).replace(/^"|"$/g, EMPTY) : i).join(HYPHEN)) : EMPTY;
	}

	/**
	 * Serves static files from a directory
	 * @param {string} [root='/'] - URL root path
	 * @param {string} [folder=process.cwd()] - File system folder to serve from
	 */
	files (root = SLASH, folder = process.cwd()) {
		this.get(`${root.replace(/\/$/, EMPTY)}/(.*)?`, (req, res) => this.serve(req, res, req.parsed.pathname.substring(1), folder));
	}

	/**
	 * Registers middleware for GET method
	 * @param {...Function} args - Middleware functions
	 * @returns {Woodland} This instance for chaining
	 */
	get (...args) {
		return this.use(...args, GET);
	}

	/**
	 * Marks a middleware function to be ignored in route visibility calculations
	 * @param {Function} fn - Middleware function to ignore
	 * @returns {Woodland} This instance for chaining
	 */
	ignore (fn) {
		this.ignored.add(fn);
		this.log(`type=ignore, message="${MSG_IGNORED_FN}", name="${fn.name}"`);

		return this;
	}

	/**
	 * Extracts the client IP address from the request with security validation
	 * @param {Object} req - HTTP request object
	 * @returns {string} Client IP address
	 */
	ip (req) {
		// Optimized: Cache fallback IP and fast path for common case
		const fallbackIP = req.connection.remoteAddress || req.socket.remoteAddress || "127.0.0.1";

		// Fast path: If no X-Forwarded-For header or empty, return connection IP
		const forwardedHeader = req.headers[X_FORWARDED_FOR];
		if (!forwardedHeader || !forwardedHeader.trim()) {
			return fallbackIP;
		}

		// Optimized: Avoid map() allocation, process inline
		const forwardedIPs = forwardedHeader.split(COMMA);

		for (let i = 0; i < forwardedIPs.length; i++) {
			const ip = forwardedIPs[i].trim();
			if (isValidIP(ip)) {
				return ip;
			}
		}

		// Fall back to connection IP if no valid IP found
		return fallbackIP;
	}

	/**
	 * Creates a JSON response function for the response object
	 * @param {Object} res - HTTP response object
	 * @returns {Function} JSON response function
	 */
	json (res) {
		return (arg, status = 200, headers = {[CONTENT_TYPE]: `${APPLICATION_JSON}; charset=${UTF_8}`}) => {
			res.send(JSON.stringify(arg), status, headers);
		};
	}

	/**
	 * Lists registered routes for a specific method
	 * @param {string} [method='get'] - HTTP method to list routes for
	 * @param {string} [type='array'] - Return type: 'array' or 'object'
	 * @returns {Array|Object} Array of route patterns or object with route details
	 */
	list (method = GET.toLowerCase(), type = ARRAY) {
		let result;

		if (type === ARRAY) {
			result = Array.from(this.middleware.get(method.toUpperCase()).keys());
		} else if (type === OBJECT) {
			result = {};

			for (const [key, value] of this.middleware.get(method.toUpperCase()).entries()) {
				result[key] = value;
			}
		}

		this.log(`type=list, method=${method}, type=${type}`);

		return result;
	}

	/**
	 * Logs a message at the specified level
	 * @param {string} msg - Message to log
	 * @param {string} [level='debug'] - Log level
	 * @returns {Woodland} This instance for chaining
	 */
	log (msg, level = DEBUG) {
		if (this.logging.enabled) {
			const idx = LEVELS[level];

			if (idx <= LEVELS[this.logging.level]) {
				/* istanbul ignore next */
				process.nextTick(() => console[idx > INT_4 ? LOG : ERROR](msg));
			}
		}

		return this;
	}

	/**
	 * Finalizes the response by setting headers and ending the response
	 * @param {Object} req - HTTP request object
	 * @param {Object} res - HTTP response object
	 * @param {string} body - Response body
	 * @param {Object} headers - Additional headers to set
	 */
	onDone (req, res, body, headers) {
		if (res.statusCode !== INT_204 && res.statusCode !== INT_304 && res.getHeader(CONTENT_LENGTH) === void 0) {
			res.header(CONTENT_LENGTH, Buffer.byteLength(body));
		}

		writeHead(res, headers);
		res.end(body, this.charset);
	}

	/**
	 * Prepares the response before sending, adding timing headers if enabled
	 * @param {Object} req - HTTP request object
	 * @param {Object} res - HTTP response object
	 * @param {string} body - Response body
	 * @param {number} status - HTTP status code
	 * @param {Object} headers - Response headers
	 * @returns {Array} Array containing [body, status, headers]
	 */
	onReady (req, res, body, status, headers) {
		if (this.time && res.getHeader(X_RESPONSE_TIME) === void 0) {
			res.header(X_RESPONSE_TIME, `${ms(req.precise.stop().diff(), this.digit)}`);
		}

		return this.onSend(req, res, body, status, headers);
	}

	/**
	 * Hook called before sending response, allows modification of response data
	 * @param {Object} req - HTTP request object
	 * @param {Object} res - HTTP response object
	 * @param {string} body - Response body
	 * @param {number} status - HTTP status code
	 * @param {Object} headers - Response headers
	 * @returns {Array} Array containing [body, status, headers]
	 */
	/* istanbul ignore next */
	onSend (req, res, body, status, headers) {
		return [body, status, headers];
	}

	/**
	 * Registers middleware for OPTIONS method
	 * @param {...Function} args - Middleware functions
	 * @returns {Woodland} This instance for chaining
	 */
	options (...args) {
		return this.use(...args, OPTIONS);
	}

	/**
	 * Registers middleware for PATCH method
	 * @param {...Function} args - Middleware functions
	 * @returns {Woodland} This instance for chaining
	 */
	patch (...args) {
		return this.use(...args, PATCH);
	}

	/**
	 * Converts a route path with parameters to a regex pattern
	 * @param {string} [arg=''] - Route path with parameter placeholders
	 * @returns {string} Regex pattern string
	 */
	path (arg = EMPTY) {
		return arg.replace(/\/:([^/]+)/g, PARAMS_GROUP);
	}

	/**
	 * Registers middleware for POST method
	 * @param {...Function} args - Middleware functions
	 * @returns {Woodland} This instance for chaining
	 */
	post (...args) {
		return this.use(...args, POST);
	}

	/**
	 * Registers middleware for PUT method
	 * @param {...Function} args - Middleware functions
	 * @returns {Woodland} This instance for chaining
	 */
	put (...args) {
		return this.use(...args, PUT);
	}

	/**
	 * Creates a redirect function for the response object
	 * @param {Object} res - HTTP response object
	 * @returns {Function} Redirect function
	 */
	redirect (res) {
		return (uri, perm = true) => {
			res.send(EMPTY, perm ? INT_308 : INT_307, {[LOCATION]: uri});
		};
	}

	/**
	 * Routes an incoming HTTP request through the middleware stack
	 * @param {Object} req - HTTP request object
	 * @param {Object} res - HTTP response object
	 */
	route (req, res) {
		// Optimized: Cache constants to avoid repeated property access
		const evc = CONNECT.toLowerCase();
		const evf = FINISH;
		const method = req.method === HEAD ? GET : req.method;

		this.decorate(req, res);

		// Optimized: Combine event listener checks to avoid multiple calls
		const connectListeners = this.listenerCount(evc);
		const finishListeners = this.listenerCount(evf);

		if (connectListeners > INT_0) {
			this.emit(evc, req, res);
		}

		if (finishListeners > INT_0) {
			res.on(evf, () => this.emit(evf, req, res));
		}

		// Optimized: Cache pathname and IP to avoid property access in logging
		const pathname = req.parsed.pathname;
		const requestMethod = req.method;
		const clientIP = req.ip;

		this.log(`type=route, uri=${pathname}, method=${requestMethod}, ip=${clientIP}, message="${MSG_ROUTING}"`);

		// Optimized: Streamline CORS validation logic
		const hasOriginHeader = ORIGIN in req.headers;
		const isOriginAllowed = hasOriginHeader && this.origins.includes(req.headers.origin);

		if (req.cors === false && hasOriginHeader && req.corsHost && !isOriginAllowed) {
			req.valid = false;
			res.error(INT_403);
		} else if (req.allow.includes(method)) {
			// Optimized: Get route result once and reuse
			const result = this.routes(pathname, method);

			if (result.params) {
				params(req, result.getParams);
			}

			// Optimized: Create exit middleware iterator more efficiently
			const exitMiddleware = result.middleware.slice(result.exit)[Symbol.iterator]();

			req.exit = next(req, res, exitMiddleware, true);
			next(req, res, result.middleware[Symbol.iterator]())();
		} else {
			req.valid = false;
			res.error(getStatus(req, res));
		}
	}

	/**
	 * Retrieves route information for a URI and method
	 * @param {string} uri - Request URI
	 * @param {string} method - HTTP method
	 * @param {boolean} [override=false] - Skip cache lookup
	 * @returns {Object} Route information object
	 */
	routes (uri, method, override = false) {
		const key = `${method}${DELIMITER}${uri}`,
			cached = override === false ? this.cache.get(key) : void 0;
		let result;

		if (cached !== void 0) {
			result = cached;
		} else {
			result = {getParams: null, middleware: [], params: false, visible: INT_0, exit: -1};
			reduce(uri, this.middleware.get(WILDCARD), result);

			if (method !== WILDCARD) {
				result.exit = result.middleware.length;
				reduce(uri, this.middleware.get(method), result);
			}

			// Optimized: Count without creating an intermediate array
			result.visible = INT_0;
			for (const middleware of result.middleware) {
				if (this.ignored.has(middleware) === false) {
					result.visible++;
				}
			}
			this.cache.set(key, result);
		}

		this.log(`type=routes, uri=${uri}, method=${method}, cached=${cached !== void 0}, middleware=${result.middleware.length}, params=${result.params}, visible=${result.visible}, override=${override}, message="${MSG_RETRIEVED_MIDDLEWARE}"`);

		return result;
	}

	/**
	 * Creates a send function for the response object
	 * @param {Object} req - HTTP request object
	 * @param {Object} res - HTTP response object
	 * @returns {Function} Send function
	 */
	send (req, res) {
		return (body = EMPTY, status = res.statusCode, headers = {}) => {
			if (res.headersSent === false) {
				[body, status, headers] = this.onReady(req, res, body, status, headers);

				// Optimized: Cache method and range header for reuse
				const method = req.method;
				const rangeHeader = req.headers.range;
				const isPipeable = pipeable(method, body);

				if (isPipeable) {
					if (rangeHeader === void 0 || req.range !== void 0) {
						writeHead(res, headers);
						body.on(ERROR, err => res.error(INT_500, err)).pipe(res);
					} else {
						res.error(INT_416);
					}
				} else {
					// Optimized: Check for toString method more efficiently
					if (typeof body !== STRING && body && typeof body[TO_STRING] === FUNCTION) {
						body = body.toString();
					}

					if (rangeHeader !== void 0) {
						// Optimized: Create buffer only once and reuse byteLength
						const buffered = Buffer.from(body);
						const byteLength = buffered.length;

						[headers] = partialHeaders(req, res, byteLength, status, headers);

						if (req.range !== void 0) {
							// Optimized: Use slice with proper range calculation
							const rangeBuffer = buffered.slice(req.range.start, req.range.end + 1);
							this.onDone(req, res, rangeBuffer.toString(), headers);
						} else {
							res.error(INT_416);
						}
					} else {
						res.statusCode = status;
						this.onDone(req, res, body, headers);
					}
				}

				this.log(`type=res.send, uri=${req.parsed.pathname}, method=${method}, ip=${req.ip}, valid=true, message="${MSG_SENDING_BODY}"`);
			}
		};
	}

	/**
	 * Creates a function to set multiple headers on the response
	 * @param {Object} res - HTTP response object
	 * @returns {Function} Header setting function
	 */
	set (res) {
		return (arg = {}) => {
			const headers = arg instanceof Map || arg instanceof Headers ? arg : new Headers(arg);

			// Node.js HTTP response doesn't have setHeaders, use setHeader for each
			for (const [key, value] of headers) {
				res.setHeader(key, value);
			}

			return res;
		};
	}

	/**
	 * Serves a file or directory from the file system
	 * @param {Object} req - HTTP request object
	 * @param {Object} res - HTTP response object
	 * @param {string} arg - File path relative to folder
	 * @param {string} [folder=process.cwd()] - Base directory to serve from
	 * @returns {Promise<void>} Promise that resolves when serving is complete
	 */
	async serve (req, res, arg, folder = process.cwd()) {
		const fp = node_path.resolve(folder, arg);

		// Security: Ensure resolved path stays within the allowed directory
		if (!fp.startsWith(node_path.resolve(folder))) {
			this.log(`type=serve, uri=${req.parsed.pathname}, method=${req.method}, ip=${req.ip}, message="Path outside allowed directory", path="${arg}"`, ERROR);
			res.error(INT_403);

			return;
		}

		let valid = true;
		let stats;

		this.log(`type=serve, uri=${req.parsed.pathname}, method=${req.method}, ip=${req.ip}, message="${MSG_ROUTING_FILE}"`);

		try {
			stats = await promises.stat(fp, {bigint: false});
		} catch {
			valid = false;
		}

		if (valid === false) {
			res.error(INT_404);
		} else if (stats.isDirectory() === false) {
			this.stream(req, res, {
				charset: this.charset,
				etag: this.etag(req.method, stats.ino, stats.size, stats.mtimeMs),
				path: fp,
				stats: stats
			});
		} else if (req.parsed.pathname.endsWith(SLASH) === false) {
			res.redirect(`${req.parsed.pathname}/${req.parsed.search}`);
		} else {
			const files = await promises.readdir(fp, {encoding: UTF8, withFileTypes: true});
			let result = EMPTY;

			for (const file of files) {
				if (this.indexes.includes(file.name)) {
					result = node_path.join(fp, file.name);
					break;
				}
			}

			if (result.length === INT_0) {
				if (this.autoindex === false) {
					res.error(INT_404);
				} else {
					const body = autoindex(decodeURIComponent(req.parsed.pathname), files);

					res.header(CONTENT_TYPE, `text/html; charset=${this.charset}`);
					res.send(body);
				}
			} else {
				const rstats = await promises.stat(result, {bigint: false});

				this.stream(req, res, {
					charset: this.charset,
					etag: this.etag(req.method, rstats.ino, rstats.size, rstats.mtimeMs),
					path: result,
					stats: rstats
				});
			}
		}
	}

	/**
	 * Creates a status code setting function for the response
	 * @param {Object} res - HTTP response object
	 * @returns {Function} Status setting function
	 */
	status (res) {
		return (arg = INT_200) => {
			res.statusCode = arg;

			return res;
		};
	}

	/**
	 * Streams a file to the response with appropriate headers
	 * @param {Object} req - HTTP request object
	 * @param {Object} res - HTTP response object
	 * @param {Object} [file] - File information object
	 * @param {string} [file.charset=''] - Character encoding
	 * @param {string} [file.etag=''] - ETag value
	 * @param {string} [file.path=''] - File system path
	 * @param {Object} [file.stats] - File statistics
	 */
	stream (req, res, file = {
		charset: EMPTY,
		etag: EMPTY,
		path: EMPTY,
		stats: {mtime: new Date(), size: INT_0}
	}) {
		if (file.path === EMPTY || file.stats.size === INT_0) {
			throw new TypeError("Invalid file descriptor");
		}

		res.header(CONTENT_LENGTH, file.stats.size);
		res.header(CONTENT_TYPE, file.charset.length > INT_0 ? `${mime(file.path)}; charset=${file.charset}` : mime(file.path));
		res.header(LAST_MODIFIED, file.stats.mtime.toUTCString());

		if (this.etags && file.etag.length > INT_0) {
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
					// Invalid range, reset options to serve full file
					options = {};
				}
			}

			res.send(node_fs.createReadStream(file.path, Object.keys(options).length > 0 ? options : undefined), status);
		} else if (req.method === HEAD) {
			res.send(EMPTY);
		} else if (req.method === OPTIONS) {
			res.removeHeader(CONTENT_LENGTH);
			res.send(OPTIONS_BODY);
		}

		this.emit(STREAM, req, res);
	}

	/**
	 * Registers middleware for TRACE method
	 * @param {...Function} args - Middleware functions
	 * @returns {Woodland} This instance for chaining
	 */
	trace (...args) {
		return this.use(...args, TRACE);
	}

	/**
	 * Registers middleware for a route pattern and HTTP method
	 * @param {string|Function} rpath - Route pattern or middleware function
	 * @param {...Function} fn - Middleware functions, optionally ending with method string
	 * @returns {Woodland} This instance for chaining
	 * @throws {TypeError} If invalid method or HEAD route is specified
	 */
	use (rpath, ...fn) {
		if (typeof rpath === FUNCTION) {
			fn = [rpath, ...fn];
			rpath = `/.${WILDCARD}`;
		}

		const method = typeof fn[fn.length - 1] === STRING ? fn.pop().toUpperCase() : GET;

		if (method !== WILDCARD && node_http.METHODS.includes(method) === false) {
			throw new TypeError(MSG_ERROR_INVALID_METHOD);
		}

		if (method === HEAD) {
			throw new TypeError(MSG_ERROR_HEAD_ROUTE);
		}

		if (this.middleware.has(method) === false) {
			if (method !== WILDCARD) {
				this.methods.push(method);
			}

			this.middleware.set(method, new Map());
		}

		const mmethod = this.middleware.get(method);
		let lrpath = rpath,
			lparams = false;

		if (lrpath.includes(`${SLASH}${COLON}`) && lrpath.includes(LEFT_PAREN) === false) {
			lparams = true;
			lrpath = this.path(lrpath);
		}

		const current = mmethod.get(lrpath) ?? {handlers: []};

		current.handlers.push(...fn);
		mmethod.set(lrpath, {
			handlers: current.handlers,
			params: lparams,
			regex: new RegExp(`^${lrpath}$`)
		});

		this.log(`type=use, route=${rpath}, method=${method}, message="${MSG_REGISTERING_MIDDLEWARE}"`);

		return this;
	}
}

/**
 * Factory function to create a new Woodland instance
 * @param {Object} [arg] - Configuration object passed to Woodland constructor
 * @returns {Woodland} New Woodland instance with bound route method
 */
function woodland (arg) {
	const app = new Woodland(arg);

	app.route = app.route.bind(app);

	return app;
}

exports.Woodland = Woodland;
exports.woodland = woodland;
