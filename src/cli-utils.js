import { isValidIP } from "./request.js";
import {
	EMPTY,
	EQUAL,
	HYPHEN,
	INT_0,
	INT_65535,
	MSG_INVALID_IP,
	MSG_INVALID_PORT,
	STRING,
} from "./constants.js";
import { coerce } from "tiny-coerce";

/**
 * Parse CLI arguments from process.argv style array
 * @param {Array} args - Array of argument strings
 * @returns {Object} Parsed arguments object
 */
export function parseArgs(args) {
	return args
		.filter((i) => i.charAt(0) === HYPHEN && i.charAt(1) === HYPHEN)
		.reduce((a, v) => {
			const x = v.split(`${HYPHEN}${HYPHEN}`)[1].split("=");
			a[x[0]] = coerce(x[1]);
			return a;
		}, {});
}

/**
 * Validate port number
 * @param {*} port - Port value to validate
 * @returns {Object} Validation result with valid flag and error message
 */
export function validatePort(port) {
	if (port === EMPTY || (typeof port === STRING && port.trim() === EMPTY)) {
		return { valid: false, error: MSG_INVALID_PORT };
	}
	const validPort = Number(port);
	if (!Number.isInteger(validPort) || validPort < INT_0 || validPort > INT_65535) {
		return { valid: false, error: MSG_INVALID_PORT };
	}
	return { valid: true, port: validPort };
}

/**
 * Validate IP address
 * @param {string} ip - IP address to validate
 * @returns {Object} Validation result with valid flag and error message
 */
export function validateIP(ip) {
	const validIP = isValidIP(ip);
	if (!validIP) {
		return { valid: false, error: MSG_INVALID_IP };
	}
	return { valid: true, ip };
}
