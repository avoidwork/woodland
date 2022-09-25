/**
 * woodland
 *
 * @copyright 2022 Jason Mulligan <jason.mulligan@avoidwork.com>
 * @license BSD-3-Clause
 * @version 17.0.0
 */
'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var node_http = require('node:http');
var node_path = require('node:path');
var node_events = require('node:events');
var node_fs = require('node:fs');
var tinyEtag = require('tiny-etag');
var precise = require('precise');
var tinyLru = require('tiny-lru');
var node_url = require('node:url');
var tinyCoerce = require('tiny-coerce');
var mimeDb = require('mime-db');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var mimeDb__default = /*#__PURE__*/_interopDefaultLegacy(mimeDb);

const all = "*";
const delimiter = "|";
const levels = {
	emerg: 0,
	alert: 1,
	crit: 2,
	error: 3,
	warn: 4,
	notice: 5,
	info: 6,
	debug: 7
};
const months = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec"
];

const __dirname$1 = node_url.fileURLToPath(new node_url.URL(".", (typeof document === 'undefined' ? new (require('u' + 'rl').URL)('file:' + __filename).href : (document.currentScript && document.currentScript.src || new URL('woodland.cjs', document.baseURI).href)))),
	html = node_fs.readFileSync(node_path.join(__dirname$1, "..", "tpl", "autoindex.html"), {encoding: "utf8"}),
	valid = Object.entries(mimeDb__default["default"]).filter(i => "extensions" in i[1]),
	extensions = valid.reduce((a, v) => {
		const result = Object.assign({type: v[0]}, v[1]);

		for (const key of result.extensions) {
			a[`.${key}`] = result;
		}

		return a;
	}, {});

function autoindex (title = "", files = []) { // eslint-disable-line no-unused-vars
	return eval("`" + html + "`"); // eslint-disable-line no-eval
}

function clone (arg) {
	return JSON.parse(JSON.stringify(arg));
}

function last (req, res, e, err) {
	const status = res.statusCode || 0;

	if (err === void 0) {
		e(new Error(req.allow.length > 0 ? req.method !== "GET" ? 405 : req.allow.includes("GET") ? 500 : 404 : 404));
	} else if (isNaN(status) === false && status >= 400) {
		e(err);
	} else {
		e(new Error(status >= 400 ? status : isNaN(err.message) === false ? err.message : node_http.STATUS_CODES[err.message || err] || 500));
	}

	return true;
}

function mime (arg = "") {
	const ext = node_path.extname(arg);

	return ext in extensions ? extensions[ext].type : "application/octet-stream";
}

function ms (arg = 0, digits = 3) {
	return `${Number(arg / 1e6).toFixed(digits)} ms`;
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
	return String(arg).padStart(2, "0");
}

function params (req, pos = []) {
	if (pos.length > 0) {
		const uri = req.parsed.ame.split("/");

		for (const i of pos) {
			req.params[i[1]] = tinyCoerce.coerce(decodeURIComponent(uri[i[0]]));
		}
	}
}

function parse (arg) {
	return new node_url.URL(typeof arg === "string" ? arg : `http://${arg.headers.host || `localhost:${arg.socket.server._connectionKey.replace(/.*::/, "")}`}${arg.url}`);
}

function partial (req, res, buffered, status, headers) {
	if ((req.headers.range || "").indexOf("bytes=") === 0) {
		const options = {},
			size = Buffer.byteLength(buffered);

		for (const [idx, i] of req.headers.range.replace("bytes=", "").split(",")[0].split("-").entries()) {
			options[idx === 0 ? "start" : "end"] = i ? parseInt(i, 10) : void 0;
		}

		// Byte offsets
		if (isNaN(options.start) && isNaN(options.end) === false) {
			options.start = size - options.end;
			options.end = size;
		} else if (isNaN(options.end)) {
			options.end = size;
		}

		if ((options.start >= options.end || isNaN(options.start) || isNaN(options.end)) === false) {
			req.range = options;
			headers["content-range"] = `bytes ${options.start + (options.end === size ? 1 : 0)}-${options.end}/${size}`;
			headers["content-length"] = `${options.end - options.start + (options.end === size ? 0 : 1)}`;
			res.statusCode = 206;
			res.removeHeader("etag"); // Removing etag since this rep is incomplete
			delete headers.etag;
		}
	}
}

