"use strict";

const tcoerce = require("tiny-coerce"),
	lru = require("tiny-lru"),
	http = require("http"),
	parse = require("tiny-parse"),
	mmh3 = require("murmurhash3js").x86.hash32,
	all = "all",
	delimiter = ":",
	methods = http.METHODS,
	regex = {
		braceLeft: /\(/,
		hasGet: /GET/,
		hasParam: /\/:(\w*)/,
		isHead: /^HEAD$/,
		isParam: /^:/,
		isOptions: /^OPTIONS$/,
		slashEnd: /\/$/,
		slashStart: /^\//
	},
	invalidHttp2Headers = /^(transfer-encoding)$/i;

function clone (arg) {
	return JSON.parse(JSON.stringify(arg));
}

function each (arr, fn) {
	const nth = arr.length;
	let i = -1;

	while (++i < nth) {
		fn(arr[i], i);
	}

	return arr;
}

class Woodland {
	constructor (defaultHeaders, cacheSize, seed, coerce, http2) {
		this.blacklisted = new Set();
		this.cache = lru(cacheSize);
		this.coerce = coerce;
		this.defaultHeaders = Object.keys(defaultHeaders).map(key => [key.toLowerCase(), defaultHeaders[key]]);
		this.http2 = http2;
		this.permissions = lru(cacheSize);
		this.middleware = new Map();
		this.seed = seed;
	}

	allowed (method, uri, override = false) {
		return this.routes(uri, method, override).middleware.filter(i => this.blacklisted.has(i.hash) === false).length > 0;
	}

	allows (uri, override = false) {
		const key = uri;
		let result = override === false ? this.permissions.get(key) : void 0;

		if (override === true || result === void 0) {
			const list = new Set(methods.filter(i => this.allowed(i, uri, override)));

			if (list.has("GET")) {
				list.add("HEAD");
				list.add("OPTIONS");
			}

			result = Array.from(list).sort().join(", ");
			this.permissions.set(key, result);
		}

		return result;
	}

	blacklist (fn) {
		if (this.blacklisted.has(fn.hash) === false) {
			this.blacklisted.add(fn.hash);
		}

		return this;
	}

	decorate (req, res) {
		const parsed = parse(req, this.coerce),
			remotes = req.headers["x-forwarded-for"] !== void 0 ? req.headers["x-forwarded-for"].split(/\s*,\s*/g) : [req.connection.remoteAddress];

		if (this.http2) {
			res._headers = {};
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

			res.send = (...args) => this.http2Send(res, ...args);
		} else {
			res.send = (body, status, headers) => {
				res.statusCode = status;
				res.writeHead(status, headers);
				res.end(body);
			};
		}

		res.error = (status, body, headers) => res.send(body, status, headers);
		res.redirect = (uri, perm = true) => res.send("", perm ? 301 : 302, {"location:": uri});

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

	hash (arg) {
		return mmh3(arg, this.seed);
	}

	http2Send (res, body, status = 200, headers = null) {
		if (res.writable) {
			const output = {":status": status};

			each(Object.keys(res._headers).filter(i => invalidHttp2Headers.test(i) === false), i => {
				output[i] = res._headers[i];
			});

			res._headers = {};

			if (headers !== null) {
				each(Object.keys(headers).filter(i => invalidHttp2Headers.test(i) === false), i => {
					output[i] = headers[i];
				});
			}

			res.statusCode = status;
			res.respond(output);
			res.end(body);
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

	normalize (arg) {
		const obj = clone(arg);

		obj.method = obj.headers[":method"];
		obj.connection = {remoteAddress: "0.0.0.0"};
		obj.url = obj.headers[":path"]; //`${obj.headers[":scheme"]}//${obj.headers[":authority"]}${obj.headers[":path"]}`;

		delete obj.headers[":authority"];
		delete obj.headers[":method"];
		delete obj.headers[":path"];
		delete obj.headers[":scheme"];

		return obj;
	}

	onclose () {}

	onconnect () {}

	onerror (req, res, err) {
		if (this.http2 === false) {
			const numeric = isNaN(err.message) === false,
				status = isNaN(res.statusCode) === false && res.statusCode >= 400 ? res.statusCode : numeric ? Number(err.message) : 500,
				output = numeric ? http.STATUS_CODES[status] : err.message;

			res.statusCode = status;
			res.writeHead(status, {"content-type": "text/plain", "content-length": Buffer.byteLength(output)});
			res.end(output);
		} else {
			const numeric = isNaN(err.message) === false,
				status = numeric ? Number(err.message) : 500,
				output = numeric ? http.STATUS_CODES[status] : err.message;

			res.send(output, status, {"content-type": "text/plain"});
		}
	}

	onfinish () {}

	params (req, pos = []) {
		const uri = req.parsed.path.replace(regex.slashEnd, "").replace(regex.slashEnd, "").split("/");

		each(pos, i => {
			req.params[i[1]] = tcoerce(uri[i[0]]);
		});
	}

	route (...args) {
		const [req, res] = this.http2 === false ? args : [this.normalize({headers: args[1]}), args[0]];

		return new Promise((resolve, reject) => {
			let method = regex.isHead.test(req.method) ? "GET" : req.method,
				mregex = new RegExp(method),
				middleware, result;

			const last = err => {
				const status = res.statusCode || 0;

				if (err === void 0) {
					reject(new Error(regex.hasGet.test(req.allow || "") ? 405 : 404));
				} else if (isNaN(status) === false && status >= 400) {
					reject(err);
				} else {
					reject(new Error(status >= 400 ? status : isNaN(err.message) === false ? err.message : http.STATUS_CODES[err.message || err] || 500));
				}
			};

			const next = err => {
				process.nextTick(() => {
					let iter = middleware.next(),
						arity = iter.done === false ? iter.value.length : 0;

					if (iter.done === false) {
						if (err !== void 0) {
							do {
								arity = iter.value.length;
							} while (arity < 4 && (iter = middleware.next()) && iter.done === false);
						}

						if (iter.done === false) {
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
				});
			};

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
					this.params(req, result.pos);
				}

				middleware = result.middleware[Symbol.iterator]();
				next();
			} else {
				last();
			}
		}).then(() => this.onfinish(req, res), err => {
			this.onerror(req, res, err);
			this.onfinish(req, res);
		});
	}

	routes (uri, method, override = false) {
		const key = this.hash(method + delimiter + uri),
			cached = override === false ? this.cache.get(key) : void 0;
		let result;

		if (cached !== void 0) {
			result = cached;
		} else {
			let middleware = [],
				pos = [],
				params = false;

			each([this.middleware.get(all.toUpperCase()), this.middleware.get(method)], map => {
				if (map !== void 0) {
					each(Array.from(map.keys()).filter(route => {
						let now = false,
							valid;

						if (regex.hasParam.test(route) === true && regex.braceLeft.test(route) === false && params === false) {
							params = true;
							now = true;

							each(route.replace(regex.slashEnd, "").replace(regex.slashEnd, "").split("/"), (i, idx) => {
								if (regex.isParam.test(i) === true) {
									pos.push([idx, i.replace(regex.isParam, "")]);
								}
							});

							route = route.replace(/\/:(\w*)/g, "/(.*)");
						}

						try {
							valid = new RegExp("^" + route + "$", "i").test(uri);
						} catch (e) {
							valid = new RegExp("^" + route.replace(/[-[\]\/{}()*+?.,\\^$|#]/g, "\\$&") + "$", "i").test(uri);
						}

						if (now === true && valid === false) {
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

	schemeless (arg) {
		return arg.replace(/^.*:\/\//, "").replace(/\/$/, "");
	}

	use (...args) {
		let rpath = args[0],
			fn = args[1],
			method = args[2],
			mmethod;

		if (typeof rpath !== "string") {
			method = fn;
			fn = rpath;
			rpath = "/.*";
		}

		method = method !== void 0 ? method.toUpperCase() : "GET";

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
			this.middleware.set(method, new Map());
		}

		mmethod = this.middleware.get(method);

		if (mmethod.has(rpath) === false) {
			mmethod.set(rpath, []);
		}

		fn.hash = this.hash(fn.toString());
		mmethod.get(rpath).push(fn);

		return this;
	}
}

module.exports = Woodland;
