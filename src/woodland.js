import { METHODS } from "node:http";
import { EventEmitter } from "node:events";
import { createReadStream } from "node:fs";
import { etag } from "tiny-etag";
import { precise } from "precise";
import {
	ACCESS_CONTROL_ALLOW_CREDENTIALS,
	ACCESS_CONTROL_ALLOW_METHODS,
	ACCESS_CONTROL_ALLOW_HEADERS,
	ACCESS_CONTROL_EXPOSE_HEADERS,
	ACCESS_CONTROL_REQUEST_HEADERS,
	ACCESS_CONTROL_ALLOW_ORIGIN,
	ALLOW,
	CLOSE,
	CONNECT,
	CONTENT_LENGTH,
	CONTENT_TYPE,
	DEBUG,
	DELETE,
	EMPTY,
	ERROR,
	FINISH,
	GET,
	HEAD,
	INFO,
	INT_0,
	INT_200,
	INT_204,
	INT_304,
	INT_403,
	NO_SNIFF,
	OPTIONS,
	ORIGIN,
	PATCH,
	POST,
	PUT,
	STREAM,
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
} from "./constants.js";
import { getStatus, next, params, parse, writeHead } from "./utility.js";
import { createMiddlewareRegistry } from "./middleware.js";
import { error, json, redirect, send, set, status, stream as responseStream } from "./response.js";
import { validateConfig, validateLogging } from "./config.js";
import { createLogger } from "./logger.js";
import { cors, corsHost, corsRequest } from "./request.js";
import { createFileServer } from "./fileserver.js";
import { APPLICATION_JSON } from "./constants.js";

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

		if (type === "array") {
			result = Array.from(this.middleware.get(method.toUpperCase()).keys());
		} else if (type === "object") {
			result = {};

			for (const [key, value] of this.middleware.get(method.toUpperCase()).entries()) {
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
		responseStream(
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
export function woodland(arg) {
	const app = new Woodland(arg);

	app.route = app.route.bind(app);

	return app;
}