function pipeable (method, arg) {
	return method !== "HEAD" && arg !== null && typeof arg.on === "function";
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

function stream (req, res, file = {charset: "", etag: "", path: "", stats: {mtime: new Date(), size: 0}}) {
	res.header("content-length", file.stats.size);
	res.header("content-type", file.charset.length > 0 ? `${mime(file.path)}; charset=${file.charset}` : mime(file.path));
	res.header("last-modified", file.stats.mtime.toUTCString());

	if (file.etag.length > 0) {
		res.header("etag", file.etag);
		res.removeHeader("cache-control");
	}

	if (req.method === "GET") {
		if ((file.etag.length > 0 && req.headers["if-none-match"] === file.etag) || (req.headers["if-none-match"] === void 0 && Date.parse(req.headers["if-modified-since"]) >= file.stats.mtime)) { // eslint-disable-line no-extra-parens
			res.removeHeader("content-type");
			res.removeHeader("content-length");
			res.send("", 304);
		} else {
			const options = {};
			let status = 200;

			// Setting the partial content headers
			if ("range" in req.headers) {
				const range = req.headers.range.replace(/^.*=/, "").split(",")[0].split("-");

				for (const [idx, i] of range.entries()) {
					options[idx === 0 ? "start" : "end"] = i !== void 0 ? parseInt(i, 10) : void 0;
				}

				// Byte offsets
				if (isNaN(options.start) && isNaN(options.end) === false) {
					options.start = file.stats.size - options.end;
					options.end = file.stats.size;
				} else if (isNaN(options.end)) {
					options.end = file.stats.size;
				}

				if (options.start >= options.end || isNaN(options.start) || isNaN(options.end)) {
					res.error(416);
				}

				status = 206;
				res.removeHeader("content-length");
				res.removeHeader("etag"); // Removing etag since this rep is incomplete
				res.header("content-range", `bytes ${options.start}-${options.end}/${file.stats.size}`);
				res.header("content-length", options.end - options.start + 1);
			}

			res.send(node_fs.createReadStream(file.path, options), status);
		}
	} else if (req.method === "HEAD") {
		res.send("");
	} else if (req.method === "OPTIONS") {
		res.removeHeader("content-length");
		res.send("Make a GET request to retrieve the file");
	} else {
		res.error(405);
	}

	return void 0;
}

function timeOffset (arg = 0) {
	const neg = arg < 0;

	return `${neg ? "" : "-"}${String((neg ? -arg : arg) / 60).split(".").reduce((a, v, idx, arr) => {
		a.push(idx === 0 ? pad(v) : "30");

		if (arr.length === 1) {
			a.push("00");
		}

		return a;
	}, []).join("")}`;
}

function writeHead (res, status, headers) {
	if (res.statusCode < status) {
		res.statusCode = status;
	}

	res.writeHead(res.statusCode, node_http.STATUS_CODES[res.statusCode], headers);
}

class Woodland extends node_events.EventEmitter {
	constructor ({autoindex = false, cacheSize = 1e3, cacheTTL = 3e5, charset = "utf-8", defaultHeaders = {}, digit = 3, etags = true, indexes = ["index.htm", "index.html"], logging = {}, origins = ["*"], seed = 42, sendError = false, time = false} = {}) {
		super();
		this.autoindex = autoindex;
		this.ignored = new Set();
		this.cache = tinyLru.lru(cacheSize, cacheTTL);
		this.charset = charset;
		this.corsExpose = "";
		this.defaultHeaders = Object.keys(defaultHeaders).map(key => [key.toLowerCase(), defaultHeaders[key]]);
		this.digit = digit;
		this.etags = etags ? tinyEtag.etag({cacheSize, cacheTTL, seed}) : null;
		this.indexes = JSON.parse(JSON.stringify(indexes));
		this.permissions = tinyLru.lru(cacheSize, cacheTTL);
		this.logging = {
			enabled: logging.enabled !== false,
			format: logging.format || "%h %l %u %t \"%r\" %>s %b",
			level: logging.level || "info"
		};
		this.methods = [];
		this.middleware = new Map();
		this.origins = JSON.parse(JSON.stringify(origins));
		this.sendError = sendError;
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
			const allMethods = this.routes(uri, all, override).visible > 0,
				list = allMethods ? clone(node_http.METHODS) : this.methods.filter(i => this.allowed(i, uri, override));

			if (list.includes("GET")) {
				if (list.includes("HEAD") === false) {
					list.push("HEAD");
				}

				if (list.includes("OPTIONS") === false) {
					list.push("OPTIONS");
				}
			}

			result = list.sort().join(", ");
			this.permissions.set(uri, result);
		}

		if (this.logging.enabled) {
			this.log(`type=allows, uri=${uri}, override=${override}, message="Determined 'allow' header value"`, "debug");
		}

		return result;
	}

	always (...args) {
		return this.use(...args, all);
	}

	connect (...args) {
		return this.use(...args, "CONNECT");
	}

	clf (req, res) {
		const date = new Date();

		return this.logging.format.replace("%v", req.headers.host)
			.replace("%h", req.ip || "-")
			.replace("%l", "-")
			.replace("%u", req.parsed.username || "-")
			.replace("%t", `[${date.getDate()}/${months[date.getMonth()]}/${date.getFullYear()}:${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())} ${timeOffset(date.getTimezoneOffset())}]`)
			.replace("%r", `${req.method} ${req.parsed.pathname}${req.parsed.search} HTTP/1.1`)
			.replace("%>s", res.statusCode)
			.replace("%b", res.getHeader("content-length") || "-")
			.replace("%{Referer}i", req.headers.referer || "-")
			.replace("%{User-agent}i", req.headers["user-agent"] || "-");
	}

	decorate (req, res) {
		if (this.time) {
			req.precise = precise.precise().start();
		}

		const parsed = parse(req);

		req.parsed = parsed;
		req.allow = this.allows(parsed.pathname);
		req.body = "";
		req.corsHost = "origin" in req.headers && req.headers.origin.replace(/^http(s)?:\/\//, "") !== req.headers.host;
		req.cors = req.corsHost && (this.origins.includes(all) || this.origins.includes(req.headers.origin));
		req.host = parsed.hostname;
		req.ip = "x-forwarded-for" in req.headers ? req.headers["x-forwarded-for"].split(",").pop().trim() : req.connection.remoteAddress;
		res.locals = {};
		req.params = {};
		res.error = (status = 500, body) => {
			const err = body !== void 0 ? body instanceof Error ? body : new Error(body) : new Error(node_http.STATUS_CODES[status]);

			res.statusCode = status;

			if (this.logging.enabled) {
				this.log(`type=res.error, status=${status}, ip=${req.ip}, uri=${req.parsed.pathname}, message="Routing to error handler"`, "debug");
			}

			this.error(req, res, err);
		};
		res.header = res.setHeader;
		res.json = (arg, status = 200, headers = {"content-type": "application/json; charset=utf-8"}) => res.send(JSON.stringify(arg), status, headers);
		res.redirect = (uri, perm = true) => res.send("", perm ? 301 : 302, {"location": uri});
		res.send = (body = "", status = 200, headers = {}) => {
			if (res.headersSent === false) {
				[body, status, headers] = this.onsend(req, res, body, status, headers);

				if (this.time && res.getHeader("x-response-time") === void 0) {
					res.header("x-response-time", `${ms(req.precise.stop().diff(), this.digit)}`);
				}

				if (pipeable(req.method, body)) {
					writeHead(res, status, headers);
					body.on("error", () => void 0).pipe(res);
				} else {
					if (typeof body !== "string" && "toString" in body) {
						body = body.toString();
					}

					if (req.headers.range !== void 0) {
						const buffered = Buffer.from(body);

						partial(req, res, buffered, status, headers);

						if (req.range !== void 0) {
							writeHead(res, status, headers);
							res.end(buffered.slice(req.range.start, req.range.end + 1).toString(), this.charset);
						} else {
							delete req.headers.range;
							res.error(416);
						}
					} else {
						const cl = "content-length";

						if (res.getHeader(cl) === void 0) {
							res.header(cl, Buffer.byteLength(body));
						}

						writeHead(res, status, headers);
						res.end(body, this.charset);
					}
				}

				if (this.logging.enabled) {
					this.log(`type=res.send, uri=${req.parsed.pathname}, ip=${req.ip}, valid=true, message="Sending response body"`, "debug");
					this.log(this.clf(req, res), "info");
				}
			} else if (this.logging.enabled) {
				this.log(`type=res.send, uri=${req.parsed.pathname}, ip=${req.ip}, valid=false, message="Headers already sent"`, "debug");
			}
		};
		res.status = arg => {
			res.statusCode = arg;

			return res;
		};

		for (const i of this.defaultHeaders) {
			res.header(i[0], i[1]);
		}

		res.header("allow", req.allow);

		if (req.cors) {
			const headers = req.headers["access-control-request-headers"] || this.corsExpose;

			res.header("access-control-allow-origin", req.headers.origin);
			res.header("timing-allow-origin", req.headers.origin);
			res.header("access-control-allow-credentials", "true");

			if (headers !== void 0) {
				res.header(`access-control-${req.method === "OPTIONS" ? "allow" : "expose"}-headers`, headers);
			}

			res.header("access-control-allow-methods", req.allow);
		}

		if (this.logging.enabled) {
			this.log(`type=decorate, uri=${req.parsed.pathname}, method=${req.method}, ip=${req.ip}, message="Decorated request from ${req.ip}"`, "debug");
		}
	}

	del (...args) {
		return this.use(...args, "DELETE");
	}

	delete (...args) {
		return this.use(...args, "DELETE");
	}

	error (req, res, err) {
		const ev = "error";

		if (res.headersSent === false) {
			const numeric = isNaN(err.message) === false,
				status = isNaN(res.statusCode) === false && res.statusCode >= 400 ? res.statusCode : numeric ? Number(err.message) : 500,
				output = this.sendError === false ? numeric ? node_http.STATUS_CODES[status] : err.message : err;

			if (status === 404) {
				res.removeHeader("allow");
				res.header("allow", "");

				if (req.cors) {
					res.removeHeader("access-control-allow-methods");
					res.header("access-control-allow-methods", req.allow);
				}
			}

			if (numeric && this.sendError) {
				output.message = node_http.STATUS_CODES[status];
			}

			res.statusCode = status;
			res.send(output, status);
		}

		if (this.listenerCount(ev) > 0) {
			this.emit(ev, req, res, err);
		}

		if (this.logging.enabled) {
			this.log(`type=error, message="Handled error response for ${req.ip}"`, "debug");
		}
	}

	etag (method, ...args) {
		return (method === "GET" || method === "HEAD" || method === "OPTIONS") && this.etags !== null ? this.etags.create(args.map(i => typeof i !== "string" ? JSON.stringify(i).replace(/^"|"$/g, "") : i).join("-")) : "";
	}

	get (...args) {
		return this.use(...args, "GET");
	}

	ignore (fn) {
		this.ignored.add(fn);

		if (this.logging.enabled) {
			this.log(`type=ignore, message="Added function to ignored Set", code="${fn.toString()}"`, "debug");
		}

		return this;
	}

	list (method = "get", type = "array") {
		let result;

		if (type === "array") {
			result = Array.from(this.middleware.get(method.toUpperCase()).keys());
		} else if (type === "object") {
			result = {};

			for (const [key, value] of this.middleware.get(method.toUpperCase()).entries()) {
				result[key] = value;
			}
		}

		if (this.logging.enabled) {
			this.log(`type=list, method=${method}, type=${type}`, "debug");
		}

		return result;
	}

	log (msg, level = "debug") {
		const idx = levels[level];

		if (idx <= levels[this.logging.level]) {
			process.nextTick(() => console[idx > 4 ? "log" : "error"](msg));
		}

		return this;
	}

	onsend (req, res, body, status, headers) {
		return [body, status, headers];
	}

	options (...args) {
		return this.use(...args, "OPTIONS");
	}

	patch (...args) {
		return this.use(...args, "PATCH");
	}

	path (arg = "") {
		return arg.replace(/\/:([^/]+)/g, "/([^/]+)");
	}

	post (...args) {
		return this.use(...args, "POST");
	}

	put (...args) {
		return this.use(...args, "PUT");
	}

	route (req, res) {
		const e = err => res.error(res.statusCode, err),
			evc = "connect",
			evf = "finish";
		let method = req.method === "HEAD" ? "GET" : req.method;

		this.decorate(req, res);

		if (this.listenerCount(evc) > 0) {
			this.emit(evc, req, res);
		}

		if (this.listenerCount(evf) > 0) {
			res.on(evf, () => this.emit(evf, req, res));
		}

		if (method === "OPTIONS" && this.allowed(method, req.parsed.pathname) === false) {
			method = "GET"; // Changing an OPTIONS request to GET due to absent route
		}

		if (req.cors === false && "origin" in req.headers && req.corsHost && this.origins.includes(req.headers.origin) === false) {
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
			this.log("type=route, message=\"Routing request\"", "debug");
		}
	}

	routes (uri, method, override = false) {
		const key = `${method}${delimiter}${uri}`,
			cached = override === false ? this.cache.get(key) : void 0;
		let result;

		if (cached !== void 0) {
			result = cached;
		} else {
			result = {middleware: [], params: false, pos: [], visible: 0, last: null};
			reduce(uri, this.middleware.get(all), result);

			if (method !== all) {
				reduce(uri, this.middleware.get(method), result, true, this.ignored);
			}

			result.visible = result.middleware.filter(i => this.ignored.has(i) === false).length;
			this.cache.set(key, result);
		}

		if (this.logging.enabled) {
			this.log(`type=routes, uri=${uri}, method=${method}, cached=${cached !== void 0}, middleware=${result.middleware.length}, params=${result.params}, visible=${result.visible}, override=${override}, message="Retrieved middleware for request"`, "debug");
		}

		return result;
	}

	serve (req, res, arg = "", folder = process.cwd(), index = this.indexes) {
		const fp = node_path.resolve(folder, decodeURIComponent(arg));

		if (req.method !== "GET" && req.method !== "HEAD" && req.method !== "OPTIONS") {
			if (req.allow.length > 0) {
				req.allow = "GET, HEAD, OPTIONS";
				res.header("allow", req.allow);
			}

			res.error(405);
		} else {
			node_fs.stat(fp, {bigint: false}, (e, stats) => {
				if (e !== null) {
					res.error(404);
				} else if (stats.isDirectory() === false) {
					stream(req, res, {charset: this.charset, etag: this.etag(req.method, stats.ino, stats.size, stats.mtimeMs), path: fp, stats: stats});
				} else if (req.parsed.pathname.endsWith("/") === false) {
					res.redirect(`${req.parsed.pathname}/${req.parsed.search}`);
				} else {
					node_fs.readdir(fp, {encoding: "utf8", withFileTypes: true}, (e2, files) => {
						if (e2 !== null) {
							res.error(500, e2);
						} else {
							let result = "";

							for (const file of files) {
								if (index.includes(file.name)) {
									result = node_path.join(fp, file.name);
									break;
								}
							}

							if (result.length === 0) {
								if (this.autoindex === false) {
									res.error(404);
								} else {
									let valid = true,
										body = "",
										lerr;

									try {
										body = autoindex(decodeURIComponent(req.parsed.pathname), files);
									} catch (err) {
										valid = false;
										lerr = err;
									}

									if (valid) {
										res.header("content-type", `text/html; charset=${this.charset}`);
										res.send(body);
									} else {
										res.error(500, lerr);
									}
								}
							} else {
								node_fs.stat(result, {bigint: false}, (e3, rstats) => {
									if (e3 !== null) {
										res.error(500, e3);
									} else {
										stream(req, res, {charset: this.charset, etag: this.etag(req.method, rstats.ino, rstats.size, rstats.mtimeMs), path: result, stats: rstats});
									}
								});
							}
						}
					});
				}
			});
		}

		if (this.logging.enabled) {
			this.log(`type=serve, uri=${req.parsed.pathname}, method=${req.method}, message="Routing request to file system"`, "debug");
		}
	}

	trace (...args) {
		return this.use(...args, "TRACE");
	}

	use (rpath, ...fn) {
		if (typeof rpath === "function") {
			fn = [rpath, ...fn];
			rpath = `/.${all}`;
		}

		const method = typeof fn[fn.length - 1] === "string" ? fn.pop().toUpperCase() : "GET";

		if (method !== all && node_http.METHODS.includes(method) === false) {
			throw new TypeError("Invalid HTTP method");
		}

		if (method === "HEAD") {
			throw new TypeError("Cannot set HEAD route, use GET");
		}

		if (this.middleware.has(method) === false) {
			if (method !== all) {
				this.methods.push(method);
			}

			this.middleware.set(method, new Map());
		}

		const mmethod = this.middleware.get(method),
			lpos = [];
		let lrpath = rpath,
			lparams = false;

		if (lrpath.includes(":") && lrpath.includes("(") === false) {
			lparams = true;

			for (const [idx, i] of lrpath.split("/").entries()) {
				if (i[0] === ":") {
					lpos.push([idx, i.replace(/^:/, "")]);
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
			this.log(`type=use, route=${rpath}, method=${method}, message="Registering middleware"`, "debug");
		}

		return this;
	}
}

function woodland (arg) {
	const router = new Woodland(arg);

	router.route = router.route.bind(router);

	return router;
}

exports.woodland = woodland;
