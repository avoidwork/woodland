"use strict";

const {STATUS_CODES} = require("http"),
	path = require("path"),
	coerce = require("tiny-coerce"),
	request = require(path.join(__dirname, "request.js")),
	{URL} = require("url"),
	all = "*",
	delimiter = ":";

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

function http2Normalize (arg, stream) {
	const obj = request(stream.session.socket);

	obj.headers = clone(arg.headers);
	obj.headers.host = arg.headers[":authority"].replace(/:.*$/, "");
	obj.method = arg.headers[":method"];
	obj.connection = {remoteAddress: stream.session.socket.server._connectionKey.split(":")[1]};
	obj.url = obj.headers[":path"]; //`${obj.headers[":scheme"]}//${obj.headers[":authority"]}${obj.headers[":path"]}`;
	obj.httpVersion = "2.0";
	obj.httpVersionMajor = 2;
	obj.httpVersionMinor = 0;

	delete obj.headers[":authority"];
	delete obj.headers[":method"];
	delete obj.headers[":path"];
	delete obj.headers[":scheme"];

	return obj;
}

function invalid (arg) {
	return arg === "transfer-encoding" || arg === "connection";
}

function http2Send (req, res, body, nstatus = 200, headers = null) {
	const status = res.statusCode < nstatus ? nstatus : res.statusCode,
		output = {":status": status},
		empty = req.method === "HEAD" || status === 204 || status === 304 || body === "";

	each(Object.keys(res._headers), i => {
		if (invalid(i) === false) {
			output[i] = res._headers[i];
		}
	});

	if (headers !== null) {
		each(Object.keys(headers), i => {
			if (invalid(i) === false) {
				output[i] = headers[i];
				res._headers[i] = headers[i];
			}
		});
	}

	if (req.file === void 0 || empty) {
		res.respond(output);

		if (res.writable) {
			res.end(empty === false ? body : void 0);
		}
	} else {
		res.respondWithFile(req.file.path, output);
	}
}

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

function ms (arg = 0, divisor = 1e6, decimal = 2) {
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

		each(pos, i => {
			req.params[i[1]] = coerce(uri[i[0]]);
		});
	}
}

function parse (arg) {
	return new URL(typeof arg === "string" ? arg : `http://${arg.headers.host || `localhost:${arg.socket.server._connectionKey.replace(/.*::/, "")}`}${arg.url}`);
}

function partial (req, res, buffered, status, headers) {
	if ((req.headers.range || "").indexOf("bytes=") === 0) {
		const options = {},
			size = Buffer.byteLength(buffered);

		each(req.headers.range.replace("bytes=", "").split(",")[0].split("-"), (i, idx) => {
			options[idx === 0 ? "start" : "end"] = i ? parseInt(i, 10) : void 0;
		});

		// Byte offsets
		if (isNaN(options.start) && isNaN(options.end) === false) {
			options.start = size - options.end;
			options.end = size;
		} else if (isNaN(options.end)) {
			options.end = size;
		}

		if ((options.start >= options.end || isNaN(options.start) || isNaN(options.end)) === false) {
			req.range = options;
			headers["content-range"] = `bytes ${options.start}-${options.end}/${size}`;
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

function reduce (uri, map = new Map(), arg = {}, end = false) {
	Array.from(map.entries()).filter(i => {
		i[0].lastIndex = 0;

		return i[0].test(uri);
	}).forEach(i => {
		arg.middleware = [...arg.middleware, ...i[1].handlers];

		if (end) {
			arg.last = arg.middleware[arg.middleware.length - 1];
		}

		if (i[1].pos.length > 0 && arg.pos.length === 0) {
			arg.pos = i[1].pos;
			arg.params = i[1].params;
		}
	});
}

function writeHead (res, status, headers) {
	if (res.statusCode < status) {
		res.statusCode = status;
	}


	res.writeHead(res.statusCode, STATUS_CODES[res.statusCode], headers);
}

module.exports = {
	all,
	clone,
	delimiter,
	each,
	http2Normalize,
	http2Send,
	last,
	ms,
	next,
	params,
	parse,
	partial,
	pipeable,
	reduce,
	writeHead
};
