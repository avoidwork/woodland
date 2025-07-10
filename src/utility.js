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
	END,
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
	PERIOD,
	START,
	STRING,
	STRING_0,
	STRING_00,
	STRING_30,
	TIME_MS,
	TOKEN_N,
	UTF8,
	SLASH
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
	return req.allow.length > INT_0 ? req.method !== GET ? INT_405 : req.allow.includes(GET) ? res.statusCode > INT_500 ? res.statusCode : INT_500 : INT_404 : INT_404;
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
				while (obj.done === false && obj.value.length < 4) {
					obj = middleware.next();
				}

				if (obj.done === false) {
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
	const fn = immediate ? () => internalFn(undefined, fn) : err => process.nextTick(() => internalFn(err, fn));

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
		let safeValue = typeof decoded === "string" ? escapeHtml(decoded) : decoded;
		req.params[key] = coerce(safeValue);
	}
}

/**
 * Parses a URL string or request object into a URL object with security checks
 * @param {string|Object} arg - URL string or request object to parse
 * @returns {URL} Parsed URL object
 */
export function parse (arg) {
	return new URL(typeof arg === STRING ? arg : `http://${arg.headers.host || `localhost:${arg.socket.server._connectionKey.replace(/.*::/, EMPTY)}`}${arg.url}`);
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

/**
 * Validates if a file path is safe and doesn't contain directory traversal sequences
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
export function sanitizeFilePath (filePath) {
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
 * Validates if an IP address is in the expected format and not spoofed
 * @param {string} ipAddress - The IP address to validate
 * @returns {boolean} True if the IP address appears valid
 */
export function isValidIpAddress (ipAddress) {
	if (typeof ipAddress !== STRING || ipAddress === EMPTY) {
		return false;
	}

	// Basic IPv4 validation
	const ipv4Regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

	// Basic IPv6 validation
	const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;

	return ipv4Regex.test(ipAddress) || ipv6Regex.test(ipAddress);
}

/**
 * Extracts IP address from X-Forwarded-For header safely
 * @param {string} xForwardedFor - The X-Forwarded-For header value
 * @returns {string|null} The extracted IP address or null if invalid
 */
export function extractForwardedIp (xForwardedFor) {
	if (typeof xForwardedFor !== STRING || xForwardedFor === EMPTY) {
		return null;
	}

	// Get the first IP (leftmost) which should be the original client IP
	const ips = xForwardedFor.split(COMMA).map(ip => ip.trim());

	for (const ip of ips) {
		if (isValidIpAddress(ip)) {
			// Additional check for private/local addresses that shouldn't be trusted
			if (!(ip.startsWith("10.") || ip.startsWith("192.168.") || ip.startsWith("127.") ||
				ip.startsWith("172.") || ip === "::1" || ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80"))) {
				return ip;
			}
		}
	}

	return null;
}
