"use strict";

const path = require("path"),
	lru = require("tiny-lru"),
	http = require("http"),
	parse = require("tiny-parse"),
	methods = http.METHODS,
	regex = require(path.join(__dirname, "regex.js")),
	{all, delimiter} = require(path.join(__dirname, "const.js")),
	{clone, each, http2Normalize, http2Send, normalize, params, last, reduce} = require(path.join(__dirname, "utility.js"));

class Woodland {
	constructor (defaultHeaders, cacheSize, coerce, http2, cacheTTL) {
		this.blacklisted = new Set();
		this.cache = lru(cacheSize, false, 0, cacheTTL);
		this.coerce = coerce;
		this.defaultHeaders = Object.keys(defaultHeaders).map(key => [key.toLowerCase(), defaultHeaders[key]]);
		this.http2 = http2;
		this.permissions = lru(cacheSize, false, 0, cacheTTL);
		this.methods = [];
		this.middleware = new Map();
	}

	allowed (method, uri, override = false) {
		return this.routes(uri, method, override).middleware.filter(i => this.blacklisted.has(i) === false).length > 0;
	}

	allows (uri, override = false) {
		const key = uri;
		let result = override === false ? this.permissions.get(key) : void 0;

		if (override === true || result === void 0) {
			const list = new Set(this.methods.filter(i => this.allowed(i, uri, override)));

			if (list.has("GET")) {
				list.add("HEAD");
				list.add("OPTIONS");
			}

			result = Array.from(list).sort().join(", ");
			this.permissions.set(key, result);
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

	decorate (req, res) {
		const parsed = parse(req, this.coerce),
			remotes = req.headers["x-forwarded-for"] !== void 0 ? req.headers["x-forwarded-for"].split(/\s*,\s*/g) : [req.connection.remoteAddress];

		if (this.http2) {
			res._headers = {};
			res.statusCode = 200;
			res.hasHeader = key => key in res._headers;
			res.getHeader = key => res.hasHeader(key) ? clone(res._headers[key]) : void 0;
			res.getHeaders = () => clone(res._headers);

			res.removeHeader = key => {
				if (res.hasHeader(key)) {
					delete res._headers[key];
				}
			};

			res.setHeader = (key, value) => {
				res._headers[key] = value;
			};

			res.send = (body, status, headers) => {
				this.onsend(req, res, body, status, headers);
				http2Send(req, res, body, status, headers);
			};

			res.writeHead = (status = res.statusCode, headers) => {
				res.statusCode = status;

				if (headers !== void 0) {
					each(Object.keys(headers), i => res.setHeader(i, headers[i]));
				}
			};
		} else {
			res.send = (body, status = 200, headers) => {
				this.onsend(req, res, body, status, headers);

				if (res.statusCode < status) {
					res.statusCode = status;
				}

				res.writeHead(res.statusCode, headers);
				res.end(body);
			};
		}

		res.error = (status = 500, body, headers = {"cache-control": "no-cache"}) => res.send(body !== void 0 ? body instanceof Error ? body : new Error(body) : new Error(http.STATUS_CODES[status]), status, headers);

		res.redirect = (uri, perm = true) => res.send("", perm ? 301 : 302, {"location": uri});

		res.json = (arg, status = 200, headers = {"content-type": "application/json"}) => res.send(typeof arg === "string" ? regex.wrappedQuotes.test(arg) ? arg : JSON.stringify(arg) : JSON.stringify(arg), status, headers);

		res.status = arg => {
			res.statusCode = arg;

			return res;
		};

		// Express interop
		res.header = res.setHeader;
		res.locals = {};
		req.params = {};

		// Decorating useful hints
		req.body = "";
		req.ip = remotes[remotes.length - 1];
		req.parsed = parsed;
		req.query = parsed.query;
		req.host = req.parsed.hostname;
		req.allow = this.allows(req.parsed.pathname);
		req.cors = req.headers.origin !== void 0 && this.schemeless(req.headers.host || req.headers.referer) !== this.schemeless(req.headers.origin);

		// CORS handling
		if (req.cors === true) {
			let headers = req.headers["access-control-request-headers"];

			res.header("access-control-allow-origin", req.headers.origin);
			res.header("timing-allow-origin", req.headers.origin);
			res.header("access-control-allow-credentials", "true");

			if (headers !== void 0) {
				res.header(regex.isOptions.test(req.method) ? "access-control-allow-headers" : "access-control-expose-headers", headers);
			}

			if (req.allow !== "") {
				res.header("access-control-allow-methods", req.allow);
			}
		}

		// Setting headers
		each(this.defaultHeaders, i => res.header(i[0], i[1]));

		if (req.allow !== "") {
			res.header("allow", req.allow);
		}
	}

	list (method = "get", type = "array") {
		let result;

		if (type === "array") {
			result = Array.from(this.middleware.get(method.toUpperCase()).keys());
		} else if (type === "object") {
			result = {};

			this.middleware.get(method.toUpperCase()).forEach((value, key) => {
				result[key] = value;
			});
		}

		return result;
	}

	onclose () {}

	onconnect () {}

	onerror (req, res, err) {
		const headers = {"content-type": "text/plain", "cache-control": "no-cache"};

		if (this.http2 === false) {
			const numeric = isNaN(err.message) === false,
				status = isNaN(res.statusCode) === false && res.statusCode >= 400 ? res.statusCode : numeric ? Number(err.message) : 500,
				output = numeric ? http.STATUS_CODES[status] : err.message;

			headers["content-length"] = Buffer.byteLength(output);
			res.send(output, status, headers);
		} else {
			const numeric = isNaN(err.message) === false,
				status = numeric ? Number(err.message) : 500,
				output = numeric ? http.STATUS_CODES[status] : err.message;

			headers["content-length"] = Buffer.byteLength(output);
			res.send(output, status, headers);
		}
	}

	onfinish () {}

	onsend () {}

	_route (...args) {
		const [req, res] = this.http2 === false ? args : [http2Normalize({headers: args[1]}), args[0]];

		return new Promise((resolve, reject) => {
			let method = regex.isHead.test(req.method) ? "GET" : req.method,
				mregex = new RegExp(method),
				middleware, result;

			const next = err => process.nextTick(() => {
				let obj = middleware.next();

				if (obj.done === false) {
					if (err !== void 0) {
						while (obj.done === false && obj.value.length < 4) {
							obj = middleware.next();
						}

						if (obj.done === false) {
							obj.value(err, req, res, next);
						} else {
							last(req, res, reject, err);
						}
					} else {
						obj.value(req, res, next);
					}
				} else {
					last(req, res, reject, err);
				}
			});

			res.on("finish", resolve);
			res.on("close", () => {
				this.onclose(req, res);
				reject(new Error("Connection closed before response was flushed"));
			});

			this.decorate(req, res);
			this.onconnect(req, res);

			if (regex.isOptions.test(method) === true && this.allowed(method, req.parsed.pathname) === false) {
				method = "GET"; // Changing an OPTIONS request to GET due to absent route
			}

			if (mregex.test(req.allow)) {
				result = this.routes(req.parsed.pathname, method);

				if (result.params !== void 0) {
					params(req, result.pos);
				}

				middleware = result.middleware[Symbol.iterator]();
				next();
			} else {
				last(req, res, reject);
			}
		}).then(() => this.onfinish(req, res)).catch(err => {
			this.onerror(req, res, err);
			this.onfinish(req, res);
		}).catch(() => void 0);
	}

	routes (uri, method, override = false) {
		const key = `${method}${delimiter}${uri}`,
			cached = override === false ? this.cache.get(key) : void 0;
		let result;

		if (cached !== void 0) {
			result = cached;
		} else {
			result = {middleware: [], params: false, pos: []};
			reduce(uri, this.middleware.get(all.toUpperCase()), result);
			reduce(uri, this.middleware.get(method), result);
			this.cache.set(key, result);
		}

		return result;
	}

	schemeless (arg) {
		return arg.replace(/^.*:\/\//, "").replace(/\/$/, "");
	}

	use (...args) {
		let [rpath, fn, method] = normalize(...args),
			mmethod;

		if (typeof fn !== "function") {
			throw new TypeError("Invalid middleware");
		}

		if (new RegExp(all, "i").test(method) === false && methods.includes(method) === false) {
			throw new TypeError("Invalid HTTP method");
		}

		if (regex.isHead.test(method) === true) {
			throw new TypeError("Cannot set HEAD route, use GET");
		}

		if (this.middleware.has(method) === false) {
			this.methods.push(method);
			this.middleware.set(method, new Map());
		}

		mmethod = this.middleware.get(method);

		if (mmethod.has(rpath) === false) {
			mmethod.set(rpath, []);
		}

		mmethod.get(rpath).push(fn);

		return this;
	}
}

module.exports = Woodland;
