import {METHODS} from "node:http";
import {EventEmitter} from "node:events";
import {createReadStream} from "node:fs";
import {etag} from "tiny-etag";
import {precise} from "precise";
import {
	ACCESS_CONTROL_ALLOW_CREDENTIALS,
	ACCESS_CONTROL_ALLOW_METHODS,
	ACCESS_CONTROL_ALLOW_HEADERS,
	ACCESS_CONTROL_EXPOSE_HEADERS,
	ACCESS_CONTROL_REQUEST_HEADERS,
	ACCESS_CONTROL_ALLOW_ORIGIN,
	ALLOW,
	CACHE_CONTROL,
	CLOSE,
	CONNECT,
	CONTENT_LENGTH,
	CONTENT_RANGE,
	CONTENT_TYPE,
	DEBUG,
	DELETE,
	EMPTY,
	ERROR,
	ETAG,
	FINISH,
	GET,
	HEAD,
	INFO,
	INT_0,
	INT_200,
	INT_204,
	INT_304,
	INT_403,
	LAST_MODIFIED,
	NO_SNIFF,
	OPTIONS,
	OPTIONS_BODY,
	ORIGIN,
	PATCH,
	POST,
	PUT,
	RANGE,
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
	X_RESPONSE_TIME
} from "./constants.js";
import {
	getStatus,
	mime,
	next,
	params,
	parse,
	partialHeaders,
	writeHead
} from "./utility.js";
import {createMiddlewareRegistry} from "./middleware.js";
import {createResponseHandler} from "./response.js";
import {createCorsHandler, createIpExtractor} from "./request.js";
import {createFileServer} from "./fileserver.js";
import {validateConfig, validateLogging} from "./config.js";
import {createLogger} from "./logger.js";

export class Woodland extends EventEmitter {
	constructor (config = {}) {
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
			time
		} = validated;

		const finalHeaders = {...defaultHeaders};
		if (silent === false) {
			if (SERVER in finalHeaders === false) {
				finalHeaders[SERVER] = SERVER_VALUE;
			}
			finalHeaders[X_POWERED_BY] = X_POWERED_BY_VALUE;
		}

		this.autoindex = autoindex;
		this.charset = charset;
		this.corsExpose = corsExpose;
		this.defaultHeaders = Reflect.ownKeys(finalHeaders).map(key => [key.toLowerCase(), finalHeaders[key]]);
		this.digit = digit;
		this.etags = etags ? etag({cacheSize, cacheTTL}) : null;
		this.indexes = [...indexes];
		this.logging = validateLogging(logging);
		this.origins = [...origins];
		this.time = time;

		this.cache = new Map();
		this.permissions = new Map();
		this.ignored = new Set();
		this.middleware = new Map();
		this.methods = [];

		const {log, clfm, extractIP, logRoute, logMiddleware, logDecoration, logError, logServe} = createLogger({
			enabled: this.logging.enabled,
			format: this.logging.format,
			level: this.logging.level
		});
		this.logger = {log, clfm, extractIP, logRoute, logMiddleware, logDecoration, logError, logServe};

		const {cors, corsHost, corsRequest} = createCorsHandler(this.origins);
		this.cors = cors;
		this.corsHost = corsHost;
		this.corsRequest = corsRequest;

		const {extract} = createIpExtractor();
		this.ip = extract;

		this.initResponseHandlers();
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

	initResponseHandlers () {
		const onReady = this.onReady.bind(this);
		const onDone = this.onDone.bind(this);
		const onSend = this.onSend.bind(this);

		const {createErrorHandler, createJsonHandler, createRedirectHandler, createSendHandler, createSetHandler, createStatusHandler, stream} = createResponseHandler({
			digit: this.digit,
			etags: this.etags,
			onReady,
			onDone,
			onSend
		});

		this.responseHandler = {createErrorHandler, createJsonHandler, createRedirectHandler, createSendHandler, createSetHandler, createStatusHandler, stream};

		this.error = createErrorHandler(
			(req, res, err) => this.emit(ERROR, req, res, err),
			(req, _status) => this.logger.logError(req.parsed.pathname, req.method, req.ip)
		);
		this.json = createJsonHandler;
		this.redirect = createRedirectHandler;
		this.send = createSendHandler;
		this.set = createSetHandler;
		this.status = createStatusHandler;
	}

	initFileServer () {
		this.fileServer = createFileServer(this);
	}

	initMiddleware () {
		this.middlewareRegistry = createMiddlewareRegistry(this.middleware, this.ignored, this.methods, this.cache);
	}

	allowed (method, uri, override = false) {
		return this.middlewareRegistry.allowed(method, uri, override);
	}

	allows (uri, override = false) {
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
			this.logger.log(`type=allows, uri=${uri}, override=${override}, message="Determined 'allow' header header value"`);
		}

