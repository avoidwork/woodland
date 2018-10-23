"use strict";

const path = require("path"),
	lru = require("tiny-lru"),
	http = require("http"),
	methods = http.METHODS,
	Base = require(path.join(__dirname, "base.js")),
	regex = require(path.join(__dirname, "regex.js")),
	{clone, each, http2Normalize, http2Send, next, params, parse, partial, pipeable, last, reduce, wrapped, writeHead} = require(path.join(__dirname, "utility.js")),
	all = "*",
	delimiter = ":";

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
			const write = res.write.bind(res);

			res._headers = {};
			res.statusCode = 200;
			res.hasHeader = key => key in res._headers;
			res.getHeader = key => res.hasHeader(key) ? clone(res._headers[key]) : void 0;
			res.getHeaders = () => clone(res._headers);

			res.write = (...args) => {
				if (res.headersSent === false) {
					let options = args[1];

					if (options === void 0) {
						options = {":status": res.statusCode};

						each(Object.keys(res._headers), i => {
							options[i] = res._headers[i];
						});
					}

					res.respond(options);
				}

				write(args[0]);
			};

			res.removeHeader = key => {
				if (res.hasHeader(key)) {
					delete res._headers[key];
				}
			};

			res.setHeader = (key, value) => {
				res._headers[key] = value;
			};

			res.send = async (body, status = 200, headers = {}) => {
				return new Promise(async () => {
					let error = false,
						output = await this.onsend(req, res, body, status, headers);

					if (pipeable(req.method, output) === false) {
						if (req.headers.range !== void 0) {
							const buffered = Buffer.from(output);

							partial(req, res, buffered, status, headers);

							if (req.range !== void 0) {
								writeHead(res, status, headers);
								output = buffered.slice(req.range.start, req.range.end + 1).toString();
							} else {
								delete req.headers.range;
								error = true;
								res.error(416);
							}
						} else if (typeof output !== "string" && "toString" in output) {
							output = output.toString();
						}
					}

					if (error === false && res.destroyed === false) {
						writeHead(res, status, headers);
						http2Send(req, res, output, status, headers);
					}
				}).catch(() => void 0);
			};

			res.writeHead = (status = res.statusCode, headers) => {
				res.statusCode = status;

				if (headers !== void 0) {
					each(Object.keys(headers), i => res.setHeader(i, headers[i]));
				}
			};
		} else {
			res.send = async (body, status = 200, headers = {}) => {
				return new Promise(async () => {
					if (res.headersSent === false) {
						let output = await this.onsend(req, res, body, status, headers);

						if (pipeable(req.method, output) === true) {
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
				}).catch(() => void 0);
			};
		}

		res.status = arg => {
			res.statusCode = arg;

			return res;
		};

		req.parsed = parsed;
		req.allow = this.allows(req.parsed.pathname);
		req.body = "";
		req.cors = req.headers.origin !== void 0;
		req.host = req.parsed.hostname;
		req.ip = remotes[remotes.length - 1];
		req.params = {};

		res.error = (status = 500, body, headers = {"cache-control": "no-cache"}) => {
			res.statusCode = status;
			this.onerror(req, res, body !== void 0 ? body instanceof Error ? body : new Error(body) : new Error(http.STATUS_CODES[status]), headers);
		};

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

	onclose () {
	}

	onconnect () {
	}

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

	onfinish () {
	}

	async onsend (req, res, body/*, status, headers*/) {
		return body;
	}

	route (...args) {
		const [req, res] = this.http2 === false ? args : [http2Normalize({headers: args[1]}, args[0]), args[0]];

		return new Promise((resolve, reject) => {
			let method = regex.isHead.test(req.method) ? "GET" : req.method,
				mregex = new RegExp(method);

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
				const result = this.routes(req.parsed.pathname, method);

				if (result.params !== void 0) {
					params(req, result.pos);
				}

				next(req, res, reject, result.middleware[Symbol.iterator]())();
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
			reduce(uri, this.middleware.get(all), result);

			if (method !== all) {
				reduce(uri, this.middleware.get(method), result);
			}

			result.visible = result.middleware.filter(i => this.blacklisted.has(i) === false).length;
			this.cache.set(key, result);
		}

		return result;
	}

	use (rpath, ...fn) {
		if (typeof rpath === "function") {
			fn = [rpath, ...fn];
			rpath = "/*";
		}

		const method = typeof fn[fn.length - 1] === "string" ? fn.pop().toUpperCase() : "GET";

		if (regex.all.test(method) === false && methods.includes(method) === false) {
			throw new TypeError("Invalid HTTP method");
		}

		if (regex.isHead.test(method) === true) {
			throw new TypeError("Cannot set HEAD route, use GET");
		}

		if (this.middleware.has(method) === false) {
			this.methods.push(method);
			this.middleware.set(method, new Map());
		}

		const mmethod = this.middleware.get(method);

		mmethod.set(rpath, [...mmethod.get(rpath) || [], ...fn]);

		return this;
	}
}

module.exports = Woodland;
