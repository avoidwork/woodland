/**
 * woodland
 *
 * @copyright 2026 Jason Mulligan <jason.mulligan@avoidwork.com>
 * @license BSD-3-Clause
 * @version 20.2.10
 */
import {STATUS_CODES,METHODS}from'node:http';import {EventEmitter}from'node:events';import {readFileSync,createReadStream}from'node:fs';import {etag}from'tiny-etag';import {precise}from'precise';import {createRequire}from'node:module';import {join,extname,resolve}from'node:path';import {fileURLToPath,URL}from'node:url';import {coerce}from'tiny-coerce';import mimeDb from'mime-db';import {Validator}from'jsonschema';import {stat,readdir}from'node:fs/promises';const __dirname$2 = fileURLToPath(new URL(".", import.meta.url));
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

// =============================================================================
// HTTP STATUS CODES
// =============================================================================
const INT_200 = 200;
const INT_204 = 204;
const INT_206 = 206;
const INT_304 = 304;
const INT_403 = 403;
const INT_404 = 404;
const INT_416 = 416;

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
const LOCATION = "location";
const NO_SNIFF = "nosniff";
const ORIGIN = "origin";
const RANGE = "range";
const SERVER = "server";
const TIMING_ALLOW_ORIGIN = "timing-allow-origin";
const X_CONTENT_TYPE_OPTIONS = "x-content-type-options";
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

// =============================================================================
// NUMERIC CONSTANTS
// =============================================================================
const INT_0 = 0;
const INT_2 = 2;
const INT_3 = 3;
const INT_10 = 10;
const INT_60 = 60;
const INT_1e3 = 1e3;
const INT_1e4 = 1e4;
const COMMA = ",";
const DELIMITER = "|";
const EMPTY = "";
const HYPHEN = "-";
const LEFT_PAREN = "(";
const SLASH = "/";
const STRING_0 = "0";
const WILDCARD = "*";
const FUNCTION = "function";
const STRING = "string";

// =============================================================================
// LOGGING & DEBUGGING
// =============================================================================
const DEBUG = "debug";
const ERROR = "error";
const INFO = "info";
const LOG_FORMAT = '%h %l %u %t "%r" %>s %b';

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
const SHORT = "short";
const TO_STRING = "toString";
const TRUE = "true";

