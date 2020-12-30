"use strict";

const path = require("path"),
	http = require("http"),
	{METHODS} = http,
	EventEmitter = require("events"),
	fs = require("fs"),
	etag = require("tiny-etag"),
	precise = require("precise"),
	lru = require("tiny-lru"),
	aindex = require(path.join(__dirname, "autoindex.js")),
	{all, delimiter, last, ms, next, params, parse, partial, pipeable, reduce, stream, writeHead} = require(path.join(__dirname, "utility.js"));

class Woodland extends EventEmitter {
	constructor ({autoindex = false, cacheSize = 1e3, cacheTTL = 3e5, charset = "utf-8", defaultHeaders = {}, digit = 3, etags = true, indexes = ["index.htm", "index.html"], origins = ["*"], time = false, seed = 42} = {}) {
		super();
		this.autoindex = autoindex;
		this.blacklisted = new Set();
		this.cache = lru(cacheSize, cacheTTL);
		this.charset = charset;
		this.defaultHeaders = Object.keys(defaultHeaders).map(key => [key.toLowerCase(), defaultHeaders[key]]);
		this.digit = digit;
		this.etags = etags ? etag({cacheSize, cacheTTL, seed}) : null;
		this.indexes = JSON.parse(JSON.stringify(indexes));
		this.permissions = lru(cacheSize, cacheTTL);
		this.methods = [];
		this.middleware = new Map();
		this.origins = JSON.parse(JSON.stringify(origins));
		this.time = time;

		if (this.etags !== null) {
			this.get(this.etags.middleware).blacklist(this.etags.middleware);
		}
	}

	allowed (method, uri, override = false) {
		return this.routes(uri, method, override).visible > 0;
	}

