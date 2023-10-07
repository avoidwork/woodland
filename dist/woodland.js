/**
 * woodland
 *
 * @copyright 2023 Jason Mulligan <jason.mulligan@avoidwork.com>
 * @license BSD-3-Clause
 * @version 18.0.5
 */
import {STATUS_CODES,METHODS}from'node:http';import {join,extname,resolve}from'node:path';import {EventEmitter}from'node:events';import {readFileSync,createReadStream,stat,readdir}from'node:fs';import {etag}from'tiny-etag';import {precise}from'precise';import {lru}from'tiny-lru';import {fileURLToPath,URL}from'node:url';import {coerce}from'tiny-coerce';import mimeDb from'mime-db';const ALL = "*";
const DELIMITER = "|";
const LEVELS = Object.freeze({
	emerg: 0,
	alert: 1,
	crit: 2,
	error: 3,
	warn: 4,
	notice: 5,
	info: 6,
	debug: 7
});

const EN_US = "en-US";
const SHORT = "short";
const MONTHS = Object.freeze(Array.from(Array(12).values()).map((i, idx) => {
	const d = new Date();
	d.setMonth(idx);

	return Object.freeze(d.toLocaleString(EN_US, {month: SHORT}));
}));
const UTF8 = "utf8";
const UTF_8 = "utf-8";
const INDEX_HTM = "index.htm";
const INDEX_HTML = "index.html";
const EXTENSIONS = "extensions";
const EMPTY = "";
const WILDCARD = "*";
const GET = "GET";
const POST = "POST";
const PUT = "PUT";
const DELETE = "DELETE";
const PATCH = "PATCH";
const CONNECT = "CONNECT";
const APPLICATION_JSON = "application/json";
const APPLICATION_OCTET_STREAM = "application/octet-stream";
const TIME_MS = "%N ms";
const TOKEN_N = "%N";
const STRING_0 = "0";
const STRING_00 = "00";
const STRING_30 = "30";
const SLASH = "/";
const STRING = "string";
const TO_STRING = "toString";
const KEY_BYTES = "bytes=";
const COMMA = ",";
const COMMA_SPACE = ", ";
const HYPHEN = "-";
const PERIOD = ".";
const START = "start";
const END = "end";
const CACHE_CONTROL = "cache-control";
const CONTENT_RANGE = "content-range";
const CONTENT_LENGTH = "content-length";
const CONTENT_TYPE = "content-type";
const LAST_MODIFIED = "last-modified";
const IF_NONE_MATCH = "if-none-match";
const IF_MODIFIED_SINCE = "if-modified-since";
const X_FORWARDED_FOR = "x-forwarded-for";
const X_RESPONSE_TIME = "x-response-time";
const ACCESS_CONTROL_ALLOW_ORIGIN = "access-control-allow-origin";
const ACCESS_CONTROL_ALLOW_METHODS = "access-control-allow-methods";
const ACCESS_CONTROL_ALLOW_HEADERS = "access-control-allow-headers";
const ACCESS_CONTROL_EXPOSE_HEADERS = "access-control-expose-headers";
const ACCESS_CONTROL_REQUEST_HEADERS = "access-control-request-headers";
const ACCESS_CONTROL_ALLOW_CREDENTIALS = "access-control-allow-credentials";
const TIMING_ALLOW_ORIGIN = "timing-allow-origin";
const LOCATION = "location";
const USER_AGENT = "user-agent";
const RANGE = "range";
const ETAG = "etag";
const HEAD = "HEAD";
const FUNCTION = "function";
const OPTIONS = "OPTIONS";
const OPTIONS_BODY = "Make a GET request to retrieve the file";
const TITLE = "title";
const FILES = "files";
const LOG_FORMAT = "%h %l %u %t \"%r\" %>s %b";
const LOG_V = "%v";
const LOG_H = "%h";
const LOG_L = "%l";
const LOG_U = "%u";
const LOG_T = "%t";
const LOG_R = "%r";
const LOG_S = "%>s";
const LOG_B = "%b";
const LOG_REFERRER = "%{Referer}i";
const LOG_USER_AGENT = "%{User-agent}i";
const INFO = "info";
const DEBUG = "debug";
const ORIGIN = "origin";
const MSG_ERROR_ROUTING = "Routing to error handler";
const MSG_DETERMINED_ALLOW = "Determined 'allow' header value";
const MSG_SENDING_BODY = "Sending response body";
const MSG_DECORATED_IP = "Decorated request from %IP";
const MSG_ERROR_IP = "Handled error response for %IP";
const MSG_IGNORED_FN = "Added function to ignored Set";
const MSG_ROUTING = "Routing request";
const MSG_ROUTING_FILE = "Routing request to file system";
const MSG_RETRIEVED_MIDDLEWARE = "Retrieved middleware for request";
const MSG_REGISTERING_MIDDLEWARE = "Registering middleware";
const MSG_HEADERS_SENT = "Headers already sent";
const IP_TOKEN = "%IP";
const ALLOW = "allow";
const TRUE = "true";
const ERROR = "error";
const ARRAY = "array";
const OBJECT = "object";
const LOG = "log";
const PARAMS_GROUP = "/([^/]+)";
const FINISH = "finish";
const READ_HEADERS = "GET, HEAD, OPTIONS";
const TRACE = "TRACE";
const ERROR_MSG_INVALID_METHOD = "Invalid HTTP method";
const ERROR_MSG_HEAD_ROUTE = "Cannot set HEAD route, use GET";
const COLON = ":";
const LEFT_PAREN = "(";const __dirname = fileURLToPath(new URL(".", import.meta.url)),
	html = readFileSync(join(__dirname, "..", "tpl", "autoindex.html"), {encoding: UTF8}),
	valid = Object.entries(mimeDb).filter(i => EXTENSIONS in i[1]),
	extensions = valid.reduce((a, v) => {
		const result = Object.assign({type: v[0]}, v[1]);

		for (const key of result.extensions) {
			a[`.${key}`] = result;
		}

		return a;
	}, {});

