"use strict";

const http = require("http"),
	path = require("path"),
	coerce = require("tiny-coerce"),
	regex = require(path.join(__dirname, "regex.js")),
	{URL} = require("url");

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

function http2Normalize (arg) {
	const obj = clone(arg);

	obj.headers.host = obj.headers[":authority"].replace(/:.*$/, "");
	obj.method = obj.headers[":method"];
	obj.connection = {remoteAddress: "0.0.0.0"};
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

function http2Send (req, res, body, nstatus = 200, headers = null) {
	const status = res.statusCode < nstatus ? nstatus : res.statusCode,
		output = {":status": status},
		empty = regex.isHead.test(req.method) || status === 204 || status === 304 || body === "";

	each(Object.keys(res._headers).filter(i => regex.invalid.test(i) === false), i => {
		output[i] = res._headers[i];
	});

	if (headers !== null) {
		each(Object.keys(headers).filter(i => regex.invalid.test(i) === false), i => {
			output[i] = headers[i];
			res._headers[i] = headers[i];
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

function normalize (...args) {
	let [route, fn, method] = args;

	if (typeof route !== "string") {
		method = fn;
		fn = route;
		route = "/.*";
	}

	method = method !== void 0 ? method.toUpperCase() : "GET";

	return [route, fn, method];
}

function last (req, res, reject, err) {
	const status = res.statusCode || 0;

	if (err === void 0) {
		reject(new Error(regex.hasGet.test(req.allow || "") ? 405 : 404));
	} else if (isNaN(status) === false && status >= 400) {
		reject(err);
	} else {
		reject(new Error(status >= 400 ? status : isNaN(err.message) === false ? err.message : http.STATUS_CODES[err.message || err] || 500));
	}
}

function params (req, pos = []) {
	if (pos.length > 0) {
		const uri = req.parsed.pathname.replace(regex.slashEnd, "").split("/");

		each(pos, i => {
			req.params[i[1]] = coerce(uri[i[0]]);
		});
	}
}

function parse (arg) {
	return new URL(typeof arg === "string" ? arg : `http://${arg.headers.host || `localhost:${arg.socket.server._connectionKey.replace(/.*::/, "")}`}${arg.url}`);
}

function partial (req, res, buffered, status, headers) {
	if (regex.partial.test(req.headers.range) === true) {
		const options = {},
			size = Buffer.byteLength(buffered);

		each(req.headers.range.replace(regex.partial, "").split(",")[0].split("-"), (i, idx) => {
			options[idx === 0 ? "start" : "end"] = i ? parseInt(i, 10) : void 0;
		});

		// Byte offsets
		if (isNaN(options.start) === true && isNaN(options.end) === false) {
			options.start = size - options.end;
			options.end = size;
		} else if (isNaN(options.end) === true) {
			options.end = size;
		}

		if ((options.start >= options.end || isNaN(options.start) || isNaN(options.end)) === false) {
			req.range = options;
			headers["content-range"] = `bytes ${options.start}-${options.end}/${size}`;
			headers["content-length"] = `${options.end - options.start + 1}`;
			status = res.statusCode = 206;
			res.removeHeader("etag"); // Removing etag since this rep is incomplete
			delete headers.etag;
		}
	}
}

function pipeable (method, arg) {
	return regex.isHead.test(method) === false && arg !== null && typeof arg.on === "function";
}

function reduce (uri, map, arg) {
	if (map !== void 0) {
		each(Array.from(map.keys()).filter(route => {
			let now = false,
				valid;

			if (regex.hasParam.test(route) === true && regex.braceLeft.test(route) === false && arg.params === false) {
				arg.params = true;
				now = true;

				each(route.replace(regex.slashEnd, "").replace(regex.slashEnd, "").split("/"), (i, idx) => {
					if (regex.isParam.test(i) === true) {
						arg.pos.push([idx, i.replace(regex.isParam, "")]);
					}
				});

				route = route.replace(/\/:(\w*)/g, "/(.*)");
			}

			valid = new RegExp("^" + route + "$", "i").test(uri);

			if (now === true && valid === false) {
				arg.params = false;
				arg.pos = [];
			}

			return valid;
		}), route => each(map.get(route), i => arg.middleware.push(i)));
	}
}

function schemeless (arg) {
	return arg.replace(/^.*:\/\//, "").replace(/\/$/, "");
}

function wrapped (arg) {
	return arg[0] === '"' && arg[arg.length - 1] === '"';
}

function writeHead (res, status, headers) {
	if (res.statusCode < status) {
		res.statusCode = status;
	}

	res.writeHead(res.statusCode, headers);
}

module.exports = {
	clone,
	each,
	http2Normalize,
	http2Send,
	normalize,
	last,
	params,
	parse,
	partial,
	pipeable,
	reduce,
	schemeless,
	wrapped,
	writeHead
};
