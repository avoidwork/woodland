/**
 * woodland
 *
 * @copyright 2026 Jason Mulligan <jason.mulligan@avoidwork.com>
 * @license BSD-3-Clause
 * @version 20.2.10
 */
import { STATUS_CODES, METHODS } from "node:http";
import { EventEmitter } from "node:events";
import { readFileSync, createReadStream } from "node:fs";
import { etag } from "tiny-etag";
import { precise } from "precise";
import { createRequire } from "node:module";
import { join, extname, resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";
import { coerce } from "tiny-coerce";
import mimeDb from "mime-db";
import { stat, readdir } from "node:fs/promises";
const __dirname$2 = fileURLToPath(new URL(".", import.meta.url));
const require$1 = createRequire(import.meta.url);
const { name, version } = require$1(join(__dirname$2, "..", "package.json"));

// =============================================================================
// HTTP METHODS
// =============================================================================
const CONNECT = "CONNECT";
const DELETE = "DELETE";
const GET = "GET";
const HEAD = "HEAD";
const OPTIONS = "OPTIONS";
const PATCH = "PATCH";
const POST = "POST";
const PUT = "PUT";
const TRACE = "TRACE";

// =============================================================================
// HTTP STATUS CODES
// =============================================================================
const INT_200 = 200;
const INT_204 = 204;
const INT_206 = 206;
const INT_304 = 304;
const INT_403 = 403;
const INT_404 = 404;
const INT_405 = 405;
const INT_416 = 416;
const INT_500 = 500;

// =============================================================================
// HTTP HEADERS
// =============================================================================
const ACCESS_CONTROL_ALLOW_CREDENTIALS = "access-control-allow-credentials";
const ACCESS_CONTROL_ALLOW_HEADERS = "access-control-allow-headers";
const ACCESS_CONTROL_ALLOW_METHODS = "access-control-allow-methods";
const ACCESS_CONTROL_ALLOW_ORIGIN = "access-control-allow-origin";
const ACCESS_CONTROL_EXPOSE_HEADERS = "access-control-expose-headers";
const ACCESS_CONTROL_REQUEST_HEADERS = "access-control-request-headers";
const ALLOW = "allow";
const CACHE_CONTROL = "cache-control";
const CONTENT_LENGTH = "content-length";
const CONTENT_RANGE = "content-range";
const CONTENT_TYPE = "content-type";
const ETAG = "etag";
const LAST_MODIFIED = "last-modified";
const LOCATION = "location";
const NO_SNIFF = "nosniff";
const ORIGIN = "origin";
const RANGE = "range";
const SERVER = "server";
const TIMING_ALLOW_ORIGIN = "timing-allow-origin";
const X_CONTENT_TYPE_OPTIONS = "x-content-type-options";
const X_POWERED_BY = "x-powered-by";
const X_RESPONSE_TIME = "x-response-time";

// =============================================================================
// CONTENT TYPES & MEDIA
// =============================================================================
const APPLICATION_JSON = "application/json";
const APPLICATION_OCTET_STREAM = "application/octet-stream";
const UTF8 = "utf8";
const UTF_8 = "utf-8";

// =============================================================================
// SERVER & SYSTEM INFO
// =============================================================================
const SERVER_VALUE = `${name}/${version}`;
const X_POWERED_BY_VALUE = `nodejs/${process.version}, ${process.platform}/${process.arch}`;

// =============================================================================
// FILE SYSTEM & ROUTING
// =============================================================================
const INDEX_HTM = "index.htm";
const INDEX_HTML = "index.html";
const EXTENSIONS = "extensions";

// =============================================================================
// NUMERIC CONSTANTS
// =============================================================================
const INT_0 = 0;
const INT_2 = 2;
const INT_3 = 3;
const INT_10 = 10;
const INT_60 = 60;
const INT_1e3 = 1e3;
const INT_1e4 = 1e4;
const COMMA = ",";
const DELIMITER = "|";
const EMPTY = "";
const HYPHEN = "-";
const LEFT_PAREN = "(";
const SLASH = "/";
const STRING_0 = "0";
const WILDCARD = "*";
const FUNCTION = "function";
const STRING = "string";

// =============================================================================
// LOGGING & DEBUGGING
// =============================================================================
const DEBUG = "debug";
const ERROR = "error";
const INFO = "info";
const LOG_FORMAT = '%h %l %u %t "%r" %>s %b';

const OPTIONS_BODY = "Make a GET request to retrieve the file";

// =============================================================================
// HTTP RANGE & CACHING
// =============================================================================
const KEY_BYTES = "bytes=";

// =============================================================================
// EVENT & STREAM CONSTANTS
// =============================================================================
const CLOSE = "close";
const FINISH = "finish";
const STREAM = "stream";

// =============================================================================
// UTILITY & MISC
// =============================================================================
const EN_US = "en-US";
const SHORT = "short";
const TO_STRING = "toString";
const TRUE = "true";

const MONTHS = Object.freeze(
  Array.from(Array(12).values()).map((i, idx) => {
    const d = new Date();
    d.setMonth(idx);

    return Object.freeze(d.toLocaleString(EN_US, { month: SHORT }));
  }),
);
const __dirname$1 = fileURLToPath(new URL(".", import.meta.url)),
  html = readFileSync(join(__dirname$1, "..", "tpl", "autoindex.html"), { encoding: UTF8 }),
  valid = Object.entries(mimeDb).filter((i) => EXTENSIONS in i[1]),
  mimeExtensions = valid.reduce((a, v) => {
    const result = Object.assign({ type: v[0] }, v[1]);

    for (const key of result.extensions) {
      a[`.${key}`] = result;
    }

    return a;
  }, {});

/**
 * Escapes HTML special characters to prevent XSS attacks
 * @param {string} [str=""] - The string to escape
 * @returns {string} The escaped string with HTML entities
 */
function escapeHtml(str = EMPTY) {
  // Use lookup table for single-pass replacement
  const htmlEscapes = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };

  return str.replace(/[&<>"']/g, (match) => htmlEscapes[match]);
}

/**
 * Generates an HTML autoindex page for directory listings
 * @param {string} [title=""] - The title for the autoindex page
 * @param {Array} [files=[]] - Array of file objects from fs.readdir with withFileTypes: true
 * @returns {string} The complete HTML string for the autoindex page
 */
function autoindex(title = EMPTY, files = []) {
  const safeTitle = escapeHtml(title);

  // Optimized: Fast path for empty files array
  if (files.length === 0) {
    return html.replace(/\$\{\s*(TITLE|FILES)\s*\}/g, (match, key) => {
      return key === "TITLE" ? safeTitle : '    <li><a href=".." rel="collection">../</a></li>';
    });
  }

  // Pre-allocate array for better performance
  const listItems = new Array(files.length + 1);
  listItems[0] = '    <li><a href=".." rel="collection">../</a></li>';

  // Optimized: Cache file count and optimize loop
  const fileCount = files.length;
  for (let i = 0; i < fileCount; i++) {
    const file = files[i];
    const fileName = file.name;
    const safeName = escapeHtml(fileName);
    const safeHref = encodeURIComponent(fileName);
    const isDir = file.isDirectory();

    // Optimized: Use ternary operator for better performance
    listItems[i + 1] = isDir
      ? `    <li><a href="${safeHref}/" rel="collection">${safeName}/</a></li>`
      : `    <li><a href="${safeHref}" rel="item">${safeName}</a></li>`;
  }

  const safeFiles = listItems.join("\n");

  // Optimized: Cache replace callback for reuse
  const replaceCallback = (match, key) => (key === "TITLE" ? safeTitle : safeFiles);

  return html.replace(/\$\{\s*(TITLE|FILES)\s*\}/g, replaceCallback);
}

/**
 * Determines the appropriate HTTP status code based on request and response state
 * @param {Object} req - The HTTP request object
 * @param {Object} res - The HTTP response object
 * @returns {number} The appropriate HTTP status code
 */
function getStatus(req, res) {
  // No allowed methods - always 404
  if (req.allow.length === INT_0) {
    return INT_404;
  }

  // Method not allowed
  if (req.method !== GET) {
    return INT_405;
  }

  // GET method not allowed
  if (!req.allow.includes(GET)) {
    return INT_404;
  }

  // Return existing error status or default 500
  return res.statusCode > INT_500 ? res.statusCode : INT_500;
}

/**
 * Gets the MIME type for a file based on its extension
 * @param {string} [arg=""] - The filename or path to get the MIME type for
 * @returns {string} The MIME type or application/octet-stream as default
 */
function mime$1(arg = EMPTY) {
  const ext = extname(arg);

  return ext in mimeExtensions ? mimeExtensions[ext].type : APPLICATION_OCTET_STREAM;
}

/**
 * Creates a next function for middleware processing with error handling
 * @param {Object} req - The HTTP request object
 * @param {Object} res - The HTTP response object
 * @param {Iterator} middleware - The middleware iterator
 * @param {boolean} [immediate=false] - Whether to execute immediately or on next tick
 * @returns {Function} The next function for middleware chain
 */
function next(req, res, middleware, immediate = false) {
  // Optimized: Pre-calculate getStatus to avoid repeated function calls
  const errorStatus = getStatus(req, res);

  const internalFn = (err, fn) => {
    let obj = middleware.next();

    if (obj.done === false) {
      if (err !== void 0) {
        // Optimized: Find error handler more efficiently
        while (obj.done === false && obj.value && obj.value.length < 4) {
          obj = middleware.next();
        }

        if (obj.done === false && obj.value) {
          obj.value(err, req, res, fn);
        } else {
          res.error(errorStatus);
        }
      } else {
        const value = obj.value;
        // Optimized: Check function type once and reuse result
        if (typeof value === FUNCTION) {
          value(req, res, fn);
        } else {
          res.send(value);
        }
      }
    } else {
      res.error(errorStatus);
    }
  };

  // Optimized: Create function based on immediate flag without conditional in hot path
  const fn = immediate
    ? (err) => internalFn(err, fn)
    : (err) => process.nextTick(() => internalFn(err, fn));

  return fn;
}

/**
 * Extracts and processes URL parameters from request path
 * @param {Object} req - The HTTP request object
 * @param {RegExp} getParams - Regular expression for parameter extraction
 */
function params(req, getParams) {
  getParams.lastIndex = INT_0;
  const match = getParams.exec(req.parsed.pathname);
  const groups = match?.groups;

  if (!groups) {
    req.params = {};

    return;
  }

  // Optimized: Use Object.create(null) for faster parameter object
  const processedParams = Object.create(null);
  const keys = Object.keys(groups);
  const keyCount = keys.length;

  // Optimized: Use standard for loop for better performance
  for (let i = 0; i < keyCount; i++) {
    const key = keys[i];
    const value = groups[key];

    // Optimized: Avoid repeated calls to escapeHtml and coerce
    if (value === null || value === undefined) {
      processedParams[key] = coerce(null);
    } else {
      // Optimized URL decoding with fast path for common cases
      let decoded;
      if (value.indexOf("%") === -1) {
        // Fast path: no URL encoding
        decoded = value;
      } else {
        try {
          decoded = decodeURIComponent(value);
        } catch {
          decoded = value;
        }
      }

      processedParams[key] = coerce(escapeHtml(decoded));
    }
  }

  req.params = processedParams;
}

/**
 * Parses a URL string or request object into a URL object with security checks
 * @param {string|Object} arg - URL string or request object to parse
 * @returns {URL} Parsed URL object
 */
function parse(arg) {
  return new URL(
    typeof arg === STRING
      ? arg
      : `http://${arg.headers.host || `localhost:${arg.socket?.server?._connectionKey?.replace(/.*::/, EMPTY) || "8000"}`}${arg.url}`,
  );
}

/**
 * Handles partial content headers for HTTP range requests
 * @param {Object} req - The HTTP request object
 * @param {Object} res - The HTTP response object
 * @param {number} size - Total size of the content
 * @param {number} status - HTTP status code
 * @param {Object} [headers={}] - Response headers object
 * @param {Object} [options={}] - Options for range processing
 * @returns {Array} Array containing [headers, options]
 */
function partialHeaders(req, res, size, status, headers = {}, options = {}) {
  const rangeHeader = req.headers.range;

  if (!rangeHeader || !rangeHeader.startsWith(KEY_BYTES)) {
    return [headers, options];
  }

  // Optimized range parsing - avoid multiple splits
  const rangePart = rangeHeader.substring(KEY_BYTES.length);
  const commaIndex = rangePart.indexOf(COMMA);
  const rangeSpec = commaIndex === -1 ? rangePart : rangePart.substring(0, commaIndex);
  const hyphenIndex = rangeSpec.indexOf(HYPHEN);

  let start, end;

  if (hyphenIndex === -1) {
    // No hyphen found, invalid range
    return [headers, options];
  }

  const startStr = rangeSpec.substring(0, hyphenIndex);
  const endStr = rangeSpec.substring(hyphenIndex + 1);

  // Parse numbers with optimized logic
  if (startStr === EMPTY) {
    // Suffix-byte-range-spec (e.g., "-500")
    if (endStr === EMPTY) {
      return [headers, options];
    }
    end = parseInt(endStr, INT_10);
    if (isNaN(end)) {
      return [headers, options];
    }
    start = size - end;
    end = size - 1;
  } else {
    start = parseInt(startStr, INT_10);
    if (isNaN(start)) {
      return [headers, options];
    }

    if (endStr === EMPTY) {
      end = size - 1;
    } else {
      end = parseInt(endStr, INT_10);
      if (isNaN(end)) {
        return [headers, options];
      }
    }
  }

  // Clean up headers once
  res.removeHeader(CONTENT_RANGE);
  res.removeHeader(CONTENT_LENGTH);
  res.removeHeader(ETAG);
  delete headers.etag;

  // Validate range
  if (!isNaN(start) && !isNaN(end) && start <= end && start >= 0 && end < size) {
    const rangeOptions = { start, end };
    req.range = rangeOptions;
    const contentLength = end - start + 1;

    headers[CONTENT_RANGE] = `bytes ${start}-${end}/${size}`;
    headers[CONTENT_LENGTH] = contentLength;

    res.header(CONTENT_RANGE, headers[CONTENT_RANGE]);
    res.header(CONTENT_LENGTH, headers[CONTENT_LENGTH]);
    res.statusCode = INT_206;

    return [headers, rangeOptions];
  } else {
    // Invalid range
    headers[CONTENT_RANGE] = `bytes */${size}`;
    res.header(CONTENT_RANGE, headers[CONTENT_RANGE]);

    return [headers, options];
  }
}

/**
 * Checks if an object is pipeable (has 'on' method and is not null)
 * @param {string} method - HTTP method
 * @param {*} arg - Object to check for pipeability
 * @returns {boolean} True if the object is pipeable
 */
function pipeable(method, arg) {
  return method !== HEAD && arg !== null && arg !== undefined && typeof arg.on === FUNCTION;
}

/**
 * Formats a time offset value into a string representation
 * @param {number} [arg=0] - Time offset value
 * @returns {string} Formatted time offset string
 */
function timeOffset(arg = INT_0) {
  const isNegative = arg < INT_0;
  const absValue = isNegative ? -arg : arg;
  const offsetMinutes = absValue / INT_60;

  const hours = Math.floor(offsetMinutes);
  const minutes = Math.floor((offsetMinutes - hours) * INT_60);

  const sign = isNegative ? EMPTY : HYPHEN;
  const hoursStr = String(hours).padStart(INT_2, STRING_0);
  const minutesStr = String(minutes).padStart(INT_2, STRING_0);

  return `${sign}${hoursStr}${minutesStr}`;
}

/**
 * Writes HTTP response headers using writeHead method
 * @param {Object} res - The HTTP response object
 * @param {Object} [headers={}] - Headers object to write
 */
function writeHead(res, headers = {}) {
  res.writeHead(res.statusCode, STATUS_CODES[res.statusCode], headers);
}

/**
 * Converts a route path with parameters to a regex pattern
 * @param {string} [arg=''] - Route path with parameter placeholders
 * @returns {string} Regex pattern string
 */
function extractPath(arg = EMPTY) {
  return arg.replace(/\/:([^/]+)/g, "/(?<$1>[^/]+)");
}
function reduce(uri, map = new Map(), arg = {}) {
  if (map.size === 0) {
    return;
  }

  const middlewareArray = arg.middleware;
  let paramsFound = arg.params;

  for (const middleware of map.values()) {
    middleware.regex.lastIndex = 0;

    if (middleware.regex.test(uri)) {
      const handlers = middleware.handlers;
      const handlerCount = handlers.length;

      if (handlerCount === 1) {
        middlewareArray.push(handlers[0]);
      } else if (handlerCount > 1) {
        middlewareArray.push.apply(middlewareArray, handlers);
      }

      if (middleware.params && paramsFound === false) {
        arg.params = true;
        arg.getParams = middleware.regex;
        paramsFound = true;
      }
    }
  }
}

function createMiddlewareRegistry(middleware, ignored, methods, cache) {
  let ignoreFn, allowedFn, routesFn, registerFn, listFn;

  function routes(uri, method, override = false) {
    const key = `${method}${DELIMITER}${uri}`;
    const cached = override === false ? cache.get(key) : void 0;
    let result;

    if (cached !== void 0) {
      result = cached;
    } else {
      result = { getParams: null, middleware: [], params: false, visible: 0, exit: -1 };
      reduce(uri, middleware.get(WILDCARD), result);

      if (method !== WILDCARD) {
        result.exit = result.middleware.length;
        reduce(uri, middleware.get(method), result);
      }

      result.visible = 0;
      for (let i = 0; i < result.middleware.length; i++) {
        if (ignored.has(result.middleware[i]) === false) {
          result.visible++;
        }
      }
      cache.set(key, result);
    }

    return result;
  }
  routesFn = routes;

  function list(method = GET.toLowerCase(), type = "array") {
    let result;

    if (type === "array") {
      result = Array.from(middleware.get(method.toUpperCase()).keys());
    } else if (type === "object") {
      result = {};

      for (const [key, value] of middleware.get(method.toUpperCase()).entries()) {
        result[key] = value;
      }
    }

    return result;
  }
  listFn = list;

  function allowed(method, uri, override = false) {
    return routesFn(uri, method, override).visible > 0;
  }
  allowedFn = allowed;

  function register(rpath, ...fn) {
    if (typeof rpath === FUNCTION) {
      fn = [rpath, ...fn];
      rpath = `/.${WILDCARD}`;
    }

    const method = typeof fn[fn.length - 1] === STRING ? fn.pop().toUpperCase() : GET;

    const nodeMethods = [
      "CONNECT",
      "DELETE",
      "GET",
      "HEAD",
      "OPTIONS",
      "PATCH",
      "POST",
      "PUT",
      "TRACE",
    ];

    if (method !== WILDCARD && nodeMethods.includes(method) === false) {
      throw new TypeError("Invalid HTTP method");
    }

    if (method === HEAD) {
      throw new TypeError("Cannot set HEAD route, use GET");
    }

    if (middleware.has(method) === false) {
      if (method !== WILDCARD) {
        methods.push(method);
      }

      middleware.set(method, new Map());
    }

    const mmethod = middleware.get(method);
    let lrpath = rpath,
      lparams = false;

    if (lrpath.includes(`${SLASH}${LEFT_PAREN}`) === false && lrpath.includes(`${SLASH}:`)) {
      lparams = true;
      lrpath = extractPath(lrpath);
    }

    const current = mmethod.get(lrpath) ?? { handlers: [] };

    current.handlers.push(...fn);
    mmethod.set(lrpath, {
      handlers: current.handlers,
      params: lparams,
      regex: new RegExp(`^${lrpath}$`),
    });

    return {
      ignore: ignoreFn,
      allowed: allowedFn,
      routes: routesFn,
      register: registerFn,
      list: listFn,
    };
  }
  registerFn = register;

  function ignore(fn) {
    ignored.add(fn);

    return {
      ignore: ignoreFn,
      allowed: allowedFn,
      routes: routesFn,
      register: registerFn,
      list: listFn,
    };
  }
  ignoreFn = ignore;

  return {
    ignore: ignoreFn,
    allowed: allowedFn,
    routes: routesFn,
    register: registerFn,
    list: listFn,
  };
}
function mime(arg = EMPTY) {
  const ext = extname(arg);

  return ext in mimeExtensions ? mimeExtensions[ext].type : APPLICATION_OCTET_STREAM;
}

function getStatusText(status) {
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
    500: "Internal Server Error",
  };

  return statusTexts[status] || "Error";
}

function createResponseHandler({ digit: _digit, etags, onReady, onDone, onSend: _onSend }) {
  function createErrorHandler(emitError, logError) {
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

  function createJsonHandler(res) {
    return (
      arg,
      status = 200,
      headers = { [CONTENT_TYPE]: `${APPLICATION_JSON}; charset=utf-8` },
    ) => {
      res.send(JSON.stringify(arg), status, headers);
    };
  }

  function createRedirectHandler(res) {
    return (uri, perm = true) => {
      res.send(EMPTY, perm ? 308 : 307, { [LOCATION]: uri });
    };
  }

  function createSendHandler(req, res) {
    return (body = EMPTY, status = res.statusCode, headers = {}) => {
      if (res.headersSent === false) {
        [body, status, headers] = onReady(req, res, body, status, headers);

        const method = req.method;
        const rangeHeader = req.headers.range;
        const isPipeable = pipeable(method, body);

        if (isPipeable) {
          if (rangeHeader === void 0 || req.range !== void 0) {
            writeHead(res, headers);
            body.on("error", (err) => res.error(500, err)).pipe(res);
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

  function createSetHandler(res) {
    return (arg = {}) => {
      const headers = arg instanceof Map || arg instanceof Headers ? arg : new Headers(arg);

      for (const [key, value] of headers) {
        res.setHeader(key, value);
      }

      return res;
    };
  }

  function createStatusHandler(res) {
    return (arg = INT_200) => {
      res.statusCode = arg;

      return res;
    };
  }

  function stream(req, res, file, emitStream) {
    if (file.path === EMPTY || file.stats.size === 0) {
      throw new TypeError("Invalid file descriptor");
    }

    res.header(CONTENT_LENGTH, file.stats.size);
    res.header(
      CONTENT_TYPE,
      file.charset.length > 0 ? `${mime(file.path)}; charset=${file.charset}` : mime(file.path),
    );
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
        [headers, options] = partialHeaders(req, res, file.stats.size);

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

      res.send(
        createReadStream(file.path, Object.keys(options).length > 0 ? options : undefined),
        status,
      );
    } else if (req.method === "HEAD") {
      res.send(EMPTY);
    } else if (req.method === OPTIONS) {
      res.removeHeader(CONTENT_LENGTH);
      res.send(OPTIONS_BODY);
    }

    emitStream(req, res);
  }

  return {
    createErrorHandler,
    createJsonHandler,
    createRedirectHandler,
    createSendHandler,
    createSetHandler,
    createStatusHandler,
    stream,
  };
}
const IPV4_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const IPV6_CHAR_PATTERN = /^[0-9a-fA-F:.]+$/;
const IPV4_MAPPED_PATTERN = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i;
const HEX_GROUP_PATTERN = /^[0-9a-fA-F]{1,4}$/;

function isValidIP(ip) {
  if (!ip || typeof ip !== "string") {
    return false;
  }

  if (ip.indexOf(":") === -1) {
    const match = IPV4_PATTERN.exec(ip);

    if (!match) {
      return false;
    }

    for (let i = 1; i < 5; i++) {
      const num = parseInt(match[i], 10);
      if (num > 255) {
        return false;
      }
    }

    return true;
  }

  if (!IPV6_CHAR_PATTERN.test(ip)) {
    return false;
  }

  const ipv4MappedMatch = IPV4_MAPPED_PATTERN.exec(ip);
  if (ipv4MappedMatch) {
    return isValidIP(ipv4MappedMatch[1]);
  }

  if (ip === "::") {
    return true;
  }

  const doubleColonIndex = ip.indexOf("::");
  const isCompressed = doubleColonIndex !== -1;

  if (isCompressed) {
    if (ip.indexOf("::", doubleColonIndex + 2) !== -1) {
      return false;
    }

    const beforeDoubleColon = ip.substring(0, doubleColonIndex);
    const afterDoubleColon = ip.substring(doubleColonIndex + 2);

    const leftGroups = beforeDoubleColon ? beforeDoubleColon.split(":") : [];
    const rightGroups = afterDoubleColon ? afterDoubleColon.split(":") : [];

    const nonEmptyLeft = leftGroups.filter((g) => g !== "");
    const nonEmptyRight = rightGroups.filter((g) => g !== "");
    const totalGroups = nonEmptyLeft.length + nonEmptyRight.length;

    if (totalGroups >= 8) {
      return false;
    }

    for (let i = 0; i < nonEmptyLeft.length; i++) {
      if (!HEX_GROUP_PATTERN.test(nonEmptyLeft[i])) {
        return false;
      }
    }
    for (let i = 0; i < nonEmptyRight.length; i++) {
      if (!HEX_GROUP_PATTERN.test(nonEmptyRight[i])) {
        return false;
      }
    }

    return true;
  } else {
    const groups = ip.split(":");
    if (groups.length !== 8) {
      return false;
    }

    for (let i = 0; i < 8; i++) {
      if (!groups[i] || !HEX_GROUP_PATTERN.test(groups[i])) {
        return false;
      }
    }

    return true;
  }
}

function createCorsHandler(origins) {
  function cors(req) {
    if (origins.length === 0) {
      return false;
    }

    return req.corsHost && (origins.includes(WILDCARD) || origins.includes(req.headers.origin));
  }

  function corsHost(req) {
    return (
      ORIGIN in req.headers && req.headers.origin.replace(/^http(s)?:\/\//, "") !== req.headers.host
    );
  }

  function corsRequest() {
    return (req, res) => res.status(204).send(EMPTY);
  }

  return { cors, corsHost, corsRequest };
}

function createIpExtractor() {
  function extract(req) {
    const connection = req.connection;
    const socket = req.socket;
    const fallbackIP =
      (connection && connection.remoteAddress) || (socket && socket.remoteAddress) || "127.0.0.1";

    const forwardedHeader = req.headers["x-forwarded-for"];
    if (!forwardedHeader || !forwardedHeader.trim()) {
      return fallbackIP;
    }

    const forwardedIPs = forwardedHeader.split(",");

    for (let i = 0; i < forwardedIPs.length; i++) {
      const ip = forwardedIPs[i].trim();
      if (isValidIP(ip)) {
        return ip;
      }
    }

    return fallbackIP;
  }

  return { extract };
}
function createFileServer(app) {
  async function serve(req, res, arg, folder = process.cwd()) {
    const fp = resolve(folder, arg);
    const resolvedFolder = resolve(folder);

    if (!fp.startsWith(resolvedFolder)) {
      app.logger.logServe(req, "Path outside allowed directory");
      res.error(INT_403);

      return;
    }

    let valid = true;
    let stats;

    app.logger.logServe(req, "Routing request to file system");

    try {
      stats = await stat(fp, { bigint: false });
    } catch {
      valid = false;
    }

    if (valid === false) {
      res.error(INT_404);
    } else if (stats.isDirectory() === false) {
      app.stream(req, res, {
        charset: app.charset,
        etag: app.etag(req.method, stats.ino, stats.size, stats.mtimeMs),
        path: fp,
        stats: stats,
      });
    } else if (req.parsed.pathname.endsWith(SLASH) === false) {
      res.redirect(`${req.parsed.pathname}/${req.parsed.search}`);
    } else {
      const files = await readdir(fp, { encoding: UTF8, withFileTypes: true });
      let result = EMPTY;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (app.indexes.includes(file.name)) {
          result = join(fp, file.name);
          break;
        }
      }

      if (result.length === INT_0) {
        if (app.autoindex === false) {
          res.error(INT_404);
        } else {
          const body = autoindex(decodeURIComponent(req.parsed.pathname), files);
          res.header("content-type", `text/html; charset=${app.charset}`);
          res.send(body);
        }
      } else {
        const rstats = await stat(result, { bigint: false });

        app.stream(req, res, {
          charset: app.charset,
          etag: app.etag(req.method, rstats.ino, rstats.size, rstats.mtimeMs),
          path: result,
          stats: rstats,
        });
      }
    }
  }

  function register(root, folder, useMiddleware) {
    useMiddleware(`${root.replace(/\/$/, EMPTY)}/(.*)?`, (req, res) =>
      serve(req, res, req.parsed.pathname.substring(1), folder),
    );
  }

  return { register, serve };
}
const CONFIG_SCHEMA = {
  autoindex: { type: "boolean", default: false },
  cacheSize: { type: "number", default: INT_1e3, min: 1 },
  cacheTTL: { type: "number", default: INT_1e4, min: 1 },
  charset: { type: "string", default: UTF_8 },
  corsExpose: { type: "string", default: EMPTY },
  defaultHeaders: { type: "object", default: {} },
  digit: { type: "number", default: INT_3, min: 1, max: 10 },
  etags: { type: "boolean", default: true },
  indexes: { type: "array", default: [INDEX_HTM, INDEX_HTML] },
  logging: { type: "object", default: {} },
  origins: { type: "array", default: [] },
  silent: { type: "boolean", default: false },
  time: { type: "boolean", default: false },
};

function validateValue(key, value, schema) {
  if (schema.type === "array") {
    if (!Array.isArray(value)) {
      return `Config "${key}" must be an array`;
    }
  } else if (schema.type === "object") {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return `Config "${key}" must be an object`;
    }
  } else if (typeof value !== schema.type) {
    return `Config "${key}" must be ${schema.type}`;
  }

  if (schema.type === "number") {
    if (schema.min !== void 0 && value < schema.min) {
      return `Config "${key}" must be >= ${schema.min}`;
    }
    if (schema.max !== void 0 && value > schema.max) {
      return `Config "${key}" must be <= ${schema.max}`;
    }
  }

  return null;
}

function validateConfig(config = {}) {
  const validated = {};
  const errors = [];

  for (const [key, schema] of Object.entries(CONFIG_SCHEMA)) {
    const value = config[key];

    if (value === void 0) {
      validated[key] = schema.default;
    } else {
      const error = validateValue(key, value, schema);
      if (error) {
        errors.push(error);
      } else {
        validated[key] = value;
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed: ${errors.join("; ")}`);
  }

  return validated;
}

function validateLogging(logging = {}) {
  const envLogEnabled = process.env.WOODLAND_LOG_ENABLED;
  const envLogFormat = process.env.WOODLAND_LOG_FORMAT;
  const envLogLevel = process.env.WOODLAND_LOG_LEVEL;

  const enabled = logging?.enabled ?? (envLogEnabled ? envLogEnabled !== "false" : true);
  const format = logging?.format ?? envLogFormat ?? LOG_FORMAT;
  const level = logging?.level ?? envLogLevel ?? INFO;

  const validLevels = [DEBUG, INFO, "warn", "error", "critical", "alert", "emerg", "notice"];
  if (!validLevels.includes(level)) {
    return { enabled, format, level: INFO };
  }

  return { enabled, format, level };
}
const LEVELS = {
  emerg: 0,
  alert: 1,
  crit: 2,
  error: 3,
  warn: 4,
  notice: 5,
  info: 6,
  debug: 7,
};

function createLogger(config = {}) {
  const { enabled = true, format, level = INFO } = config;
  const validLevels = [DEBUG, INFO, "warn", "error", "critical", "alert", "emerg", "notice"];
  const actualLevel = validLevels.includes(level) ? level : INFO;

  let logFn, clfmFn, logRouteFn, logMiddlewareFn, logDecorationFn, logErrorFn, logServeFn;

  function extractIP(req) {
    const connection = req.connection;
    const socket = req.socket;

    return (
      (connection && connection.remoteAddress) || (socket && socket.remoteAddress) || "127.0.0.1"
    );
  }

  logFn = function (msg, logLevel = DEBUG) {
    if (enabled) {
      const idx = LEVELS[logLevel];
      if (idx <= LEVELS[actualLevel]) {
        process.nextTick(() => {
          const consoleMethod = idx > 4 ? "log" : "error";
          console[consoleMethod](msg);
        });
      }
    }

    return {
      log: logFn,
      clfm: clfmFn,
      extractIP,
      logRoute: logRouteFn,
      logMiddleware: logMiddlewareFn,
      logDecoration: logDecorationFn,
      logError: logErrorFn,
      logServe: logServeFn,
    };
  };

  clfmFn = function (req, res) {
    const date = new Date();
    const month = MONTHS[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    const timezone = timeOffset(date.getTimezoneOffset());
    const dateStr = `[${day}/${month}/${year}:${hours}:${minutes}:${seconds} ${timezone}]`;

    const host = req.headers?.host ?? HYPHEN;
    const clientIP = req.ip || extractIP(req);
    const ip = clientIP;
    const logname = HYPHEN;
    const username = req?.parsed?.username ?? HYPHEN;

    const parsed = req?.parsed;
    const pathname = parsed?.pathname ?? req.url ?? HYPHEN;
    const search = parsed?.search ?? HYPHEN;
    const requestLine = `${req.method ?? HYPHEN} ${pathname}${search} HTTP/1.1`;

    const statusCode = res?.statusCode ?? 500;
    const contentLength = res?.getHeader("content-length") ?? HYPHEN;

    const referer = req.headers?.referer ?? HYPHEN;
    const userAgent = req.headers?.["user-agent"] ?? HYPHEN;

    let logEntry = format;

    logEntry = logEntry
      .replace("%v", host)
      .replace("%h", ip)
      .replace("%l", logname)
      .replace("%u", username)
      .replace("%t", dateStr)
      .replace("%r", requestLine)
      .replace("%>s", String(statusCode))
      .replace("%b", contentLength)
      .replace("%{Referer}i", referer)
      .replace("%{User-agent}i", userAgent);

    return logEntry;
  };

  logRouteFn = function (uri, method, ip) {
    return logFn(`type=route, uri=${uri}, method=${method}, ip=${ip}, message="Routing request"`);
  };

  logMiddlewareFn = function (route, method) {
    return logFn(`type=use, route=${route}, method=${method}, message="Registering middleware"`);
  };

  logDecorationFn = function (uri, method, ip) {
    return logFn(
      `type=decorate, uri=${uri}, method=${method}, ip=${ip}, message="Decorated request from ${ip}"`,
    );
  };

  logErrorFn = function (uri, method, ip) {
    return logFn(
      `type=error, uri=${uri}, method=${method}, ip=${ip}, message="Handled error response for ${ip}"`,
      ERROR,
    );
  };

  logServeFn = function (req, message) {
    return logFn(
      `type=serve, uri=${req.parsed.pathname}, method=${req.method}, ip=${req.ip}, message="${message}"`,
      ERROR,
    );
  };

  return {
    log: logFn,
    clfm: clfmFn,
    extractIP,
    logRoute: logRouteFn,
    logMiddleware: logMiddlewareFn,
    logDecoration: logDecorationFn,
    logError: logErrorFn,
    logServe: logServeFn,
  };
}
class Woodland extends EventEmitter {
  constructor(config = {}) {
    super();

    const validated = validateConfig(config);
    const {
      autoindex,
      cacheSize,
      cacheTTL,
      charset,
      corsExpose,
      defaultHeaders,
      digit,
      etags,
      indexes,
      logging,
      origins,
      silent,
      time,
    } = validated;

    const finalHeaders = { ...defaultHeaders };
    if (silent === false) {
      if (SERVER in finalHeaders === false) {
        finalHeaders[SERVER] = SERVER_VALUE;
      }
      finalHeaders[X_POWERED_BY] = X_POWERED_BY_VALUE;
    }

    this.autoindex = autoindex;
    this.charset = charset;
    this.corsExpose = corsExpose;
    this.defaultHeaders = Reflect.ownKeys(finalHeaders).map((key) => [
      key.toLowerCase(),
      finalHeaders[key],
    ]);
    this.digit = digit;
    this.etags = etags ? etag({ cacheSize, cacheTTL }) : null;
    this.indexes = [...indexes];
    this.logging = validateLogging(logging);
    this.origins = [...origins];
    this.time = time;

    this.cache = new Map();
    this.permissions = new Map();
    this.ignored = new Set();
    this.middleware = new Map();
    this.methods = [];

    const { log, clfm, extractIP, logRoute, logMiddleware, logDecoration, logError, logServe } =
      createLogger({
        enabled: this.logging.enabled,
        format: this.logging.format,
        level: this.logging.level,
      });
    this.logger = {
      log,
      clfm,
      extractIP,
      logRoute,
      logMiddleware,
      logDecoration,
      logError,
      logServe,
    };

    const { cors, corsHost, corsRequest } = createCorsHandler(this.origins);
    this.cors = cors;
    this.corsHost = corsHost;
    this.corsRequest = corsRequest;

    const { extract } = createIpExtractor();
    this.ip = extract;

    this.initResponseHandlers();
    this.initFileServer();
    this.initMiddleware();

    if (this.etags !== null) {
      this.get(this.etags.middleware).ignore(this.etags.middleware);
    }

    if (this.origins.length > INT_0) {
      const fnCorsRequest = this.corsRequest();
      this.options(fnCorsRequest).ignore(fnCorsRequest);
    }

    this.on(ERROR, () => {});
  }

  initResponseHandlers() {
    const onReady = this.onReady.bind(this);
    const onDone = this.onDone.bind(this);
    const onSend = this.onSend.bind(this);

    const {
      createErrorHandler,
      createJsonHandler,
      createRedirectHandler,
      createSendHandler,
      createSetHandler,
      createStatusHandler,
      stream,
    } = createResponseHandler({
      digit: this.digit,
      etags: this.etags,
      onReady,
      onDone,
      onSend,
    });

    this.responseHandler = {
      createErrorHandler,
      createJsonHandler,
      createRedirectHandler,
      createSendHandler,
      createSetHandler,
      createStatusHandler,
      stream,
    };

    this.error = createErrorHandler(
      (req, res, err) => this.emit(ERROR, req, res, err),
      (req, _status) => this.logger.logError(req.parsed.pathname, req.method, req.ip),
    );
    this.json = createJsonHandler;
    this.redirect = createRedirectHandler;
    this.send = createSendHandler;
    this.set = createSetHandler;
    this.status = createStatusHandler;
  }

  initFileServer() {
    this.fileServer = createFileServer(this);
  }

  initMiddleware() {
    this.middlewareRegistry = createMiddlewareRegistry(
      this.middleware,
      this.ignored,
      this.methods,
      this.cache,
    );
  }

  allowed(method, uri, override = false) {
    return this.middlewareRegistry.allowed(method, uri, override);
  }

  allows(uri, override = false) {
    let result = override === false ? this.permissions.get(uri) : void 0;

    if (override || result === void 0) {
      const allMethods = this.middlewareRegistry.routes(uri, WILDCARD, override).visible > INT_0;
      let list;

      if (allMethods) {
        list = [...METHODS];
      } else {
        const methodSet = new Set();

        for (let i = 0; i < this.methods.length; i++) {
          const method = this.methods[i];
          if (this.allowed(method, uri, override)) {
            methodSet.add(method);
          }
        }

        list = Array.from(methodSet);
      }

      const methodSet = new Set(list);

      if (methodSet.has(GET) && !methodSet.has(HEAD)) {
        list.push(HEAD);
      }

      if (list.length > INT_0 && !methodSet.has(OPTIONS)) {
        list.push(OPTIONS);
      }

      result = list.sort().join(", ");
      this.permissions.set(uri, result);
      this.logger.log(
        `type=allows, uri=${uri}, override=${override}, message="Determined 'allow' header header value"`,
      );
    }

    return result;
  }

  always(...args) {
    return this.use(...args, WILDCARD);
  }

  connect(...args) {
    return this.use(...args, CONNECT);
  }

  clf(req, res) {
    return this.logger.clfm(req, res);
  }

  decorate(req, res) {
    let timing = null;
    if (this.time) {
      timing = precise().start();
    }

    const parsed = parse(req);
    const pathname = parsed.pathname;
    const allowString = this.allows(pathname);

    req.parsed = parsed;
    req.allow = allowString;
    req.body = EMPTY;
    req.host = parsed.hostname;
    req.params = {};
    req.valid = true;

    if (timing) {
      req.precise = timing;
    }

    req.corsHost = this.corsHost(req);
    req.cors = this.cors(req);

    const clientIP = this.ip(req);
    req.ip = clientIP;

    res.locals = {};
    res.error = this.error(req, res);
    res.header = res.setHeader;
    res.json = this.json(res);
    res.redirect = this.redirect(res);
    res.send = this.send(req, res);
    res.set = this.set(res);
    res.status = this.status(res);

    const headersBatch = Object.create(null);
    headersBatch[ALLOW] = allowString;
    headersBatch[X_CONTENT_TYPE_OPTIONS] = NO_SNIFF;

    for (let i = 0; i < this.defaultHeaders.length; i++) {
      const [key, value] = this.defaultHeaders[i];
      headersBatch[key] = value;
    }

    if (req.cors) {
      const corsHeaders = req.headers[ACCESS_CONTROL_REQUEST_HEADERS] ?? this.corsExpose;
      const origin = req.headers.origin;

      headersBatch[ACCESS_CONTROL_ALLOW_ORIGIN] = origin;
      headersBatch[TIMING_ALLOW_ORIGIN] = origin;
      headersBatch[ACCESS_CONTROL_ALLOW_CREDENTIALS] = TRUE;
      headersBatch[ACCESS_CONTROL_ALLOW_METHODS] = allowString;

      if (corsHeaders !== void 0) {
        headersBatch[
          req.method === OPTIONS ? ACCESS_CONTROL_ALLOW_HEADERS : ACCESS_CONTROL_EXPOSE_HEADERS
        ] = corsHeaders;
      }
    }

    res.set(headersBatch);

    this.log(
      `type=decorate, uri=${pathname}, method=${req.method}, ip=${clientIP}, message="Decorated request from ${clientIP}"`,
    );
    res.on(CLOSE, () => this.log(this.clf(req, res), INFO));
  }

  delete(...args) {
    return this.use(...args, DELETE);
  }

  etag(method, ...args) {
    return (method === GET || method === HEAD || method === OPTIONS) && this.etags !== null
      ? this.etags.create(
          args
            .map((i) => (typeof i !== STRING ? JSON.stringify(i).replace(/^"|"$/g, EMPTY) : i))
            .join("-"),
        )
      : EMPTY;
  }

  files(root = SLASH, folder = process.cwd()) {
    this.fileServer.register(root, folder, this.use.bind(this));
  }

  get(...args) {
    return this.use(...args, GET);
  }

  ignore(fn) {
    this.ignored.add(fn);
    this.logger.log(`type=ignore, message="Added function to ignored Set", name="${fn.name}"`);

    return this;
  }

  list(method = GET.toLowerCase(), type = "array") {
    let result;

    if (type === "array") {
      result = Array.from(this.middleware.get(method.toUpperCase()).keys());
    } else if (type === "object") {
      result = {};

      for (const [key, value] of this.middleware.get(method.toUpperCase()).entries()) {
        result[key] = value;
      }
    }

    this.logger.log(`type=list, method=${method}, type=${type}`);

    return result;
  }

  log(msg, level = DEBUG) {
    this.logger.log(msg, level);

    return this;
  }

  onDone(req, res, body, headers) {
    if (
      res.statusCode !== INT_204 &&
      res.statusCode !== INT_304 &&
      res.getHeader(CONTENT_LENGTH) === void 0
    ) {
      res.header(CONTENT_LENGTH, Buffer.byteLength(body));
    }

    writeHead(res, headers);
    res.end(body, this.charset);
  }

  onReady(req, res, body, status, headers) {
    if (this.time && res.getHeader(X_RESPONSE_TIME) === void 0) {
      const diff = req.precise.stop().diff();
      const msValue = Number(diff / 1e6).toFixed(this.digit);
      res.header(X_RESPONSE_TIME, `${msValue} ms`);
    }

    return this.onSend(req, res, body, status, headers);
  }

  onSend(req, res, body, status, headers) {
    return [body, status, headers];
  }

  options(...args) {
    return this.use(...args, OPTIONS);
  }

  patch(...args) {
    return this.use(...args, PATCH);
  }

  extractPath(arg = EMPTY) {
    return arg.replace(/\/:([^/]+)/g, "/(?<$1>[^/]+)");
  }

  post(...args) {
    return this.use(...args, POST);
  }

  put(...args) {
    return this.use(...args, PUT);
  }

  route(req, res) {
    const method = req.method === HEAD ? GET : req.method;

    this.decorate(req, res);

    if (this.listenerCount("connect") > INT_0) {
      this.emit("connect", req, res);
    }

    if (this.listenerCount(FINISH) > INT_0) {
      res.on(FINISH, () => this.emit(FINISH, req, res));
    }

    this.logger.logRoute(req.parsed.pathname, req.method, req.ip);

    const hasOriginHeader = ORIGIN in req.headers;
    const isOriginAllowed = hasOriginHeader && this.origins.includes(req.headers.origin);

    if (req.cors === false && hasOriginHeader && req.corsHost && !isOriginAllowed) {
      req.valid = false;
      res.error(INT_403);
    } else if (req.allow.includes(method)) {
      const result = this.middlewareRegistry.routes(req.parsed.pathname, method);

      if (result.params) {
        params(req, result.getParams);
      }

      const exitMiddleware = result.middleware.slice(result.exit)[Symbol.iterator]();
      req.exit = next(req, res, exitMiddleware, true);
      next(req, res, result.middleware[Symbol.iterator]())();
    } else {
      req.valid = false;
      res.error(getStatus(req, res));
    }
  }

  routes(uri, method, override = false) {
    return this.middlewareRegistry.routes(uri, method, override);
  }

  async serve(req, res, arg, folder = process.cwd()) {
    return this.fileServer.serve(req, res, arg, folder);
  }

  stream(
    req,
    res,
    file = {
      charset: EMPTY,
      etag: EMPTY,
      path: EMPTY,
      stats: { mtime: new Date(), size: INT_0 },
    },
  ) {
    if (file.path === EMPTY || file.stats.size === INT_0) {
      throw new TypeError("Invalid file descriptor");
    }

    res.header(CONTENT_LENGTH, file.stats.size);
    res.header(
      CONTENT_TYPE,
      file.charset.length > INT_0
        ? `${mime$1(file.path)}; charset=${file.charset}`
        : mime$1(file.path),
    );
    res.header(LAST_MODIFIED, file.stats.mtime.toUTCString());

    if (this.etags && file.etag.length > INT_0) {
      res.header(ETAG, file.etag);
      res.removeHeader(CACHE_CONTROL);
    }

    if (req.method === "GET") {
      let status = INT_200;
      let options = {};
      let headers = {};

      if (RANGE in req.headers) {
        [headers, options] = partialHeaders(req, res, file.stats.size);

        if (Object.keys(options).length > INT_0) {
          res.removeHeader(CONTENT_LENGTH);
          res.header(CONTENT_RANGE, headers[CONTENT_RANGE]);

          if (CONTENT_LENGTH in headers) {
            res.header(CONTENT_LENGTH, headers[CONTENT_LENGTH]);
          }
        } else {
          options = {};
        }
      }

      res.send(
        createReadStream(file.path, Object.keys(options).length > INT_0 ? options : undefined),
        status,
      );
    } else if (req.method === HEAD) {
      res.send(EMPTY);
    } else if (req.method === OPTIONS) {
      res.removeHeader(CONTENT_LENGTH);
      res.send(OPTIONS_BODY);
    }

    this.emit(STREAM, req, res);
  }

  trace(...args) {
    return this.use(...args, TRACE);
  }

  use(rpath, ...fn) {
    if (typeof rpath === "function") {
      fn = [rpath, ...fn];
      rpath = `/.${WILDCARD}`;
    }

    const method = typeof fn[fn.length - 1] === STRING ? fn.pop().toUpperCase() : GET;

    if (method !== WILDCARD && METHODS.includes(method) === false) {
      throw new TypeError("Invalid HTTP method");
    }

    if (method === HEAD) {
      throw new TypeError("Cannot set HEAD route, use GET");
    }

    if (this.middleware.has(method) === false) {
      if (method !== WILDCARD) {
        this.methods.push(method);
      }

      this.middleware.set(method, new Map());
    }

    const mmethod = this.middleware.get(method);
    let lrpath = rpath,
      lparams = false;

    if (lrpath.includes(`${SLASH}:`) && lrpath.includes("(") === false) {
      lparams = true;
      lrpath = this.extractPath(lrpath);
    }

    const current = mmethod.get(lrpath) ?? { handlers: [] };

    current.handlers.push(...fn);
    mmethod.set(lrpath, {
      handlers: current.handlers,
      params: lparams,
      regex: new RegExp(`^${lrpath}$`),
    });

    this.logger.logMiddleware(rpath, method);

    return this;
  }
}

function woodland(arg) {
  const app = new Woodland(arg);

  app.route = app.route.bind(app);

  return app;
}
export { Woodland, woodland };
