/**
 * woodland
 *
 * @copyright 2024 Jason Mulligan <jason.mulligan@avoidwork.com>
 * @license BSD-3-Clause
 * @version 18.2.8
 */
'use strict';

var node_http = require('node:http');
var node_path = require('node:path');
var node_events = require('node:events');
var promises = require('node:fs/promises');
var tinyEtag = require('tiny-etag');
var precise = require('precise');
var tinyLru = require('tiny-lru');
var node_module = require('node:module');
var node_url = require('node:url');
var node_fs = require('node:fs');
var tinyCoerce = require('tiny-coerce');
var mimeDb = require('mime-db');

var _documentCurrentScript = typeof document !== 'undefined' ? document.currentScript : null;
const __dirname$2 = node_url.fileURLToPath(new node_url.URL(".", (typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.src || new URL('woodland.cjs', document.baseURI).href))));
const require$1 = node_module.createRequire((typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.src || new URL('woodland.cjs', document.baseURI).href)));
const {name, version} = require$1(node_path.join(__dirname$2, "..", "package.json"));

const ACCESS_CONTROL_ALLOW_CREDENTIALS = "access-control-allow-credentials";
const ACCESS_CONTROL_ALLOW_HEADERS = "access-control-allow-headers";
const ACCESS_CONTROL_ALLOW_METHODS = "access-control-allow-methods";
const ACCESS_CONTROL_ALLOW_ORIGIN = "access-control-allow-origin";
const ACCESS_CONTROL_EXPOSE_HEADERS = "access-control-expose-headers";
const ACCESS_CONTROL_REQUEST_HEADERS = "access-control-request-headers";
const ALLOW = "allow";
const APPLICATION_JSON = "application/json";
const APPLICATION_OCTET_STREAM = "application/octet-stream";
const ARRAY = "array";
const CACHE_CONTROL = "cache-control";
const COLON = ":";
const COMMA = ",";
const COMMA_SPACE = ", ";
const CONNECT = "CONNECT";
const CONTENT_LENGTH = "content-length";
const CONTENT_RANGE = "content-range";
const CONTENT_TYPE = "content-type";
const DEBUG = "debug";
const DELETE = "DELETE";
const DELIMITER = "|";
const EMPTY = "";
const EN_US = "en-US";
const END = "end";
const ETAG = "etag";
const ERROR = "error";
const EXTENSIONS = "extensions";
const FILES = "files";
const FINISH = "finish";
const FUNCTION = "function";
const GET = "GET";
const HEAD = "HEAD";
const HYPHEN = "-";
const IF_NONE_MATCH = "if-none-match";
const IF_MODIFIED_SINCE = "if-modified-since";
const INDEX_HTM = "index.htm";
const INDEX_HTML = "index.html";
const INFO = "info";
const INT_0 = 0;
const INT_2 = 2;
const INT_3 = 3;
const INT_4 = 4;
const INT_10 = 10;
const INT_60 = 60;
const INT_200 = 200;
const INT_204 = 204;
const INT_206 = 206;
const INT_304 = 304;
const INT_307 = 307;
const INT_308 = 308;
const INT_403 = 403;
const INT_404 = 404;
const INT_405 = 405;
const INT_416 = 416;
const INT_500 = 500;
const INT_1e3 = 1e3;
const INT_1e4 = 1e4;
const INT_1e6 = 1e6;
const IP_TOKEN = "%IP";
const KEY_BYTES = "bytes=";
const LAST_MODIFIED = "last-modified";
const LEFT_PAREN = "(";
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
const LOCATION = "location";
const LOG = "log";
const LOG_B = "%b";
const LOG_FORMAT = "%h %l %u %t \"%r\" %>s %b";
const LOG_H = "%h";
const LOG_L = "%l";
const LOG_R = "%r";
const LOG_REFERRER = "%{Referer}i";
const LOG_S = "%>s";
const LOG_T = "%t";
const LOG_U = "%u";
const LOG_USER_AGENT = "%{User-agent}i";
const LOG_V = "%v";
const SHORT = "short";
const MONTHS = Object.freeze(Array.from(Array(12).values()).map((i, idx) => {
	const d = new Date();
	d.setMonth(idx);

	return Object.freeze(d.toLocaleString(EN_US, {month: SHORT}));
}));
const MSG_DETERMINED_ALLOW = "Determined 'allow' header value";
const MSG_ERROR_HEAD_ROUTE = "Cannot set HEAD route, use GET";
const MSG_ERROR_INVALID_METHOD = "Invalid HTTP method";
const MSG_SENDING_BODY = "Sending response body";
const MSG_DECORATED_IP = "Decorated request from %IP";
const MSG_ERROR_IP = "Handled error response for %IP";
const MSG_IGNORED_FN = "Added function to ignored Set";
const MSG_ROUTING = "Routing request";
const MSG_ROUTING_FILE = "Routing request to file system";
const MSG_RETRIEVED_MIDDLEWARE = "Retrieved middleware for request";
const MSG_REGISTERING_MIDDLEWARE = "Registering middleware";
const MSG_HEADERS_SENT = "Headers already sent";
const OBJECT = "object";
const OPTIONS = "OPTIONS";
const OPTIONS_BODY = "Make a GET request to retrieve the file";
const ORIGIN = "origin";
const PARAMS_GROUP = "/(?<$1>[^/]+)";
const PATCH = "PATCH";
const PERIOD = ".";
const POST = "POST";
const PUT = "PUT";
const RANGE = "range";
const READ_HEADERS = "GET, HEAD, OPTIONS";
const SERVER = "server";
const SERVER_VALUE = `${name}/${version}`;
const SLASH = "/";
const START = "start";
const STRING = "string";
const STRING_0 = "0";
const STRING_00 = "00";
const STRING_30 = "30";
const TIME_MS = "%N ms";
const TIMING_ALLOW_ORIGIN = "timing-allow-origin";
const TITLE = "title";
const TO_STRING = "toString";
const TOKEN_N = "%N";
const TRACE = "TRACE";
const TRUE = "true";
const USER_AGENT = "user-agent";
const UTF8 = "utf8";
const UTF_8 = "utf-8";
const WILDCARD = "*";
const X_FORWARDED_FOR = "x-forwarded-for";
const X_POWERED_BY = "x-powered-by";
const X_POWERED_BY_VALUE = `nodejs/${process.version}, ${process.platform}/${process.arch}`;
const X_RESPONSE_TIME = "x-response-time";

