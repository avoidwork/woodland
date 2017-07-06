"use strict";

const coerce = require("tiny-coerce"),
	defer = require("tiny-defer"),
	lru = require("tiny-lru"),
	path = require("path"),
	http = require("http"),
	parse = require("tiny-parse"),
	mmh3 = require("murmurhash3js").x86.hash32,
	retsu = require("retsu"),
	regex = require(path.join(__dirname, "regex.js")),
	utility = require(path.join(__dirname, "utility.js")),
	all = "all",
	allMethod = all.toUpperCase(),
	delimiter = ":",
	methods = http.METHODS;

class Woodland {
	constructor (defaultHost, defaultHeaders, cacheSize, seed) {
		this.blacklisted = new Set();
		this.cache = lru(cacheSize);
		this.defaultHost = defaultHost;
		this.defaultHeaders = Reflect.ownKeys(defaultHeaders).map(key => [key.toLowerCase(), defaultHeaders[key]]);
		this.hosts = new Map();
		this.permissions = lru(cacheSize);
		this.middleware = new Map();
		this.seed = seed;
	}

	allowed (method, uri, host, override = false) {
		return this.routes(uri, host, method, override).middleware.filter(i => !this.blacklisted.has(i.hash)).length > 0;
	}

	allows (uri, host, override = false) {
		const key = this.hash(host + delimiter + uri);
		let result = !override ? this.permissions.get(key) : void 0;

		if (override || result === void 0) {
			const list = methods.filter(i => this.allowed(i, uri, host, override)),
				odx = list.indexOf("OPTIONS");

			if (odx > -1) {
				list.splice(odx, 1);
			}

			result = list.join(", ").replace("GET", "GET, HEAD, OPTIONS");
			this.permissions.set(key, result);
		}

		return result;
	}

	blacklist (fn) {
		if (!this.blacklisted.has(fn.hash)) {
			this.blacklisted.add(fn.hash);
		}

		return this;
	}

	decorate (req, res) {
		const parsed = parse(req),
			remotes = req.headers["x-forwarded-for"] ? req.headers["x-forwarded-for"].split(/\s*,\s*/g) : [req.connection.remoteAddress];

		// Express interop
		res.header = res.setHeader;
		res.locals = {};
		req.params = {};

		// Decorating useful hints
		req.body = "";
		req.ip = remotes[remotes.length - 1];
		req.parsed = parsed;
		req.query = parsed.query;
		req.host = this.host(req.parsed.hostname);
		req.allow = this.allows(req.parsed.pathname, req.host);
		req.cors = req.headers.origin !== void 0 && utility.schemeless(req.headers.host) !== utility.schemeless(req.headers.origin);

		// CORS handling
		if (req.cors) {
			let headers = req.headers["access-control-request-headers"];

			res.header("access-control-allow-origin", req.headers.origin);

			if (headers !== void 0) {
				res.header(regex.options.test(req.method) ? "access-control-allow-headers" : "access-control-expose-headers", headers);
			}

			if (!utility.isEmpty(req.allow)) {
				res.header("access-control-allow-methods", req.allow);
			}
		}

		// Setting headers
		retsu.each(this.defaultHeaders, header => res.header(header[0], header[1]));

		if (!utility.isEmpty(req.allow)) {
			res.header("allow", req.allow);
		}
	}

	hash (arg) {
		return mmh3(arg, this.seed);
	}

	host (arg) {
		let result = "";

		retsu.each(this.hosts, (reg, host) => {
			let output = true;

			if (reg.test(arg)) {
				result = host;
				output = false;
			}

			return output;
		});

		return result || this.defaultHost;
	}

	onclose () {}

	onerror (req, res, err) {
		const numeric = !isNaN(err.message),
			status = !isNaN(res.statusCode) && res.statusCode >= 400 ? res.statusCode : numeric ? Number(err.message) : 500,
			output = numeric ? http.STATUS_CODES[status] : err.message;

		res.writeHead(status, {"content-type": "text/plain", "content-length": Buffer.byteLength(output)});
		res.end(output);
	}

	onfinish () {}

	params (req, pos) {
		const uri = req.parsed.path.replace(regex.startSlash, "").replace(regex.endSlash, "").split("/");

		retsu.each(pos, i => {
			req.params[i[1]] = coerce(uri[i[0]]);
		});
	}

