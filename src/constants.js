import {createRequire} from "node:module";
import {join} from "node:path";
import {fileURLToPath, URL} from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const require = createRequire(import.meta.url);
const {name, version} = require(join(__dirname, "..", "package.json"));

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
export const ORIGIN = "origin";
export const RANGE = "range";
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
export const CHAR_SET = "charset=utf-8";
export const UTF8 = "utf8";
export const UTF_8 = "utf-8";

// =============================================================================
// SERVER & SYSTEM INFO
// =============================================================================
export const SERVER_VALUE = `${name}/${version}`;
export const X_POWERED_BY_VALUE = `nodejs/${process.version}, ${process.platform}/${process.arch}`;
export const LOCALHOST = "127.0.0.1";
export const INT_8000 = 8000;

// =============================================================================
// FILE SYSTEM & ROUTING
// =============================================================================
export const INDEX_HTM = "index.htm";
export const INDEX_HTML = "index.html";
export const FILES = "files";
export const EXTENSIONS = "extensions";
export const PARAMS_GROUP = "/(?<$1>[^/]+)";

// =============================================================================
// NUMERIC CONSTANTS
// =============================================================================
export const INT_0 = 0;
export const INT_2 = 2;
export const INT_3 = 3;
export const INT_4 = 4;
export const INT_10 = 10;
export const INT_60 = 60;
export const INT_1e3 = 1e3;
export const INT_1e4 = 1e4;
export const INT_1e6 = 1e6;

// =============================================================================
// STRING & CHARACTER CONSTANTS
// =============================================================================
export const COLON = ":";
export const COMMA = ",";
export const COMMA_SPACE = ", ";
export const DELIMITER = "|";
export const EMPTY = "";
export const EQUAL = "=";
export const HYPHEN = "-";
export const LEFT_PAREN = "(";
export const PERIOD = ".";
export const SLASH = "/";
export const STRING_0 = "0";
export const STRING_00 = "00";
export const STRING_30 = "30";
export const WILDCARD = "*";

// =============================================================================
// DATA TYPES
// =============================================================================
export const ARRAY = "array";
export const FUNCTION = "function";
export const OBJECT = "object";
export const STRING = "string";

// =============================================================================
// LOGGING & DEBUGGING
// =============================================================================
export const DEBUG = "debug";
export const ERROR = "error";
export const INFO = "info";
export const LOG = "log";

export const LEVELS = Object.freeze({
	emerg: 0,
	alert: 1,
	crit: 2,
	error: 3,
	warn: 4,
	notice: 5,
	info: 6,
	debug: 7
});

// Log format tokens
export const LOG_B = "%b";
export const LOG_FORMAT = "%h %l %u %t \"%r\" %>s %b";
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
export const MSG_DECORATED_IP = "Decorated request from %IP";
export const MSG_DETERMINED_ALLOW = "Determined 'allow' header value";
export const MSG_ERROR_HEAD_ROUTE = "Cannot set HEAD route, use GET";
export const MSG_ERROR_INVALID_METHOD = "Invalid HTTP method";
export const MSG_ERROR_IP = "Handled error response for %IP";
export const MSG_IGNORED_FN = "Added function to ignored Set";
export const MSG_REGISTERING_MIDDLEWARE = "Registering middleware";
export const MSG_RETRIEVED_MIDDLEWARE = "Retrieved middleware for request";
export const MSG_ROUTING = "Routing request";
export const MSG_ROUTING_FILE = "Routing request to file system";
export const MSG_SENDING_BODY = "Sending response body";

export const OPTIONS_BODY = "Make a GET request to retrieve the file";

// =============================================================================
// HTTP RANGE & CACHING
// =============================================================================
export const KEY_BYTES = "bytes=";
export const NO_CACHE = "no-cache";

// =============================================================================
// EVENT & STREAM CONSTANTS
// =============================================================================
export const CLOSE = "close";
export const END = "end";
export const FINISH = "finish";
export const START = "start";
export const STREAM = "stream";

// =============================================================================
// UTILITY & MISC
// =============================================================================
export const EN_US = "en-US";
export const IP_TOKEN = "%IP";
export const SHORT = "short";
export const TIME_MS = "%N ms";
export const TITLE = "title";
export const TOKEN_N = "%N";
export const TO_STRING = "toString";
export const TRUE = "true";

export const MONTHS = Object.freeze(Array.from(Array(12).values()).map((i, idx) => {
	const d = new Date();
	d.setMonth(idx);

	return Object.freeze(d.toLocaleString(EN_US, {month: SHORT}));
}));