		return result;
	}

	always (...args) {
		return this.use(...args, WILDCARD);
	}

	connect (...args) {
		return this.use(...args, CONNECT);
	}

	clf (req, res) {
		return this.logger.clfm(req, res);
	}

	decorate (req, res) {
		let timing = null;
		if (this.time) {
			timing = precise().start();
		}

		const parsed = parse(req);
		const pathname = parsed.pathname;
		const allowString = this.allows(pathname);

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

		const clientIP = this.ip(req);
		req.ip = clientIP;

		res.locals = {};
		res.error = this.error(req, res);
		res.header = res.setHeader;
		res.json = this.json(res);
		res.redirect = this.redirect(res);
		res.send = this.send(req, res);
		res.set = this.set(res);
		res.status = this.status(res);

		const headersBatch = Object.create(null);
		headersBatch[ALLOW] = allowString;
		headersBatch[X_CONTENT_TYPE_OPTIONS] = NO_SNIFF;

		for (let i = 0; i < this.defaultHeaders.length; i++) {
			const [key, value] = this.defaultHeaders[i];
			headersBatch[key] = value;
		}

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

		res.set(headersBatch);

		this.log(`type=decorate, uri=${pathname}, method=${req.method}, ip=${clientIP}, message="Decorated request from ${clientIP}"`);
		res.on(CLOSE, () => this.log(this.clf(req, res), INFO));
	}

	delete (...args) {
		return this.use(...args, DELETE);
	}

	etag (method, ...args) {
		return (method === GET || method === HEAD || method === OPTIONS) && this.etags !== null ? this.etags.create(args.map(i => typeof i !== STRING ? JSON.stringify(i).replace(/^"|"$/g, EMPTY) : i).join("-")) : EMPTY;
	}

	files (root = SLASH, folder = process.cwd()) {
		this.fileServer.register(root, folder, this.use.bind(this));
	}

	get (...args) {
		return this.use(...args, GET);
	}

	ignore (fn) {
		this.ignored.add(fn);
		this.logger.log(`type=ignore, message="Added function to ignored Set", name="${fn.name}"`);

		return this;
	}

	list (method = GET.toLowerCase(), type = "array") {
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

	log (msg, level = DEBUG) {
		this.logger.log(msg, level);

		return this;
	}

	onDone (req, res, body, headers) {
		if (res.statusCode !== INT_204 && res.statusCode !== INT_304 && res.getHeader(CONTENT_LENGTH) === void 0) {
			res.header(CONTENT_LENGTH, Buffer.byteLength(body));
		}

		writeHead(res, headers);
		res.end(body, this.charset);
	}

	onReady (req, res, body, status, headers) {
		if (this.time && res.getHeader(X_RESPONSE_TIME) === void 0) {
			const diff = req.precise.stop().diff();
			const msValue = Number(diff / 1e6).toFixed(this.digit);
			res.header(X_RESPONSE_TIME, `${msValue} ms`);
		}

		return this.onSend(req, res, body, status, headers);
	}

	onSend (req, res, body, status, headers) {
		return [body, status, headers];
	}

	options (...args) {
		return this.use(...args, OPTIONS);
	}

	patch (...args) {
		return this.use(...args, PATCH);
	}

	extractPath (arg = EMPTY) {
		return arg.replace(/\/:([^/]+)/g, "/(?<$1>[^/]+)");
	}

	post (...args) {
		return this.use(...args, POST);
	}

	put (...args) {
		return this.use(...args, PUT);
	}

	route (req, res) {
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

	routes (uri, method, override = false) {
		return this.middlewareRegistry.routes(uri, method, override);
	}

	async serve (req, res, arg, folder = process.cwd()) {
		return this.fileServer.serve(req, res, arg, folder);
	}

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

		if (req.method === "GET") {
			let status = INT_200;
			let options = {};
			let headers = {};

			if (RANGE in req.headers) {
				[headers, options] = partialHeaders(req, res, file.stats.size, status);

				if (Object.keys(options).length > INT_0) {
					res.removeHeader(CONTENT_LENGTH);
					res.header(CONTENT_RANGE, headers[CONTENT_RANGE]);

					if (CONTENT_LENGTH in headers) {
						res.header(CONTENT_LENGTH, headers[CONTENT_LENGTH]);
					}
				} else {
					options = {};
				}
			}

			res.send(createReadStream(file.path, Object.keys(options).length > INT_0 ? options : undefined), status);
		} else if (req.method === HEAD) {
			res.send(EMPTY);
		} else if (req.method === OPTIONS) {
			res.removeHeader(CONTENT_LENGTH);
			res.send(OPTIONS_BODY);
		}

		this.emit(STREAM, req, res);
	}

	trace (...args) {
		return this.use(...args, TRACE);
	}

	use (rpath, ...fn) {
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

		const current = mmethod.get(lrpath) ?? {handlers: []};

		current.handlers.push(...fn);
		mmethod.set(lrpath, {
			handlers: current.handlers,
			params: lparams,
			regex: new RegExp(`^${lrpath}$`)
		});

		this.logger.logMiddleware(rpath, method);

		return this;
	}
}

export function woodland (arg) {
	const app = new Woodland(arg);

	app.route = app.route.bind(app);

	return app;
}
