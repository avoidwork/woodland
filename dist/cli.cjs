#!/usr/bin/env node
/**
 * woodland
 *
 * @copyright 2025 Jason Mulligan <jason.mulligan@avoidwork.com>
 * @license BSD-3-Clause
 * @version 20.1.11
 */
'use strict';

var node_http = require('node:http');
var tinyCoerce = require('tiny-coerce');
var node_path = require('node:path');
var node_events = require('node:events');
var promises = require('node:fs/promises');
var node_fs = require('node:fs');
var tinyEtag = require('tiny-etag');
var precise = require('precise');
var tinyLru = require('tiny-lru');
var node_module = require('node:module');
var node_url = require('node:url');
var mimeDb = require('mime-db');

var _documentCurrentScript = typeof document !== 'undefined' ? document.currentScript : null;
const __dirname$2 = node_url.fileURLToPath(new node_url.URL(".", (typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === 'SCRIPT' && _documentCurrentScript.src || new URL('cli.cjs', document.baseURI).href))));
const require$1 = node_module.createRequire((typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === 'SCRIPT' && _documentCurrentScript.src || new URL('cli.cjs', document.baseURI).href)));
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
const TEXT_PLAIN = "text/plain";
const CHAR_SET = "charset=utf-8";
const UTF8 = "utf8";
const UTF_8 = "utf-8";

// =============================================================================
// SERVER & SYSTEM INFO
// =============================================================================
const SERVER_VALUE = `${name}/${version}`;
const X_POWERED_BY_VALUE = `nodejs/${process.version}, ${process.platform}/${process.arch}`;
const LOCALHOST = "127.0.0.1";
const INT_8000 = 8000;

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
const INT_65535 = 65535;

// =============================================================================
// STRING & CHARACTER CONSTANTS
// =============================================================================
const COLON = ":";
const COMMA = ",";
const COMMA_SPACE = ", ";
const DELIMITER = "|";
const EMPTY = "";
const EQUAL = "=";
const HYPHEN = "-";
const LEFT_PAREN = "(";
const PERIOD = ".";
const SLASH = "/";
const STRING_0 = "0";
const STRING_00 = "00";
const STRING_30 = "30";
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
const NO_CACHE = "no-cache";

// =============================================================================
// EVENT & STREAM CONSTANTS
// =============================================================================
const CLOSE = "close";
const END = "end";
const FINISH = "finish";
const START = "start";
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

const __dirname$1 = node_url.fileURLToPath(new node_url.URL(".", (typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === 'SCRIPT' && _documentCurrentScript.src || new URL('cli.cjs', document.baseURI).href)))),
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
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

/**
 * Generates an HTML autoindex page for directory listings
 * @param {string} [title=""] - The title for the autoindex page
 * @param {Array} [files=[]] - Array of file objects from fs.readdir with withFileTypes: true
 * @returns {string} The complete HTML string for the autoindex page
 */
function autoindex (title = EMPTY, files = []) {
	const safeTitle = escapeHtml(title);

	// Security: Generate file listing with proper HTML escaping
	const parentDir = "    <li><a href=\"..\" rel=\"collection\">../</a></li>";
	const fileList = files.map(file => {
		const safeName = escapeHtml(file.name);
		const safeHref = encodeURIComponent(file.name);
		const isDir = file.isDirectory();
		const displayName = isDir ? `${safeName}/` : safeName;
		const href = isDir ? `${safeHref}/` : safeHref;
		const rel = isDir ? "collection" : "item";

		return `    <li><a href="${href}" rel="${rel}">${displayName}</a></li>`;
	}).join("\n");

	const safeFiles = files.length > 0 ? `${parentDir}\n${fileList}` : parentDir;

	return html.replace(/\$\{\s*TITLE\s*\}/g, safeTitle)
		.replace(/\$\{\s*FILES\s*\}/g, safeFiles);
}

/**
 * Determines the appropriate HTTP status code based on request and response state
 * @param {Object} req - The HTTP request object
 * @param {Object} res - The HTTP response object
 * @returns {number} The appropriate HTTP status code
 */