function autoindex (title = EMPTY, files = []) {
	return new Function(TITLE, FILES, `return \`${html}\`;`)(title, files);
}

function last (req, res, e, err) {
	const status = res.statusCode || 0;

	if (err === void 0) {
		e(new Error(req.allow.length > 0 ? req.method !== GET ? 405 : req.allow.includes(GET) ? 500 : 404 : 404));
	} else if (isNaN(status) === false && status >= 400) {
		e(err);
	} else {
		e(new Error(status >= 400 ? status : isNaN(err.message) === false ? err.message : STATUS_CODES[err.message || err] || 500));
	}

	return true;
}

function mime (arg = EMPTY) {
	const ext = extname(arg);

	return ext in extensions ? extensions[ext].type : APPLICATION_OCTET_STREAM;
}

function ms (arg = 0, digits = 3) {
	return TIME_MS.replace(TOKEN_N, Number(arg / 1e6).toFixed(digits));
}

function next (req, res, e, middleware) {
	const fn = err => process.nextTick(() => {
		let obj = middleware.next();

		if (obj.done === false) {
			if (err !== void 0) {
				while (obj.done === false && obj.value.length < 4) {
					obj = middleware.next();
				}

				if (obj.done === false) {
					obj.value(err, req, res, fn);
				} else {
					last(req, res, e, err);
				}
			} else {
				obj.value(req, res, fn);
			}
		} else {
			last(req, res, e, err);
		}
	});

	return fn;
}

function pad (arg = 0) {
	return String(arg).padStart(2, STRING_0);
}

function params (req, pos = []) {
	if (pos.length > 0) {
		const uri = req.parsed.pathname.split(SLASH);

		for (const i of pos) {
			req.params[i[1]] = coerce(decodeURIComponent(uri[i[0]]));
		}
	}
}

function parse (arg) {
	return new URL(typeof arg === STRING ? arg : `http://${arg.headers.host || `localhost:${arg.socket.server._connectionKey.replace(/.*::/, EMPTY)}`}${arg.url}`);
}

function partialHeaders (req, res, size, status, headers = {}, options = {}) {
	if ((req.headers.range || EMPTY).indexOf(KEY_BYTES) === 0) {
		options = {};

		for (const [idx, i] of req.headers.range.replace(KEY_BYTES, EMPTY).split(COMMA)[0].split(HYPHEN).entries()) {
			options[idx === 0 ? START : END] = i ? parseInt(i, 10) : void 0;
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
			res.statusCode = 206;
		} else {
			headers[CONTENT_RANGE] = `bytes */${size}`;
			res.header(CONTENT_RANGE, headers[CONTENT_RANGE]);
		}
	}

	return [headers, options];
}

function pipeable (method, arg) {
	return method !== HEAD && arg !== null && typeof arg.on === FUNCTION;
}

