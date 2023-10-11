import {createRequire} from "node:module";
import {join} from "node:path";
import {fileURLToPath, URL} from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const require = createRequire(import.meta.url);
const {name, version} = require(join(__dirname, "..", "package.json"));

export const ACCESS_CONTROL_ALLOW_CREDENTIALS = "access-control-allow-credentials";
export const ACCESS_CONTROL_ALLOW_HEADERS = "access-control-allow-headers";
export const ACCESS_CONTROL_ALLOW_METHODS = "access-control-allow-methods";
export const ACCESS_CONTROL_ALLOW_ORIGIN = "access-control-allow-origin";
export const ACCESS_CONTROL_EXPOSE_HEADERS = "access-control-expose-headers";
export const ACCESS_CONTROL_REQUEST_HEADERS = "access-control-request-headers";
export const ALLOW = "allow";
export const APPLICATION_JSON = "application/json";
export const APPLICATION_OCTET_STREAM = "application/octet-stream";
export const ARRAY = "array";
export const CACHE_CONTROL = "cache-control";
export const COLON = ":";
export const COMMA = ",";
export const COMMA_SPACE = ", ";
export const CONNECT = "CONNECT";
export const CONTENT_LENGTH = "content-length";
export const CONTENT_RANGE = "content-range";
export const CONTENT_TYPE = "content-type";
export const DEBUG = "debug";
export const DELETE = "DELETE";
export const DELIMITER = "|";
export const EMPTY = "";
export const EN_US = "en-US";
export const END = "end";
export const ETAG = "etag";
export const ERROR = "error";
export const EXTENSIONS = "extensions";
export const FILES = "files";
export const FINISH = "finish";
export const FUNCTION = "function";
export const GET = "GET";
export const HEAD = "HEAD";
export const HYPHEN = "-";
export const IF_NONE_MATCH = "if-none-match";
export const IF_MODIFIED_SINCE = "if-modified-since";
export const INDEX_HTM = "index.htm";
export const INDEX_HTML = "index.html";
export const INFO = "info";
export const IP_TOKEN = "%IP";
export const KEY_BYTES = "bytes=";
export const LAST_MODIFIED = "last-modified";
export const LEFT_PAREN = "(";
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
export const LOCATION = "location";
export const LOG = "log";
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
export const SHORT = "short";
export const MONTHS = Object.freeze(Array.from(Array(12).values()).map((i, idx) => {
	const d = new Date();
	d.setMonth(idx);

	return Object.freeze(d.toLocaleString(EN_US, {month: SHORT}));
}));
export const MSG_DETERMINED_ALLOW = "Determined 'allow' header value";
export const MSG_ERROR_HEAD_ROUTE = "Cannot set HEAD route, use GET";
export const MSG_ERROR_INVALID_METHOD = "Invalid HTTP method";
export const MSG_SENDING_BODY = "Sending response body";
export const MSG_DECORATED_IP = "Decorated request from %IP";
export const MSG_ERROR_IP = "Handled error response for %IP";
export const MSG_IGNORED_FN = "Added function to ignored Set";
export const MSG_ROUTING = "Routing request";
export const MSG_ROUTING_FILE = "Routing request to file system";
export const MSG_RETRIEVED_MIDDLEWARE = "Retrieved middleware for request";
export const MSG_REGISTERING_MIDDLEWARE = "Registering middleware";
export const MSG_HEADERS_SENT = "Headers already sent";
export const OBJECT = "object";
export const OPTIONS = "OPTIONS";
export const OPTIONS_BODY = "Make a GET request to retrieve the file";
export const ORIGIN = "origin";
export const PARAMS_GROUP = "/([^/]+)";
export const PATCH = "PATCH";
export const PERIOD = ".";
export const POST = "POST";
export const PUT = "PUT";
export const RANGE = "range";
export const READ_HEADERS = "GET, HEAD, OPTIONS";
export const SERVER = "server";
export const SERVER_VALUE = `${name}/${version}`;
export const SLASH = "/";
export const START = "start";
export const STRING = "string";
export const STRING_0 = "0";
export const STRING_00 = "00";
export const STRING_30 = "30";
export const TIME_MS = "%N ms";
export const TIMING_ALLOW_ORIGIN = "timing-allow-origin";
export const TITLE = "title";
export const TO_STRING = "toString";
export const TOKEN_N = "%N";
export const TRACE = "TRACE";
export const TRUE = "true";
export const USER_AGENT = "user-agent";
export const UTF8 = "utf8";
export const UTF_8 = "utf-8";
export const WILDCARD = "*";
export const X_FORWARDED_FOR = "x-forwarded-for";
export const X_POWERED_BY = "x-powered-by";
export const X_POWERED_BY_VALUE = `nodejs/${process.version}, ${process.platform}/${process.arch}`;
export const X_RESPONSE_TIME = "x-response-time";
