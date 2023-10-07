import {METHODS, STATUS_CODES} from "node:http";
import {join, resolve} from "node:path";
import {EventEmitter} from "node:events";
import {readdir, stat} from "node:fs";
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
	ALL,
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
	ERROR_MSG_HEAD_ROUTE,
	ERROR_MSG_INVALID_METHOD,
	FINISH,
	FUNCTION,
	GET,
	HEAD,
	HYPHEN,
	INDEX_HTM,
	INDEX_HTML,
	INFO,
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
	MSG_ERROR_IP,
	MSG_ERROR_ROUTING,
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
	X_RESPONSE_TIME
} from "./constants.js";
import {
	autoindex as aindex,
	last,
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

class Woodland extends EventEmitter {
	constructor ({
		autoindex = false,
		cacheSize = 1e3,
		cacheTTL = 3e5,
		charset = UTF_8,
		defaultHeaders = {},
		digit = 3,
		etags = true,
		indexes = [
			INDEX_HTM,
			INDEX_HTML
		],
		logging = {},
		origins = [WILDCARD],
		time = false
	} = {}) {
		super();
		this.autoindex = autoindex;
		this.ignored = new Set();
		this.cache = lru(cacheSize, cacheTTL);
		this.charset = charset;
		this.corsExpose = EMPTY;
		this.defaultHeaders = Object.keys(defaultHeaders).map(key => [key.toLowerCase(), defaultHeaders[key]]);
		this.digit = digit;
		this.etags = etags ? etag({cacheSize, cacheTTL}) : null;
		this.indexes = structuredClone(indexes);
		this.permissions = lru(cacheSize, cacheTTL);
		this.logging = {
			enabled: logging?.enabled !== false ?? true,
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
		return this.routes(uri, method, override).visible > 0;
	}

	allows (uri, override = false) {
		let result = override === false ? this.permissions.get(uri) : void 0;

		if (override || result === void 0) {
			const allMethods = this.routes(uri, ALL, override).visible > 0,
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
		}

		if (this.logging.enabled) {
			this.log(`type=allows, uri=${uri}, override=${override}, message="${MSG_DETERMINED_ALLOW}"`);
		}

		return result;
	}

	always (...args) {
		return this.use(...args, ALL);
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
		return req.corsHost && (this.origins.includes(ALL) || this.origins.includes(req.headers.origin));
	}

	corsHost (req) {
		return ORIGIN in req.headers && req.headers.origin.replace(/^http(s)?:\/\//, "") !== req.headers.host;
	}

	ip (req) {
		return X_FORWARDED_FOR in req.headers ? req.headers[X_FORWARDED_FOR].split(COMMA).pop().trim() : req.connection.remoteAddress;
	}

	decoratorError (req, res) {
		return (status = 500, body) => {
			const err = body !== void 0 ? body instanceof Error ? body : new Error(body) : new Error(STATUS_CODES[status]);

			res.statusCode = status;

			if (this.logging.enabled) {
				this.log(`type=res.error, status=${status}, ip=${req.ip}, uri=${req.parsed.pathname}, message="${MSG_ERROR_ROUTING}"`);
			}

			this.error(req, res, err);
		};
	}

	decoratorJson (req, res) {
		return (arg, status = 200, headers = {[CONTENT_TYPE]: `${APPLICATION_JSON}; charset=${UTF_8}`}) => {
			res.send(JSON.stringify(arg), status, headers);
		};
	}

	decoratorRedirect (req, res) {
		return (uri, perm = true) => {
			res.send(EMPTY, perm ? 301 : 302, {[LOCATION]: uri});
		};
	}

	decoratorSend (req, res) {
		return (body = EMPTY, status = 200, headers = {}, errorPass = false) => {
			const done = () => {
				if (res.getHeader(CONTENT_LENGTH) === void 0) {
					res.header(CONTENT_LENGTH, Buffer.byteLength(body));
				}

				writeHead(res, status, headers);
				res.end(body, this.charset);
			};

			if (res.headersSent === false) {
				[body, status, headers] = this.onsend(req, res, body, status, headers);

				if (errorPass === false && this.time && res.getHeader(X_RESPONSE_TIME) === void 0) {
					res.header(X_RESPONSE_TIME, `${ms(req.precise.stop().diff(), this.digit)}`);
				}

				if (errorPass) {
					done();
				} else if (pipeable(req.method, body)) {
					if (req.headers.range === void 0 || req.range !== void 0) {
						writeHead(res, status, headers);
						body.on(ERROR, err => res.error(500, err)).pipe(res);
					} else {
						res.error(416);
					}
				} else {
					if (typeof body !== STRING && typeof body[TO_STRING] === FUNCTION) {
						body = body.toString();
					}

					if (req.headers.range !== void 0) {
						const buffered = Buffer.from(body);

						[headers] = partialHeaders(req, res, Buffer.byteLength(buffered), status, headers);

						if (req.range !== void 0) {
							writeHead(res, status, headers);
							res.end(buffered.slice(req.range.start, req.range.end).toString(), this.charset);
						} else {
							res.error(416);
						}
					} else {
						done();
					}
				}

				if (this.logging.enabled) {
					this.log(`type=res.send, uri=${req.parsed.pathname}, ip=${req.ip}, valid=true, message="${MSG_SENDING_BODY}"`);
					this.log(this.clf(req, res), INFO);
				}
			} else if (this.logging.enabled) {
				this.log(`type=res.send, uri=${req.parsed.pathname}, ip=${req.ip}, valid=false, message="${MSG_HEADERS_SENT}"`);
			}
		};
	}

	decoratorStatus (req, res) {
		return (arg = 200) => {
			res.statusCode = arg;

			return res;
		};
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
		res.error = this.decoratorError(req, res);
		res.header = res.setHeader;
		res.json = this.decoratorJson(req, res);
		res.redirect = this.decoratorRedirect(req, res);
		res.send = this.decoratorSend(req, res);
		res.status = this.decoratorStatus(req, res);

		for (const i of this.defaultHeaders) {
			res.header(i[0], i[1]);
		}

		res.header(ALLOW, req.allow);

		if (req.cors) {
			const headers = req.headers[ACCESS_CONTROL_REQUEST_HEADERS] || this.corsExpose;

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

	error (req, res, err) {
		const ev = ERROR;

		if (res.headersSent === false) {
			const numeric = isNaN(err.message) === false,
				status = isNaN(res.statusCode) === false && res.statusCode >= 400 ? res.statusCode : numeric ? Number(err.message) : 500,
				output = numeric ? STATUS_CODES[status] : err.message;

			if (status === 404) {
				res.removeHeader(ALLOW);
				res.header(ALLOW, EMPTY);

				if (req.cors) {
					res.removeHeader(ACCESS_CONTROL_ALLOW_METHODS);
					res.header(ACCESS_CONTROL_ALLOW_METHODS, EMPTY);
				}
			}

			res.statusCode = status;
			res.send(output, status, {}, true);
		}

		if (this.listenerCount(ev) > 0) {
			this.emit(ev, req, res, err);
		}

		if (this.logging.enabled) {
			this.log(`type=error, message="${MSG_ERROR_IP.replace(IP_TOKEN, req.ip)}"`);
		}
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
			process.nextTick(() => console[idx > 4 ? LOG : ERROR](msg));
		}

		return this;
	}

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

	route (req, res) {
		const e = err => res.error(res.statusCode, err),
			evc = CONNECT.toLowerCase(),
			evf = FINISH;
		let method = req.method === HEAD ? GET : req.method;

		this.decorate(req, res);

		if (this.listenerCount(evc) > 0) {
			this.emit(evc, req, res);
		}

		if (this.listenerCount(evf) > 0) {
			res.on(evf, () => this.emit(evf, req, res));
		}

		if (method === OPTIONS && this.allowed(method, req.parsed.pathname) === false) {
			method = GET; // Changing an OPTIONS request to GET due to absent route
		}

		if (req.cors === false && ORIGIN in req.headers && req.corsHost && this.origins.includes(req.headers.origin) === false) {
			res.error(403);
		} else if (req.allow.includes(method)) {
			const result = this.routes(req.parsed.pathname, method);

			if (result.params) {
				params(req, result.pos);
			}

			req.last = result.last;
			next(req, res, e, result.middleware[Symbol.iterator]())();
		} else {
			last(req, res, e);
		}

		if (this.logging.enabled) {
			this.log(`type=route, message="${MSG_ROUTING}"`);
		}
	}

	routes (uri, method, override = false) {
		const key = `${method}${DELIMITER}${uri}`,
			cached = override === false ? this.cache.get(key) : void 0;
		let result;

		if (cached !== void 0) {
			result = cached;
		} else {
			result = {middleware: [], params: false, pos: [], visible: 0, last: null};
			reduce(uri, this.middleware.get(ALL), result);

			if (method !== ALL) {
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

	serve (req, res, arg = "", folder = process.cwd(), index = this.indexes) {
		const fp = resolve(folder, decodeURIComponent(arg));

		if (req.method !== GET && req.method !== HEAD && req.method !== OPTIONS) {
			if (req.allow.length > 0) {
				req.allow = READ_HEADERS;
				res.header(ALLOW, req.allow);
			}

			res.error(405);
		} else {
			stat(fp, {bigint: false}, (e, stats) => {
				if (e !== null) {
					res.error(404);
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
					readdir(fp, {encoding: UTF8, withFileTypes: true}, (e2, files) => {
						if (e2 !== null) {
							res.error(500, e2);
						} else {
							let result = EMPTY;

							for (const file of files) {
								if (index.includes(file.name)) {
									result = join(fp, file.name);
									break;
								}
							}

							if (result.length === 0) {
								if (this.autoindex === false) {
									res.error(404);
								} else {
									let valid = true,
										body = EMPTY,
										lerr;

									try {
										body = aindex(decodeURIComponent(req.parsed.pathname), files);
									} catch (err) {
										valid = false;
										lerr = err;
									}

									if (valid) {
										res.header(CONTENT_TYPE, `text/html; charset=${this.charset}`);
										res.send(body);
									} else {
										res.error(500, lerr);
									}
								}
							} else {
								stat(result, {bigint: false}, (e3, rstats) => {
									if (e3 !== null) {
										res.error(500, e3);
									} else {
										stream(req, res, {
											charset: this.charset,
											etag: this.etag(req.method, rstats.ino, rstats.size, rstats.mtimeMs),
											path: result,
											stats: rstats
										});
									}
								});
							}
						}
					});
				}
			});
		}

		if (this.logging.enabled) {
			this.log(`type=serve, uri=${req.parsed.pathname}, method=${req.method}, message="${MSG_ROUTING_FILE}"`);
		}
	}

	trace (...args) {
		return this.use(...args, TRACE);
	}

	use (rpath, ...fn) {
		if (typeof rpath === FUNCTION) {
			fn = [rpath, ...fn];
			rpath = `/.${ALL}`;
		}

		const method = typeof fn[fn.length - 1] === STRING ? fn.pop().toUpperCase() : GET;

		if (method !== ALL && METHODS.includes(method) === false) {
			throw new TypeError(ERROR_MSG_INVALID_METHOD);
		}

		if (method === HEAD) {
			throw new TypeError(ERROR_MSG_HEAD_ROUTE);
		}

		if (this.middleware.has(method) === false) {
			if (method !== ALL) {
				this.methods.push(method);
			}

			this.middleware.set(method, new Map());
		}

		const mmethod = this.middleware.get(method),
			lpos = [];
		let lrpath = rpath,
			lparams = false;

		if (lrpath.includes(COLON) && lrpath.includes(LEFT_PAREN) === false) {
			lparams = true;

			for (const [idx, i] of lrpath.split(SLASH).entries()) {
				if (i[0] === ":") {
					lpos.push([idx, i.replace(/^:/, EMPTY)]);
				}
			}

			lrpath = this.path(lrpath);
		}

		const current = mmethod.get(lrpath) || {},
			keep = (current.pos || []).length > 0;

		lrpath = new RegExp(`^${lrpath}$`);
		mmethod.set(lrpath, {
			handlers: [...current.handlers || [], ...fn],
			params: keep ? current.params : lparams,
			pos: keep ? current.pos : lpos
		});

		if (this.logging.enabled) {
			this.log(`type=use, route=${rpath}, method=${method}, message="${MSG_REGISTERING_MIDDLEWARE}"`);
		}

		return this;
	}
}

export function woodland (arg) {
	const router = new Woodland(arg);

	router.route = router.route.bind(router);

	return router;
}
