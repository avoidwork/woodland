import {extname} from "node:path";
import {
	APPLICATION_JSON,
	APPLICATION_OCTET_STREAM,
	CACHE_CONTROL,
	CONTENT_LENGTH,
	CONTENT_RANGE,
	CONTENT_TYPE,
	EMPTY,
	ETAG,
	INT_200,
	INT_416,
	LOCATION,
	OPTIONS,
	OPTIONS_BODY,
	RANGE,
	STRING,
	TO_STRING
} from "./constants.js";
import {partialHeaders, writeHead, pipeable, mimeExtensions} from "./utility.js";
import {createReadStream} from "node:fs";

function mime (arg = EMPTY) {
	const ext = extname(arg);

	return ext in mimeExtensions ? mimeExtensions[ext].type : APPLICATION_OCTET_STREAM;
}

function getStatusText (status) {
	const statusTexts = {
		200: "OK",
		204: "No Content",
		307: "Temporary Redirect",
		308: "Permanent Redirect",
		400: "Bad Request",
		403: "Forbidden",
		404: "Not Found",
		405: "Method Not Allowed",
		416: "Range Not Satisfiable",
		500: "Internal Server Error"
	};

	return statusTexts[status] || "Error";
}

export function createResponseHandler ({digit: _digit, etags, onReady, onDone, onSend: _onSend}) {
	function createErrorHandler (emitError, logError) {
		return (req, res) => {
			return (status = 500, body) => {
				if (res.headersSent === false) {
					const err = body instanceof Error ? body : new Error(body ?? getStatusText(status));
					let output = err.message,
						headers = {};

					[output, status, headers] = onReady(req, res, output, status, headers);

					if (status === 404) {
						res.removeHeader("allow");
						res.header("allow", EMPTY);

						if (req.cors) {
							res.removeHeader("access-control-allow-methods");
							res.header("access-control-allow-methods", EMPTY);
						}
					}

					res.removeHeader(CONTENT_LENGTH);
					res.statusCode = status;

					emitError(req, res, err);
					logError(req, status);
					onDone(req, res, output, headers);
				}
			};
		};
	}

	function createJsonHandler (res) {
		return (arg, status = 200, headers = {[CONTENT_TYPE]: `${APPLICATION_JSON}; charset=utf-8`}) => {
			res.send(JSON.stringify(arg), status, headers);
		};
	}

	function createRedirectHandler (res) {
		return (uri, perm = true) => {
			res.send(EMPTY, perm ? 308 : 307, {[LOCATION]: uri});
		};
	}

	function createSendHandler (req, res) {
		return (body = EMPTY, status = res.statusCode, headers = {}) => {
			if (res.headersSent === false) {
				[body, status, headers] = onReady(req, res, body, status, headers);

				const method = req.method;
				const rangeHeader = req.headers.range;
				const isPipeable = pipeable(method, body);

				if (isPipeable) {
					if (rangeHeader === void 0 || req.range !== void 0) {
						writeHead(res, headers);
						body.on("error", err => res.error(500, err)).pipe(res);
					} else {
						res.error(INT_416);
					}
				} else {
					if (typeof body !== STRING && body && typeof body[TO_STRING] === "function") {
						body = body.toString();
					}

					if (rangeHeader !== void 0) {
						const buffered = Buffer.from(body);
						const byteLength = buffered.length;

						[headers] = partialHeaders(req, res, byteLength, status, headers);

						if (req.range !== void 0) {
							const rangeBuffer = buffered.slice(req.range.start, req.range.end + 1);
							onDone(req, res, rangeBuffer.toString(), headers);
						} else {
							res.error(INT_416);
						}
					} else {
						res.statusCode = status;
						onDone(req, res, body, headers);
					}
				}
			}
		};
	}

	function createSetHandler (res) {
		return (arg = {}) => {
			const headers = arg instanceof Map || arg instanceof Headers ? arg : new Headers(arg);

			for (const [key, value] of headers) {
				res.setHeader(key, value);
			}

			return res;
		};
	}

	function createStatusHandler (res) {
		return (arg = INT_200) => {
			res.statusCode = arg;

			return res;
		};
	}

	function stream (req, res, file, emitStream) {
		if (file.path === EMPTY || file.stats.size === 0) {
			throw new TypeError("Invalid file descriptor");
		}

		res.header(CONTENT_LENGTH, file.stats.size);
		res.header(CONTENT_TYPE, file.charset.length > 0 ? `${mime(file.path)}; charset=${file.charset}` : mime(file.path));
		res.header("last-modified", file.stats.mtime.toUTCString());

		if (etags && file.etag.length > 0) {
			res.header(ETAG, file.etag);
			res.removeHeader(CACHE_CONTROL);
		}

		if (req.method === "GET") {
			let status = INT_200;
			let options = {};
			let headers = {};

			if (RANGE in req.headers) {
				[headers, options] = partialHeaders(req, res, file.stats.size, status);

				if (Object.keys(options).length > 0) {
					res.removeHeader(CONTENT_LENGTH);
					res.header(CONTENT_RANGE, headers[CONTENT_RANGE]);

					if (CONTENT_LENGTH in headers) {
						res.header(CONTENT_LENGTH, headers[CONTENT_LENGTH]);
					}
				} else {
					options = {};
				}
			}

			res.send(createReadStream(file.path, Object.keys(options).length > 0 ? options : undefined), status);
		} else if (req.method === "HEAD") {
			res.send(EMPTY);
		} else if (req.method === OPTIONS) {
			res.removeHeader(CONTENT_LENGTH);
			res.send(OPTIONS_BODY);
		}

		emitStream(req, res);
	}

	return {createErrorHandler, createJsonHandler, createRedirectHandler, createSendHandler, createSetHandler, createStatusHandler, stream};
}