const __dirname$1 = node_url.fileURLToPath(new node_url.URL(".", (typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.src || new URL('woodland.cjs', document.baseURI).href)))),
	html = node_fs.readFileSync(node_path.join(__dirname$1, "..", "tpl", "autoindex.html"), {encoding: UTF8}),
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

function getStatus (req, res) {
	return req.allow.length > INT_0 ? req.method !== GET ? INT_405 : req.allow.includes(GET) ? res.statusCode > INT_500 ? res.statusCode : INT_500 : INT_404 : INT_404;
}

function mime (arg = EMPTY) {
	const ext = node_path.extname(arg);

	return ext in extensions ? extensions[ext].type : APPLICATION_OCTET_STREAM;
}

function ms (arg = INT_0, digits = INT_3) {
	return TIME_MS.replace(TOKEN_N, Number(arg / INT_1e6).toFixed(digits));
}

function next (req, res, middleware) {
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
					res.error(getStatus(req, res));
				}
			} else {
				obj.value(req, res, fn);
			}
		} else {
			res.error(getStatus(req, res));
		}
	});

	return fn;
}

function pad (arg = INT_0) {
	return String(arg).padStart(INT_2, STRING_0);
}

function params (req, getParams) {
	getParams.lastIndex = INT_0;
	req.params = getParams.exec(req.parsed.pathname)?.groups ?? {};

	for (const [key, value] of Object.entries(req.params)) {
		req.params[key] = tinyCoerce.coerce(decodeURIComponent(value));
	}
}

function parse (arg) {
	return new node_url.URL(typeof arg === STRING ? arg : `http://${arg.headers.host || `localhost:${arg.socket.server._connectionKey.replace(/.*::/, EMPTY)}`}${arg.url}`);
}

function partialHeaders (req, res, size, status, headers = {}, options = {}) {
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
			res.statusCode = INT_206;
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
	Array.from(map.values()).filter(i => {
		i.regex.lastIndex = INT_0;

		return i.regex.test(uri);
	}).forEach(i => {
		for (const fn of i.handlers) {
			arg.middleware.push(fn);

			if (end && arg.last === null && ignore.has(fn) === false) {
				arg.last = fn;
			}
		}

		if (i.params && arg.params === false) {
			arg.params = true;
			arg.getParams = i.regex;
		}
	});
}

