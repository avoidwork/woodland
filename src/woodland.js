import { STATUS_CODES } from "node:http";
import { EventEmitter } from "node:events";
import { createReadStream } from "node:fs";
import { etag } from "tiny-etag";
import { lru } from "tiny-lru";
import { precise } from "precise";
import {
	ACCESS_CONTROL_ALLOW_CREDENTIALS,
	ACCESS_CONTROL_ALLOW_METHODS,
	ACCESS_CONTROL_ALLOW_HEADERS,
	ACCESS_CONTROL_EXPOSE_HEADERS,
	ACCESS_CONTROL_REQUEST_HEADERS,
	ACCESS_CONTROL_ALLOW_ORIGIN,
	ALLOW,
	CONNECT,
	CONTENT_LENGTH,
	DELETE,
	DELIMITER,
	EMPTY,
	ERROR,
	GET,
	HEAD,
	INFO,
	INT_0,
	INT_204,
	INT_304,
	INT_403,
	NO_SNIFF,
	OPTIONS,
	ORIGIN,
	PATCH,
	POST,
	PUT,
	STRING,
	SERVER,
	SERVER_VALUE,
	SLASH,
	TIMING_ALLOW_ORIGIN,
	TRACE,
	TRUE,
	WILDCARD,
	X_CONTENT_TYPE_OPTIONS,
	X_POWERED_BY,
	X_POWERED_BY_VALUE,
	X_RESPONSE_TIME,
	HYPHEN,
	COMMA_SPACE,
	EVT_CONNECT,
	EVT_FINISH,
	EVT_STREAM,
	EVT_CLOSE,
} from "./constants.js";
import { createMiddlewareRegistry, next } from "./middleware.js";
import { stream as responseStream, getStatus, writeHead } from "./response.js";
import { validateConfig, validateLogging } from "./config.js";
import { createLogger } from "./logger.js";
import { cors, corsHost, corsRequest, params, parse, extractIP } from "./request.js";
import { createFileServer } from "./fileserver.js";
import {
	createErrorHandler,
	createJsonHandler,
	createRedirectHandler,
	createSendHandler,
	createSetHandler,
	createStatusHandler,
} from "./response.js";

/**
 * Woodland HTTP server framework class extending EventEmitter
 * @class
 * @extends {EventEmitter}
 */
