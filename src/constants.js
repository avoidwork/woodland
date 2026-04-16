import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath, URL } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const require = createRequire(import.meta.url);
const { name, version } = require(join(__dirname, "..", "package.json"));

// =============================================================================
// HTTP METHODS
// =============================================================================
export const CONNECT = "CONNECT";
export const DELETE = "DELETE";
export const GET = "GET";
export const HEAD = "HEAD";
export const OPTIONS = "OPTIONS";
export const PATCH = "PATCH";
export const POST = "POST";
export const PUT = "PUT";
export const TRACE = "TRACE";
export const NODE_METHODS = [CONNECT, DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT, TRACE];

// =============================================================================
// HTTP STATUS CODES
// =============================================================================
export const INT_200 = 200;
export const INT_204 = 204;
export const INT_206 = 206;
export const INT_304 = 304;
export const INT_307 = 307;
export const INT_308 = 308;
export const INT_400 = 400;
export const INT_403 = 403;
export const INT_404 = 404;
export const INT_405 = 405;
export const INT_416 = 416;
export const INT_500 = 500;

// =============================================================================
// HTTP HEADERS
// =============================================================================
export const ACCESS_CONTROL_ALLOW_CREDENTIALS = "access-control-allow-credentials";
export const ACCESS_CONTROL_ALLOW_HEADERS = "access-control-allow-headers";
export const ACCESS_CONTROL_ALLOW_METHODS = "access-control-allow-methods";
export const ACCESS_CONTROL_ALLOW_ORIGIN = "access-control-allow-origin";
export const ACCESS_CONTROL_EXPOSE_HEADERS = "access-control-expose-headers";
export const ACCESS_CONTROL_REQUEST_HEADERS = "access-control-request-headers";
export const ALLOW = "allow";
export const CACHE_CONTROL = "cache-control";
export const CONTENT_LENGTH = "content-length";
export const CONTENT_RANGE = "content-range";
export const CONTENT_TYPE = "content-type";
export const ETAG = "etag";
export const LAST_MODIFIED = "last-modified";
export const LOCATION = "location";
export const NO_SNIFF = "nosniff";
export const ORIGIN = "origin";
export const RANGE = "range";
export const REFERER = "referer";
export const SERVER = "server";
export const TIMING_ALLOW_ORIGIN = "timing-allow-origin";
export const USER_AGENT = "user-agent";
export const X_CONTENT_TYPE_OPTIONS = "x-content-type-options";
export const X_FORWARDED_FOR = "x-forwarded-for";
export const X_POWERED_BY = "x-powered-by";
export const X_RESPONSE_TIME = "x-response-time";

// =============================================================================
// CONTENT TYPES & MEDIA
// =============================================================================
export const APPLICATION_JSON = "application/json";
export const APPLICATION_OCTET_STREAM = "application/octet-stream";
export const TEXT_PLAIN = "text/plain";
export const TEXT_HTML = "text/html";
export const CHAR_SET = "charset=utf-8";
export const UTF8 = "utf8";
export const UTF_8 = "utf-8";

// =============================================================================
// NUMERIC CONSTANTS
// =============================================================================
export const INT_0 = 0;
export const INT_1 = 1;
export const INT_2 = 2;
export const INT_3 = 3;
export const INT_4 = 4;
export const INT_5 = 5;
export const INT_8 = 8;
export const INT_10 = 10;
export const INT_60 = 60;
export const INT_255 = 255;
export const INT_1e3 = 1e3;
export const INT_1e4 = 1e4;
export const INT_1e6 = 1e6;
export const INT_8000 = 8000;
export const INT_65535 = 65535;
export const INT_NEG_1 = -1;

// =============================================================================
// STRING & CHARACTER CONSTANTS
// =============================================================================
export const COMMA_SPACE = ", ";
export const COMMA = ",";
export const COLON = ":";
export const DELIMITER = "|";
export const DOUBLE_COLON = "::";
export const EMPTY = "";
export const EQUAL = "=";
export const HYPHEN = "-";
export const LEFT_PAREN = "(";
export const PERCENT = "%";
export const PERIOD = ".";
export const SLASH = "/";
export const STRING_0 = "0";
export const WILDCARD = "*";
export const WOODLAND = "woodland";

// =============================================================================
// DATA TYPES
// =============================================================================
export const ARRAY = "array";
export const BOOLEAN = "boolean";
export const FUNCTION = "function";
export const NUMBER = "number";
export const OBJECT = "object";
export const STRING = "string";
export const TYPE = "type";
export const ERROR_HANDLER_LENGTH = 4;

// =============================================================================
// SERVER & SYSTEM INFO
// =============================================================================
export const SERVER_VALUE = `${name}/${version}`;
export const X_POWERED_BY_VALUE = `nodejs/${process.version}, ${process.platform}/${process.arch}`;
export const LOCALHOST = "127.0.0.1";
export const HTTP_PREFIX = "http://";

// =============================================================================
// FILE SYSTEM & ROUTING
// =============================================================================
export const INDEX_HTM = "index.htm";
export const INDEX_HTML = "index.html";
export const FILES = "files";
export const EXTENSIONS = "extensions";
export const PARAMS_GROUP = "/(?<$1>[^/]+)";
export const PARENT_DIR = "..";
export const CURRENT_DIR = ".";
export const BACKSLASH = "\\";
export const DOUBLE_SLASH = "//";
export const SLASH_BACKSLASH = "/\\";
export const NEWLINE = "\n";
export const ROUTE_PATTERN = "(/.*)?";
export const MSG_USE_MIDDLEWARE_REQUIRED =
	"useMiddleware is required or config.use must be a function";
