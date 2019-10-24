"use strict";

const path = require("path"),
	fifo = require("tiny-fifo"),
	http = require("http"),
	precise = require("precise"),
	{METHODS, STATUS_CODES} = http,
	EventEmitter = require("events"),
	dtrace = require(path.join(__dirname, "dtrace.js")),
	{all, clone, delimiter, each, http2Normalize, http2Send, next, ms, params, parse, partial, pipeable, last, reduce, writeHead} = require(path.join(__dirname, "utility.js"));

class Woodland extends EventEmitter {
	constructor (defaultHeaders, cacheSize, http2, cacheTTL, dtp, origins) {
		super();
		this.blacklisted = new Set();
		this.cache = fifo(cacheSize, cacheTTL);
		this.defaultHeaders = Object.keys(defaultHeaders).map(key => [key.toLowerCase(), defaultHeaders[key]]);
		this.dtrace = dtp === true;
		this.dtp = this.dtrace ? dtrace("woodland") : null;
		this.http2 = http2 === true;
		this.permissions = fifo(cacheSize, cacheTTL);
		this.methods = [];
		this.middleware = new Map();
		this.origins = clone(origins);
		this.probes = new Map();

		if (this.dtrace) {
			this.probes.set("allows", this.dtp.addProbe("allows", "char *", "char *", "char *"));
			this.probes.set("decorate", this.dtp.addProbe("decorate", "char *", "char *"));
			this.probes.set("error", this.dtp.addProbe("error", "char *", "int", "char *"));
			this.probes.set("route", this.dtp.addProbe("route", "char *", "char *", "char *"));
			this.probes.set("routes", this.dtp.addProbe("routes", "char *", "char *", "char *", "char *"));
			this.dtp.enable();
		}
	}

	allowed (method, uri, override = false) {
		return this.routes(uri, method, override).visible > 0;
	}

	allows (uri, override = false) {
		let timer;

		if (this.dtrace) {
			timer = precise().start();
		}

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

		if (this.dtrace) {
			timer.stop();
			this.probes.get("allows").fire(() => [uri, `override: ${override}`, ms(timer.diff())]);
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
		let timer;

		if (this.dtrace) {
			timer = precise().start();
		}

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

			res.header = res.setHeader;

			res.send = (body, status = 200, headers = {}) => {
				let error = false,
					output = body;

				this.emit("send", req, res, body, status, headers);

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
			};

			res.writeHead = (status = res.statusCode, reason = STATUS_CODES[res.statusCode], headers) => {
				res.statusCode = status;
				res.statusMessage = reason;

				if (headers !== void 0) {
					each(Object.keys(headers), i => res.setHeader(i, headers[i]));
				}
			};
		} else {
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
		}

		if (this.defaultHeaders.length > 0) {
			each(this.defaultHeaders, i => res.header(i[0], i[1]));
		}

		if (req.allow !== "") {
			res.header("allow", req.allow);
		}

		if (req.cors) {
			const headers = req.headers["access-control-request-headers"];

			res.header("access-control-allow-origin", req.headers.origin);
			res.header("timing-allow-origin", req.headers.origin);
			res.header("access-control-allow-credentials", "true");

			if (headers !== void 0) {
				res.header(req.method === "OPTIONS" ? "access-control-allow-headers" : "access-control-expose-headers", headers);
			}

			if (req.allow !== "") {
				res.header("access-control-allow-methods", req.allow);
			}
		}

		if (this.dtrace) {
			timer.stop();
			this.probes.get("decorate").fire(() => [req.parsed.pathname, ms(timer.diff())]);
		}
	}

	del (...args) {
		this.use(...args, "DELETE");
	}

	delete (...args) {
		this.use(...args, "DELETE");
	}

	error (req, res, err) {
		let timer;

		if (this.dtrace) {
			timer = precise().start();
		}

		const headers = {"content-type": "text/plain", "cache-control": "no-cache"};

		if (this.http2 === false) {
			const numeric = isNaN(err.message) === false,
				status = isNaN(res.statusCode) === false && res.statusCode >= 400 ? res.statusCode : numeric ? Number(err.message) : 500,
				output = numeric ? http.STATUS_CODES[status] : err.message;

			headers["content-length"] = Buffer.byteLength(output);

			if (this.dtrace) {
				timer.stop();
				this.probes.get("error").fire(() => [req.parsed.href, status, ms(timer.diff())]);
			}

			res.send(output, status, headers);
		} else {
			const numeric = isNaN(err.message) === false,
				status = isNaN(res.statusCode) === false && res.statusCode >= 400 ? res.statusCode : numeric ? Number(err.message) : 500,
				output = numeric ? http.STATUS_CODES[status] : err.message;

			headers["content-length"] = Buffer.byteLength(output);

			if (this.dtrace) {
				timer.stop();
				this.probes.get("error").fire(() => [req.parsed.href, status, ms(timer.diff())]);
			}

			res.send(output, status, headers);
		}
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

			this.middleware.get(method.toUpperCase()).forEach((value, key) => {
				result[key] = value;
			});
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
		let timer;

		if (this.dtrace) {
			timer = precise().start();
		}

		const [req, res] = this.http2 === false ? args : [http2Normalize({headers: args[1]}, args[0]), args[0]];
		let method = req.method === "HEAD" ? "GET" : req.method;

		const e = err => this.emit("error", req, res, err);

		this.emit("connect", req, res);

		res.on("finish", () => {
			if (this.dtrace) {
				timer.stop();
				this.probes.get("route").fire(() => [req.parsed.pathname, "finish", ms(timer.diff())]);
			}

			this.emit("finish", req, res);
		});

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
		let timer;

		if (this.dtrace) {
			timer = precise().start();
		}

		const key = `${method}${delimiter}${uri}`,
			cached = override === false ? this.cache.get(key) : void 0;
		let result;

		if (cached !== void 0) {
			result = cached;
		} else {
			result = {middleware: [], params: false, pos: [], visible: 0, next: null};
			reduce(uri, this.middleware.get(all), result);

			if (method !== all) {
				reduce(uri, this.middleware.get(method), result, true);
			}

			result.visible = result.middleware.filter(i => this.blacklisted.has(i) === false).length;
			this.cache.set(key, result);
		}

		if (this.dtrace) {
			timer.stop();
			this.dtp.fire("routes", () => [uri, method, `override: ${override}`, ms(timer.diff())]);
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

			each(lrpath.split("/"), (i, idx) => {
				if (i[0] === ":") {
					lpos.push([idx, i.replace(/^:/, "")]);
				}
			});

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
