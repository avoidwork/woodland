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
	const match = getParams.exec(req.parsed.pathname);
	req.params = match?.groups ?? {};

	// Process parameters in a single loop
	for (const [key, value] of Object.entries(req.params)) {
		try {
			const decoded = decodeURIComponent(value);
			req.params[key] = coerce(escapeHtml(decoded));
		} catch {
			// If decoding fails, escape the original value
			req.params[key] = coerce(escapeHtml(value));
		}
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
	const rangeHeader = req.headers.range;

	if (!rangeHeader || !rangeHeader.startsWith(KEY_BYTES)) {
		return [headers, options];
	}

	// Parse range header more efficiently
	const rangePart = rangeHeader.slice(KEY_BYTES.length);
	const [rangeSpec] = rangePart.split(COMMA);
	const [startStr, endStr] = rangeSpec.split(HYPHEN);

	let start = startStr ? parseInt(startStr, INT_10) : NaN;
	let end = endStr ? parseInt(endStr, INT_10) : NaN;

	// Handle suffix-byte-range-spec (e.g., "-500" means last 500 bytes)
	if (isNaN(start) && !isNaN(end)) {
		start = size - end;
		end = size - 1;
	} else if (!isNaN(start) && isNaN(end)) {
		end = size - 1;
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
	// Iterate directly over map values without creating intermediate array
	for (const middleware of map.values()) {
		middleware.regex.lastIndex = INT_0;

		if (middleware.regex.test(uri)) {
			// Add all handlers at once using spread operator
			arg.middleware.push(...middleware.handlers);

			// Set params info if needed
			if (middleware.params && arg.params === false) {
				arg.params = true;
				arg.getParams = middleware.regex;
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

/**
 * Validates if an IP address is properly formatted
 * @param {string} ip - IP address to validate
 * @returns {boolean} True if IP is valid format
 */
export function isValidIP (ip) {
	if (!ip || typeof ip !== "string") {
		return false;
	}

	// IPv4 validation
	if (!ip.includes(":")) {
		const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
		const match = ip.match(ipv4Pattern);

		if (!match) {
			return false;
		}

		// Check octets are in valid range (0-255)
		return match.slice(1).every(octet => {
			const num = parseInt(octet, 10);

			return num >= 0 && num <= 255;
		});
	}

	// IPv6 validation
	// Quick check for valid characters
	if (!(/^[0-9a-fA-F:.]+$/).test(ip)) {
		return false;
	}

	// Handle IPv4-mapped IPv6 addresses
	const ipv4MappedMatch = ip.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i);
	if (ipv4MappedMatch) {
		return isValidIP(ipv4MappedMatch[1]);
	}

	// Handle "::" compression
	const doublColonParts = ip.split("::");
	if (doublColonParts.length > 2) {
		return false;
	}

	// Special case for "::" alone
	if (ip === "::") {
		return true;
	}

	const isCompressed = doublColonParts.length === 2;
	let groups;

	if (isCompressed) {
		const leftGroups = doublColonParts[0] ? doublColonParts[0].split(":") : [];
		const rightGroups = doublColonParts[1] ? doublColonParts[1].split(":") : [];
		groups = [...leftGroups, ...rightGroups].filter(g => g !== "");

		// Must be compressed (less than 8 groups)
		if (groups.length >= 8) {
			return false;
		}
	} else {
		groups = ip.split(":");
		// Full notation must have exactly 8 groups
		if (groups.length !== 8) {
			return false;
		}
	}

	// Validate each group (1-4 hex digits)
	return groups.every(group => group && (/^[0-9a-fA-F]{1,4}$/).test(group));
}
