"use strict";

const path = require("path"),
	precise = require("precise"),
	mime = require("mimetype"),
	utility = require(path.join(__dirname, "utility.js")),
	regex = require(path.join(__dirname, "regex.js"));

function connect (req, res, next) {
	let server = req.server,
		payload;

	if (regex.body.test(req.method)) {
		req.setEncoding("utf-8");

		req.on("data", data => {
			payload = payload === undefined ? data : payload + data;

			if (server.config.maxBytes > 0 && Buffer.byteLength(payload) > server.config.maxBytes) {
				req.invalid = true;
				next(new Error(413));
			}
		});

		req.on("end", () => {
			if (!req.invalid) {
				if (payload) {
					req.body = payload;
				}

				next();
			}
		});
	} else {
		next();
	}
}

function cors (req, res, next) {
	req.cors = req.headers.origin !== undefined;
	next();
}

function decorate (server) {
	return function (req, res, next) {
		let timer = precise().start(),
			parsed = server.parse(server.url(req)),
			update = false;

		req.body = "";
		res.header = res.setHeader;
		req.ip = req.headers["x-forwarded-for"] ? array.last(req.headers["x-forwarded-for"].split(/\s*,\s*/g)) : req.connection.remoteAddress;
		res.locals = {};
		req.parsed = parsed;
		req.query = parsed.query;
		req.server = server;
		req.timer = timer;
		req.host = server.router.host(parsed.hostname) || server.config.servername;

		if (!server.router.allowed("GET", req.parsed.pathname, req.host)) {
			server.get(req.parsed.pathname, (req2, res2, next2) => {
				server.request(req2, res2).then(next2, next2);
			}, req.host);

			update = true;
		}

		req.allow = server.router.allows(req.parsed.pathname, req.host, update);

		res.redirect = target => {
			return server.send(req, res, "", 302, {location: target});
		};

		res.respond = (arg, status, headers) => {
			return server.send(req, res, arg, status, headers);
		};

		res.error = (status, arg) => {
			return server.error(req, res, status, arg);
		};

		res.send = (arg, status, headers) => {
			return server.send(req, res, arg, status, headers);
		};

		next();
	}
}

function etag (req, res, next) {
	let cached, headers;

	if (regex.get_only.test(req.method) && !req.headers.range && req.headers["if-none-match"] !== undefined) {
		cached = req.server.etags.get(req.parsed.href);

		if (cached && (req.headers["if-none-match"] || "").replace(/\"/g, "") === cached.etag) {
			headers = utility.clone(cached.headers);
			headers.age = parseInt(new Date().getTime() / 1000 - cached.timestamp, 10);
			res.send("", 304, headers).then(null, next);
		} else {
			next();
		}
	} else {
		next();
	}
}

module.exports = {
	connect: connect,
	cors: cors,
	decorate: decorate,
	etag: etag
};
