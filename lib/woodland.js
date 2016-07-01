"use strict";

const defer = require("tiny-defer"),
	lru = require("tiny-lru"),
	path = require("path"),
	http = require("http"),
	mmh3 = require("murmurhash3js").x86.hash32,
	utility = require(path.join(__dirname, "utility.js")),
	all = require(path.join(__dirname, "all.js")),
	allMethod = all.toUpperCase(),
	head = /^(HEAD|OPTIONS)$/,
	space = /\s+/,
	methods = ["DELETE", "GET", "POST", "PUT", "PATCH"];

class Woodland {
	constructor (defaultHost, defaultHeaders, cacheSize, seed) {
		this.blacklisted = new Set();
		this.cache = lru(cacheSize);
		this.defaultHost = defaultHost;
		this.defaultHeaders = Object.keys(defaultHeaders).map(key => [key, defaultHeaders[key]]);
		this.hosts = new Map();
		this.permissions = lru(cacheSize);
		this.middleware = new Map();
		this.onclose = () => {};
		this.onerror = (req, res, err) => {
			const numeric = !isNaN(err.message),
				status = numeric ? Number(err.message) : 500,
				body = numeric ? http.STATUS_CODES[status] : err.message;

			res.writeHead(status, {"Content-Type": "text/plain"});
			res.end(body);
		};
		this.onfinish = () => {};
		this.seed = seed;
	}

	allowed (method, uri, host, override = false) {
		return this.routes(uri, host, method, override).filter(i => !this.blacklisted.has(i.hash || this.hash(i))).length > 0;
	}

	allows (uri, host, override = false) {
		let result = !override ? this.permissions.get(host + "_" + uri) : undefined;

		if (override || !result) {
			result = methods.filter(i => this.allowed(i, uri, host, override)).join(", ").replace("GET", "GET, HEAD, OPTIONS");
			this.permissions.set(host + "_" + uri, result);
		}

		return result;
	}

	blacklist (fn) {
		let hfn;

		if (fn.hash) {
			hfn = fn.hash;
		} else {
			hfn = fn.hash = this.hash(fn.toString());
		}

		if (!this.blacklisted.has(hfn)) {
			this.blacklisted.add(hfn);
		}

		return hfn;
	}

	decorate (req, res) {
		let parsed = utility.parse(this.url(req)),
			remotes = req.headers["x-forwarded-for"] ? req.headers["x-forwarded-for"].split(/\s*,\s*/g) : [req.connection.remoteAddress];

		// Decorating useful hints
		req.body = "";
		req.ip = remotes[remotes.length - 1];
		req.parsed = parsed;
		req.query = parsed.query;
		req.host = this.host(parsed.hostname);
		req.allow = this.allows(req.parsed.pathname, req.host);

		// Express interop
		res.header = res.setHeader;
		res.locals = {};

		// Setting headers
		this.defaultHeaders.forEach(header => res.header(header[0], header[1]));

		if (req.allow) {
			res.header("Allow", req.allow);
		}
	}

	hash (arg) {
		return mmh3(arg, this.seed);
	}

	host (arg) {
		let result = "";

		this.hosts.forEach((reg, host) => {
			if (!result && reg.test(arg)) {
				result = host;
			}
		});

		return result || this.defaultHost;
	}

	route (req, res) {
		let deferred = defer(),
			method = head.test(req.method) ? "GET" : req.method,
			middleware;

		this.decorate(req, res);
		middleware = this.routes(req.parsed.pathname, req.host, method)[Symbol.iterator]();

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
			} else {
				errorCode = !isNaN(err.message) ? err.message : http.STATUS_CODES[err.message || err] || 500;
				status = res.statusCode >= 400 ? res.statusCode : errorCode;
				deferred.reject(new Error(status));
			}
		};

		let next = err => {
			process.nextTick(() => {
				let arity = 3,
					iter = middleware.next();

				if (!res.finished && !iter.done) {
					if (err) {
						arity = utility.getArity(iter.value);
						do {
							arity = utility.getArity(iter.value);
						} while (arity < 4 && (iter = middleware.next()) && !iter.done);
					}

					if (!iter.done) {
						if (err) {
							if (arity === 4) {
								try {
									iter.value(err, req, res, next);
								} catch (e) {
									next(e);
								}
							} else {
								last(err);
							}
						} else {
							try {
								iter.value(req, res, next);
							} catch (e) {
								next(e);
							}
						}
					} else {
						last(err);
					}
				} else if (!res.finished) {
					last(err);
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

		next();

		return deferred.promise.then(() => {
			this.onfinish(req, res);

			return [req, res];
		}, err => {
			this.onerror(req, res, err);

			throw err;
		});
	}

	routes (uri, host, method, override = false) {
		let id = method + ":" + host + ":" + uri,
			cached = !override ? this.cache.get(id) : undefined,
			allMap, hostMap, result;

		if (cached) {
			result = cached;
		} else {
			allMap = this.middleware.get(all) || new Map();
			hostMap = this.middleware.get(host) || new Map();
			result = [];

			[allMap.get(allMethod), allMap.get(method), hostMap.get(allMethod), hostMap.get(method)].forEach(map => {
				if (map) {
					Array.from(map.keys()).filter(route => {
						let valid;

						try {
							valid = new RegExp("^" + route + "$", "i").test(uri);
						} catch (e) {
							valid = new RegExp("^" + utility.escape(route) + "$", "i").test(uri);
						}

						return valid;
					}).forEach(route => {
						result = result.concat(map.get(route));
					});
				}
			});

			this.cache.set(id, result);
		}

		return result;
	}

	setHost (arg) {
		if (!this.hosts.has(arg)) {
			this.hosts.set(arg, new RegExp("^" + arg.replace(/\*/g, ".*") + "$"));
		}

		return this;
	}

	use (rpath, fn, method, host) {
		let lpath = rpath,
			lfn = fn,
			lmethod = method,
			lhost = host,
			mhost, mmethod;

		if (typeof lpath !== "string") {
			lmethod = lfn;
			lfn = lpath;
			lpath = "/.*";
		}

		lmethod = lmethod ? lmethod.toUpperCase() : "GET";
		lhost = lhost || all;

		if (typeof lfn !== "function") {
			throw new Error("Invalid middleware");
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

	url (req) {
		let header = req.headers.authorization || "",
			auth = "",
			token;

		if (!utility.isEmpty(header)) {
			token = header.split(space).pop() || "";
			auth = new Buffer(token, "base64").toString();

			if (!utility.isEmpty(auth)) {
				auth += "@";
			}
		}

		return "http://" + auth + req.headers.host + req.url;
	}
}

module.exports = Woodland;
