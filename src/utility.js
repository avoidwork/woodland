import {extname, join} from "node:path";
import {readFileSync} from "node:fs";
import {STATUS_CODES} from "node:http";
import {fileURLToPath, URL} from "node:url";
import {coerce} from "tiny-coerce";
import {lru} from "tiny-lru";
import mimeDb from "mime-db";
import {
	APPLICATION_OCTET_STREAM,
	COMMA,
	CONTENT_LENGTH,
	CONTENT_RANGE,
	EMPTY,
	END,
	ETAG,
	EXTENSIONS,
	FUNCTION,
	GET,
	HEAD,
	HTTP_PROTOCOL,
	HTTPS_PROTOCOL,
	HYPHEN,
	INT_0,
	INT_1,
	INT_4,
	INT_8,
	INT_10,
	INT_1e6,
	INT_2,
	INT_206,
	INT_255,
	INT_3,
	INT_404,
	INT_405,
	INT_500,
	INT_60,
	INT_65535,
	IPV6_ALL_ZEROS,
	IPV6_DOUBLE_COLON,
	IPV6_IPV4_MAPPED_PREFIX,
	IPV6_INVALID_TRIPLE_COLON,
	KEY_BYTES,
	PERIOD,
	START,
	STRING,
	STRING_0,
	STRING_00,
	STRING_30,
	UTF8,
	SLASH,
	COLON
} from "./constants.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url)),
	html = readFileSync(join(__dirname, "..", "tpl", "autoindex.html"), {encoding: UTF8}),
	valid = Object.entries(mimeDb).filter(i => EXTENSIONS in i[1]),
	extensions = valid.reduce((a, v) => {
		const result = Object.assign({type: v[0]}, v[1]);

		for (const key of result.extensions) {
			a[`.${key}`] = result;
		}

		return a;
	}, {}),
	// Optimized caching for frequently called validation functions
	ipValidationCache = lru(500, 300000); // Cache 500 IPs for 5 minutes

/**
 * Escapes HTML special characters to prevent XSS attacks
 * @param {string} [str=""] - The string to escape
 * @returns {string} The escaped string with HTML entities
 */