function getStatus (req, res) {
	return req.allow.length > INT_0 ? req.method !== GET ? INT_405 : req.allow.includes(GET) ? res.statusCode > INT_500 ? res.statusCode : INT_500 : INT_404 : INT_404;
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
	const internalFn = (err, fn) => {
		let obj = middleware.next();

		if (obj.done === false) {
			if (err !== void 0) {
				while (obj.done === false && obj.value && obj.value.length < 4) {
					obj = middleware.next();
				}

				if (obj.done === false && obj.value) {
					obj.value(err, req, res, fn);
				} else {
					res.error(getStatus(req, res));
				}
			} else if (typeof obj.value === FUNCTION) {
				obj.value(req, res, fn);
			} else {
				res.send(obj.value);
			}
		} else {
			res.error(getStatus(req, res));
		}
	};
	const fn = immediate ? err => internalFn(err, fn) : err => process.nextTick(() => internalFn(err, fn));

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
	req.params = getParams.exec(req.parsed.pathname)?.groups ?? {};

	for (const [key, value] of Object.entries(req.params)) {
		let decoded = decodeURIComponent(value);
		let safeValue = typeof decoded === "string" ? escapeHtml(decoded) : decoded;
		req.params[key] = tinyCoerce.coerce(safeValue);
	}
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
	if ((req.headers.range || EMPTY).indexOf(KEY_BYTES) === INT_0) {
		options = {};

		for (const [idx, i] of req.headers.range.replace(KEY_BYTES, EMPTY).split(COMMA)[0].split(HYPHEN).entries()) {
			options[idx === INT_0 ? START : END] = i ? parseInt(i, INT_10) : void 0;
		}

		// Byte offsets
		if (isNaN(options.start) && isNaN(options.end) === false) {
			options.start = size - options.end;
			options.end = size;
		} else if (isNaN(options.end)) {
			options.end = size;
		}

		res.removeHeader(CONTENT_RANGE);
		res.removeHeader(CONTENT_LENGTH);
		res.removeHeader(ETAG);
		delete headers.etag;

		if (isNaN(options.start) === false && isNaN(options.end) === false && options.start < options.end && options.end <= size) {
			req.range = options;
			headers[CONTENT_RANGE] = `bytes ${options.start}-${options.end}/${size}`;
			headers[CONTENT_LENGTH] = options.end - options.start;
			res.header(CONTENT_RANGE, headers[CONTENT_RANGE]);
			res.header(CONTENT_LENGTH, headers[CONTENT_LENGTH]);
			res.statusCode = INT_206;
		} else {
			headers[CONTENT_RANGE] = `bytes */${size}`;
			res.header(CONTENT_RANGE, headers[CONTENT_RANGE]);
		}
	}

	return [headers, options];
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
	Array.from(map.values()).filter(i => {
		i.regex.lastIndex = INT_0;

		return i.regex.test(uri);
	}).forEach(i => {
		for (const fn of i.handlers) {
			arg.middleware.push(fn);
		}

		if (i.params && arg.params === false) {
			arg.params = true;
			arg.getParams = i.regex;
		}
	});
}

/**
 * Formats a time offset value into a string representation
 * @param {number} [arg=0] - Time offset value
 * @returns {string} Formatted time offset string
 */
function timeOffset (arg = INT_0) {
	const neg = arg < INT_0;

	return `${neg ? EMPTY : HYPHEN}${String((neg ? -arg : arg) / INT_60).split(PERIOD).reduce((a, v, idx, arr) => {
		a.push(idx === INT_0 ? pad(v) : STRING_30);

		if (arr.length === 1) {
			a.push(STRING_00);
		}

		return a;
	}, []).join(EMPTY)}`;
}

/**
 * Writes HTTP response headers using writeHead method
 * @param {Object} res - The HTTP response object
 * @param {Object} [headers={}] - Headers object to write
 */
function writeHead (res, headers = {}) {
	res.writeHead(res.statusCode, node_http.STATUS_CODES[res.statusCode], headers);
}

/**
 * Validates if a file path is safe and doesn't contain directory traversal sequences
 * @param {string} filePath - The file path to validate
 * @returns {boolean} True if the path is safe, false otherwise
 */
function isSafeFilePath (filePath) {
	if (typeof filePath !== STRING) {
		return false;
	}

	// Empty string is safe (represents root directory)
	if (filePath === EMPTY) {
		return true;
	}

	// Check for directory traversal patterns
	const dangerousPatterns = [
		/\.\.\//, // ../
		/\.\.\\/, // ..\
		/\.\.$/, // .. at end
		/^\.\./, // .. at start
		/\/\.\.\//, // /../
		/\\\.\.\\/, // \..\
		/\0/, // null bytes
		/[\r\n]/ // newlines
	];

	return !dangerousPatterns.some(pattern => pattern.test(filePath));
}

