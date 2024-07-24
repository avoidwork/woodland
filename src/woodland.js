import {METHODS, STATUS_CODES} from "node:http";
import {join} from "node:path";
import {EventEmitter} from "node:events";
import {readdir, stat} from "node:fs/promises";
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
	COLON,
	COMMA,
	COMMA_SPACE,
	CONNECT,
	CONTENT_LENGTH,
	CONTENT_TYPE,
	DEBUG,
	DELETE,
	DELIMITER,
	EMPTY,
	ERROR,
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
	INT_405,
	INT_416,
	INT_500,
	IP_TOKEN,
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
	MSG_HEADERS_SENT,
	MSG_IGNORED_FN,
	MSG_REGISTERING_MIDDLEWARE,
	MSG_RETRIEVED_MIDDLEWARE,
	MSG_ROUTING,
	MSG_ROUTING_FILE,
	MSG_SENDING_BODY,
	OBJECT,
	OPTIONS,
	ORIGIN,
	PARAMS_GROUP,
	PATCH,
	POST,
	PUT,
	READ_HEADERS,
	SERVER,
	SERVER_VALUE,
	SLASH,
	STRING,
	TIMING_ALLOW_ORIGIN,
	TO_STRING,
	TRACE,
	TRUE,
	USER_AGENT,
	UTF8,
	UTF_8,
	WILDCARD,
	X_FORWARDED_FOR,
	X_POWERED_BY,
	X_POWERED_BY_VALUE,
	X_RESPONSE_TIME
} from "./constants.js";
import {
	autoindex as aindex,
	getStatus,
	ms,
	next,
	pad,
	params,
	parse,
	partialHeaders,
	pipeable,
	reduce,
	stream,
	timeOffset,
	writeHead
} from "./utility.js";

