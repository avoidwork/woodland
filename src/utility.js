import {extname, join} from "node:path";
import {createReadStream, readFileSync} from "node:fs";
import {STATUS_CODES} from "node:http";
import {fileURLToPath, URL} from "node:url";
import {coerce} from "tiny-coerce";
import mimeDb from "mime-db";

const __dirname = fileURLToPath(new URL(".", import.meta.url)),
	html = readFileSync(join(__dirname, "..", "tpl", "autoindex.html"), {encoding: "utf8"}),
	valid = Object.entries(mimeDb).filter(i => "extensions" in i[1]),
	extensions = valid.reduce((a, v) => {
		const result = Object.assign({type: v[0]}, v[1]);

		for (const key of result.extensions) {
			a[`.${key}`] = result;
		}

		return a;
	}, {});

export function autoindex (title = "", files = []) { // eslint-disable-line no-unused-vars
	return eval("`" + html + "`"); // eslint-disable-line no-eval
}

export function clone (arg) {
	return JSON.parse(JSON.stringify(arg));
}

export function last (req, res, e, err) {
	const status = res.statusCode || 0;

	if (err === void 0) {
		e(new Error(req.allow.length > 0 ? req.method !== "GET" ? 405 : req.allow.includes("GET") ? 500 : 404 : 404));
	} else if (isNaN(status) === false && status >= 400) {
		e(err);
	} else {
		e(new Error(status >= 400 ? status : isNaN(err.message) === false ? err.message : STATUS_CODES[err.message || err] || 500));
	}

	return true;
}

function mime (arg = "") {
	const ext = extname(arg);

	return ext in extensions ? extensions[ext].type : "application/octet-stream";
}

export function ms (arg = 0, digits = 3) {
	return `${Number(arg / 1e6).toFixed(digits)} ms`;
}

export function next (req, res, e, middleware) {
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

export function pad (arg = 0) {
	return String(arg).padStart(2, "0");
}

export function params (req, pos = []) {
	if (pos.length > 0) {
		const uri = req.parsed.pathname.split("/");

		for (const i of pos) {
			req.params[i[1]] = coerce(decodeURIComponent(uri[i[0]]));
		}
	}
}

export function parse (arg) {
	return new URL(typeof arg === "string" ? arg : `http://${arg.headers.host || `localhost:${arg.socket.server._connectionKey.replace(/.*::/, "")}`}${arg.url}`);
}

export function partial (req, res, buffered, status, headers) {
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

export function pipeable (method, arg) {
	return method !== "HEAD" && arg !== null && typeof arg.on === "function";
}

export function reduce (uri, map = new Map(), arg = {}, end = false, ignore = new Set()) {
	Array.from(map.entries()).filter(i => {
		i[0].lastIndex = 0;

		return i[0].test(uri);
	}).forEach(i => {
		for (const fn of i[1].handlers) {
			arg.middleware.push(fn);

			if (end && arg.last === null && ignore.has(fn) === false) {
				arg.last = fn;
			}
		}

		if (i[1].pos.length > 0 && arg.pos.length === 0) {
			arg.pos = i[1].pos;
			arg.params = i[1].params;
		}
	});
}

export function stream (req, res, file = {charset: "", etag: "", path: "", stats: {mtime: new Date(), size: 0}}) {
	res.header("content-length", file.stats.size);
	res.header("content-type", file.charset.length > 0 ? `${mime(file.path)}; charset=${file.charset}` : mime(file.path));
	res.header("last-modified", file.stats.mtime.toUTCString());

	if (file.etag.length > 0) {
		res.header("etag", file.etag);
		res.removeHeader("cache-control");
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
				const range = req.headers.range.replace(/^.*=/, "").split(",")[0].split("-");

				for (const [idx, i] of range.entries()) {
					options[idx === 0 ? "start" : "end"] = i !== void 0 ? parseInt(i, 10) : void 0;
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
				res.removeHeader("content-length");
				res.removeHeader("etag"); // Removing etag since this rep is incomplete
				res.header("content-range", `bytes ${options.start}-${options.end}/${file.stats.size}`);
				res.header("content-length", options.end - options.start + 1);
			}

			res.send(createReadStream(file.path, options), status);
		}
	} else if (req.method === "HEAD") {
		res.send("");
	} else if (req.method === "OPTIONS") {
		res.removeHeader("content-length");
		res.send("Make a GET request to retrieve the file");
	} else {
		res.error(405);
	}

	return void 0;
}

export function timeOffset (arg = 0) {
	const neg = arg < 0;

	return `${neg ? "" : "-"}${String((neg ? -arg : arg) / 60).split(".").reduce((a, v, idx, arr) => {
		a.push(idx === 0 ? pad(v) : "30");

		if (arr.length === 1) {
			a.push("00");
		}

		return a;
	}, []).join("")}`;
}

export function writeHead (res, status, headers) {
	if (res.statusCode < status) {
		res.statusCode = status;
	}

	res.writeHead(res.statusCode, STATUS_CODES[res.statusCode], headers);
}