/**
 * Sanitizes a file path by removing potentially dangerous sequences
 * @param {string} filePath - The file path to sanitize
 * @returns {string} The sanitized file path
 */
function sanitizeFilePath (filePath) {
	if (typeof filePath !== STRING) {
		return EMPTY;
	}

	return filePath
		.replace(/\.\.\//g, EMPTY) // Remove ../
		.replace(/\.\.\\\\?/g, EMPTY) // Remove ..\ (with optional second backslash)
		.replace(/\0/g, EMPTY) // Remove null bytes
		.replace(/[\r\n]/g, EMPTY) // Remove newlines
		.replace(/\/+/g, SLASH) // Normalize multiple slashes
		.replace(/^\//, EMPTY); // Remove leading slash
}

/**
 * Validates if an IP address is properly formatted
 * @param {string} ip - IP address to validate
 * @returns {boolean} True if IP is valid format
 */
function isValidIP (ip) {
	if (!ip || typeof ip !== "string") {
		return false;
	}

	// Basic IPv4 validation
	const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
	const ipv4Match = ip.match(ipv4Regex);

	if (ipv4Match) {
		const octets = ipv4Match.slice(1).map(Number);

		// Check if all octets are valid (0-255)
		if (octets.some(octet => octet > 255)) {
			return false;
		}

		return true;
	}

	// IPv6 validation
	if (ip.includes(":")) {
		// Check for valid characters (hex digits, colons, and dots for IPv4-mapped addresses)
		if (!(/^[0-9a-fA-F:.]+$/).test(ip)) {
			return false;
		}

		// Handle IPv4-mapped IPv6 addresses (e.g., ::ffff:192.0.2.1)
		const ipv4MappedMatch = ip.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i);
		if (ipv4MappedMatch) {
			return isValidIP(ipv4MappedMatch[1]);
		}

		// Split on "::" to handle compressed notation
		const parts = ip.split("::");
		if (parts.length > 2) {
			return false; // More than one "::" is invalid
		}

		let leftPart = parts[0] || "";
		let rightPart = parts[1] || "";

		// Split each part by ":"
		const leftGroups = leftPart ? leftPart.split(":") : [];
		const rightGroups = rightPart ? rightPart.split(":") : [];

		// Check each group
		const allGroups = [...leftGroups, ...rightGroups];
		for (const group of allGroups) {
			if (group === "") {
				// Empty groups are only allowed in compressed notation context
				if (parts.length === 1) {
					return false; // Empty group without "::" compression
				}
			} else if (!(/^[0-9a-fA-F]{1,4}$/).test(group)) {
				// Each group must be 1-4 hex digits
				return false;
			}
		}

		// Calculate total number of groups
		const totalGroups = leftGroups.length + rightGroups.length;

		if (parts.length === 2) {
			// Compressed notation: total groups should be less than 8
			// Special case: "::" alone represents all zeros
			if (ip === "::") {
				return true;
			}
			// Remove empty groups from count (they represent compressed zeros)
			const nonEmptyGroups = allGroups.filter(g => g !== "").length;

			return nonEmptyGroups <= 8 && nonEmptyGroups < 8; // Must be compressed (< 8 groups)
		} else {
			// Full notation: must have exactly 8 groups
			return totalGroups === 8 && allGroups.every(g => g !== "");
		}
	}

	return false;
}

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
		this.corsExpose = EMPTY;
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
			const allMethods = this.routes(uri, WILDCARD, override).visible > INT_0,
				list = allMethods ? structuredClone(node_http.METHODS) : this.methods.filter(i => this.allowed(i, uri, override));

			// Add HEAD when GET is present
			if (list.includes(GET) && list.includes(HEAD) === false) {
				list.push(HEAD);
			}

			// Add OPTIONS for any route that has methods defined
			if (list.length > INT_0 && list.includes(OPTIONS) === false) {
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

		return this.logging.format.replace(LOG_V, req.headers?.host ?? HYPHEN)
			.replace(LOG_H, req?.ip ?? HYPHEN)
			.replace(LOG_L, HYPHEN)
			.replace(LOG_U, req?.parsed?.username ?? HYPHEN)
			.replace(LOG_T, `[${date.getDate()}/${MONTHS[date.getMonth()]}/${date.getFullYear()}:${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())} ${timeOffset(date.getTimezoneOffset())}]`)
			.replace(LOG_R, `${req.method} ${req.parsed.pathname}${req.parsed.search} HTTP/1.1`)
			.replace(LOG_S, res.statusCode)
			.replace(LOG_B, res?.getHeader(CONTENT_LENGTH) ?? HYPHEN)
			.replace(LOG_REFERRER, req.headers?.referer ?? HYPHEN)
			.replace(LOG_USER_AGENT, req.headers?.[USER_AGENT] ?? HYPHEN);
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
		return ORIGIN in req.headers && req.headers.origin.replace(/^http(s)?:\/\//, "") !== req.headers.host;
	}

	/**
	 * Decorates request and response objects with additional properties and methods
	 * @param {Object} req - HTTP request object
	 * @param {Object} res - HTTP response object
	 */
	decorate (req, res) {
		if (this.time) {
			req.precise = precise.precise().start();
		}

		const parsed = parse(req);

		req.parsed = parsed;
		req.allow = this.allows(parsed.pathname);
		req.body = EMPTY;
		req.corsHost = this.corsHost(req);
		req.cors = this.cors(req);
		req.host = parsed.hostname;
		req.ip = this.ip(req);
		req.params = {};
		req.valid = true;
		res.locals = {};
		res.error = this.error(req, res);
		res.header = res.setHeader;
		res.json = this.json(res);
		res.redirect = this.redirect(res);
		res.send = this.send(req, res);
		res.set = this.set(res);
		res.status = this.status(res);

		for (const i of this.defaultHeaders) {
			res.header(i[0], i[1]);
		}

		res.header(ALLOW, req.allow);
		res.header(X_CONTENT_TYPE_OPTIONS, NO_SNIFF);

		if (req.cors) {
			const headers = req.headers[ACCESS_CONTROL_REQUEST_HEADERS] ?? this.corsExpose;

			res.header(ACCESS_CONTROL_ALLOW_ORIGIN, req.headers.origin);
			res.header(TIMING_ALLOW_ORIGIN, req.headers.origin);
			res.header(ACCESS_CONTROL_ALLOW_CREDENTIALS, TRUE);

			if (headers !== void 0) {
				res.header(req.method === OPTIONS ? ACCESS_CONTROL_ALLOW_HEADERS : ACCESS_CONTROL_EXPOSE_HEADERS, headers);
			}

			res.header(ACCESS_CONTROL_ALLOW_METHODS, req.allow);
		}

		this.log(`type=decorate, uri=${req.parsed.pathname}, method=${req.method}, ip=${req.ip}, message="${MSG_DECORATED_IP.replace(IP_TOKEN, req.ip)}"`);
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
		// If no X-Forwarded-For header, return connection IP
		if (!(X_FORWARDED_FOR in req.headers) || !req.headers[X_FORWARDED_FOR].trim()) {
			return req.connection.remoteAddress || req.socket.remoteAddress || "127.0.0.1";
		}

		// Parse X-Forwarded-For header and find first valid IP
		const forwardedIPs = req.headers[X_FORWARDED_FOR].split(COMMA).map(ip => ip.trim());

		for (const ip of forwardedIPs) {
			if (isValidIP(ip)) {
				return ip;
			}
		}

		// Fall back to connection IP if no valid IP found
		return req.connection.remoteAddress || req.socket.remoteAddress || "127.0.0.1";
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
		const evc = CONNECT.toLowerCase(),
			evf = FINISH;
		let method = req.method === HEAD ? GET : req.method;

		this.decorate(req, res);

		if (this.listenerCount(evc) > INT_0) {
			this.emit(evc, req, res);
		}

		if (this.listenerCount(evf) > INT_0) {
			res.on(evf, () => this.emit(evf, req, res));
		}

		if (method === OPTIONS && this.allowed(method, req.parsed.pathname) === false) {
			method = GET; // Changing an OPTIONS request to GET due to absent route
		}

		this.log(`type=route, uri=${req.parsed.pathname}, method=${req.method}, ip=${req.ip}, message="${MSG_ROUTING}"`);

		if (req.cors === false && ORIGIN in req.headers && req.corsHost && this.origins.includes(req.headers.origin) === false) {
			req.valid = false;
			res.error(INT_403);
		} else if (req.allow.includes(method)) {
			const result = this.routes(req.parsed.pathname, method);

			if (result.params) {
				params(req, result.getParams);
			}

			req.exit = next(req, res, result.middleware.slice(result.exit, result.middleware.length)[Symbol.iterator](), true);
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

			result.visible = result.middleware.filter(i => this.ignored.has(i) === false).length;
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

				if (pipeable(req.method, body)) {
					if (req.headers.range === void 0 || req.range !== void 0) {
						writeHead(res, headers);
						body.on(ERROR, err => res.error(INT_500, err)).pipe(res);
					} else {
						res.error(INT_416);
					}
				} else {
					if (typeof body !== STRING && typeof body[TO_STRING] === FUNCTION) {
						body = body.toString();
					}

					if (req.headers.range !== void 0) {
						const buffered = Buffer.from(body);

						[headers] = partialHeaders(req, res, Buffer.byteLength(buffered), status, headers);

						if (req.range !== void 0) {
							this.onDone(req, res, buffered.slice(req.range.start, req.range.end).toString(), headers);
						} else {
							res.error(INT_416);
						}
					} else {
						res.statusCode = status;
						this.onDone(req, res, body, headers);
					}
				}

				this.log(`type=res.send, uri=${req.parsed.pathname}, method=${req.method}, ip=${req.ip}, valid=true, message="${MSG_SENDING_BODY}"`);
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
			res.setHeaders(arg instanceof Map || arg instanceof Headers ? arg : new Headers(arg));

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
		// Security: Validate and sanitize file path to prevent directory traversal
		if (!isSafeFilePath(arg)) {
			this.log(`type=serve, uri=${req.parsed.pathname}, method=${req.method}, ip=${req.ip}, message="Path traversal attempt blocked", path="${arg}"`, ERROR);
			res.error(INT_403);

			return;
		}

		const sanitizedPath = sanitizeFilePath(arg);
		const fp = node_path.join(folder, sanitizedPath);

		// Additional security check: ensure resolved path is within the base folder
		const absoluteFolder = node_path.join(process.cwd(), folder);
		const absoluteFilePath = node_path.join(process.cwd(), fp);

		if (!absoluteFilePath.startsWith(absoluteFolder)) {
			this.log(`type=serve, uri=${req.parsed.pathname}, method=${req.method}, ip=${req.ip}, message="Path traversal attempt blocked", resolvedPath="${absoluteFilePath}"`, ERROR);
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
			let options, headers;

			if (RANGE in req.headers) {
				[headers, options] = partialHeaders(req, res, file.stats.size);
				res.removeHeader(CONTENT_LENGTH);
				res.header(CONTENT_RANGE, headers[CONTENT_RANGE]);
				options.end--; // last byte offset

				if (CONTENT_LENGTH in headers) {
					res.header(CONTENT_LENGTH, headers[CONTENT_LENGTH]);
				}
			}

			res.send(node_fs.createReadStream(file.path, options), status);
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

const app = woodland({
		autoindex: true,
		defaultHeaders: {[CACHE_CONTROL]: NO_CACHE, [CONTENT_TYPE]: `${TEXT_PLAIN}; ${CHAR_SET}`},
		time: true
	}),
	argv = process.argv.filter(i => i.charAt(0) === HYPHEN && i.charAt(1) === HYPHEN).reduce((a, v) => {
		const x = v.split(`${HYPHEN}${HYPHEN}`)[1].split(EQUAL);

		a[x[0]] = tinyCoerce.coerce(x[1]);

		return a;
	}, {}),
	ip = argv.ip ?? LOCALHOST,
	port = argv.port ?? INT_8000;

let validPort = Number(port);
if (!Number.isInteger(validPort) || validPort < INT_0 || validPort > INT_65535) {
	app.log("Invalid port: must be an integer between 0 and 65535.", "error");
	process.exit(1);
}
let validIP = typeof ip === "string" && (/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/).test(ip);
if (!validIP) {
	app.log("Invalid IP: must be a valid IPv4 address.", "error");
	process.exit(1);
}

app.files();
node_http.createServer(app.route).listen(validPort, ip);
app.log(`id=woodland, hostname=localhost, ip=${ip}, port=${validPort}`, INFO);
