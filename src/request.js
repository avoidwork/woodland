import {
	COLON,
	COMMA,
	DOUBLE_COLON,
	EMPTY,
	EXTRACT_PATH_REPLACE,
	HEX_GROUP_PATTERN,
	HTTP_PREFIX,
	INT_0,
	INT_1,
	INT_10,
	INT_2,
	INT_204,
	INT_255,
	INT_5,
	INT_8,
	INT_8000,
	IPV4_MAPPED_PATTERN,
	IPV4_PATTERN,
	IPV6_CHAR_PATTERN,
	LOCALHOST,
	ORIGIN,
	PERCENT,
	SLASH,
	STRING,
	WILDCARD,
	X_FORWARDED_FOR,
} from "./constants.js";
import { escapeHtml } from "./response.js";
import { coerce } from "tiny-coerce";

/**
 * Checks if request origin is allowed for CORS
 * @param {Object} req - Request object
 * @param {Set} origins - Set of allowed origins
 * @returns {boolean} True if CORS is allowed
 */
export function cors(req, origins) {
	if (origins.size === 0) {
		return false;
	}

	const origin = req.headers.origin;
	const corsWildcard = origins.has(WILDCARD);
	return req.corsHost && (corsWildcard || origins.has(origin));
}

/**
 * Checks if request origin host differs from request host
 * @param {Object} req - Request object
 * @returns {boolean} True if hosts differ
 */