function escapeHtml (str = EMPTY) {
	const htmlEntities = {
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		'"': "&quot;",
		"'": "&#39;"
	};

	return str.replace(/[&<>"']/g, char => htmlEntities[char]);
}

/**
 * Generates an HTML autoindex page for directory listings
 * @param {string} [title=""] - The title for the autoindex page
 * @param {Array} [files=[]] - Array of file objects from fs.readdir with withFileTypes: true
 * @returns {string} The complete HTML string for the autoindex page
 */
export function autoindex (title = EMPTY, files = []) {
	const safeTitle = escapeHtml(title);

	// Security: Generate file listing with proper HTML escaping
	const fileListItems = ["    <li><a href=\"..\" rel=\"collection\">../</a></li>"];

	for (const file of files) {
		const safeName = escapeHtml(file.name);
		const safeHref = encodeURIComponent(file.name);
		const isDir = file.isDirectory();
		const displayName = isDir ? `${safeName}/` : safeName;
		const href = isDir ? `${safeHref}/` : safeHref;
		const rel = isDir ? "collection" : "item";

		fileListItems.push(`    <li><a href="${href}" rel="${rel}">${displayName}</a></li>`);
	}

	const safeFiles = fileListItems.join("\n");

	return html.replace(/\$\{\s*TITLE\s*\}/g, safeTitle)
		.replace(/\$\{\s*FILES\s*\}/g, safeFiles);
}

/**
 * Determines the appropriate HTTP status code based on request and response state
 * @param {Object} req - The HTTP request object
 * @param {Object} res - The HTTP response object
 * @returns {number} The appropriate HTTP status code
 */
export function getStatus (req, res) {
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

/**
 * Gets the MIME type for a file based on its extension
 * @param {string} [arg=""] - The filename or path to get the MIME type for
 * @returns {string} The MIME type or application/octet-stream as default
 */
export function mime (arg = EMPTY) {
	const ext = extname(arg);

	return ext in extensions ? extensions[ext].type : APPLICATION_OCTET_STREAM;
}

/**
 * Formats a time value in milliseconds with specified precision
 * @param {number} [arg=0] - The time value in nanoseconds
 * @param {number} [digits=3] - Number of decimal places for precision
 * @returns {string} Formatted time string with "ms" suffix
 */
export function ms (arg = INT_0, digits = INT_3) {
	return `${Number(arg / INT_1e6).toFixed(digits)}ms`;
}

/**
 * Creates a next function for middleware processing with error handling
 * @param {Object} req - The HTTP request object
 * @param {Object} res - The HTTP response object
 * @param {Iterator} middleware - The middleware iterator
 * @param {boolean} [immediate=false] - Whether to execute immediately or on next tick
 * @returns {Function} The next function for middleware chain
 */
export function next (req, res, middleware, immediate = false) {
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
export function pad (arg = INT_0) {
	return String(arg).padStart(INT_2, STRING_0);
}

/**
 * Extracts and processes URL parameters from request path
 * @param {Object} req - The HTTP request object
 * @param {RegExp} getParams - Regular expression for parameter extraction
 */
export function params (req, getParams) {
	getParams.lastIndex = INT_0;
	req.params = getParams.exec(req.parsed.pathname)?.groups ?? {};

	for (const [key, value] of Object.entries(req.params)) {
		let decoded = decodeURIComponent(value);
		let safeValue = typeof decoded === STRING ? escapeHtml(decoded) : decoded;
		req.params[key] = coerce(safeValue);
	}
}

/**
 * Parses a URL string or request object into a URL object with security checks
 * @param {string|Object} arg - URL string or request object to parse
 * @returns {URL} Parsed URL object
 */
export function parse (arg) {
	return new URL(typeof arg === STRING ? arg : `http://${arg.headers.host || `localhost:${arg.socket?.server?._connectionKey?.replace(/.*::/, EMPTY) || "8000"}`}${arg.url}`);
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
export function partialHeaders (req, res, size, status, headers = {}, options = {}) {
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
			status = res.statusCode = INT_206;
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
export function pipeable (method, arg) {
	return method !== HEAD && arg !== null && arg !== undefined && typeof arg.on === FUNCTION;
}

/**
 * Processes middleware map for a given URI and populates middleware array
 * @param {string} uri - The URI to match against
 * @param {Map} [map=new Map()] - Map of middleware handlers
 * @param {Object} [arg={}] - Object containing middleware array and parameters
 */
export function reduce (uri, map = new Map(), arg = {}) {
	for (const i of map.values()) {
		i.regex.lastIndex = INT_0;

		if (i.regex.test(uri)) {
			for (const fn of i.handlers) {
				arg.middleware.push(fn);
			}

			if (i.params && arg.params === false) {
				arg.params = true;
				arg.getParams = i.regex;
			}
		}
	}
}

/**
 * Formats a time offset value into a string representation
 * @param {number} [arg=0] - Time offset value
 * @returns {string} Formatted time offset string
 */
export function timeOffset (arg = INT_0) {
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
export function writeHead (res, headers = {}) {
	res.writeHead(res.statusCode, STATUS_CODES[res.statusCode], headers);
}

// Optimized dangerous character detection for file path validation - non-global for test, global for replace
const DANGEROUS_PATH_CHARS = /[\r\n\0]/;

/**
 * Validates if a file path is safe and doesn't contain dangerous characters
 * @param {string} filePath - The file path to validate
 * @returns {boolean} True if the path is safe, false otherwise
 */
export function isSafeFilePath (filePath) {
	if (typeof filePath !== STRING) {
		return false;
	}

	// Empty string is safe (represents root directory)
	if (filePath === EMPTY) {
		return true;
	}

	// Check for dangerous characters using optimized regex test
	// Test for null bytes and newlines (using non-global regex to avoid lastIndex issues)
	return !DANGEROUS_PATH_CHARS.test(filePath);
}

/**
 * Sanitizes a file path by removing potentially dangerous sequences
 * @param {string} filePath - The file path to sanitize
 * @returns {string} The sanitized file path
 */
export function sanitizeFilePath (filePath) {
	if (typeof filePath !== STRING) {
		return EMPTY;
	}

	// Optimized single-pass sanitization using fresh regex instances to avoid state issues
	return filePath
		.replace(/\.\.\//g, EMPTY) // Remove ../
		.replace(/\.\.\\\\?/g, EMPTY) // Remove ..\ (with optional second backslash)
		.replace(/[\r\n\0]/g, EMPTY) // Remove dangerous chars (fresh global regex instance)
		.replace(/\/+/g, SLASH) // Normalize multiple slashes
		.replace(/^\//, EMPTY); // Remove leading slash
}

/**
 * Internal function that performs the actual IP validation without caching
 * @param {string} ip - IP address to validate
 * @returns {boolean} True if IP is valid format
 */
function validateIPInternal (ip) {
	// IPv4 validation - optimized with combined validation
	if (!ip.includes(COLON)) {
		const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
		const ipv4Match = ip.match(ipv4Regex);

		if (ipv4Match) {
			// Validate octets inline to avoid array creation and iteration
			for (let i = INT_1; i <= INT_4; i++) {
				const octet = parseInt(ipv4Match[i], INT_10);
				if (octet > INT_255) {
					return false;
				}
			}

			return true;
		}

		return false;
	}

	// IPv6 validation - optimized for performance
	// Early check for invalid patterns
	if (ip.includes(IPV6_INVALID_TRIPLE_COLON) || !(/^[0-9a-fA-F:.]+$/).test(ip)) {
		return false;
	}

	// Handle IPv4-mapped IPv6 addresses first (most common case)
	const ipv4MappedMatch = ip.match(new RegExp(`^${IPV6_IPV4_MAPPED_PREFIX.replace(/:/g, "\\:")}(\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3})$`, "i"));
	if (ipv4MappedMatch) {
		return validateIPInternal(ipv4MappedMatch[1]);
	}

	// Special case for all-zeros
	if (ip === IPV6_ALL_ZEROS) {
		return true;
	}

	// Optimized IPv6 validation
	const parts = ip.split(IPV6_DOUBLE_COLON);
	if (parts.length > 2) {
		return false;
	}

	// For compressed notation (::)
	if (parts.length === 2) {
		const leftGroups = parts[0] ? parts[0].split(COLON) : [];
		const rightGroups = parts[1] ? parts[1].split(COLON) : [];

		// Check group validity and count non-empty groups in single pass
		let nonEmptyCount = 0;
		for (const group of [...leftGroups, ...rightGroups]) {
			if (group !== EMPTY) {
				if (!(/^[0-9a-fA-F]{1,4}$/).test(group)) {
					return false;
				}
				nonEmptyCount++;
			}
		}

		return nonEmptyCount < INT_8; // Must be compressed
	}

	// Full notation (no ::)
	const groups = ip.split(COLON);
	if (groups.length !== INT_8) {
		return false;
	}

	// Validate all groups in single pass
	for (const group of groups) {
		if (!group || !(/^[0-9a-fA-F]{1,4}$/).test(group)) {
			return false;
		}
	}

	return true;
}

/**
 * Validates if an IP address is properly formatted with caching for performance
 * @param {string} ip - IP address to validate
 * @returns {boolean} True if IP is valid format
 */
export function isValidIP (ip) {
	if (!ip || typeof ip !== STRING) {
		return false;
	}

	// Check cache first for performance optimization
	const cached = ipValidationCache.get(ip);
	if (cached !== undefined) {
		return cached;
	}

	// Perform validation and cache result
	const result = validateIPInternal(ip);
	ipValidationCache.set(ip, result);

	return result;
}

/**
 * Validates if an Origin header value is safe to use in response headers
 * @param {string} origin - Origin header value to validate
 * @returns {boolean} True if origin is valid and safe
 */
export function isValidOrigin (origin) {
	if (!origin || typeof origin !== STRING) {
		return false;
	}

	// Check for dangerous characters that could enable header injection
	// Check for \r, \n, null, backspace, vertical tab, form feed
	if (origin.indexOf("\r") !== -1 || origin.indexOf("\n") !== -1 ||
		origin.indexOf("\0") !== -1 || origin.indexOf(String.fromCharCode(8)) !== -1 ||
		origin.indexOf(String.fromCharCode(11)) !== -1 || origin.indexOf(String.fromCharCode(12)) !== -1) {
		return false;
	}

	// Basic URL validation - should start with http:// or https://
	return origin.startsWith(HTTP_PROTOCOL) || origin.startsWith(HTTPS_PROTOCOL);
}

// Optimized dangerous character detection for header validation - non-global for test
// eslint-disable-next-line no-control-regex
const DANGEROUS_HEADER_CHARS = /[\r\n\0\x08\x0B\x0C]/;

/**
 * Checks if a header value contains dangerous characters that could enable header injection
 * @param {string} headerValue - Header value to check
 * @returns {boolean} True if dangerous characters are found
 */
function hasDangerousHeaderChars (headerValue) {
	return DANGEROUS_HEADER_CHARS.test(headerValue);
}

/**
 * Sanitizes a header value by removing potentially dangerous characters
 * @param {string} headerValue - Header value to sanitize
 * @returns {string} Sanitized header value
 */
export function sanitizeHeaderValue (headerValue) {
	if (!headerValue || typeof headerValue !== STRING) {
		return EMPTY;
	}

	// Remove characters that could enable header injection using fresh regex instance to avoid state issues
	// Removes \r, \n, null, backspace, vertical tab, form feed
	// eslint-disable-next-line no-control-regex
	return headerValue.replace(/[\r\n\0\x08\x0B\x0C]/g, EMPTY).trim();
}

/**
 * Validates if a header value is safe for use in HTTP headers
 * @param {string} headerValue - Header value to validate
 * @returns {boolean} True if header value is safe
 */
export function isValidHeaderValue (headerValue) {
	if (!headerValue || typeof headerValue !== STRING) {
		return false;
	}

	// Check for characters that could enable header injection using optimized regex
	return !hasDangerousHeaderChars(headerValue);
}

/**
 * Validates if a port number is valid
 * @param {number} port - Port number to validate
 * @returns {boolean} True if port is valid (integer between 0 and 65535)
 */
export function isValidPort (port) {
	return Number.isInteger(port) && port >= INT_0 && port <= INT_65535;
}
