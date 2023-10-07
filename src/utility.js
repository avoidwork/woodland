import {extname, join} from "node:path";
import {createReadStream, readFileSync} from "node:fs";
import {STATUS_CODES} from "node:http";
import {fileURLToPath, URL} from "node:url";
import {coerce} from "tiny-coerce";
import mimeDb from "mime-db";
import {
	EXTENSIONS,
	UTF8,
	EMPTY,
	GET,
	APPLICATION_OCTET_STREAM,
	TIME_MS,
	TOKEN_N,
	STRING_0,
	SLASH,
	STRING,
	KEY_BYTES,
	COMMA,
	HYPHEN,
	START,
	END,
	CONTENT_RANGE,
	CONTENT_LENGTH,
	ETAG,
	HEAD,
	FUNCTION,
	CONTENT_TYPE,
	LAST_MODIFIED,
	CACHE_CONTROL,
	IF_NONE_MATCH,
	IF_MODIFIED_SINCE,
	RANGE,
	OPTIONS,
	OPTIONS_BODY,
	PERIOD,
	STRING_30, STRING_00
} from "./constants.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url)),
	html = readFileSync(join(__dirname, "..", "tpl", "autoindex.html"), {encoding: UTF8}),
	valid = Object.entries(mimeDb).filter(i => EXTENSIONS in i[1]),
	extensions = valid.reduce((a, v) => {
		const result = Object.assign({type: v[0]}, v[1]);

		for (const key of result.extensions) {
			a[`.${key}`] = result;
		}

		return a;
	}, {});

export function autoindex (title = EMPTY, files = []) {
	return new Function("title", "files", `return \`${html}\`;`)(title, files);
}

export function last (req, res, e, err) {
	const status = res.statusCode || 0;

	if (err === void 0) {
		e(new Error(req.allow.length > 0 ? req.method !== GET ? 405 : req.allow.includes(GET) ? 500 : 404 : 404));
	} else if (isNaN(status) === false && status >= 400) {
		e(err);
	} else {
		e(new Error(status >= 400 ? status : isNaN(err.message) === false ? err.message : STATUS_CODES[err.message || err] || 500));
	}

	return true;
}

function mime (arg = EMPTY) {
	const ext = extname(arg);

	return ext in extensions ? extensions[ext].type : APPLICATION_OCTET_STREAM;
}

export function ms (arg = 0, digits = 3) {
	return TIME_MS.replace(TOKEN_N, Number(arg / 1e6).toFixed(digits));
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
	return String(arg).padStart(2, STRING_0);
}

export function params (req, pos = []) {
	if (pos.length > 0) {
		const uri = req.parsed.pathname.split(SLASH);

		for (const i of pos) {
			req.params[i[1]] = coerce(decodeURIComponent(uri[i[0]]));
		}
	}
}

export function parse (arg) {
	return new URL(typeof arg === STRING ? arg : `http://${arg.headers.host || `localhost:${arg.socket.server._connectionKey.replace(/.*::/, EMPTY)}`}${arg.url}`);
}

export function partial (req, res, buffered, status, headers) {
	if ((req.headers.range || EMPTY).indexOf(KEY_BYTES) === 0) {
		const options = {},
			size = Buffer.byteLength(buffered);

		for (const [idx, i] of req.headers.range.replace(KEY_BYTES, EMPTY).split(COMMA)[0].split(HYPHEN).entries()) {
			options[idx === 0 ? START : END] = i ? parseInt(i, 10) : void 0;
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
			headers[CONTENT_RANGE] = `bytes ${options.start + (options.end === size ? 1 : 0)}-${options.end}/${size}`;
			headers[CONTENT_LENGTH] = `${options.end - options.start + (options.end === size ? 0 : 1)}`;
			status = res.statusCode = 206;
			res.removeHeader(ETAG); // Removing etag since this rep is incomplete
			delete headers.etag;
		}
	}
}

export function pipeable (method, arg) {
	return method !== HEAD && arg !== null && typeof arg.on === FUNCTION;
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

export function stream (req, res, file = {charset: EMPTY, etag: EMPTY, path: EMPTY, stats: {mtime: new Date(), size: 0}}) {
	res.header(CONTENT_LENGTH, file.stats.size);
	res.header(CONTENT_TYPE, file.charset.length > 0 ? `${mime(file.path)}; charset=${file.charset}` : mime(file.path));
	res.header(LAST_MODIFIED, file.stats.mtime.toUTCString());

	if (file.etag.length > 0) {
		res.header(ETAG, file.etag);
		res.removeHeader(CACHE_CONTROL);
	}

	if (req.method === GET) {
		if ((file.etag.length > 0 && req.headers[IF_NONE_MATCH] === file.etag) || (req.headers[IF_NONE_MATCH] === void 0 && Date.parse(req.headers[IF_MODIFIED_SINCE]) >= file.stats.mtime)) { // eslint-disable-line no-extra-parens
			res.removeHeader(CONTENT_TYPE);
			res.removeHeader(CONTENT_LENGTH);
			res.send(EMPTY, 304);
		} else {
			const options = {};
			let status = 200;

			// Setting the partial content headers
			if (RANGE in req.headers) {
				const range = req.headers.range.replace(/^.*=/, EMPTY).split(COMMA)[0].split(HYPHEN);

				for (const [idx, i] of range.entries()) {
					options[idx === 0 ? START : END] = i !== void 0 ? parseInt(i, 10) : void 0;
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
				res.removeHeader(CONTENT_LENGTH);
				res.removeHeader(ETAG); // Removing etag since this rep is incomplete
				res.header(CONTENT_RANGE, `bytes ${options.start}-${options.end}/${file.stats.size}`);
				res.header(CONTENT_LENGTH, options.end - options.start + 1);
			}

			res.send(createReadStream(file.path, options), status);
		}
	} else if (req.method === HEAD) {
		res.send(EMPTY);
	} else if (req.method === OPTIONS) {
		res.removeHeader(CONTENT_LENGTH);
		res.send(OPTIONS_BODY);
	} else {
		res.error(405);
	}

	return void 0;
}

export function timeOffset (arg = 0) {
	const neg = arg < 0;

	return `${neg ? EMPTY : HYPHEN}${String((neg ? -arg : arg) / 60).split(PERIOD).reduce((a, v, idx, arr) => {
		a.push(idx === 0 ? pad(v) : STRING_30);

		if (arr.length === 1) {
			a.push(STRING_00);
		}

		return a;
	}, []).join(EMPTY)}`;
}

export function writeHead (res, status, headers) {
	if (res.statusCode < status) {
		res.statusCode = status;
	}

	res.writeHead(res.statusCode, STATUS_CODES[res.statusCode], headers);
}
