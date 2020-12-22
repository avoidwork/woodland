"use strict";

const path = require("path"),
	lru = require("tiny-lru"),
	http = require("http"),
	{METHODS} = http,
	EventEmitter = require("events"),
	{all, delimiter, next, params, parse, partial, pipeable, last, reduce, writeHead} = require(path.join(__dirname, "utility.js"));

class Woodland extends EventEmitter {
	constructor (defaultHeaders, cacheSize, cacheTTL, origins) {
		super();
		this.blacklisted = new Set();
		this.cache = lru(cacheSize, cacheTTL);
		this.defaultHeaders = Object.keys(defaultHeaders).map(key => [key.toLowerCase(), defaultHeaders[key]]);
		this.permissions = lru(cacheSize, cacheTTL);
		this.methods = [];
		this.middleware = new Map();
		this.origins = JSON.parse(JSON.stringify(origins));
	}

	allowed (method, uri, override = false) {
		return this.routes(uri, method, override).visible > 0;
	}

	allows (uri, override = false) {
		let result = override === false ? this.permissions.get(uri) : void 0;

		if (override || result === void 0) {
			const list = this.methods.filter(i => this.allowed(i, uri, override));

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

		return result;
	}

	always (...args) {
		return this.use(...args, all);
	}

	blacklist (fn) {
		this.blacklisted.add(fn);

		return this;
	}

	connect (...args) {
		this.use(...args, "CONNECT");
	}

	decorate (req, res) {
		const parsed = parse(req);

		req.parsed = parsed;
		req.allow = this.allows(parsed.pathname);
		req.body = "";
		req.corsHost = "origin" in req.headers && req.headers.origin.replace(/^http(s)?:\/\//, "") !== req.headers.host;
		req.cors = req.corsHost && (this.origins.includes(all) || this.origins.includes(req.headers.origin));
		req.host = parsed.hostname;
		req.ip = "x-forwarded-for" in req.headers ? req.headers["x-forwarded-for"].split(",").pop().trim() : req.connection.remoteAddress;
		req.params = {};

		res.error = (status = 500, body, headers = {"cache-control": "no-cache"}) => {
			res.statusCode = status;

			this.emit("error", req, res, body !== void 0 ? body instanceof Error ? body : new Error(body) : new Error(http.STATUS_CODES[status]), headers);
		};

		res.json = (arg, status = 200, headers = {"content-type": "application/json"}) => res.send(JSON.stringify(arg), status, headers);
		res.locals = {};
		res.redirect = (uri, perm = true) => res.send("", perm ? 301 : 302, {"location": uri});
		res.status = arg => {
			res.statusCode = arg;

			return res;
		};

		res.header = res.setHeader;
		res.send = (body, status = 200, headers = {}) => {
			if (res.headersSent === false) {
				let output = body;

				this.emit("send", req, res, output, status, headers);

				if (pipeable(req.method, output)) {
					writeHead(res, status, headers);
					output.on("error", () => void 0).pipe(res);
				} else {
					if (typeof output !== "string" && "toString" in output) {
						output = output.toString();
					}

					if (req.headers.range !== void 0) {
						const buffered = Buffer.from(output);

						partial(req, res, buffered, status, headers);

						if (req.range !== void 0) {
							writeHead(res, status, headers);
							res.end(buffered.slice(req.range.start, req.range.end + 1).toString());
						} else {
							delete req.headers.range;
							res.error(416);
						}
					} else {
						writeHead(res, status, headers);
						res.end(output);
					}
				}
			}
		};

		for (const i of this.defaultHeaders) {
			res.header(i[0], i[1]);
		}

		const allow = req.allow !== "";

		if (allow) {
			res.header("allow", req.allow);
		}

		if (req.cors) {
			const headers = req.headers["access-control-request-headers"];

			res.header("access-control-allow-origin", req.headers.origin);
			res.header("timing-allow-origin", req.headers.origin);
			res.header("access-control-allow-credentials", "true");

			if (headers !== void 0) {
				res.header(`access-control-${req.method === "OPTIONS" ? "allow" : "expose"}-headers`, headers);
			}

			if (allow) {
				res.header("access-control-allow-methods", req.allow);
			}
		}
	}

	del (...args) {
		this.use(...args, "DELETE");
	}

	delete (...args) {
		this.use(...args, "DELETE");
	}

	error (req, res, err) {
		const headers = {"content-type": "text/plain"},
			numeric = isNaN(err.message) === false,
			status = isNaN(res.statusCode) === false && res.statusCode >= 400 ? res.statusCode : numeric ? Number(err.message) : 500,
			output = numeric ? http.STATUS_CODES[status] : err.message;

		headers["content-length"] = Buffer.byteLength(output);
		res.send(output, status, headers);
	}

	get (...args) {
		this.use(...args, "GET");
	}

	head (...args) {
		this.use(...args, "HEAD");
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

		return result;
	}

	patch (...args) {
		this.use(...args, "PATCH");
	}

	path (arg = "") {
		return arg.replace(/\/:([^/]+)/g, "/([^/]+)");
	}

	post (...args) {
		this.use(...args, "POST");
	}

	put (...args) {
		this.use(...args, "PUT");
	}

	options (...args) {
		this.use(...args, "OPTIONS");
	}

	route (...args) {
		const [req, res] = args;
		let method = req.method === "HEAD" ? "GET" : req.method;

		const e = err => this.emit("error", req, res, err);

		this.emit("connect", req, res);
		res.on("finish", () => this.emit("finish", req, res));

		if (method === "OPTIONS" && this.allowed(method, req.parsed.pathname) === false) {
			method = "GET"; // Changing an OPTIONS request to GET due to absent route
		}

		if (req.cors === false && "origin" in req.headers && req.corsHost && this.origins.includes(req.headers.origin) === false) {
			res.error(403);
		} else if (req.allow.includes(method)) {
			const result = this.routes(req.parsed.pathname, method);

			if (result.params !== void 0) {
				params(req, result.pos);
			}

			req.last = result.last;
			next(req, res, e, result.middleware[Symbol.iterator]())();
		} else {
			last(req, res, e);
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
				reduce(uri, this.middleware.get(method), result, true, this.blacklisted);
			}

			result.visible = result.middleware.filter(i => this.blacklisted.has(i) === false).length;
			this.cache.set(key, result);
		}

		return result;
	}

	trace (...args) {
		this.use(...args, "TRACE");
	}

	use (rpath, ...fn) {
		if (typeof rpath === "function") {
			fn = [rpath, ...fn];
			rpath = `/.${all}`;
		}

		const method = typeof fn[fn.length - 1] === "string" ? fn.pop().toUpperCase() : "GET";

		if (method !== all && METHODS.includes(method) === false) {
			throw new TypeError("Invalid HTTP method");
		}

		if (method === "HEAD") {
			throw new TypeError("Cannot set HEAD route, use GET");
		}

		if (this.middleware.has(method) === false) {
			this.methods.push(method);
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

		lrpath = new RegExp(`^${lrpath}$`, "i");
		mmethod.set(lrpath, {
			handlers: [...current.handlers || [], ...fn],
			params: keep ? current.params : lparams,
			pos: keep ? current.pos : lpos
		});

		return this;
	}
}

module.exports = Woodland;
