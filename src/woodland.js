import {METHODS, STATUS_CODES} from "node:http";
import {join, resolve} from "node:path";
import {EventEmitter} from "node:events";
import {readdir, stat} from "node:fs/promises";
import {createReadStream} from "node:fs";
import {etag} from "tiny-etag";
import {precise} from "precise";
import {lru} from "tiny-lru";
import {
	ACCESS_CONTROL_ALLOW_CREDENTIALS,
	ACCESS_CONTROL_ALLOW_HEADERS,
	ACCESS_CONTROL_ALLOW_METHODS,
	ACCESS_CONTROL_ALLOW_ORIGIN,
	ACCESS_CONTROL_EXPOSE_HEADERS,
	ACCESS_CONTROL_REQUEST_HEADERS,
	ALLOW,
	APPLICATION_JSON,
	ARRAY,
	CACHE_CONTROL,
	CLOSE,
	COLON,
	COMMA,
	COMMA_SPACE,
	CONNECT,
	CONTENT_LENGTH,
	CONTENT_RANGE,
	CONTENT_TYPE,
	DEBUG,
	DELETE,
	DELIMITER,
	EMPTY,
	ERROR,
	ETAG,
	FINISH,
	FUNCTION,
	GET,
	HEAD,
	HYPHEN,
	INDEX_HTM,
	INDEX_HTML,
	INFO,
	INT_0,
	INT_1e3,
	INT_1e4,
	INT_200,
	INT_204,
	INT_3,
	INT_304,
	INT_307,
	INT_308,
	INT_4,
	INT_403,
	INT_404,
	INT_416,
	INT_500,
	IP_TOKEN,
	LAST_MODIFIED,
	LEFT_PAREN,
	LEVELS,
	LOCATION,
	LOG,
	LOG_B,
	LOG_FORMAT,
	LOG_H,
	LOG_L,
	LOG_R,
	LOG_REFERRER,
	LOG_S,
	LOG_T,
	LOG_U,
	LOG_USER_AGENT,
	LOG_V,
	MONTHS,
	MSG_DECORATED_IP,
	MSG_DETERMINED_ALLOW,
	MSG_ERROR_HEAD_ROUTE,
	MSG_ERROR_INVALID_METHOD,
	MSG_ERROR_IP,
	MSG_IGNORED_FN,
	MSG_REGISTERING_MIDDLEWARE,
	MSG_RETRIEVED_MIDDLEWARE,
	MSG_ROUTING,
	MSG_ROUTING_FILE,
	MSG_SENDING_BODY,
	NO_SNIFF,
	OBJECT,
	OPTIONS,
	OPTIONS_BODY,
	ORIGIN,
	PARAMS_GROUP,
	PATCH,
	POST,
	PUT,
	RANGE,
	SERVER,
	SERVER_VALUE,
	SLASH,
	STREAM,
	STRING,
	TIMING_ALLOW_ORIGIN,
	TO_STRING,
	TRACE,
	TRUE,
	USER_AGENT,
	UTF8,
	UTF_8,
	WILDCARD,
	X_CONTENT_TYPE_OPTIONS,
	X_FORWARDED_FOR,
	X_POWERED_BY,
	X_POWERED_BY_VALUE,
	X_RESPONSE_TIME
} from "./constants.js";
import {
	autoindex as aindex,
	getStatus,
	mime,
	ms,
	next,
	pad,
	params,
	parse,
	partialHeaders,
	pipeable,
	reduce,
	timeOffset,
	writeHead,
	isValidIP
} from "./utility.js";

// Optimized: Cache regex for corsHost method to avoid recompilation
const PROTOCOL_REGEX = /^http(s)?:\/\//;

/**
 * Woodland HTTP server framework class extending EventEmitter
 * @class
 * @extends {EventEmitter}
 */
export class Woodland extends EventEmitter {
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
		this.cache = lru(cacheSize, cacheTTL);
		this.charset = charset;
		this.corsExpose = corsExpose;
		this.defaultHeaders = Reflect.ownKeys(defaultHeaders).map(key => [key.toLowerCase(), defaultHeaders[key]]);
		this.digit = digit;
		this.etags = etags ? etag({cacheSize, cacheTTL}) : null;
		this.indexes = structuredClone(indexes);
		this.permissions = lru(cacheSize, cacheTTL);
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
				list = [...METHODS];
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
			timing = precise().start();
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
				const err = body instanceof Error ? body : new Error(body ?? STATUS_CODES[status]);
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
				reduce(uri, this.middleware.get(method), result, true);
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
		const fp = resolve(folder, arg);

		// Security: Ensure resolved path stays within the allowed directory
		if (!fp.startsWith(resolve(folder))) {
			this.log(`type=serve, uri=${req.parsed.pathname}, method=${req.method}, ip=${req.ip}, message="Path outside allowed directory", path="${arg}"`, ERROR);
			res.error(INT_403);

			return;
		}

		let valid = true;
		let stats;

		this.log(`type=serve, uri=${req.parsed.pathname}, method=${req.method}, ip=${req.ip}, message="${MSG_ROUTING_FILE}"`);

		try {
			stats = await stat(fp, {bigint: false});
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
			const files = await readdir(fp, {encoding: UTF8, withFileTypes: true});
			let result = EMPTY;

			for (const file of files) {
				if (this.indexes.includes(file.name)) {
					result = join(fp, file.name);
					break;
				}
			}

			if (result.length === INT_0) {
				if (this.autoindex === false) {
					res.error(INT_404);
				} else {
					const body = aindex(decodeURIComponent(req.parsed.pathname), files);

					res.header(CONTENT_TYPE, `text/html; charset=${this.charset}`);
					res.send(body);
				}
			} else {
				const rstats = await stat(result, {bigint: false});

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
				[headers, options] = partialHeaders(req, res, file.stats.size, status);

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

			res.send(createReadStream(file.path, Object.keys(options).length > 0 ? options : undefined), status);
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

		if (method !== WILDCARD && METHODS.includes(method) === false) {
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
export function woodland (arg) {
	const app = new Woodland(arg);

	app.route = app.route.bind(app);

	return app;
}
