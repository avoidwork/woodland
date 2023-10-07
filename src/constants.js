import deepFreeze from "deep-freeze";

export const ALL = "*";
export const DELIMITER = "|";
export const LEVELS = deepFreeze({
	emerg: 0,
	alert: 1,
	crit: 2,
	error: 3,
	warn: 4,
	notice: 5,
	info: 6,
	debug: 7
});

export const EN_US = "en-US";
export const SHORT = "short";
export const MONTHS = deepFreeze(Array.from(Array(12).values()).map((i, idx) => {
	const d = new Date();
	d.setMonth(idx);

	return d.toLocaleString(EN_US, {month: SHORT});
}));
export const UTF8 = "utf8";
export const EXTENSIONS = "extensions";
export const EMPTY = "";
export const GET = "GET";
export const APPLICATION_JSON = "application/json";
export const APPLICATION_OCTET_STREAM = "application/octet-stream";
export const TIME_MS = "%N ms";
export const TOKEN_N = "%N";
export const STRING_0 = "0";
export const STRING_00 = "00";
export const STRING_30 = "30";
export const SLASH = "/";
export const STRING = "string";
export const KEY_BYTES = "bytes=";
export const COMMA = ",";
export const HYPHEN = "-";
export const PERIOD = ".";
export const START = "start";
export const END = "end";
export const CONTENT_DISPOSITION = "content-disposition";
export const CACHE_CONTROL = "cache-control";
export const CONTENT_RANGE = "content-range";
export const CONTENT_LENGTH = "content-length";
export const CONTENT_TYPE = "content-type";
export const LAST_MODIFIED = "last-modified";
export const IF_NONE_MATCH = "if-none-match";
export const IF_MODIFIED_SINCE = "if-modified-since";
export const RANGE = "range";
export const ETAG = "etag";
export const HEAD = "HEAD";
export const FUNCTION = "function";
export const OPTIONS = "OPTIONS";
export const OPTIONS_BODY = "Make a GET request to retrieve the file";