function stream (req, res, file = {
	charset: EMPTY,
	etag: EMPTY,
	path: EMPTY,
	stats: {mtime: new Date(), size: INT_0}
}) {
	res.header(CONTENT_LENGTH, file.stats.size);
	res.header(CONTENT_TYPE, file.charset.length > INT_0 ? `${mime(file.path)}; charset=${file.charset}` : mime(file.path));
	res.header(LAST_MODIFIED, file.stats.mtime.toUTCString());

	if (file.etag.length > INT_0) {
		res.header(ETAG, file.etag);
		res.removeHeader(CACHE_CONTROL);
	}

	if (req.method === GET) {
		if (file.etag.length > INT_0 && req.headers[IF_NONE_MATCH] === file.etag || req.headers[IF_NONE_MATCH] === void 0 && Date.parse(req.headers[IF_MODIFIED_SINCE]) >= file.stats.mtime) {
			res.removeHeader(CONTENT_LENGTH);
			res.send(EMPTY, INT_304);
		} else {
			let status = INT_200;
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

			res.send(node_fs.createReadStream(file.path, options), status);
		}
	} else if (req.method === HEAD) {
		res.send(EMPTY);
	} else if (req.method === OPTIONS) {
		res.removeHeader(CONTENT_LENGTH);
		res.send(OPTIONS_BODY);
	}

	return void 0;
}

function timeOffset (arg = INT_0) {
	const neg = arg < INT_0;

	return `${neg ? EMPTY : HYPHEN}${String((neg ? -arg : arg) / INT_60).split(PERIOD).reduce((a, v, idx, arr) => {
		a.push(idx === INT_0 ? pad(v) : STRING_30);

		if (arr.length === 1) {
			a.push(STRING_00);
		}

		return a;
	}, []).join(EMPTY)}`;
}

function writeHead (res, headers = {}) {
	res.writeHead(res.statusCode, node_http.STATUS_CODES[res.statusCode], headers);
}

class Woodland extends node_events.EventEmitter {
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
		this.cache = tinyLru.lru(cacheSize, cacheTTL);
		this.charset = charset;
		this.corsExpose = EMPTY;
		this.defaultHeaders = Reflect.ownKeys(defaultHeaders).map(key => [key.toLowerCase(), defaultHeaders[key]]);
		this.digit = digit;
		this.etags = etags ? tinyEtag.etag({cacheSize, cacheTTL}) : null;
		this.indexes = structuredClone(indexes);
		this.permissions = tinyLru.lru(cacheSize, cacheTTL);
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
				list = allMethods ? structuredClone(node_http.METHODS) : this.methods.filter(i => this.allowed(i, uri, override));

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
			req.precise = precise.precise().start();
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
				const err = body instanceof Error ? body : new Error(body ?? node_http.STATUS_CODES[status]);
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
		const fp = node_path.join(folder, arg);

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
				stats = await promises.stat(fp, {bigint: false});
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
				const files = await promises.readdir(fp, {encoding: UTF8, withFileTypes: true});
				let result = EMPTY;

				for (const file of files) {
					if (this.indexes.includes(file.name)) {
						result = node_path.join(fp, file.name);
						break;
					}
				}

				if (result.length === INT_0) {
					if (this.autoindex === false) {
						res.error(INT_404);
					} else {
						const body = autoindex(decodeURIComponent(req.parsed.pathname), files);

						res.header(CONTENT_TYPE, `text/html; charset=${this.charset}`);
						res.send(body);
					}
				} else {
					const rstats = await promises.stat(result, {bigint: false});

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
		this.get(`${root.replace(/\/$/, EMPTY)}/(.*)?`, (req, res) => this.serve(req, res, req.parsed.pathname.substring(1), folder));
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

		if (method !== WILDCARD && node_http.METHODS.includes(method) === false) {
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

function woodland (arg) {
	const app = new Woodland(arg);

	app.route = app.route.bind(app);

	return app;
}

exports.Woodland = Woodland;
exports.woodland = woodland;