function reduce (uri, map = new Map(), arg = {}, end = false, ignore = new Set()) {
	Array.from(map.entries()).filter(i => {
		i[0].lastIndex = 0;

		return i[0].test(uri);
	}).forEach(i => {
		for (const fn of i[1].handlers) {
			arg.middleware.push(fn);

			if (end && arg.last === null && ignore.has(fn) === false) {
				arg.last = fn;
			}
		}

		if (i[1].pos.length > 0 && arg.pos.length === 0) {
			arg.pos = i[1].pos;
			arg.params = i[1].params;
		}
	});
}

function stream (req, res, file = {
	charset: EMPTY,
	etag: EMPTY,
	path: EMPTY,
	stats: {mtime: new Date(), size: 0}
}) {
	res.header(CONTENT_LENGTH, file.stats.size);
	res.header(CONTENT_TYPE, file.charset.length > 0 ? `${mime(file.path)}; charset=${file.charset}` : mime(file.path));
	res.header(LAST_MODIFIED, file.stats.mtime.toUTCString());

	if (file.etag.length > 0) {
		res.header(ETAG, file.etag);
		res.removeHeader(CACHE_CONTROL);
	}

	if (req.method === GET) {
		if ((file.etag.length > 0 && req.headers[IF_NONE_MATCH] === file.etag) || (req.headers[IF_NONE_MATCH] === void 0 && Date.parse(req.headers[IF_MODIFIED_SINCE]) >= file.stats.mtime)) { // eslint-disable-line no-extra-parens
			res.removeHeader(CONTENT_TYPE);
			res.removeHeader(CONTENT_LENGTH);
			res.send(EMPTY, 304);
		} else {
			let status = 200;
			let options, headers;

			if (RANGE in req.headers) {
				[headers, options] = partialHeaders(req, res, file.stats.size);
				res.removeHeader(CONTENT_LENGTH);
				res.header(CONTENT_RANGE, headers[CONTENT_RANGE]);
				options.end--; // last byte offset

				if (CONTENT_LENGTH in headers) {
					res.header(CONTENT_LENGTH, headers[CONTENT_LENGTH]);
				}
			}

			res.send(createReadStream(file.path, options), status);
		}
	} else if (req.method === HEAD) {
		res.send(EMPTY);
	} else if (req.method === OPTIONS) {
		res.removeHeader(CONTENT_LENGTH);
		res.send(OPTIONS_BODY);
	}

	return void 0;
}

function timeOffset (arg = 0) {
	const neg = arg < 0;

	return `${neg ? EMPTY : HYPHEN}${String((neg ? -arg : arg) / 60).split(PERIOD).reduce((a, v, idx, arr) => {
		a.push(idx === 0 ? pad(v) : STRING_30);

		if (arr.length === 1) {
			a.push(STRING_00);
		}

		return a;
	}, []).join(EMPTY)}`;
}

function writeHead (res, status = 200, headers = {}) {
	if (res.statusCode < status) {
		res.statusCode = status;
	}

	res.writeHead(res.statusCode, STATUS_CODES[res.statusCode], headers);
}class Woodland extends EventEmitter {
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
		return (body = EMPTY, status = 200, headers = {}) => {
			if (res.headersSent === false) {
				[body, status, headers] = this.onready(req, res, body, status, headers);

				if (pipeable(req.method, body)) {
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
							this.ondone(req, res, buffered.slice(req.range.start, req.range.end).toString(), status, headers);
						} else {
							res.error(416);
						}
					} else {
						this.ondone(req, res, body, status, headers);
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

			res.removeHeader(CONTENT_LENGTH);
			this.ondone(req, res, output, status);
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

	ondone (req, res, body, status, headers) {
		if (res.getHeader(CONTENT_LENGTH) === void 0) {
			res.header(CONTENT_LENGTH, Buffer.byteLength(body));
		}

		writeHead(res, status, headers);
		res.end(body, this.charset);
	}

	onready (req, res, body, status, headers) {
		if (res.headersSent === false) {
			if (this.time && res.getHeader(X_RESPONSE_TIME) === void 0) {
				res.header(X_RESPONSE_TIME, `${ms(req.precise.stop().diff(), this.digit)}`);
			}
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
							/* istanbul ignore next */
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
									const body = autoindex(decodeURIComponent(req.parsed.pathname), files);

									res.header(CONTENT_TYPE, `text/html; charset=${this.charset}`);
									res.send(body);
								}
							} else {
								stat(result, {bigint: false}, (e3, rstats) => {
									if (e3 !== null) {
										/* istanbul ignore next */
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

function woodland (arg) {
	const app = new Woodland(arg);

	app.route = app.route.bind(app);

	return app;
}export{Woodland,woodland};