export class Woodland extends EventEmitter {
	#autoIndex;
	#charset;
	#corsExpose;
	#defaultHeaders;
	#digit;
	#etags;
	#indexes;
	#logging;
	#origins;
	#time;
	#cache;
	#methods;
	#logger;
	#fileServer;
	#middleware;

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
			time,
		} = validated;

		const finalHeaders = { ...defaultHeaders };
		if (!validated.silent) {
			if (!(SERVER in finalHeaders)) {
				finalHeaders[SERVER] = SERVER_VALUE;
			}
			finalHeaders[X_POWERED_BY] = X_POWERED_BY_VALUE;
		}

		this.#autoIndex = autoIndex;
		this.#charset = charset;
		this.#corsExpose = corsExpose;
		this.#defaultHeaders = Reflect.ownKeys(finalHeaders)
			.filter((key) => typeof key === STRING)
			.map((key) => [key.toLowerCase(), finalHeaders[key]]);
		this.#digit = digit;
		this.#etags = etags ? Object.freeze(etag({ cacheSize, cacheTTL })) : null;
		this.#indexes = [...indexes];
		this.#logging = Object.freeze(validateLogging(logging));
		this.#origins = new Set(origins);
		this.#time = time;
		this.#cache = lru(cacheSize, cacheTTL);
		this.#methods = new Set();
		this.#logger = createLogger({
			enabled: this.#logging.enabled,
			format: this.#logging.format,
			level: this.#logging.level,
		});
		this.#fileServer = createFileServer({
			autoIndex: this.#autoIndex,
			charset: this.#charset,
			indexes: this.#indexes,
			logger: this.#logger,
			stream: this.stream.bind(this),
			etag: this.etag.bind(this),
		});
		this.#middleware = createMiddlewareRegistry(this.#methods, this.#cache);

		if (this.#etags !== null) {
			this.get(this.#etags.middleware).ignore(this.#etags.middleware);
		}

		if (this.#origins.size > INT_0) {
			const fnCorsRequest = corsRequest();
			this.options(fnCorsRequest).ignore(fnCorsRequest);
		}

		this.on(ERROR, (req, _res, _error) =>
			this.#logger.logError(req.parsed.pathname, req.method, req.ip),
		);
	}

	/**
	 * Checks if a method is allowed for a URI
	 * @param {string} method - HTTP method
	 * @param {string} uri - URI to check
	 * @param {boolean} [override=false] - Override cache
	 * @returns {boolean} True if method is allowed
	 */
	#allowed(method, uri, override = false) {
		return this.#middleware.allowed(method, uri, override);
	}

	/**
	 * Determines allowed methods for a URI
	 * @param {string} uri - URI to check
	 * @param {boolean} [override=false] - Override cache
	 * @param {boolean} [isCorsRequest=false] - Whether this is a CORS request
	 * @returns {string} Comma-separated list of allowed methods
	 */
	#allows(uri, override = false, isCorsRequest = false) {
		const key = `perm${DELIMITER}${uri}${DELIMITER}${isCorsRequest ? "1" : "0"}`;
		let result = override === false ? this.#cache.get(key) : void 0;

		if (override || result === void 0) {
			const methodSet = new Set();

			for (const method of this.#methods) {
				if (this.#allowed(method, uri, override)) {
					methodSet.add(method);
				}
			}

			const list = this.#buildAllowedList(methodSet, isCorsRequest);
			result = list.sort().join(COMMA_SPACE);
			this.#cache.set(key, result);
			this.#logger.log(
				`type=allows, uri=${uri}, override=${override}, message="Determined 'allow' header value"`,
			);
		}

		return result ?? EMPTY;
	}

	/**
	 * Builds the list of allowed methods including implicit HEAD and OPTIONS
	 * @param {Set} methodSet - Set of explicitly registered methods
	 * @param {boolean} isCorsRequest - Whether this is a CORS request
	 * @returns {Array} Array of allowed methods
	 */
	#buildAllowedList(methodSet, isCorsRequest = false) {
		const list = [...methodSet];

		if (list.length > 0) {
			if (methodSet.has(GET) && !methodSet.has(HEAD)) {
				list.push(HEAD);
			}

			if (!methodSet.has(OPTIONS) && isCorsRequest) {
				/* node:coverage ignore next 2 */
				list.push(OPTIONS);
			}
		}

		return list;
	}

	/**
	 * Registers wildcard middleware for all methods
	 * @param {...*} args - Middleware function(s)
	 * @returns {Woodland} Returns self for chaining
	 */
	always(...args) {
		for (let i = 0; i < args.length; i++) {
			this.#middleware.ignore(args[i]);
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
	#decorate(req, res) {
		const timing = this.#time ? precise().start() : null;
		const parsed = parse(req);
		const clientIP = extractIP(req);
		req.corsHost = corsHost(req);
		req.cors = cors(req, this.#origins);
		const allowString = this.#allows(parsed.pathname, false, req.cors);
		const headersBatch = Object.create(null);
		headersBatch[ALLOW] = allowString;
		headersBatch[X_CONTENT_TYPE_OPTIONS] = NO_SNIFF;

		const defaultHeaders = this.#defaultHeaders;
		const headerCount = defaultHeaders.length;
		for (let i = 0; i < headerCount; i++) {
			const [key, value] = defaultHeaders[i];
			headersBatch[key] = value;
		}

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
			this.#addCorsHeaders(req, headersBatch);
		}

		res.locals = {};
		res.error = createErrorHandler(req, res, this);
		res.header = res.setHeader;
		res.json = createJsonHandler(res);
		res.redirect = createRedirectHandler(res);
		res.send = createSendHandler(req, res, this.#onReady.bind(this), this.#onDone.bind(this));
		res.set = createSetHandler(res);
		res.status = createStatusHandler(res);

		res.set(headersBatch);
		res.on(EVT_CLOSE, () => this.#logger.log(this.#logger.clf(req, res), INFO));
		this.#logger.log(
			`type=decorate, uri=${parsed.pathname}, method=${req.method}, ip=${clientIP}, message="Decorated request from ${clientIP}"`,
		);
	}

	/**
	 * Adds CORS headers to the headers batch
	 * @param {Object} req - HTTP request object
	 * @param {Object} headersBatch - Headers batch object
	 */
	#addCorsHeaders(req, headersBatch) {
		const origin = req.headers.origin;
		const corsHeaders = req.headers[ACCESS_CONTROL_REQUEST_HEADERS] ?? this.#corsExpose;
		const originAllowed = this.#origins.has(origin);
		const hasWildcard = this.#origins.has(WILDCARD);

		/* node:coverage ignore next 11 */
		if (originAllowed) {
			headersBatch[ACCESS_CONTROL_ALLOW_ORIGIN] = origin;
			headersBatch[TIMING_ALLOW_ORIGIN] = origin;
			headersBatch[ACCESS_CONTROL_ALLOW_CREDENTIALS] = TRUE;
			headersBatch[ACCESS_CONTROL_ALLOW_METHODS] = req.allow;

			if (corsHeaders !== void 0) {
				headersBatch[
					req.method === OPTIONS ? ACCESS_CONTROL_ALLOW_HEADERS : ACCESS_CONTROL_EXPOSE_HEADERS
				] = corsHeaders;
			}
		} else if (hasWildcard) {
			headersBatch[ACCESS_CONTROL_ALLOW_ORIGIN] = WILDCARD;
			headersBatch[ACCESS_CONTROL_ALLOW_METHODS] = req.allow;

			if (corsHeaders !== void 0) {
				headersBatch[
					req.method === OPTIONS ? ACCESS_CONTROL_ALLOW_HEADERS : ACCESS_CONTROL_EXPOSE_HEADERS
				] = corsHeaders;
			}
		}
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
		if (!this.#isHashableMethod(method) || !this.#etagsEnabled()) {
			return EMPTY;
		}

		const hashed = this.#hashArgs(args);
		return this.#etags.create(hashed);
	}

	/**
	 * Checks if a method can be hashed for ETag generation
	 * @param {string} method - HTTP method
	 * @returns {boolean} True if method is GET, HEAD, or OPTIONS
	 */
	#isHashableMethod(method) {
		return method === GET || method === HEAD || method === OPTIONS;
	}

	/**
	 * Checks if ETags are enabled
	 * @returns {boolean} True if ETags are enabled
	 */
	#etagsEnabled() {
		return this.#etags !== null;
	}

	/**
	 * Hashes arguments for ETag generation
	 * @param {Array} args - Arguments to hash
	 * @returns {string} Hashed string
	 */
	#hashArgs(args) {
		return args
			.map((i) => (typeof i !== STRING ? JSON.stringify(i).replace(/^"|"$/g, EMPTY) : i))
			.join(HYPHEN);
	}

	/**
	 * Registers file server middleware
	 * @param {string} [root='/'] - Root path
	 * @param {string} [folder=process.cwd()] - Folder to serve
	 * @returns {Woodland} Returns self for chaining
	 */
	files(root = SLASH, folder = process.cwd()) {
		this.#fileServer.register(root, folder, this.use.bind(this));

		return this;
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
		this.#middleware.ignore(fn);
		this.#logger.log(`type=ignore, message="Added function to ignored Set", name="${fn.name}"`);

		return this;
	}

	/**
	 * Lists middleware routes
	 * @param {string} [method='GET'] - HTTP method
	 * @param {string} [type='array'] - Return type (array or object)
	 * @returns {Array|Object} List of routes
	 */
	list(method = GET.toLowerCase(), type = "array") {
		const result = this.#middleware.list(method, type);
		this.#logger.log(`type=list, method=${method}, type=${type}`);

		return result;
	}

	/**
	 * Handles response done event
	 * @param {Object} req - HTTP request object
	 * @param {Object} res - HTTP response object
	 * @param {string} body - Response body
	 * @param {Object} headers - Response headers
	 */
	#onDone(req, res, body, headers) {
		const isNoContent = res.statusCode === INT_204 || res.statusCode === INT_304;
		const hasContentLength = res.getHeader(CONTENT_LENGTH) !== void 0;

		if (!isNoContent && !hasContentLength) {
			res.header(CONTENT_LENGTH, Buffer.byteLength(body));
		}

		writeHead(res, headers);
		res.end(body, this.#charset);
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
	#onReady(req, res, body, status, headers) {
		/* node:coverage ignore next 5 */
		if (this.#time && res.getHeader(X_RESPONSE_TIME) === void 0) {
			const diff = req.precise.stop().diff();
			const msValue = Number(diff / 1e6).toFixed(this.#digit);
			res.header(X_RESPONSE_TIME, `${msValue} ms`);
		}

		return this.#onSend(req, res, body, status, headers);
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
	#onSend(req, res, body, status, headers) {
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

		this.#decorate(req, res);

		if (this.listenerCount(EVT_CONNECT) > INT_0) {
			this.emit(EVT_CONNECT, req, res);
		}

		if (this.listenerCount(EVT_FINISH) > INT_0) {
			res.on(EVT_FINISH, () => this.emit(EVT_FINISH, req, res));
		}

		this.#logger.logRoute(req.parsed.pathname, req.method, req.ip);

		const hasOriginHeader = ORIGIN in req.headers;
		const origin = hasOriginHeader ? req.headers.origin : EMPTY;
		const isOriginAllowed = hasOriginHeader && this.#origins.has(origin);

		// Check if CORS request is disallowed
		const isCorsRequest = req.corsHost;
		const isCorsDisallowed =
			req.cors === false && hasOriginHeader && isCorsRequest && !isOriginAllowed;

		if (isCorsDisallowed) {
			req.valid = false;
			res.error(INT_403, new Error(STATUS_CODES[INT_403]));
		} else if (req.allow.includes(method)) {
			this.#handleAllowedRoute(req, res, method);
		} else {
			req.valid = false;
			const newStatus = getStatus(req, res);
			res.error(newStatus, new Error(STATUS_CODES[newStatus]));
		}
	}

	/**
	 * Handles routing for allowed methods
	 * @param {Object} req - HTTP request object
	 * @param {Object} res - HTTP response object
	 * @param {string} method - Normalized HTTP method
	 */
	#handleAllowedRoute(req, res, method) {
		const result = this.#middleware.routes(req.parsed.pathname, method);

		if (result.params) {
			params(req, result.getParams);
		}

		const middleware = result.middleware;
		const exitIndex = result.exit;
		req.exit = next(req, res, middleware.slice(exitIndex)[Symbol.iterator](), true);
		next(req, res, middleware[Symbol.iterator]())();
	}

	/**
	 * Gets route information
	 * @param {string} uri - URI to check
	 * @param {string} method - HTTP method
	 * @param {boolean} [override=false] - Override cache
	 * @returns {Object} Route information
	 */
	routes(uri, method, override = false) {
		return this.#middleware.routes(uri, method, override);
	}

	/**
	 * Serves file from disk
	 * @param {Object} req - HTTP request object
	 * @param {Object} res - HTTP response object
	 * @param {string} arg - File path
	 * @param {string} [folder=process.cwd()] - Folder to serve from
	 * @returns {Promise} Promise that resolves when done
	 */
	/* node:coverage ignore next 3 */
	async serve(req, res, arg, folder = process.cwd()) {
		return this.#fileServer.serve(req, res, arg, folder);
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
		responseStream(
			req,
			res,
			file,
			(req, res) => this.emit(EVT_STREAM, req, res),
			createReadStream,
			this.#etags,
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
		this.#middleware.register(rpath, ...fn);
		this.#logger.logMiddleware(rpath, fn[fn.length - 1]);

		return this;
	}

	get logger() {
		return this.#logger;
	}
}

/**
 * Factory function to create a new Woodland instance
 * @param {Object} [arg={}] - Configuration object
 * @returns {Woodland} New Woodland instance
 */
export function woodland(arg) {
	const app = new Woodland(arg);

	app.route = app.route.bind(app);

	return app;
}