	route (req, res) {
		const deferred = defer();
		let method = regex.head.test(req.method) ? "GET" : req.method,
			middleware, result;

		const last = err => {
			if (err === void 0) {
				deferred.reject(new Error(regex.hasGet.test(req.allow || "") ? 405 : 404));
			} else if (!isNaN(res.statusCode) && res.statusCode >= 400) {
				deferred.reject(err);
			} else {
				deferred.reject(new Error(res.statusCode >= 400 ? res.statusCode : !isNaN(err.message) ? err.message : http.STATUS_CODES[err.message || err] || 500));
			}
		};

		const next = err => {
			process.nextTick(() => {
				if (!res.headersSent) {
					let iter = middleware.next(),
						arity = !iter.done ? utility.getArity(iter.value) : 0;

					if (!iter.done) {
						if (err !== void 0) {
							do {
								arity = utility.getArity(iter.value);
							} while (arity < 4 && (iter = middleware.next()) && !iter.done);
						}

						if (!iter.done) {
							if (err !== void 0 && arity === 4) {
								try {
									iter.value(err, req, res, next);
								} catch (e) {
									next(e);
								}
							} else if (err === void 0 && arity <= 3) {
								try {
									iter.value(req, res, next);
								} catch (e) {
									next(e);
								}
							} else {
								next(); // Error handler in the middle
							}
						} else {
							last(err); // Unhandled error
						}
					} else {
						last(err); // Called next() in the last middleware
					}
				}
			});
		};

		res.on("close", () => {
			this.onclose(req, res);
			deferred.reject(new Error("Connection closed before response was flushed"));
		});

		res.on("finish", deferred.resolve);

		this.decorate(req, res);

		if (regex.options.test(method) && !this.allowed(method, req.parsed.pathname, req.host)) {
			method = "GET"; // Changing an OPTIONS request to GET due to absent route
		}

		result = this.routes(req.parsed.pathname, req.host, method);

		if (result.params) {
			this.params(req, result.pos);
		}

		middleware = result.middleware[Symbol.iterator]();
		next();

		return deferred.promise.then(() => this.onfinish(req, res), err => {
			this.onerror(req, res, err);
			this.onfinish(req, res);
		});
	}

	routes (uri, host, method, override = false) {
		const key = this.hash(method + delimiter + host + delimiter + uri),
			cached = !override ? this.cache.get(key) : void 0;
		let result;

		if (cached !== void 0) {
			result = cached;
		} else {
			const allMap = this.middleware.get(all) || new Map(),
				hostMap = this.middleware.get(host) || new Map();
			let middleware = [],
				pos = [],
				params = false;

			retsu.each([allMap.get(allMethod), allMap.get(method), hostMap.get(allMethod), hostMap.get(method)], map => {
				if (map !== void 0) {
					retsu.each(Array.from(map.keys()).filter(route => {
						let now = false,
							valid;

						if (regex.hasParam.test(route) && !regex.leftBrace.test(route) && !params) {
							params = true;
							now = true;

							retsu.each(route.replace(regex.startSlash, "").replace(regex.endSlash, "").split("/"), (i, idx) => {
								if (regex.isParam.test(i)) {
									pos.push([idx, i.replace(regex.isParam, "")]);
								}
							});

							route = route.replace(/\/:(\w*)/g, "/(.*)");
						}

						try {
							valid = new RegExp("^" + route + "$", "i").test(uri);
						} catch (e) {
							valid = new RegExp("^" + utility.escape(route) + "$", "i").test(uri);
						}

						if (now && !valid) {
							params = false;
							pos = [];
						}

						return valid;
					}), route => {
						middleware = middleware.concat(map.get(route));
					});
				}
			});

			result = {middleware: middleware, params: params, pos: pos};
			this.cache.set(key, result);
		}

		return result;
	}

	setHost (arg) {
		if (!this.hosts.has(arg)) {
			this.hosts.set(arg, new RegExp("^" + arg.replace(/\*/g, ".*") + "$"));
		}

		return this;
	}

	use (...args) {
		let rpath = args[0],
			fn = args[1],
			method = args[2],
			host = args[3] || all,
			mhost, mmethod;

		if (typeof rpath !== "string") {
			host = method || host;
			method = fn;
			fn = rpath;
			rpath = "/.*";
		}

		method = method !== void 0 ? method.toUpperCase() : "GET";

		if (typeof fn !== "function") {
			throw new TypeError("Invalid middleware");
		}

		if (!new RegExp(all, "i").test(method) && !retsu.contains(methods, method)) {
			throw new TypeError("Invalid HTTP method");
		}

		if (regex.head.test(method)) {
			throw new TypeError("Cannot set HEAD route, use GET");
		}

		if (!this.middleware.has(host)) {
			this.middleware.set(host, new Map());
		}

		mhost = this.middleware.get(host);

		if (!mhost.has(method)) {
			mhost.set(method, new Map());
		}

		mmethod = mhost.get(method);

		if (!mmethod.has(rpath)) {
			mmethod.set(rpath, []);
		}

		fn.hash = this.hash(fn.toString());
		mmethod.get(rpath).push(fn);

		return this;
	}
}

module.exports = Woodland;
