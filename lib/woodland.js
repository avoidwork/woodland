"use strict";

const coerce = require("tiny-coerce"),
	defer = require("tiny-defer"),
	lru = require("tiny-lru"),
	path = require("path"),
	http = require("http"),
	parse = require("tiny-parse"),
	mmh3 = require("murmurhash3js").x86.hash32,
	retsu = require("retsu"),
	utility = require(path.join(__dirname, "utility.js")),
	all = "all",
	allMethod = all.toUpperCase(),
	delimiter = ":",
	startSlash = /^\//,
	endSlash = /\/$/,
	isParam = /^:/,
	hasParam = /\/:(\w*)/,
	head = /^(HEAD)$/,
	methods = http.METHODS;

class Woodland {
	constructor (defaultHost, defaultHeaders, cacheSize, seed) {
		this.blacklisted = new Set();
		this.cache = lru(cacheSize);
		this.defaultHost = defaultHost;
		this.defaultHeaders = Reflect.ownKeys(defaultHeaders).map(key => [key, defaultHeaders[key]]);
		this.hosts = new Map();
		this.permissions = lru(cacheSize);
		this.middleware = new Map();
		this.seed = seed;
	}

	allowed (method, uri, host, override = false) {
		return this.routes(uri, host, method, override).middleware.filter(i => !this.blacklisted.has(i.hash || this.hash(i))).length > 0;
	}

	allows (uri, host, override = false) {
		const key = this.hash(host + delimiter + uri);
		let result = !override ? this.permissions.get(key) : undefined;

		if (override || !result) {
			result = methods.filter(i => this.allowed(i, uri, host, override)).sort().join(", ").replace(/(, )?OPTIONS/, "").replace("GET", "GET, HEAD, OPTIONS");
			this.permissions.set(key, result);
		}

		return result;
	}

	blacklist (fn) {
		let key;

		if (fn.hash) {
			key = fn.hash;
		} else {
			key = fn.hash = this.hash(fn.toString());
		}

		if (!this.blacklisted.has(key)) {
			this.blacklisted.add(key);
		}

		return this;
	}

	decorate (req, res) {
		let parsed = parse(req),
			remotes = req.headers["x-forwarded-for"] ? req.headers["x-forwarded-for"].split(/\s*,\s*/g) : [req.connection.remoteAddress];

		// Decorating useful hints
		req.body = "";
		req.ip = remotes[remotes.length - 1];
		req.parsed = parsed;
		req.query = parsed.query;
		req.host = this.host(parsed.hostname);
		req.allow = this.allows(req.parsed.pathname, req.host);

		// Express interop
		req.params = {};
		res.header = res.setHeader;
		res.locals = {};

		// Setting headers
		retsu.each(this.defaultHeaders, header => res.header(header[0], header[1]));

		if (req.allow) {
			res.header("Allow", req.allow);
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
			body = numeric ? http.STATUS_CODES[status] : err.message;

		res.writeHead(status, {"Content-Type": "text/plain"});
		res.end(body);
	}

	onfinish () {}

	params (req, pos) {
		const uri = req.parsed.path.replace(startSlash, "").replace(endSlash, "").split("/");

		retsu.each(pos, i => {
			req.params[i[1]] = coerce(uri[i[0]]);
		});
	}

	route (req, res) {
		let deferred = defer(),
			method = head.test(req.method) ? "GET" : req.method,
			middleware, result;

		let last = err => {
			let allowed, errorCode, status;

			if (!err) {
				// Double checking `this.allows()` (middleware memoization)
				if (!req.allow) {
					allowed = this.allows(req.parsed.pathname, req.host);

					if (allowed) {
						req.allow = allowed;
					}
				}

				deferred.reject(req.allow.indexOf("GET") > -1 ? new Error(405) : new Error(404));
			} else if (!isNaN(res.statusCode) && res.statusCode >= 400) {
				deferred.reject(err);
			} else {
				errorCode = !isNaN(err.message) ? err.message : http.STATUS_CODES[err.message || err] || 500;
				status = res.statusCode >= 400 ? res.statusCode : errorCode;
				deferred.reject(new Error(status));
			}
		};

		let next = err => {
			process.nextTick(() => {
				let arity, iter;

				if (!res._headerSent) {
					iter = middleware.next();
					arity = !iter.done ? utility.getArity(iter.value) : 0;

					if (!iter.done) {
						if (err) {
							do {
								arity = utility.getArity(iter.value);
							} while (arity < 4 && (iter = middleware.next()) && !iter.done);
						}

						if (!iter.done) {
							if (err && arity === 4) {
								try {
									iter.value(err, req, res, next);
								} catch (e) {
									next(e);
								}
							} else if (!err && arity <= 3) {
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

		res.on("finish", () => {
			deferred.resolve();
		});

		this.decorate(req, res);
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
		let key = this.hash(method + delimiter + host + delimiter + uri),
			cached = !override ? this.cache.get(key) : undefined,
			params = false,
			allMap, hostMap, middleware, pos, result;

		if (cached) {
			result = cached;
		} else {
			allMap = this.middleware.get(all) || new Map();
			hostMap = this.middleware.get(host) || new Map();
			middleware = [];
			pos = [];

			retsu.each([allMap.get(allMethod), allMap.get(method), hostMap.get(allMethod), hostMap.get(method)], map => {
				if (map) {
					retsu.each(Array.from(map.keys()).filter(route => {
						let now = false,
							valid;

						if (hasParam.test(route) && route.indexOf("(") === -1 && !params) {
							params = true;
							now = true;

							retsu.each(route.replace(startSlash, "").replace(endSlash, "").split("/"), (i, idx) => {
								if (isParam.test(i)) {
									pos.push([idx, i.replace(isParam, "")]);
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

	use (rpath, fn, method, host = all) {
		let lpath = rpath,
			lfn = fn,
			lmethod = method,
			lhost = host,
			mhost, mmethod;

		if (typeof lpath !== "string") {
			lhost = lmethod || lhost;
			lmethod = lfn;
			lfn = lpath;
			lpath = "/.*";
		}

		lmethod = lmethod ? lmethod.toUpperCase() : "GET";

		if (typeof lfn !== "function") {
			throw new Error("Invalid middleware");
		}

		if (!retsu.contains(methods, lmethod)) {
			throw new Error("Invalid HTTP method");
		}

		if (!this.middleware.has(lhost)) {
			this.middleware.set(lhost, new Map());
		}

		mhost = this.middleware.get(lhost);

		if (!mhost.has(lmethod)) {
			mhost.set(lmethod, new Map());
		}

		mmethod = mhost.get(lmethod);

		if (!mmethod.has(lpath)) {
			mmethod.set(lpath, []);
		}

		lfn.hash = this.hash(lfn.toString());
		mmethod.get(lpath).push(lfn);

		return this;
	}
}

module.exports = Woodland;