export const EXTRACT_PATH_REPLACE = "(?<$1>[^/]+)";
export const TPL_DIR = "tpl";
export const INDEX_HTML_FILE = "index.html";

// =============================================================================
// LOGGING & DEBUGGING
// =============================================================================
export const DEBUG = "debug";
export const ERROR = "error";
export const INFO = "info";

export const LEVELS = Object.freeze({
	emerg: 0,
	alert: 1,
	crit: 2,
	error: 3,
	warn: 4,
	notice: 5,
	info: 6,
	debug: 7,
});

// Log format tokens
export const LOG_B = "%b";
export const LOG_FORMAT = '%h %l %u %t "%r" %>s %b';
export const LOG_H = "%h";
export const LOG_L = "%l";
export const LOG_R = "%r";
export const LOG_REFERRER = "%{Referer}i";
export const LOG_S = "%>s";
export const LOG_T = "%t";
export const LOG_U = "%u";
export const LOG_USER_AGENT = "%{User-agent}i";
export const LOG_V = "%v";

// =============================================================================
// MESSAGES & RESPONSES
// =============================================================================
export const MSG_CONFIG_FIELD = "Config ";
export const MSG_INVALID_IP = "Invalid IP: must be a valid IPv4 and IPv6 address.";
export const MSG_INVALID_PORT = "Invalid port: must be an integer between 0 and 65535.";
export const MSG_INVALID_REDIRECT_URI = "Invalid redirect URI";
export const MSG_INVALID_FILE_DESCRIPTOR = "Invalid file descriptor";
export const MSG_INVALID_HTTP_METHOD = "Invalid HTTP method";
export const MSG_CANNOT_SET_HEAD_ROUTE = "Cannot set HEAD route, use GET";
export const MSG_REDOS_VULNERABILITY = "Invalid route pattern: potential ReDoS vulnerability";
export const MSG_PATH_TRAVERSAL_BLOCKED = "Path outside allowed directory";
export const MSG_FILE_NOT_FOUND = "File not found";
export const MSG_REDIRECT_TRAILING_SLASH = "Redirect to add trailing slash";
export const MSG_ROUTING = "Routing request";
export const MSG_ROUTING_FILE = "Routing request to file system";
export const MSG_SERVE_PATH_OUTSIDE = "Path outside allowed directory";
export const MSG_VALIDATION_FAILED = "Configuration validation failed: ";
export const MSG_MUST_BE_TYPE = "is not of a type(s)";
export const MSG_MUST_BE_GREATER_THAN = "must be greater than or equal to";
export const MSG_MUST_BE_LESS_THAN = "must be less than or equal to";
export const SEMICOLON_SPACE = "; ";
export const OPTIONS_BODY = "Make a GET request to retrieve the file";

// =============================================================================
// HTTP RANGE & CACHING
// =============================================================================
export const KEY_BYTES = "bytes=";
export const NO_CACHE = "no-cache";
export const BYTES_SPACE = "bytes ";

// =============================================================================
// EVENT & STREAM CONSTANTS
// =============================================================================
export const EVT_CLOSE = "close";
export const EVT_FINISH = "finish";
export const EVT_STREAM = "stream";
export const EVT_CONNECT = "connect";
export const EVT_ERROR = "error";

// =============================================================================
// UTILITY & MISC
// =============================================================================
export const CONSOLE_ERROR = "error";
export const CONSOLE_LOG = "log";
export const COLLECTION = "collection";
export const CRITICAL = "critical";
export const EMERG = "emerg";
export const EN_US = "en-US";
export const FALSE = "false";
export const HTTP_VERSION = "HTTP/1.1";
export const ITEM = "item";
export const NOTICE = "notice";
export const SHORT = "short";
export const TIME_MS = "%N ms";
export const TITLE = "title";
export const TO_STRING = "toString";
export const TOKEN_FILES = "FILES";
export const TOKEN_N = "%N";
export const TOKEN_TITLE = "TITLE";
export const TRUE = "true";
export const WARN = "warn";
export const ALERT = "alert";
export const EVT_LISTENING = "listening";

export const MONTHS = Object.freeze(
	Array.from({ length: 12 }, (_, idx) => {
		const d = new Date();
		d.setMonth(idx);

		return Object.freeze(d.toLocaleString(EN_US, { month: SHORT }));
	}),
);

export const VALID_LOG_LEVELS = new Set([DEBUG, INFO, WARN, ERROR, CRITICAL, ALERT, EMERG, NOTICE]);

// =============================================================================
// REGULAR EXPRESSION PATTERNS
// =============================================================================
export const HTTP_PROTOCOL_PATTERN = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;
export const CONTROL_CHAR_PATTERN = /[\r\n\t]/;
export const QUANTIFIER_PATTERN = /([.*+?^${}()|[\\]])\1{3,}/;
export const IPV4_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
export const IPV6_CHAR_PATTERN = /^[0-9a-fA-F:.]+$/;
export const IPV4_MAPPED_PATTERN = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i;
export const HEX_GROUP_PATTERN = /^[0-9a-fA-F]{1,4}$/;

// =============================================================================
// HTML ESCAPE MAPPING
// =============================================================================
export const HTML_ESCAPES = Object.freeze({
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&#39;",
});