export class Woodland extends EventEmitter {
	constructor ({
		autoindex = false,
		cacheSize = INT_1e3,
		cacheTTL = INT_1e4,
		charset = UTF_8,
		defaultHeaders = {},
		digit = INT_3,
		etags = true,
		indexes = [
			INDEX_HTM,
			INDEX_HTML
		],
		logging = {},
		origins = [WILDCARD],
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
		this.corsExpose = EMPTY;
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
	}

	allowed (method, uri, override = false) {
		return this.routes(uri, method, override).visible > INT_0;
	}

	allows (uri, override = false) {
		let result = override === false ? this.permissions.get(uri) : void 0;

		if (override || result === void 0) {
			const allMethods = this.routes(uri, WILDCARD, override).visible > INT_0,
				list = allMethods ? structuredClone(METHODS) : this.methods.filter(i => this.allowed(i, uri, override));

			if (list.includes(GET)) {
				if (list.includes(HEAD) === false) {
					list.push(HEAD);
				}

				if (list.includes(OPTIONS) === false) {
					list.push(OPTIONS);
				}
			}

			result = list.sort().join(COMMA_SPACE);
			this.permissions.set(uri, result);

			if (this.logging.enabled) {
				this.log(`type=allows, uri=${uri}, override=${override}, message="${MSG_DETERMINED_ALLOW}"`);
			}
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
		const date = new Date();

		return this.logging.format.replace(LOG_V, req.headers?.host ?? HYPHEN)
			.replace(LOG_H, req?.ip ?? HYPHEN)
			.replace(LOG_L, HYPHEN)
			.replace(LOG_U, req?.parsed?.username ?? HYPHEN)
			.replace(LOG_T, `[${date.getDate()}/${MONTHS[date.getMonth()]}/${date.getFullYear()}:${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())} ${timeOffset(date.getTimezoneOffset())}]`)
			.replace(LOG_R, `${req.method} ${req.parsed.pathname}${req.parsed.search} HTTP/1.1`)
			.replace(LOG_S, res.statusCode)
			.replace(LOG_B, res?.getHeader(CONTENT_LENGTH) ?? HYPHEN)
			.replace(LOG_REFERRER, req.headers?.referer ?? HYPHEN)
			.replace(LOG_USER_AGENT, req.headers?.[USER_AGENT] ?? HYPHEN);
	}

	cors (req) {
		return req.corsHost && (this.origins.includes(WILDCARD) || this.origins.includes(req.headers.origin));
	}

	corsHost (req) {
		return ORIGIN in req.headers && req.headers.origin.replace(/^http(s)?:\/\//, "") !== req.headers.host;
	}

	decorate (req, res) {
		if (this.time) {
			req.precise = precise().start();
		}

		const parsed = parse(req);

		req.parsed = parsed;
		req.allow = this.allows(parsed.pathname);
		req.body = EMPTY;
		req.corsHost = this.corsHost(req);
		req.cors = this.cors(req);
		req.host = parsed.hostname;
		req.ip = this.ip(req);
		req.params = {};
		res.locals = {};
		res.error = this.error(req, res);
		res.header = res.setHeader;
		res.json = this.json(res);
		res.redirect = this.redirect(res);
		res.send = this.send(req, res);
		res.set = this.set(res);
		res.status = this.status(res);

		for (const i of this.defaultHeaders) {
			res.header(i[0], i[1]);
		}

		res.header(ALLOW, req.allow);

		if (req.cors) {
			const headers = req.headers[ACCESS_CONTROL_REQUEST_HEADERS] ?? this.corsExpose;

			res.header(ACCESS_CONTROL_ALLOW_ORIGIN, req.headers.origin);
			res.header(TIMING_ALLOW_ORIGIN, req.headers.origin);
			res.header(ACCESS_CONTROL_ALLOW_CREDENTIALS, TRUE);

			if (headers !== void 0) {
				res.header(req.method === OPTIONS ? ACCESS_CONTROL_ALLOW_HEADERS : ACCESS_CONTROL_EXPOSE_HEADERS, headers);
			}

			res.header(ACCESS_CONTROL_ALLOW_METHODS, req.allow);
		}

		if (this.logging.enabled) {
			this.log(`type=decorate, uri=${req.parsed.pathname}, method=${req.method}, ip=${req.ip}, message="${MSG_DECORATED_IP.replace(IP_TOKEN, req.ip)}"`);
		}
	}

	del (...args) {
		return this.use(...args, DELETE);
	}

	delete (...args) {
		return this.use(...args, DELETE);
	}

	error (req, res) {
		return (status = INT_500, body) => {
			if (res.headersSent === false) {
				const err = body instanceof Error ? body : new Error(body ?? STATUS_CODES[status]);
				let output = err.message,
					headers = {};

				[output, status, headers] = this.onready(req, res, output, status, headers);

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

				if (this.logging.enabled) {
					this.log(`type=error, uri=${req.parsed.pathname}, method=${req.method}, ip=${req.ip}, message="${MSG_ERROR_IP.replace(IP_TOKEN, req.ip)}"`);
					this.log(this.clf(req, res), INFO);
				}

				this.ondone(req, res, output, headers);
			}
		};
	}

	etag (method, ...args) {
		return (method === GET || method === HEAD || method === OPTIONS) && this.etags !== null ? this.etags.create(args.map(i => typeof i !== STRING ? JSON.stringify(i).replace(/^"|"$/g, EMPTY) : i).join(HYPHEN)) : EMPTY;
	}

	get (...args) {
		return this.use(...args, GET);
	}

	ignore (fn) {
		this.ignored.add(fn);

		if (this.logging.enabled) {
			this.log(`type=ignore, message="${MSG_IGNORED_FN}", code="${fn.toString()}"`);
		}

		return this;
	}

	ip (req) {
		return X_FORWARDED_FOR in req.headers ? req.headers[X_FORWARDED_FOR].split(COMMA).pop().trim() : req.connection.remoteAddress;
	}

	json (res) {
		return (arg, status = 200, headers = {[CONTENT_TYPE]: `${APPLICATION_JSON}; charset=${UTF_8}`}) => {
			res.send(JSON.stringify(arg), status, headers);
		};
	}

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

		if (this.logging.enabled) {
			this.log(`type=list, method=${method}, type=${type}`);
		}

		return result;
	}

	log (msg, level = DEBUG) {
		const idx = LEVELS[level];

		if (idx <= LEVELS[this.logging.level]) {
			/* istanbul ignore next */
			process.nextTick(() => console[idx > INT_4 ? LOG : ERROR](msg));
		}

		return this;
	}

	ondone (req, res, body, headers) {
		if (res.statusCode !== INT_204 && res.statusCode !== INT_304 && res.getHeader(CONTENT_LENGTH) === void 0) {
			res.header(CONTENT_LENGTH, Buffer.byteLength(body));
		}

		writeHead(res, headers);
		res.end(body, this.charset);
	}

	onready (req, res, body, status, headers) {
		if (this.time && res.getHeader(X_RESPONSE_TIME) === void 0) {
			res.header(X_RESPONSE_TIME, `${ms(req.precise.stop().diff(), this.digit)}`);
		}

		return this.onsend(req, res, body, status, headers);
	}

	/* istanbul ignore next */
	onsend (req, res, body, status, headers) {
		return [body, status, headers];
	}

	options (...args) {
		return this.use(...args, OPTIONS);
	}

	patch (...args) {
		return this.use(...args, PATCH);
	}

	path (arg = EMPTY) {
		return arg.replace(/\/:([^/]+)/g, PARAMS_GROUP);
	}

	post (...args) {
		return this.use(...args, POST);
	}

	put (...args) {
		return this.use(...args, PUT);
	}

	redirect (res) {
		return (uri, perm = true) => {
			res.send(EMPTY, perm ? INT_308 : INT_307, {[LOCATION]: uri});
		};
	}

	route (req, res) {
		const evc = CONNECT.toLowerCase(),
			evf = FINISH;
		let method = req.method === HEAD ? GET : req.method;

		this.decorate(req, res);

		if (this.listenerCount(evc) > INT_0) {
			this.emit(evc, req, res);
		}

		if (this.listenerCount(evf) > INT_0) {
			res.on(evf, () => this.emit(evf, req, res));
		}

		if (method === OPTIONS && this.allowed(method, req.parsed.pathname) === false) {
			method = GET; // Changing an OPTIONS request to GET due to absent route
		}

		if (this.logging.enabled) {
			this.log(`type=route, uri=${req.parsed.pathname}, method=${req.method}, ip=${req.ip}, message="${MSG_ROUTING}"`);
		}

		if (req.cors === false && ORIGIN in req.headers && req.corsHost && this.origins.includes(req.headers.origin) === false) {
			res.error(INT_403);
		} else if (req.allow.includes(method)) {
			const result = this.routes(req.parsed.pathname, method);

			if (result.params) {
				params(req, result.getParams);
			}

			req.last = result.last;
			next(req, res, result.middleware[Symbol.iterator]())();
		} else {
			res.error(getStatus(req, res));
		}
	}

	routes (uri, method, override = false) {
		const key = `${method}${DELIMITER}${uri}`,
			cached = override === false ? this.cache.get(key) : void 0;
		let result;

		if (cached !== void 0) {
			result = cached;
		} else {
			result = {getParams: null, middleware: [], params: false, visible: INT_0, last: null};
			reduce(uri, this.middleware.get(WILDCARD), result);

			if (method !== WILDCARD) {
				reduce(uri, this.middleware.get(method), result, true, this.ignored);
			}

			result.visible = result.middleware.filter(i => this.ignored.has(i) === false).length;
			this.cache.set(key, result);
		}

		if (this.logging.enabled) {
			this.log(`type=routes, uri=${uri}, method=${method}, cached=${cached !== void 0}, middleware=${result.middleware.length}, params=${result.params}, visible=${result.visible}, override=${override}, message="${MSG_RETRIEVED_MIDDLEWARE}"`);
		}

		return result;
	}

	send (req, res) {
		return (body = EMPTY, status = res.statusCode, headers = {}) => {
			if (res.headersSent === false) {
				[body, status, headers] = this.onready(req, res, body, status, headers);

				if (pipeable(req.method, body)) {
					if (req.headers.range === void 0 || req.range !== void 0) {
						writeHead(res, headers);
						body.on(ERROR, err => res.error(INT_500, err)).pipe(res);
					} else {
						res.error(INT_416);
					}
				} else {
					if (typeof body !== STRING && typeof body[TO_STRING] === FUNCTION) {
						body = body.toString();
					}

					if (req.headers.range !== void 0) {
						const buffered = Buffer.from(body);

						[headers] = partialHeaders(req, res, Buffer.byteLength(buffered), status, headers);

						if (req.range !== void 0) {
							this.ondone(req, res, buffered.slice(req.range.start, req.range.end).toString(), headers);
						} else {
							res.error(INT_416);
						}
					} else {
						res.statusCode = status;
						this.ondone(req, res, body, headers);
					}
				}

				if (this.logging.enabled) {
					this.log(`type=res.send, uri=${req.parsed.pathname}, method=${req.method}, ip=${req.ip}, valid=true, message="${MSG_SENDING_BODY}"`);
					this.log(this.clf(req, res), INFO);
				}
			} else if (this.logging.enabled) {
				this.log(`type=res.send, uri=${req.parsed.pathname}, method=${req.method}, ip=${req.ip}, valid=false, message="${MSG_HEADERS_SENT}"`);
			}
		};
	}

	set (res) {
		return (arg = {}) => {
			res.setHeaders(arg instanceof Map || arg instanceof Headers ? arg : new Headers(arg));

			return res;
		};
	}

	async serve (req, res, arg, folder = process.cwd()) {
		const fp = join(folder, arg);

		if (req.method !== GET && req.method !== HEAD && req.method !== OPTIONS) {
			if (req.allow.length > INT_0) {
				req.allow = READ_HEADERS;
				res.header(ALLOW, req.allow);
			}

			res.error(INT_405);
		} else {
			let valid = true;
			let stats;

			try {
				stats = await stat(fp, {bigint: false});
				// eslint-disable-next-line no-unused-vars
			} catch (e) {
				valid = false;
			}

			if (valid === false) {
				res.error(INT_404);
			} else if (stats.isDirectory() === false) {
				stream(req, res, {
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

					stream(req, res, {
						charset: this.charset,
						etag: this.etag(req.method, rstats.ino, rstats.size, rstats.mtimeMs),
						path: result,
						stats: rstats
					});
				}
			}
		}

		if (this.logging.enabled) {
			this.log(`type=serve, uri=${req.parsed.pathname}, method=${req.method}, ip=${req.ip}, message="${MSG_ROUTING_FILE}"`);
		}
	}

	status (res) {
		return (arg = INT_200) => {
			res.statusCode = arg;

			return res;
		};
	}

	staticFiles (root, folder = process.cwd()) {
		this.get(`${root.replace(/\/$/, EMPTY)}(.*)?`, (req, res) => this.serve(req, res, req.parsed.pathname.substring(1), folder));
	}

	trace (...args) {
		return this.use(...args, TRACE);
	}

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

		if (this.logging.enabled) {
			this.log(`type=use, route=${rpath}, method=${method}, message="${MSG_REGISTERING_MIDDLEWARE}"`);
		}

		return this;
	}
}

export function woodland (arg) {
	const app = new Woodland(arg);

	app.route = app.route.bind(app);

	return app;
}
