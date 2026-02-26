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
 * Determines the appropriate HTTP status code based on request and response state
 * @param {Object} req - The HTTP request object
 * @param {Object} res - The HTTP response object
 * @returns {number} The appropriate HTTP status code
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
 * Parses a URL string or request object into a URL object with security checks
 * @param {string|Object} arg - URL string or request object to parse
 * @returns {URL} Parsed URL object
 */
export function parse (arg) {
	if (typeof arg === STRING) {
		return new URL(arg);
	}

	const host = arg.headers?.host || "localhost:8000";
	const port = host.includes(":") && !host.startsWith("[") ? host.split(":")[1] : "8000";
	const connectionIP = arg.connection?.remoteAddress || arg.socket?.remoteAddress || "localhost";

	return new URL(`${arg.url}`, `http://${connectionIP}:${port}`);
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
 * Writes HTTP response headers using writeHead method
 * @param {Object} res - The HTTP response object
 * @param {Object} [headers={}] - Headers object to write
 */
export function writeHead (res, headers = {}) {
	res.writeHead(res.statusCode, STATUS_CODES[res.statusCode], headers);
}

// Pre-compiled regex patterns for better performance
const IPV4_PATTERN = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
const IPV6_CHAR_PATTERN = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}|[0-9a-fA-F]{1,4}::(?:[0-9a-fA-F]{1,4}:){0,5}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,7}:|::1|::$/;
const IPV4_MAPPED_PATTERN = /^::ffff:(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/i;

/**
 * Validates if an IP address is properly formatted
 * @param {string} ip - IP address to validate
 * @returns {boolean} True if IP is valid format
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
		return isValidIP(ipv4MappedMatch[0].replace(/^::ffff:/, ""));
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

		// Validate each group has at most 4 hex digits and only hex characters
		const allGroups = [...nonEmptyLeft, ...nonEmptyRight];
		for (const group of allGroups) {
			if (group.length > 4 || !(/^[0-9a-fA-F]+$/).test(group)) {
				return false;
			}
		}

		return true;
	} else {
		// Full notation: check for exactly 8 groups and 1-4 hex digits per group
		const groups = ip.split(":");
		if (groups.length !== 8) {
			return false;
		}

		// Validate each group has at most 4 hex digits
		for (const group of groups) {
			if (group.length > 4) {
				return false;
			}
		}

		return true;
	}
}

