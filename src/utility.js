import {extname, join} from "node:path";
import {createReadStream, readFileSync} from "node:fs";
import {STATUS_CODES} from "node:http";
import {fileURLToPath, URL} from "node:url";
import {coerce} from "tiny-coerce";
import mimeDb from "mime-db";
import {
	APPLICATION_OCTET_STREAM,
	CACHE_CONTROL,
	COMMA,
	CONTENT_LENGTH,
	CONTENT_RANGE,
	CONTENT_TYPE,
	EMPTY,
	END,
	ETAG,
	EXTENSIONS,
	FILES,
	FUNCTION,
	GET,
	HEAD,
	HYPHEN,
	INT_0,
	INT_10,
	INT_1e6,
	INT_2,
	INT_200,
	INT_206,
	INT_3,
	INT_404,
	INT_405,
	INT_500,
	INT_60,
	KEY_BYTES,
	LAST_MODIFIED,
	OPTIONS,
	OPTIONS_BODY,
	PERIOD,
	RANGE,
	START,
	STRING,
	STRING_0,
	STRING_00,
	STRING_30,
	TIME_MS,
	TITLE,
	TOKEN_N,
	UTF8
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
	return new Function(TITLE, FILES, `return \`${html}\`;`)(title, files);
}

export function getStatus (req, res) {
	return req.allow.length > INT_0 ? req.method !== GET ? INT_405 : req.allow.includes(GET) ? res.statusCode > INT_500 ? res.statusCode : INT_500 : INT_404 : INT_404;
}

function mime (arg = EMPTY) {
	const ext = extname(arg);

	return ext in extensions ? extensions[ext].type : APPLICATION_OCTET_STREAM;
}

export function ms (arg = INT_0, digits = INT_3) {
	return TIME_MS.replace(TOKEN_N, Number(arg / INT_1e6).toFixed(digits));
}

export function next (req, res, middleware) {
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
					res.error(getStatus(req, res));
				}
			} else {
				obj.value(req, res, fn);
			}
		} else {
			res.error(getStatus(req, res));
		}
	});

	return fn;
}

export function pad (arg = INT_0) {
	return String(arg).padStart(INT_2, STRING_0);
}

export function params (req, getParams) {
	getParams.lastIndex = INT_0;
	req.params = getParams.exec(req.parsed.pathname)?.groups ?? {};

	for (const [key, value] of Object.entries(req.params)) {
		req.params[key] = coerce(decodeURIComponent(value));
	}
}

export function parse (arg) {
	return new URL(typeof arg === STRING ? arg : `http://${arg.headers.host || `localhost:${arg.socket.server._connectionKey.replace(/.*::/, EMPTY)}`}${arg.url}`);
}

export function partialHeaders (req, res, size, status, headers = {}, options = {}) {
	if ((req.headers.range || EMPTY).indexOf(KEY_BYTES) === INT_0) {
		options = {};

		for (const [idx, i] of req.headers.range.replace(KEY_BYTES, EMPTY).split(COMMA)[0].split(HYPHEN).entries()) {
			options[idx === INT_0 ? START : END] = i ? parseInt(i, INT_10) : void 0;
		}

		// Byte offsets
		if (isNaN(options.start) && isNaN(options.end) === false) {
			options.start = size - options.end;
			options.end = size;
		} else if (isNaN(options.end)) {
			options.end = size;
		}

		res.removeHeader(CONTENT_RANGE);
		res.removeHeader(CONTENT_LENGTH);
		res.removeHeader(ETAG);
		delete headers.etag;

		if (isNaN(options.start) === false && isNaN(options.end) === false && options.start < options.end && options.end <= size) {
			req.range = options;
			headers[CONTENT_RANGE] = `bytes ${options.start}-${options.end}/${size}`;
			headers[CONTENT_LENGTH] = options.end - options.start;
			res.header(CONTENT_RANGE, headers[CONTENT_RANGE]);
			res.header(CONTENT_LENGTH, headers[CONTENT_LENGTH]);
			status = res.statusCode = INT_206;
		} else {
			headers[CONTENT_RANGE] = `bytes */${size}`;
			res.header(CONTENT_RANGE, headers[CONTENT_RANGE]);
		}
	}

	return [headers, options];
}

export function pipeable (method, arg) {
	return method !== HEAD && arg !== null && typeof arg.on === FUNCTION;
}

export function reduce (uri, map = new Map(), arg = {}, end = false) {
	Array.from(map.values()).filter(i => {
		i.regex.lastIndex = INT_0;

		return i.regex.test(uri);
	}).forEach(i => {
		for (const fn of i.handlers) {
			arg.middleware.push(fn);

			if (end && arg.exit === null) {
				arg.exit = fn;
			}
		}

		if (i.params && arg.params === false) {
			arg.params = true;
			arg.getParams = i.regex;
		}
	});
}

export function stream (req, res, file = {
	charset: EMPTY,
	etag: EMPTY,
	path: EMPTY,
	stats: {mtime: new Date(), size: INT_0}
}) {
	res.header(CONTENT_LENGTH, file.stats.size);
	res.header(CONTENT_TYPE, file.charset.length > INT_0 ? `${mime(file.path)}; charset=${file.charset}` : mime(file.path));
	res.header(LAST_MODIFIED, file.stats.mtime.toUTCString());

	if (file.etag.length > INT_0) {
		res.header(ETAG, file.etag);
		res.removeHeader(CACHE_CONTROL);
	}

	if (req.method === GET) {
		let status = INT_200;
		let options, headers;

		if (RANGE in req.headers) {
			[headers, options] = partialHeaders(req, res, file.stats.size, status);
			res.removeHeader(CONTENT_LENGTH);
			res.header(CONTENT_RANGE, headers[CONTENT_RANGE]);
			options.end--; // last byte offset

			if (CONTENT_LENGTH in headers) {
				res.header(CONTENT_LENGTH, headers[CONTENT_LENGTH]);
			}
		}

		res.send(createReadStream(file.path, options), status);
	} else if (req.method === HEAD) {
		res.send(EMPTY);
	} else if (req.method === OPTIONS) {
		res.removeHeader(CONTENT_LENGTH);
		res.send(OPTIONS_BODY);
	}

	return void 0;
}

export function timeOffset (arg = INT_0) {
	const neg = arg < INT_0;

	return `${neg ? EMPTY : HYPHEN}${String((neg ? -arg : arg) / INT_60).split(PERIOD).reduce((a, v, idx, arr) => {
		a.push(idx === INT_0 ? pad(v) : STRING_30);

		if (arr.length === 1) {
			a.push(STRING_00);
		}

		return a;
	}, []).join(EMPTY)}`;
}

export function writeHead (res, headers = {}) {
	res.writeHead(res.statusCode, STATUS_CODES[res.statusCode], headers);
}
