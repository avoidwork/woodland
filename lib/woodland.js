"use strict";

const path = require("path"),
	lru = require("tiny-lru"),
	http = require("http"),
	methods = http.METHODS,
	regex = require(path.join(__dirname, "regex.js")),
	{clone, each, http2Normalize, http2Send, normalize, params, parse, last, reduce, schemeless, wrapped} = require(path.join(__dirname, "utility.js")),
	all = "all",
	delimiter = ":";

function Base () {
	void 0;
}

Base.prototype.constructor = Base;
Base.prototype.use = function () {};

each(methods, i => {
	Base.prototype[i.toLowerCase()] = function (...args) {
		this.use(...args);
	};
});

class Woodland extends Base {
	constructor (defaultHeaders, cacheSize, http2, cacheTTL) {
		super();
		this.blacklisted = new Set();
		this.cache = lru(cacheSize, false, 0, cacheTTL);
		this.defaultHeaders = Object.keys(defaultHeaders).map(key => [key.toLowerCase(), defaultHeaders[key]]);
		this.http2 = http2;
		this.permissions = lru(cacheSize, false, 0, cacheTTL);
		this.methods = [];
		this.middleware = new Map();
	}

	allowed (method, uri, override = false) {
		return this.routes(uri, method, override).visible > 0;
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
		const parsed = parse(req),
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

			res.send = (body, status = 200, headers = {}) => {
				let output = this.onsend(req, res, body, status, headers);
				const pipe = regex.isHead.test(req.method) === false && output !== null && typeof output.on === "function";

				output = pipe === true ? body : req.range !== void 0 ? Buffer.from(body.toString()).slice(req.range.start, req.range.end + 1).toString() : typeof body.toString === "function" ? body.toString() : body;
				http2Send(req, res, output, status, headers);
			};

			res.writeHead = (status = res.statusCode, headers) => {
				res.statusCode = status;

				if (headers !== void 0) {
					each(Object.keys(headers), i => res.setHeader(i, headers[i]));
				}
			};
		} else {
			res.send = (body, status = 200, headers = {}) => {
				const output = this.onsend(req, res, body, status, headers),
					pipe = regex.isHead.test(req.method) === false && output !== null && typeof output.on === "function";

				if (pipe === false && req.headers.range !== void 0 && headers["content-range"] === void 0) {
					this.partial(req, res, headers);
				}

				if (res.statusCode < status) {
					res.statusCode = status;
				}

				res.writeHead(res.statusCode, headers);

				if (pipe === true) {
					output.on("error", () => void 0).pipe(res);
				} else {
					const x = typeof output === "string" ? output : typeof output.toString === "function" ? output.toString() : output;

					if (req.range !== void 0) {
						res.end(Buffer.from(x).slice(req.range.start, req.range.end + 1).toString());
					} else {
						res.end(x);
					}
				}
			};
		}

		res.status = arg => {
			res.statusCode = arg;

			return res;
		};

		req.parsed = parsed;
		req.allow = this.allows(req.parsed.pathname);
		req.body = "";
		req.cors = req.headers.origin !== void 0 && schemeless(req.headers.host || req.headers.referer) !== schemeless(req.headers.origin);
		req.host = req.parsed.hostname;
		req.ip = remotes[remotes.length - 1];
		req.params = {};

		res.error = (status = 500, body, headers = {"cache-control": "no-cache"}) => res.send(body !== void 0 ? body instanceof Error ? body : new Error(body) : new Error(http.STATUS_CODES[status]), status, headers);
		res.header = res.setHeader;
		res.json = (arg, status = 200, headers = {"content-type": "application/json"}) => res.send(typeof arg === "string" ? wrapped(arg) ? arg : JSON.stringify(arg) : JSON.stringify(arg), status, headers);
		res.locals = {};
		res.redirect = (uri, perm = true) => res.send("", perm ? 301 : 302, {"location": uri});

		each(this.defaultHeaders, i => res.header(i[0], i[1]));

		if (req.allow !== "") {
			res.header("allow", req.allow);
		}

		if (req.cors === true) {
			const headers = req.headers["access-control-request-headers"];

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

	onsend (req, res, body/*, status, headers*/) {
		return body;
	}

	partial (req, res, headers) {
		if (regex.partial.test(req.headers.range) === true) {
			const options = {},
				size = headers["content-length"] || 0;

			each(req.headers.range.replace(regex.partial, "").split(",")[0].split("-"), (i, idx) => {
				options[idx === 0 ? "start" : "end"] = i ? parseInt(i, 10) : void 0;
			});

			// Byte offsets
			if (isNaN(options.start) === true && isNaN(options.end) === false) {
				options.start = size - options.end;
				options.end = size;
			} else if (isNaN(options.end) === true) {
				options.end = size;
			}

			if ((options.start >= options.end || isNaN(options.start) || isNaN(options.end)) === false) {
				req.range = options;
				headers["content-range"] = `bytes ${options.start}-${options.end}/${size}`;
				headers["content-length"] = options.end - options.start + 1;
				res.statusCode = 206;
				res.removeHeader("etag"); // Removing etag since this rep is incomplete
				delete headers.etag;
			}
		}
	}

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
			result = {middleware: [], params: false, pos: [], visible: 0};
			reduce(uri, this.middleware.get(all.toUpperCase()), result);
			reduce(uri, this.middleware.get(method), result);
			result.visible = result.middleware.filter(i => this.blacklisted.has(i) === false).length;
			this.cache.set(key, result);
		}

		return result;
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
