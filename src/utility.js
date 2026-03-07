import {extname, join} from "node:path";
import {readFileSync} from "node:fs";
import {STATUS_CODES} from "node:http";
import {fileURLToPath, URL} from "node:url";
import {coerce} from "tiny-coerce";
import mimeDb from "mime-db";
import {
	APPLICATION_OCTET_STREAM,
	COMMA,
	CONTENT_LENGTH,
	CONTENT_RANGE,
	EMPTY,
	ETAG,
	EXTENSIONS,
	FUNCTION,
	GET,
	HEAD,
	HYPHEN,
	INT_0,
	INT_10,
	INT_1e6,
	INT_2,
	INT_206,
	INT_3,
	INT_404,
	INT_405,
	INT_500,
	INT_60,
	KEY_BYTES,
	STRING,
	STRING_0,
	TIME_MS,
	TOKEN_N,
	UTF8
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
	}, {});

/**
 * Escapes HTML entities to prevent Cross-Site Scripting (XSS) attacks
 * Transforms &, <, >, ", ' into their respective HTML entities
 * @param {string} [str=""] - Input string containing potential XSS vectors
 * @returns {string} HTML-safe string with special characters escaped
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
 * Generates HTML autoindex page for directory browser interface
 * Escapes HTML content and creates styled list of files/directories with ../ navigation
 * @param {string} [title=""] - Page display title (will be HTML-escaped)
 * @param {Array} [files=[]] - Array of fs.Dirent objects (from readdir withFileTypes:true)
 * @returns {string} Complete HTML document with autoindex template
 */