const MONTHS = Object.freeze(
	Array.from(Array(12).values()).map((i, idx) => {
		const d = new Date();
		d.setMonth(idx);

		return Object.freeze(d.toLocaleString(EN_US, { month: SHORT }));
	}),
);const __dirname$1 = fileURLToPath(new URL(".", import.meta.url)),
	html = readFileSync(join(__dirname$1, "..", "tpl", "autoindex.html"), { encoding: UTF8 }),
	valid = Object.entries(mimeDb).filter((i) => EXTENSIONS in i[1]),
	mimeExtensions = valid.reduce((a, v) => {
		const result = Object.assign({ type: v[0] }, v[1]);

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
function escapeHtml(str = EMPTY) {
	// Use lookup table for single-pass replacement
	const htmlEscapes = {
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		'"': "&quot;",
		"'": "&#39;",
	};

	return str.replace(/[&<>"']/g, (match) => htmlEscapes[match]);
}

/**
 * Generates an HTML autoindex page for directory listings
 * @param {string} [title=""] - The title for the autoindex page
 * @param {Array} [files=[]] - Array of file objects from fs.readdir with withFileTypes: true
 * @returns {string} The complete HTML string for the autoindex page
 */
function autoindex(title = EMPTY, files = []) {
	const safeTitle = escapeHtml(title);

	// Optimized: Fast path for empty files array
	if (files.length === 0) {
		return html.replace(/\$\{\s*(TITLE|FILES)\s*\}/g, (match, key) => {
			return key === "TITLE" ? safeTitle : '    <li><a href=".." rel="collection">../</a></li>';
		});
	}

	// Pre-allocate array for better performance
	const listItems = Array.from({ length: files.length + 1 });
	listItems[0] = '    <li><a href=".." rel="collection">../</a></li>';

	// Optimized: Cache file count and optimize loop
	const fileCount = files.length;
	for (let i = 0; i < fileCount; i++) {
		const file = files[i];
		const fileName = file.name;
		const safeName = escapeHtml(fileName);
		const safeHref = encodeURIComponent(fileName);
		const isDir = file.isDirectory();

		// Optimized: Use ternary operator for better performance
		listItems[i + 1] = isDir
			? `    <li><a href="${safeHref}/" rel="collection">${safeName}/</a></li>`
			: `    <li><a href="${safeHref}" rel="item">${safeName}</a></li>`;
	}

	const safeFiles = listItems.join("\n");

	// Optimized: Cache replace callback for reuse
	const replaceCallback = (match, key) => (key === "TITLE" ? safeTitle : safeFiles);

	return html.replace(/\$\{\s*(TITLE|FILES)\s*\}/g, replaceCallback);
}

/**
 * Extracts and processes URL parameters from request path
 * @param {Object} req - The HTTP request object
 * @param {RegExp} getParams - Regular expression for parameter extraction
 */
function params(req, getParams) {
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
function parse(arg) {
	return new URL(
		typeof arg === STRING
			? arg
			: `http://${arg.headers.host || `localhost:${arg.socket?.server?._connectionKey?.replace(/.*::/, EMPTY) || "8000"}`}${arg.url}`,
	);
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
function pipeable(method, arg) {
	return method !== HEAD && arg !== null && arg !== undefined && typeof arg.on === FUNCTION;
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

/**
 * Writes HTTP response headers using writeHead method
 * @param {Object} res - The HTTP response object
 * @param {Object} [headers={}] - Headers object to write
 */
function writeHead(res, headers = {}) {
	res.writeHead(res.statusCode, STATUS_CODES[res.statusCode], headers);
}

/**
 * Converts a route path with parameters to a regex pattern
 * @param {string} [arg=''] - Route path with parameter placeholders
 * @returns {string} Regex pattern string
 */
function extractPath(arg = EMPTY) {
	return arg.replace(/\/:([^/]+)/g, "/(?<$1>[^/]+)");
}/**
 * Processes middleware map for a given URI and populates middleware array
 * @param {string} uri - The URI to match against
 * @param {Map} [map=new Map()] - Map of middleware handlers
 * @param {Object} [arg={}] - Object containing middleware array and parameters
 */
function reduce(uri, map = new Map(), arg = {}) {
	if (map.size === 0) {
		return;
	}

	const middlewareArray = arg.middleware;
	let paramsFound = arg.params;
	const values = map.values();
	const valuesArray = Array.from(values);
	const valueCount = valuesArray.length;

	for (let i = 0; i < valueCount; i++) {
		const middleware = valuesArray[i];
		middleware.regex.lastIndex = 0;

		if (middleware.regex.test(uri)) {
			const handlers = middleware.handlers;
			const handlerCount = handlers.length;

			if (handlerCount === 1) {
				middlewareArray.push(handlers[0]);
			} else if (handlerCount > 1) {
				middlewareArray.push.apply(middlewareArray, handlers);
			}

			if (middleware.params && paramsFound === false) {
				arg.params = true;
				arg.getParams = middleware.regex;
				paramsFound = true;
			}
		}
	}
}

/**
 * Determines the appropriate HTTP status code based on request and response state
 * @param {Object} req - The HTTP request object
 * @param {Object} res - The HTTP response object
 * @returns {number} The appropriate HTTP status code
 */
function getStatus(req, res) {
	if (req.allow.length === 0) {
		return 404;
	}

	if (req.method !== "GET") {
		return 405;
	}

	if (req.allow.includes("GET") === false) {
		return 404;
	}

	return res.statusCode > 500 ? res.statusCode : 500;
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
	const errorStatus = getStatus(req, res);

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
					res.error(errorStatus);
				}
			} else {
				const value = obj.value;
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

	const fn = immediate
		? (err) => internalFn(err, fn)
		: (err) => process.nextTick(() => internalFn(err, fn));

	return fn;
}

/**
 * Computes route information for a given URI and method
 * @param {Map} middleware - Map of middleware by method
 * @param {Set} ignored - Set of ignored middleware functions
 * @param {string} uri - The URI to match
 * @param {string} method - HTTP method
 * @param {Map} cache - Cache for route results
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

		result.visible = 0;
		for (let i = 0; i < result.middleware.length; i++) {
			if (ignored.has(result.middleware[i]) === false) {
				result.visible++;
			}
		}
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
		result = Array.from(methodMap.keys());
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
 * @param {Map} cache - Cache for route results
 * @param {string} method - HTTP method
 * @param {string} uri - The URI to check
 * @param {boolean} [override=false] - Whether to override cache
 * @returns {boolean} True if allowed
 */
function checkAllowed(middleware, ignored, cache, method, uri, override = false) {
	return computeRoutes(middleware, ignored, uri, method, cache, override).visible > 0;
}

/**
 * Creates a registry object with middleware management methods
 * @param {Map} middleware - Map of middleware by method
 * @param {Set} ignored - Set of ignored middleware functions
 * @param {Array} methods - Array of registered HTTP methods
 * @param {Map} cache - Cache for route results
 * @returns {Object} Registry object with ignore, allowed, routes, register, list methods
 */
function createMiddlewareRegistry(middleware, ignored, methods, cache) {
	const registry = {
		ignore: (f) => {
			ignored.add(f);
			return registry;
		},
		allowed: (m, u, o) => checkAllowed(middleware, ignored, cache, m, u, o),
		routes: (u, m, o) => computeRoutes(middleware, ignored, u, m, cache, o),
		register: (p, ...fns) => registerMiddleware(middleware, ignored, methods, cache, p, ...fns),
		list: (m, t) => listRoutes(middleware, m, t),
	};

	return registry;
}

/**
 * Registers middleware for a route
 * @param {Map} middleware - Map of middleware by method
 * @param {Set} ignored - Set of ignored middleware functions
 * @param {Array} methods - Array of registered HTTP methods
 * @param {Map} cache - Cache for route results
 * @param {string|Function} rpath - Route path or middleware function
 * @param {...Function} fn - Middleware functions to register
 * @returns {Object} Registry object for chaining
 */
function registerMiddleware(middleware, ignored, methods, cache, rpath, ...fn) {
	if (rpath === void 0) {
		return createMiddlewareRegistry(middleware, ignored, methods, cache);
	}

	if (typeof rpath === FUNCTION) {
		fn = [rpath, ...fn];
		rpath = `/.${WILDCARD}`;
	}

	const method = typeof fn[fn.length - 1] === STRING ? fn.pop().toUpperCase() : GET;

	const nodeMethods = [
		"CONNECT",
		"DELETE",
		"GET",
		"HEAD",
		"OPTIONS",
		"PATCH",
		"POST",
		"PUT",
		"TRACE",
	];

	if (method !== WILDCARD && nodeMethods.includes(method) === false) {
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

	return createMiddlewareRegistry(middleware, ignored, methods, cache);
}/**
 * Gets MIME type for file extension
 * @param {string} [arg=""] - File path or extension
 * @returns {string} MIME type string
 */
function mime(arg = EMPTY) {
	const ext = extname(arg);

	return ext in mimeExtensions ? mimeExtensions[ext].type : APPLICATION_OCTET_STREAM;
}

/**
 * Gets HTTP status text for status code
 * @param {number} status - HTTP status code
 * @returns {string} Status text string
 */
function getStatusText(status) {
	const statusTexts = {
		200: "OK",
		204: "No Content",
		307: "Temporary Redirect",
		308: "Permanent Redirect",
		400: "Bad Request",
		403: "Forbidden",
		404: "Not Found",
		405: "Method Not Allowed",
		416: "Range Not Satisfiable",
		500: "Internal Server Error",
	};

	return statusTexts[status] || "Error";
}

/**
 * No-op function for default parameters
 * @returns {void}
 */
function noop() {}

/**
 * Error response handler
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} emitError - Error emit function
 * @param {Function} logError - Error log function
 * @param {number} [status=500] - HTTP status code
 * @param {*} [body] - Error body
 */
function error(req, res, emitError, logError, status = 500, body) {
	if (res.headersSent === false) {
		const err = body instanceof Error ? body : new Error(body ?? getStatusText(status));

		if (status === 404) {
			res.removeHeader("allow");
			res.header("allow", EMPTY);

			if (req.cors) {
				res.removeHeader("access-control-allow-methods");
				res.header("access-control-allow-methods", EMPTY);
			}
		}

		res.removeHeader(CONTENT_LENGTH);
		res.statusCode = status;

		emitError(req, res, err);
		logError(req, status);
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
	status = 200,
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
	res.send(EMPTY, perm ? 308 : 307, { [LOCATION]: uri });
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
				body.on("error", (err) => error(req, res, noop, noop, 500, err)).pipe(res);
			} else {
				error(req, res, noop, noop, INT_416);
			}
		} else {
			if (typeof body !== STRING && body && typeof body[TO_STRING] === "function") {
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
					error(req, res, noop, noop, INT_416);
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

	for (const [key, value] of headers) {
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
	res.header("last-modified", file.stats.mtime.toUTCString());

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
}const DEFAULTS = {
	autoindex: false,
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
		autoindex: { type: "boolean" },
		cacheSize: { type: "number", minimum: 1 },
		cacheTTL: { type: "number", minimum: 1 },
		charset: { type: "string" },
		corsExpose: { type: "string" },
		defaultHeaders: { type: "object" },
		digit: { type: "number", minimum: 1, maximum: 10 },
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
				? err.path.join(".")
				: String(err.path).replace(/^\./, "");
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

			return `Config "${field}" ${msg}`;
		});
		throw new Error(`Configuration validation failed: ${errors.join("; ")}`);
	}

	const validated = {};
	for (const [key] of Object.entries(CONFIG_SCHEMA.properties)) {
		const value = config[key];
		validated[key] = value === void 0 ? DEFAULTS[key] : value;
	}

	return validated;
}

/**
 * Validates and merges logging configuration with environment variables
 * @param {Object} [logging={}] - Logging configuration object
 * @returns {Object} Logging configuration with enabled, format, level
 */
function validateLogging(logging = {}) {
	const envLogEnabled = process.env.WOODLAND_LOG_ENABLED;
	const envLogFormat = process.env.WOODLAND_LOG_FORMAT;
	const envLogLevel = process.env.WOODLAND_LOG_LEVEL;

	let enabled;
	if (logging.enabled !== void 0) {
		enabled = logging.enabled;
	} else if (envLogEnabled !== void 0) {
		enabled = envLogEnabled !== "false";
	} else {
		enabled = true;
	}

	let format;
	if (logging.format !== void 0) {
		format = logging.format;
	} else if (envLogFormat !== void 0) {
		format = envLogFormat;
	} else {
		format = LOG_FORMAT;
	}

	let level;
	if (logging.level !== void 0) {
		level = logging.level;
	} else if (envLogLevel !== void 0) {
		level = envLogLevel;
	} else {
		level = INFO;
	}

	const validLevels = [DEBUG, INFO, "warn", "error", "critical", "alert", "emerg", "notice"];
	if (!validLevels.includes(level)) {
		return { enabled, format, level: INFO };
	}

	return { enabled, format, level };
}const LEVELS = {
	emerg: 0,
	alert: 1,
	crit: 2,
	error: 3,
	warn: 4,
	notice: 5,
	info: 6,
	debug: 7,
};

/**
 * Extracts IP address from request object
 * @param {Object} req - Request object
 * @returns {string} IP address
 */
function extractIP(req) {
	const connection = req.connection;
	const socket = req.socket;

	return (
		(connection && connection.remoteAddress) || (socket && socket.remoteAddress) || "127.0.0.1"
	);
}

/**
 * Generates common log format entry
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {string} format - Log format string
 * @returns {string} Common log format string
 */
function clfm(req, res, format) {
	const date = new Date();
	const month = MONTHS[date.getMonth()];
	const day = date.getDate();
	const year = date.getFullYear();
	const hours = String(date.getHours()).padStart(2, "0");
	const minutes = String(date.getMinutes()).padStart(2, "0");
	const seconds = String(date.getSeconds()).padStart(2, "0");
	const timezone = timeOffset(date.getTimezoneOffset());
	const dateStr = `[${day}/${month}/${year}:${hours}:${minutes}:${seconds} ${timezone}]`;

	const headers = req.headers;
	const host = headers && headers.host ? headers.host : HYPHEN;
	const clientIP = req.ip || extractIP(req);
	const ip = clientIP;
	const logname = HYPHEN;
	const parsed = req.parsed;
	const username = parsed && parsed.username ? parsed.username : HYPHEN;
	const pathname = parsed && parsed.pathname ? parsed.pathname : req.url ? req.url : HYPHEN;
	const search = parsed && parsed.search ? parsed.search : HYPHEN;
	const method = req.method ? req.method : HYPHEN;
	const requestLine = `${method} ${pathname}${search} HTTP/1.1`;

	const resStatusCode = res.statusCode;
	const statusCode = resStatusCode ? resStatusCode : 500;
	const getHeader = res.getHeader;
	const contentLength = getHeader ? getHeader.call(res, "content-length") : HYPHEN;

	const referer = headers && headers.referer ? headers.referer : HYPHEN;
	const userAgent = headers && headers["user-agent"] ? headers["user-agent"] : HYPHEN;

	let logEntry = format;

	logEntry = logEntry
		.replace("%v", host)
		.replace("%h", ip)
		.replace("%l", logname)
		.replace("%u", username)
		.replace("%t", dateStr)
		.replace("%r", requestLine)
		.replace("%>s", String(statusCode))
		.replace("%b", contentLength)
		.replace("%{Referer}i", referer)
		.replace("%{User-agent}i", userAgent);

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
 * Main logging function
 * @param {string} msg - Log message
 * @param {string} [logLevel='debug'] - Log level
 * @param {boolean} enabled - Enable/disable logging
 * @param {string} actualLevel - Actual log level
 * @returns {Object} Logger object for chaining
 */
function log(msg, logLevel = DEBUG, enabled = true, actualLevel = INFO) {
	if (enabled) {
		const idx = LEVELS[logLevel];
		if (idx <= LEVELS[actualLevel]) {
			process.nextTick(() => {
				const consoleMethod = idx > 4 ? "log" : "error";
				console[consoleMethod](msg);
			});
		}
	}

	return {
		log,
		clfm,
		extractIP,
		logRoute,
		logMiddleware,
		logDecoration,
		logError,
		logServe,
	};
}

/**
 * Creates logger with configurable format and level
 * @param {Object} [config={}] - Configuration object
 * @param {boolean} [config.enabled=true] - Enable/disable logging
 * @param {string} [config.format] - Custom log format string
 * @param {string} [config.level='info'] - Log level
 * @returns {Object} Logger with log, clfm, extractIP, logRoute, logMiddleware, logDecoration, logError, logServe methods
 */
function createLogger(config = {}) {
	const { enabled = true, format, level = INFO } = config;
	const validLevels = [DEBUG, INFO, "warn", "error", "critical", "alert", "emerg", "notice"];
	const actualLevel = validLevels.includes(level) ? level : INFO;

	return {
		log: (msg, logLevel = DEBUG) => log(msg, logLevel, enabled, actualLevel),
		clfm: (req, res) => clfm(req, res, format),
		extractIP,
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
}/**
 * Checks if request origin is allowed for CORS
 * @param {Object} req - Request object
 * @param {Array} origins - Array of allowed origins
 * @returns {boolean} True if CORS is allowed
 */
function cors(req, origins) {
	if (origins.length === 0) {
		return false;
	}

	return req.corsHost && (origins.includes(WILDCARD) || origins.includes(req.headers.origin));
}

/**
 * Checks if request origin host differs from request host
 * @param {Object} req - Request object
 * @returns {boolean} True if hosts differ
 */
function corsHost(req) {
	return (
		ORIGIN in req.headers && req.headers.origin.replace(/^http(s)?:\/\//, "") !== req.headers.host
	);
}

/**
 * Creates CORS request handler that sends 204 No Content
 * @returns {Function} Request handler function
 */
function corsRequest() {
	return (req, res) => res.status(204).send(EMPTY);
}/**
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
		app.logger.logServe(req, "Path outside allowed directory");
		res.error(INT_403);

		return;
	}

	let valid = true;
	let stats;

	app.logger.logServe(req, "Routing request to file system");

	try {
		stats = await stat(fp, { bigint: false });
	} catch {
		valid = false;
	}

	if (valid === false) {
		res.error(INT_404);
	} else if (stats.isDirectory() === false) {
		app.stream(req, res, {
			charset: app.charset,
			etag: app.etag(req.method, stats.ino, stats.size, stats.mtimeMs),
			path: fp,
			stats: stats,
		});
	} else if (req.parsed.pathname.endsWith(SLASH) === false) {
		res.redirect(`${req.parsed.pathname}/${req.parsed.search}`);
	} else {
		const files = await readdir(fp, { encoding: UTF8, withFileTypes: true });
		let result = EMPTY;

		for (let i = 0; i < files.length; i++) {
			const file = files[i];
			if (app.indexes.includes(file.name)) {
				result = join(fp, file.name);
				break;
			}
		}

		if (result.length === INT_0) {
			if (app.autoindex === false) {
				res.error(INT_404);
			} else {
				const body = autoindex(decodeURIComponent(req.parsed.pathname), files);
				res.header("content-type", `text/html; charset=${app.charset}`);
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
	 * @param {boolean} [config.autoindex=false] - Enable automatic directory indexing
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
			autoindex,
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
		if (silent === false) {
			if (SERVER in finalHeaders === false) {
				finalHeaders[SERVER] = SERVER_VALUE;
			}
			finalHeaders[X_POWERED_BY] = X_POWERED_BY_VALUE;
		}

		this.autoindex = autoindex;
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
		this.origins = [...origins];
		this.time = time;

		this.cache = new Map();
		this.permissions = new Map();
		this.ignored = new Set();
		this.middleware = new Map();
		this.methods = [];

		const { log, clfm, extractIP, logRoute, logMiddleware, logDecoration, logError, logServe } =
			createLogger({
				enabled: this.logging.enabled,
				format: this.logging.format,
				level: this.logging.level,
			});
		this.logger = {
			log,
			clfm,
			extractIP,
			logRoute,
			logMiddleware,
			logDecoration,
			logError,
			logServe,
		};

		this.cors = (req) => cors(req, this.origins);
		this.corsHost = corsHost;
		this.corsRequest = corsRequest;
		this.ip = extractIP;

		this.error = this.error.bind(this);
		this.json = this.json.bind(this);
		this.redirect = this.redirect.bind(this);
		this.send = this.send.bind(this);
		this.set = this.set.bind(this);
		this.status = this.status.bind(this);

		this.initFileServer();
		this.initMiddleware();

		if (this.etags !== null) {
			this.get(this.etags.middleware).ignore(this.etags.middleware);
		}

		if (this.origins.length > INT_0) {
			const fnCorsRequest = this.corsRequest();
			this.options(fnCorsRequest).ignore(fnCorsRequest);
		}

		this.on(ERROR, () => {});
	}

	/**
	 * Initializes file server
	 */
	initFileServer() {
		this.fileServer = createFileServer(this);
	}

	/**
	 * Initializes middleware registry
	 */
	initMiddleware() {
		this.middlewareRegistry = createMiddlewareRegistry(
			this.middleware,
			this.ignored,
			this.methods,
			this.cache,
		);
	}

	/**
	 * Error response handler
	 * @param {Object} req - HTTP request object
	 * @param {Object} res - HTTP response object
	 * @param {number} status - HTTP status code
	 * @param {*} body - Response body
	 */
	error(req, res, status = 500, body) {
		if (arguments.length === 2) {
			return (s, b) =>
				error(
					req,
					res,
					(req, res, err) => this.emit(ERROR, req, res, err),
					(req, _status) => this.logger.logError(req.parsed.pathname, req.method, req.ip),
					s,
					b,
				);
		}
		error(
			req,
			res,
			(req, res, err) => this.emit(ERROR, req, res, err),
			(req, _status) => this.logger.logError(req.parsed.pathname, req.method, req.ip),
			status,
			body,
		);
	}

	/**
	 * JSON response handler
	 * @param {Object} res - HTTP response object
	 * @param {*} arg - Response data
	 * @param {number} status - HTTP status code
	 * @param {Object} headers - Response headers
	 */
	json(res, arg, status = 200, headers = { [CONTENT_TYPE]: `${APPLICATION_JSON}; charset=utf-8` }) {
		if (arguments.length === 1) {
			return (a, s, h) => json(res, a, s, h);
		}
		json(res, arg, status, headers);
	}

	/**
	 * Redirect response handler
	 * @param {Object} res - HTTP response object
	 * @param {string} uri - Redirect URI
	 * @param {boolean} perm - Permanent redirect
	 */
	redirect(res, uri, perm = true) {
		if (arguments.length === 1) {
			return (u, p) => redirect(res, u, p);
		}
		redirect(res, uri, perm);
	}

	/**
	 * Send response handler
	 * @param {Object} req - HTTP request object
	 * @param {Object} res - HTTP response object
	 * @param {*} body - Response body
	 * @param {number} status - HTTP status code
	 * @param {Object} headers - Response headers
	 */
	send(req, res, body = EMPTY, status = res.statusCode, headers = {}) {
		if (arguments.length === 2) {
			return (b, s, h) => send(req, res, b, s, h, this.onReady.bind(this), this.onDone.bind(this));
		}
		send(req, res, body, status, headers, this.onReady.bind(this), this.onDone.bind(this));
	}

	/**
	 * Set headers handler
	 * @param {Object} res - HTTP response object
	 * @param {Object} arg - Headers object
	 */
	set(res, arg = {}) {
		if (arguments.length === 1) {
			return (a) => set(res, a);
		}
		set(res, arg);
	}

	/**
	 * Status handler
	 * @param {Object} res - HTTP response object
	 * @param {number} arg - Status code
	 */
	status(res, arg = INT_200) {
		if (arguments.length === 1) {
			return (a) => status(res, a);
		}
		status(res, arg);
	}

	/**
	 * Checks if a method is allowed for a URI
	 * @param {string} method - HTTP method
	 * @param {string} uri - URI to check
	 * @param {boolean} [override=false] - Override cache
	 * @returns {boolean} True if method is allowed
	 */
	allowed(method, uri, override = false) {
		return this.middlewareRegistry.allowed(method, uri, override);
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
			const allMethods = this.middlewareRegistry.routes(uri, WILDCARD, override).visible > INT_0;
			let list;

			if (allMethods) {
				list = [...METHODS];
			} else {
				const methodSet = new Set();

				for (let i = 0; i < this.methods.length; i++) {
					const method = this.methods[i];
					if (this.allowed(method, uri, override)) {
						methodSet.add(method);
					}
				}

				list = Array.from(methodSet);
			}

			const methodSet = new Set(list);

			if (methodSet.has(GET) && !methodSet.has(HEAD)) {
				list.push(HEAD);
			}

			if (list.length > INT_0 && !methodSet.has(OPTIONS)) {
				list.push(OPTIONS);
			}

			result = list.sort().join(", ");
			this.permissions.set(uri, result);
			this.logger.log(
				`type=allows, uri=${uri}, override=${override}, message="Determined 'allow' header header value"`,
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
	 * Generates common log format entry
	 * @param {Object} req - HTTP request object
	 * @param {Object} res - HTTP response object
	 * @returns {string} Common log format string
	 */
	clf(req, res) {
		return this.logger.clfm(req, res);
	}

	/**
	 * Decorates request and response objects with framework utilities
	 * @param {Object} req - HTTP request object
	 * @param {Object} res - HTTP response object
	 */
	decorate(req, res) {
		let timing = null;
		if (this.time) {
			timing = precise().start();
		}

		const parsed = parse(req);
		const allowString = this.allows(parsed.pathname);

		const clientIP = this.ip(req);

		const headersBatch = Object.create(null);
		headersBatch[ALLOW] = allowString;
		headersBatch[X_CONTENT_TYPE_OPTIONS] = NO_SNIFF;

		for (let i = 0; i < this.defaultHeaders.length; i++) {
			const [key, value] = this.defaultHeaders[i];
			headersBatch[key] = value;
		}

		req.parsed = parsed;
		req.allow = allowString;
		req.body = EMPTY;
		req.host = parsed.hostname;
		req.params = {};
		req.valid = true;

		if (timing) {
			req.precise = timing;
		}

		req.corsHost = this.corsHost(req);
		req.cors = this.cors(req);

		if (req.cors) {
			const corsHeaders = req.headers[ACCESS_CONTROL_REQUEST_HEADERS] ?? this.corsExpose;
			const origin = req.headers.origin;

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

		req.ip = clientIP;

		res.locals = {};
		res.error = this.error(req, res);
		res.header = res.setHeader;
		res.json = this.json(res);
		res.redirect = this.redirect(res);
		res.send = this.send(req, res);
		res.set = this.set(res);
		res.status = this.status(res);

		res.set(headersBatch);

		this.log(
			`type=decorate, uri=${parsed.pathname}, method=${req.method}, ip=${clientIP}, message="Decorated request from ${clientIP}"`,
		);
		res.on(CLOSE, () => this.log(this.clf(req, res), INFO));
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
						.join("-"),
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
		this.ignored.add(fn);
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
		let result;
		const methodMap = this.middleware.get(method.toUpperCase());

		if (type === "array") {
			result = Array.from(methodMap.keys());
		} else if (type === "object") {
			result = {};
			const entries = Array.from(methodMap.entries());
			const entryCount = entries.length;

			for (let i = 0; i < entryCount; i++) {
				const [key, value] = entries[i];
				result[key] = value;
			}
		}

		this.logger.log(`type=list, method=${method}, type=${type}`);

		return result;
	}

	/**
	 * Logs a message
	 * @param {string} msg - Message to log
	 * @param {string} [level='debug'] - Log level
	 * @returns {Woodland} Returns self for chaining
	 */
	log(msg, level = DEBUG) {
		this.logger.log(msg, level);

		return this;
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
	 * Converts parameterized route to regex
	 * @param {string} [arg=''] - Route path
	 * @returns {string} Regex pattern string
	 */
	extractPath(arg = EMPTY) {
		return arg.replace(/\/:([^/]+)/g, "/(?<$1>[^/]+)");
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

		if (this.listenerCount("connect") > INT_0) {
			this.emit("connect", req, res);
		}

		if (this.listenerCount(FINISH) > INT_0) {
			res.on(FINISH, () => this.emit(FINISH, req, res));
		}

		this.logger.logRoute(req.parsed.pathname, req.method, req.ip);

		const hasOriginHeader = ORIGIN in req.headers;
		const isOriginAllowed = hasOriginHeader && this.origins.includes(req.headers.origin);

		if (req.cors === false && hasOriginHeader && req.corsHost && !isOriginAllowed) {
			req.valid = false;
			res.error(INT_403);
		} else if (req.allow.includes(method)) {
			const result = this.middlewareRegistry.routes(req.parsed.pathname, method);

			if (result.params) {
				params(req, result.getParams);
			}

			const exitMiddleware = result.middleware.slice(result.exit)[Symbol.iterator]();
			req.exit = next(req, res, exitMiddleware, true);
			next(req, res, result.middleware[Symbol.iterator]())();
		} else {
			req.valid = false;
			res.error(getStatus(req, res));
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
		return this.middlewareRegistry.routes(uri, method, override);
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
			(req, res) => this.emit(STREAM, req, res),
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
	 * @throws {TypeError} When invalid HTTP method or HEAD method is used
	 */
	use(rpath, ...fn) {
		if (typeof rpath === "function") {
			fn = [rpath, ...fn];
			rpath = `/.${WILDCARD}`;
		}

		const method = typeof fn[fn.length - 1] === STRING ? fn.pop().toUpperCase() : GET;

		if (method !== WILDCARD && METHODS.includes(method) === false) {
			throw new TypeError("Invalid HTTP method");
		}

		if (method === HEAD) {
			throw new TypeError("Cannot set HEAD route, use GET");
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

		if (lrpath.includes(`${SLASH}:`) && lrpath.includes("(") === false) {
			lparams = true;
			lrpath = this.extractPath(lrpath);
		}

		const current = mmethod.get(lrpath) ?? { handlers: [] };

		current.handlers.push(...fn);
		mmethod.set(lrpath, {
			handlers: current.handlers,
			params: lparams,
			regex: new RegExp(`^${lrpath}$`),
		});

		this.logger.logMiddleware(rpath, method);

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