	allows (uri, override = false) {
		let result = override === false ? this.permissions.get(uri) : void 0;

		if (override || result === void 0) {
			const list = this.methods.filter(i => this.allowed(i, uri, override));

			if (list.includes("GET")) {
				list.push("HEAD");

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
		return this.use(...args, "CONNECT");
	}

	decorate (req, res) {
		if (this.time) {
			req.precise = precise().start();
		}

		const parsed = parse(req);

		req.parsed = parsed;
		req.allow = this.allows(parsed.pathname);
		req.body = "";
		req.corsHost = "origin" in req.headers && req.headers.origin.replace(/^http(s)?:\/\//, "") !== req.headers.host;
		req.cors = req.corsHost && (this.origins.includes(all) || this.origins.includes(req.headers.origin));
		req.host = parsed.hostname;
		req.ip = "x-forwarded-for" in req.headers ? req.headers["x-forwarded-for"].split(",").pop().trim() : req.connection.remoteAddress;
		res.locals = {};
		req.params = {};
		res.error = (status = 500, body) => {
			const err = body !== void 0 ? body instanceof Error ? body : new Error(body) : new Error(http.STATUS_CODES[status]);

			res.statusCode = status;
			this.error(req, res, err);
		};
		res.header = res.setHeader;
		res.json = (arg, status = 200, headers = {"content-type": "application/json; charset=utf-8"}) => res.send(JSON.stringify(arg), status, headers);
		res.redirect = (uri, perm = true) => res.send("", perm ? 301 : 302, {"location": uri});
		res.send = (body, status = 200, headers = {}) => {
			if (res.headersSent === false) {
				const ev = "send";
				let output = body;

				if (this.listenerCount(ev) > 0) {
					this.emit(ev, req, res, output, status, headers);
				}

				if (this.time) {
					headers["x-response-time"] = `${ms(req.precise.stop().diff(), this.digit)}`;
				}

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
						const cl = "content-length";

						if (res.getHeader(cl) === void 0) {
							res.header(cl, Buffer.byteLength(output));
						}

						writeHead(res, status, headers);
						res.end(output, this.charset);
					}
				}
			}
		};
		res.status = arg => {
			res.statusCode = arg;

			return res;
		};

		for (const i of this.defaultHeaders) {
			res.header(i[0], i[1]);
		}

		res.header("allow", req.allow);

		if (req.cors) {
			const headers = req.headers["access-control-request-headers"];

			res.header("access-control-allow-origin", req.headers.origin);
			res.header("timing-allow-origin", req.headers.origin);
			res.header("access-control-allow-credentials", "true");

			if (headers !== void 0) {
				res.header(`access-control-${req.method === "OPTIONS" ? "allow" : "expose"}-headers`, headers);
			}

			res.header("access-control-allow-methods", req.allow);
		}
	}

	del (...args) {
		return this.use(...args, "DELETE");
	}

	delete (...args) {
		return this.use(...args, "DELETE");
	}

	error (req, res, err) {
		const ev = "error";

		if (res.headersSent === false) {
			const headers = {"content-type": "text/plain; charset=utf-8"},
				numeric = isNaN(err.message) === false,
				status = isNaN(res.statusCode) === false && res.statusCode >= 400 ? res.statusCode : numeric ? Number(err.message) : 500,
				output = numeric ? http.STATUS_CODES[status] : err.message;

			if (status === 404) {
				res.removeHeader("allow");
				res.header("allow", "");

				if (req.cors) {
					res.removeHeader("access-control-allow-methods");
					res.header("access-control-allow-methods", req.allow);
				}
			}

			headers["content-length"] = Buffer.byteLength(output);
			res.send(output, status, headers);
		}

		if (this.listenerCount(ev) > 0) {
			this.emit(ev, req, res, err);
		}
	}

	etag (method, ...args) {
		return (method === "GET" || method === "HEAD" || method === "OPTIONS") && this.etags !== null ? this.etags.create(args.map(i => typeof i !== "string" ? JSON.stringify(i).replace(/^"|"$/g, "") : i).join("-")) : "";
	}

	get (...args) {
		return this.use(...args, "GET");
	}

	head (...args) {
		return this.use(...args, "HEAD");
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
		return this.use(...args, "PATCH");
	}

	path (arg = "") {
		return arg.replace(/\/:([^/]+)/g, "/([^/]+)");
	}

	post (...args) {
		return this.use(...args, "POST");
	}

	put (...args) {
		return this.use(...args, "PUT");
	}

	options (...args) {
		return this.use(...args, "OPTIONS");
	}

	route (...args) {
		const [req, res] = args,
			e = err => res.error(0, err),
			evc = "connect",
			evf = "finish";
		let method = req.method === "HEAD" ? "GET" : req.method;

		this.decorate(req, res);

		if (this.listenerCount(evc) > 0) {
			this.emit(evc, req, res);
		}

		if (this.listenerCount(evf) > 0) {
			res.on(evf, () => this.emit(evf, req, res));
		}

		if (method === "OPTIONS" && this.allowed(method, req.parsed.pathname) === false) {
			method = "GET"; // Changing an OPTIONS request to GET due to absent route
		}

		if (req.cors === false && "origin" in req.headers && req.corsHost && this.origins.includes(req.headers.origin) === false) {
			res.error(403);
		} else if (req.allow.includes(method)) {
			const result = this.routes(req.parsed.pathname, method);

			if (result.params) {
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

	serve (req, res, arg = "", folder = process.cwd(), index = this.indexes) {
		const fp = path.resolve(folder, arg);

		if (req.method !== "GET" && req.method !== "HEAD" && req.method !== "OPTIONS") {
			res.error(405);
		} else if (fp.startsWith(folder) === false) {
			res.error(404);
		} else if ("expect" in req.headers) {
			res.error(417);
		} else {
			fs.stat(fp, {bigint: false}, (e, stats) => {
				if (e !== null) {
					res.error(404);
				} else if (stats.isDirectory() === false) {
					stream(req, res, {charset: this.charset, etag: this.etag(req.method, stats.ino, stats.size, stats.mtimeMs), path: fp, stats: stats});
				} else if (req.parsed.pathname.endsWith("/") === false) {
					res.redirect(`${req.parsed.pathname}/${req.parsed.search}`);
				} else {
					fs.readdir(fp, {encoding: "utf8", withFileTypes: true}, (e2, files) => {
						if (e2 !== null) {
							res.error(500, e2);
						} else {
							let result = "";

							search:
							for (const file of files) {
								if (index.includes(file.name)) {
									result = path.join(fp, file.name);
									break search;
								}
							}

							if (result.length === 0) {
								if (this.autoindex === false) {
									res.error(404);
								} else {
									let valid = true,
										body = "",
										lerr;

									try {
										body = aindex(decodeURIComponent(req.parsed.pathname), files);
									} catch (err) {
										valid = false;
										lerr = err;
									}

									if (valid) {
										res.header("content-type", `text/html; charset=${this.charset}`);
										res.send(body);
									} else {
										res.error(500, lerr);
									}
								}
							} else {
								fs.stat(result, {bigint: false}, (e3, rstats) => {
									if (e3 !== null) {
										res.error(500, e3);
									} else {
										stream(req, res, {charset: this.charset, etag: this.etag(req.method, rstats.ino, rstats.size, rstats.mtimeMs), path: result, stats: rstats});
									}
								});
							}
						}
					});
				}
			});
		}
	}

	trace (...args) {
		return this.use(...args, "TRACE");
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
