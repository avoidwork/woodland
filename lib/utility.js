"use strict";

const path = require("path"),
	fs = require("fs"),
	{STATUS_CODES} = require("http"),
	{URL} = require("url"),
	coerce = require("tiny-coerce"),
	mime = require(path.join(__dirname, "mime.js")),
	all = "*",
	delimiter = "|";

function last (req, res, e, err) {
	const status = res.statusCode || 0;

	if (err === void 0) {
		e(new Error(req.allow.includes("GET") ? 405 : 404));
	} else if (isNaN(status) === false && status >= 400) {
		e(err);
	} else {
		e(new Error(status >= 400 ? status : isNaN(err.message) === false ? err.message : STATUS_CODES[err.message || err] || 500));
	}
}

function ms (arg = 0, divisor = 1e6, decimal = 3) {
	return `${Number(arg / divisor).toFixed(decimal)} ms`;
}

function next (req, res, e, middleware) {
	const fn = err => process.nextTick(() => {
		let obj = middleware.next();

		if (obj.done === false) {
			if (err !== void 0) {
				while (obj.done === false && obj.value.length < 4) {
					obj = middleware.next();
				}

				if (obj.done === false) {
					obj.value(err, req, res, fn);
				} else {
					last(req, res, e, err);
				}
			} else {
				obj.value(req, res, fn);
			}
		} else {
			last(req, res, e, err);
		}
	});

	return fn;
}

function params (req, pos = []) {
	if (pos.length > 0) {
		const uri = req.parsed.pathname.split("/");

		for (const i of pos) {
			req.params[i[1]] = coerce(uri[i[0]]);
		}
	}
}

function parse (arg) {
	return new URL(typeof arg === "string" ? arg : `http://${arg.headers.host || `localhost:${arg.socket.server._connectionKey.replace(/.*::/, "")}`}${arg.url}`);
}

function partial (req, res, buffered, status, headers) {
	if ((req.headers.range || "").indexOf("bytes=") === 0) {
		const options = {},
			size = Buffer.byteLength(buffered);

		for (const [idx, i] of req.headers.range.replace("bytes=", "").split(",")[0].split("-").entries()) {
			options[idx === 0 ? "start" : "end"] = i ? parseInt(i, 10) : void 0;
		}

		// Byte offsets
		if (isNaN(options.start) && isNaN(options.end) === false) {
			options.start = size - options.end;
			options.end = size;
		} else if (isNaN(options.end)) {
			options.end = size;
		}

		if ((options.start >= options.end || isNaN(options.start) || isNaN(options.end)) === false) {
			req.range = options;
			headers["content-range"] = `bytes ${options.start + (options.end === size ? 1 : 0)}-${options.end}/${size}`;
			headers["content-length"] = `${options.end - options.start + (options.end === size ? 0 : 1)}`;
			status = res.statusCode = 206;
			res.removeHeader("etag"); // Removing etag since this rep is incomplete
			delete headers.etag;
		}
	}
}

function pipeable (method, arg) {
	return method !== "HEAD" && arg !== null && typeof arg.on === "function";
}

function reduce (uri, map = new Map(), arg = {}, end = false, blacklist = new Set()) {
	Array.from(map.entries()).filter(i => {
		i[0].lastIndex = 0;

		return i[0].test(uri);
	}).forEach(i => {
		for (const fn of i[1].handlers) {
			arg.middleware.push(fn);

			if (end && arg.last === null && blacklist.has(fn) === false) {
				arg.last = fn;
			}
		}

		if (i[1].pos.length > 0 && arg.pos.length === 0) {
			arg.pos = i[1].pos;
			arg.params = i[1].params;
		}
	});
}

function stream (req, res, file = {charset: "", etag: "", path: "", stats: {mtime: new Date(), size: 0}}) {
	res.header("content-length", file.stats.size);
	res.header("content-type", file.charset.length > 0 ? `${mime(file.path)}; charset=${file.charset}` : mime(file.path));
	res.header("last-modified", file.stats.mtime.toUTCString());

	if (file.etag.length > 0) {
		res.header("etag", file.etag);
	}

	if (req.method === "GET") {
		if ((file.etag.length > 0 && req.headers["if-none-match"] === file.etag) || (req.headers["if-none-match"] === void 0 && Date.parse(req.headers["if-modified-since"]) >= file.stats.mtime)) { // eslint-disable-line no-extra-parens
			res.removeHeader("content-type");
			res.removeHeader("content-length");
			res.send("", 304);
		} else {
			const options = {};
			let status = 200;

			// Setting the partial content headers
			if ("range" in req.headers) {
				for (const [idx, i] of req.headers.range.replace(/^.*=/, "").split(",")[0].split("-")) {
					options[idx === 0 ? "start" : "end"] = i ? parseInt(i, 10) : void 0;
				}

				// Byte offsets
				if (isNaN(options.start) && isNaN(options.end) === false) {
					options.start = file.stats.size - options.end;
					options.end = file.stats.size;
				} else if (isNaN(options.end)) {
					options.end = file.stats.size;
				}

				if (options.start >= options.end || isNaN(options.start) || isNaN(options.end)) {
					res.error(416);
				}

				status = 206;
				res.header("content-range", `bytes ${options.start}-${options.end}/${file.stats.size}`);
				res.header("content-length", options.end - options.start + 1);
				res.removeHeader("etag"); // Removing etag since this rep is incomplete
			}

			res.send(fs.createReadStream(file.path, options), status);
		}
	} else if (req.method === "HEAD") {
		res.send("");
	} else if (req.method === "OPTIONS") {
		res.removeHeader("content-length");
		res.send("");
	} else {
		res.error(405);
	}

	return void 0;
}

function writeHead (res, status, headers) {
	if (res.statusCode < status) {
		res.statusCode = status;
	}

	res.writeHead(res.statusCode, STATUS_CODES[res.statusCode], headers);
}

module.exports = {
	all,
	delimiter,
	last,
	ms,
	next,
	params,
	parse,
	partial,
	pipeable,
	reduce,
	stream,
	writeHead
};
