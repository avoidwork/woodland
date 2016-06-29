"use strict";

const array = require("retsu"),
	defer = require("tiny-defer"),
	lru = require("tiny-lru"),
	path = require("path"),
	http = require("http"),
	mmh3 = require("murmurhash3js").x86.hash32,
	utility = require(path.join(__dirname, "utility.js")),
	regex = require(path.join(__dirname, "regex.js")),
	all = "all",
	verbs = ["DELETE", "GET", "POST", "PUT", "PATCH"];

class Woodland {
	constructor (defaultHost, max, seed) {
		this.blacklisted = new Set();
		this.cache = lru(max);
		this.defaultHost = defaultHost;
		this.hosts = new Map();
		this.permissions = lru(max);
		this.middleware = new Map();
		this.onclose = () => {};
		this.onerror = () => {};
		this.onfinish = () => {};
		this.seed = seed;
	}

	allowed (method, uri, host, override = false) {
		return this.routes(uri, host, method, override).filter(i => {
				return !this.blacklisted.has(i.hash || this.hash(i));
			}).length > 0;
	}

	allows (uri, host, override = false) {
		let result = !override ? this.permissions.get(host + "_" + uri) : undefined;

		if (override || !result) {
			result = verbs.filter(i => this.allowed(i, uri, host, override)).join(", ").replace("GET", "GET, HEAD, OPTIONS");
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
		let parsed = utility.parse(this.url(req));

		req.body = "";
		req.ip = req.headers["x-forwarded-for"] ? array.last(req.headers["x-forwarded-for"].split(/\s*,\s*/g)) : req.connection.remoteAddress;
		req.parsed = parsed;
		req.query = parsed.query;
		req.host = this.host(parsed.hostname);
		req.allow = this.allows(req.parsed.pathname, req.host);

		res.header = res.setHeader;
		res.locals = {};
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
			byRef = [req, res],
			method = regex.head.test(req.method) ? "GET" : req.method,
			middleware;

		this.decorate(byRef[0], byRef[1]);
		middleware = array.iterator(this.routes(req.parsed.pathname, req.host, method));

		function last (err) {
			let errorCode, status;

			if (err) {
				deferred.reject(req.allow.indexOf("GET") > -1 ? new Error(405) : new Error(404));
			} else {
				errorCode = !isNaN(err.message) ? err.message : http.STATUS_CODES[err.message || err] || 500;
				status = res.statusCode >= 400 ? res.statusCode : errorCode;
				deferred.reject(new Error(status));
			}
		}

		let next = err => {
			process.nextTick(() => {
				let arity = 3,
					step = middleware.next();

				if (!res._header && !step.done) {
					if (err) {
						arity = utility.getArity(step.value);
						do {
							arity = utility.getArity(step.value);
						} while (arity < 4 && (step = middleware.next()) && !step.done);
					}

					if (!step.done) {
						if (err) {
							if (arity === 4) {
								try {
									step.value(err, req, res, next);
								} catch (e) {
									next(e);
								}
							} else {
								last(err);
							}
						} else {
							try {
								step.value(req, res, next);
							} catch (e) {
								next(e);
							}
						}
					} else {
						last(err);
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

			[allMap.get(all), allMap.get(method), hostMap.get(all), hostMap.get(method)].forEach(map => {
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

	use (rpath, fn, host, method) {
		let lpath = rpath,
			lfn = fn,
			lhost = host,
			lmethod = method,
			mhost, mmethod;

		if (typeof lpath !== "string") {
			lhost = lfn;
			lfn = lpath;
			lpath = "/.*";
		}

		lhost = lhost || all;
		lmethod = lmethod || all;

		if (typeof lfn !== "function" && (lfn && typeof lfn.handle !== "function")) {
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

		if (lfn.handle) {
			lfn = lfn.handle;
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
			token = header.split(regex.space).pop() || "";
			auth = new Buffer(token, "base64").toString();

			if (!utility.isEmpty(auth)) {
				auth += "@";
			}
		}

		return "http" + /*(this.config.ssl.cert ? "s" : "") +*/ "://" + auth + req.headers.host + req.url;
	}
}

module.exports = Woodland;