export function corsHost(req) {
	return (
		ORIGIN in req.headers &&
		req.headers.origin.replace(/^http(s)?:\/\//, EMPTY) !== req.headers.host
	);
}

/**
 * Creates CORS request handler that sends 204 No Content
 * @returns {Function} Request handler function
 */
export function corsRequest() {
	return (req, res) => res.status(INT_204).send(EMPTY);
}

/**
 * Extracts client IP address from request
 * @param {Object} req - Request object
 * @returns {string} Client IP address
 */
export function extractIP(req) {
	const connection = req.connection;
	const socket = req.socket;
	const fallbackIP =
		(connection && connection.remoteAddress) || (socket && socket.remoteAddress) || LOCALHOST;

	const forwardedHeader = req.headers[X_FORWARDED_FOR];
	if (!forwardedHeader || !forwardedHeader.trim()) {
		return fallbackIP;
	}

	const forwardedIPs = forwardedHeader.split(COMMA);
	const ipCount = forwardedIPs.length;

	for (let i = INT_0; i < ipCount; i++) {
		const ip = forwardedIPs[i].trim();
		if (isValidIP(ip)) {
			return ip;
		}
	}

	return fallbackIP;
}

/**
 * Extracts URL parameters from request pathname using regex groups
 * @param {Object} req - HTTP request object with parsed pathname
 * @param {RegExp} getParams - Regular expression with named capture groups
 */
export function params(req, getParams) {
	getParams.lastIndex = INT_0;
	const match = getParams.exec(req.parsed.pathname);
	const groups = match?.groups;

	if (!groups) {
		req.params = {};
		return;
	}

	const processedParams = Object.create(null);
	const keys = Object.keys(groups);
	const keyCount = keys.length;

	for (let i = INT_0; i < keyCount; i++) {
		const key = keys[i];
		const value = groups[key];

		if (value === null || value === undefined) {
			processedParams[key] = coerce(null);
		} else {
			let decoded;
			if (value.indexOf(PERCENT) === -1) {
				decoded = value;
			} else {
				try {
					decoded = decodeURIComponent(value);
				} catch {
					decoded = value;
				}
			}

			const coerced = coerce(decoded);
			processedParams[key] = typeof coerced === STRING ? escapeHtml(coerced) : coerced;
		}
	}

	req.params = processedParams;
}

/**
 * Parses a URL string or request object into a URL object with security checks
 * @param {string|Object} arg - URL string or request object to parse
 * @returns {URL} Parsed URL object
 */
export function parse(arg) {
	const urlString =
		typeof arg === STRING
			? arg
			: `${HTTP_PREFIX}${arg.headers?.host || `localhost:${arg.socket?.server?._connectionKey?.replace(/.*::/, EMPTY) || String(INT_8000)}`}${arg.url}`;

	/* node:coverage ignore next 6 */
	try {
		return new URL(urlString);
	} catch {
		return new URL(`${HTTP_PREFIX}localhost${arg.url || SLASH}`);
	}
}

/**
 * Converts parameterized route path to regex pattern
 * @param {string} path - Route path with parameters (e.g., "/users/:id")
 * @returns {string} Regex pattern string
 */
export function extractPath(path) {
	return path.replace(/:([a-zA-Z_]\w*)/g, EXTRACT_PATH_REPLACE);
}

/**
 * Validates IPv4 address format
 * @param {string} ip - IPv4 address to validate
 * @returns {boolean} True if valid IPv4
 */
function isValidIPv4(ip) {
	const match = IPV4_PATTERN.exec(ip);
	if (!match) {
		return false;
	}

	for (let i = INT_1; i < INT_5; i++) {
		const num = parseInt(match[i], INT_10);
		if (num > INT_255) {
			return false;
		}
	}

	return true;
}

/**
 * Validates IPv6 address format
 * @param {string} ip - IPv6 address to validate
 * @returns {boolean} True if valid IPv6
 */
function isValidIPv6(ip) {
	if (!IPV6_CHAR_PATTERN.test(ip)) {
		return false;
	}

	const ipv4MappedMatch = IPV4_MAPPED_PATTERN.exec(ip);
	if (ipv4MappedMatch) {
		return isValidIPv4(ipv4MappedMatch[1]);
	}

	if (ip === DOUBLE_COLON) {
		return true;
	}

	const doubleColonIndex = ip.indexOf(DOUBLE_COLON);
	const isCompressed = doubleColonIndex !== -1;

	if (isCompressed) {
		return validateCompressedIPv6(ip, doubleColonIndex);
	}

	return validateUncompressedIPv6(ip);
}

/**
 * Validates compressed IPv6 address (with ::)
 * @param {string} ip - IPv6 address
 * @param {number} doubleColonIndex - Position of ::
 * @returns {boolean} True if valid
 */
function validateCompressedIPv6(ip, doubleColonIndex) {
	if (ip.indexOf(DOUBLE_COLON, doubleColonIndex + INT_2) !== -1) {
		return false;
	}

	if (
		(doubleColonIndex > INT_0 && ip.charAt(doubleColonIndex - INT_1) === COLON) ||
		(doubleColonIndex + INT_2 < ip.length && ip.charAt(doubleColonIndex + INT_2) === COLON)
	) {
		return false;
	}

	const beforeDoubleColon = ip.substring(INT_0, doubleColonIndex);
	const afterDoubleColon = ip.substring(doubleColonIndex + INT_2);

	const leftGroups = beforeDoubleColon ? beforeDoubleColon.split(COLON) : [];
	const rightGroups = afterDoubleColon ? afterDoubleColon.split(COLON) : [];

	const totalGroups =
		leftGroups.filter((g) => g !== EMPTY).length + rightGroups.filter((g) => g !== EMPTY).length;

	if (totalGroups >= INT_8) {
		return false;
	}

	return validateHexGroups(leftGroups) && validateHexGroups(rightGroups);
}

/**
 * Validates uncompressed IPv6 address
 * @param {string} ip - IPv6 address
 * @returns {boolean} True if valid
 */
function validateUncompressedIPv6(ip) {
	const groups = ip.split(COLON);
	if (groups.length !== INT_8) {
		return false;
	}

	return validateHexGroups(groups);
}

/**
 * Validates hex groups in IPv6 address
 * @param {Array} groups - Array of hex group strings
 * @returns {boolean} True if all groups are valid
 */
function validateHexGroups(groups) {
	const groupCount = groups.length;

	for (let i = INT_0; i < groupCount; i++) {
		/* node:coverage ignore next 3 */
		if (!groups[i] || !HEX_GROUP_PATTERN.test(groups[i])) {
			return false;
		}
	}
	return true;
}

/**
 * Validates if an IP address is properly formatted
 * @param {string} ip - IP address to validate
 * @returns {boolean} True if IP is valid format
 */
export function isValidIP(ip) {
	if (!ip || typeof ip !== STRING) {
		return false;
	}

	if (ip.indexOf(COLON) === -1) {
		return isValidIPv4(ip);
	}

	return isValidIPv6(ip);
}