export function autoindex (title = EMPTY, files = []) {
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
 * Determines HTTP response status code based on request/response state
 * Returns 404, 405, 500, or existing status depending on methods, allow list, and error state
 * @param {IncomingMessage} req - HTTP request (must have allow[], method properties)
 * @param {ServerResponse} res - HTTP response (must have statusCode property)
 * @returns {number} Appropriate status code (404, 405, 500, or existing status)
 */
export function getStatus (req, res) {
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
 * Gets MIME type string for file based on extension lookup in mime-db
 * Returns application/octet-stream for unknown extensions
 * @param {string} [filePath=""] - File path or filename to determine MIME type for
 * @returns {string} MIME type string (e.g., "text/plain", "image/png")
 */
export function mime (arg = EMPTY) {
	const ext = extname(arg);

	return ext in extensions ? extensions[ext].type : APPLICATION_OCTET_STREAM;
}

/**
 * Formats response time in milliseconds with configurable decimal places
 * @param {number} [ms=0] - Time value in milliseconds to format
 * @param {number} [digits=3] - Number of decimal places for precision (0-10)
 * @returns {string} Formatted time string (e.g., "123.456ms")
 */
export function ms (arg = INT_0, digits = INT_3) {
	return TIME_MS.replace(TOKEN_N, Number(arg / INT_1e6).toFixed(digits));
}

/**
 * Creates callback-based middleware executor with error handling and async support
 * Builds async recursion for middleware chain, handles errors by finding error handlers or returning status
 * @param {IncomingMessage} req - HTTP request context for error status calculation
 * @param {ServerResponse} res - HTTP response object with error, send methods
 * @param {Iterator<Function>} middleware - Middleware generator iterator from next()
 * @param {boolean} [immediate=false] - Execute on next tick (false) or immediately (true)
 * @returns {(err=*) => void} next() callback function for middleware chain
 */
export function next (req, res, middleware, immediate = false) {
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
 * Pads numeric values with leading zeros to ensure 2-digit width
 * Used for timestamp formatting (hours, minutes, seconds)
 * @param {number} [num=0] - Integer to pad
 * @returns {string} Zero-padded string representation (e.g., 5 → "05", 42 → "42")
 */
export function pad (arg = INT_0) {
	return String(arg).padStart(INT_2, STRING_0);
}

/**
 * Extracts, decodes, and URL-handles route parameters from request path
 * Executes regex match, parses named groups, applies HTML escaping and coercion
 * @param {IncomingMessage} req - HTTP request (must have parsed.pathname and params object)
 * @param {RegExp} getParams - Compiled regex from route path with named captures
 * @returns {void}
 */
export function params (req, getParams) {
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
			processedParams[key] = coerce(null);
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

			processedParams[key] = coerce(escapeHtml(decoded));
		}
	}

	req.params = processedParams;
}

/**
 * Parses URL string or request object into standardized URL object
 * Handles request conversion by extracting host and URL from Node.js HTTP objects
 * @param {string|IncomingMessage} arg - URL string or Node.js HTTP request object
 * @returns {URL} Parsed URL object with protocol, host, pathname, search properties
 */
export function parse (arg) {
	return new URL(typeof arg === STRING ? arg : `http://${arg.headers.host || `localhost:${arg.socket?.server?._connectionKey?.replace(/.*::/, EMPTY) || "8000"}`}${arg.url}`);
}

/**
 * Parses partial content range headers and validates range specifications
 * Handles byte ranges, returns 206 partial content info or invalid range error
 * @param {IncomingMessage} req - HTTP request (must have headers.range)
 * @param {ServerResponse} res - HTTP response (must have header, removeHeader methods)
 * @param {number} size - Total file/content size in bytes
 * @param {number} status - Current or desired status code (becomes 206 if valid range)
 * @param {Object} headers - Output headers map for Content-Range, Content-Length
 * @param {Object} options - Output options object for range {start, end}
 * @returns {[Object, Object]} [updatedHeaders, rangeOptions] with modified headers and optional range
 */
export function partialHeaders (req, res, size, status, headers = {}, options = {}) {
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
 * Pipes HTTP method and response body to check if streamable
 * Checks if method supports streaming and object has 'on' listener for error handling
 * @param {string} method - HTTP request method (GET, HEAD, OPTIONS)
 * @param {*|Stream} arg - Response body to check for pipeability (Stream, Buffer, or string)
 * @returns {boolean} True if body can be piped to response (not HEAD and has on method)
 */
export function pipeable (method, arg) {
	return method !== HEAD && arg !== null && arg !== undefined && typeof arg.on === FUNCTION;
}

/**
 * Processes middleware Map and array for URI matching, building route handler stack
 * Tests URI against middleware regex patterns and accumulates handlers, tracks presence of params
 * @param {string} uri - Request path URI to match against route patterns
 * @param {Map<string, {regex:RegExp, handlers:Function[], params:boolean}>} map - Middleware Map from Woodland instance
 * @param {{middleware:Function[], params:boolean, getParams:RegExp|null}} arg - Output object for populated middleware array and param detection
 * @returns {void}
 */
export function reduce (uri, map = new Map(), arg = {}) {
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
export function timeOffset (arg = INT_0) {
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
 * Writes all response headers at once using Node.js HTTP writeHead method
 * Includes status code, status text from STATUS_CODES, and headers map
 * @param {ServerResponse} res - HTTP response object (must have writeHead method)
 * @param {Object} headers - Headers object to write (plain object or Headers instance)
 * @returns {void}
 */
export function writeHead (res, headers = {}) {
	res.writeHead(res.statusCode, STATUS_CODES[res.statusCode], headers);
}

// Pre-compiled regex patterns for better performance
const IPV4_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const IPV6_CHAR_PATTERN = /^[0-9a-fA-F:.]+$/;
const IPV4_MAPPED_PATTERN = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i;
const HEX_GROUP_PATTERN = /^[0-9a-fA-F]{1,4}$/;

/**
 * Validates IPv4 or IPv6 address format including IPv4-mapped IPv6 and :: compression
 * Performs rigorous format validation with octet ranges and hex group checking
 * @param {string|number|*} ip - Address string to validate (must be string)
 * @returns {boolean} True if valid IP address format (rejects non-string and invalid formats)
 */
export function isValidIP (ip) {
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

