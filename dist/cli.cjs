#!/usr/bin/env node
/**
 * woodland
 *
 * @copyright 2026 Jason Mulligan <jason.mulligan@avoidwork.com>
 * @license BSD-3-Clause
 * @version 22.0.4
 */
'use strict';

var node_http = require('node:http');
var woodland = require('woodland');
var node_module = require('node:module');
var node_path = require('node:path');
var node_url = require('node:url');
var mimeDb = require('mime-db');
var tinyCoerce = require('tiny-coerce');

var _documentCurrentScript = typeof document !== 'undefined' ? document.currentScript : null;
const __dirname$1 = node_url.fileURLToPath(new node_url.URL(".", (typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === 'SCRIPT' && _documentCurrentScript.src || new URL('cli.cjs', document.baseURI).href))));
const require$1 = node_module.createRequire((typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === 'SCRIPT' && _documentCurrentScript.src || new URL('cli.cjs', document.baseURI).href)));
const { name, version } = require$1(node_path.join(__dirname$1, "..", "package.json"));
const CACHE_CONTROL = "cache-control";
const CONTENT_TYPE = "content-type";
const TEXT_PLAIN = "text/plain";
const CHAR_SET = "charset=utf-8";

// =============================================================================
// NUMERIC CONSTANTS
// =============================================================================
const INT_0 = 0;
const INT_1 = 1;
const INT_2 = 2;
const INT_5 = 5;
const INT_8 = 8;
const INT_10 = 10;
const INT_255 = 255;
const INT_8000 = 8000;
const INT_65535 = 65535;
const INT_NEG_1 = -1;
const COLON = ":";
const DOUBLE_COLON = "::";
const EMPTY = "";
const EQUAL = "=";
const HYPHEN = "-";
const STRING = "string";
`nodejs/${process.version}, ${process.platform}/${process.arch}`;
const LOCALHOST = "127.0.0.1";
const EXTENSIONS = "extensions";
const INFO = "info";
const MSG_INVALID_IP = "Invalid IP: must be a valid IPv4 or IPv6 address.";
const MSG_INVALID_PORT = "Invalid port: must be an integer between 0 and 65535.";
const NO_CACHE = "no-cache";
const EN_US = "en-US";
const SHORT = "short";
const EVT_LISTENING = "listening";

Object.freeze(
	Array.from({ length: 12 }, (_, idx) => {
		const d = new Date();
		d.setMonth(idx);

		return Object.freeze(d.toLocaleString(EN_US, { month: SHORT }));
	}),
);
const IPV4_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const IPV6_CHAR_PATTERN = /^[0-9a-fA-F:.]+$/;
const IPV4_MAPPED_PATTERN = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i;
const HEX_GROUP_PATTERN = /^[0-9a-fA-F]{1,4}$/;

const valid = Object.entries(mimeDb).filter((i) => EXTENSIONS in i[INT_1]);
	valid.reduce((a, v) => {
		const result = Object.assign({ type: v[INT_0] }, v[INT_1]);
		const extCount = result.extensions.length;
		for (let i = INT_0; i < extCount; i++) {
			a[`.${result.extensions[i]}`] = result;
		}
		return a;
	}, {});

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
		return isValidIPv4(ipv4MappedMatch[INT_1]);
	}

	if (ip === DOUBLE_COLON) {
		return true;
	}

	const doubleColonIndex = ip.indexOf(DOUBLE_COLON);
	const isCompressed = doubleColonIndex !== INT_NEG_1;

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
	if (ip.indexOf(DOUBLE_COLON, doubleColonIndex + INT_2) !== INT_NEG_1) {
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
function isValidIP(ip) {
	if (!ip || typeof ip !== STRING) {
		return false;
	}

	if (ip.indexOf(COLON) === INT_NEG_1) {
		return isValidIPv4(ip);
	}

	return isValidIPv6(ip);
}

/**
 * Parse CLI arguments from process.argv style array
 * @param {Array} args - Array of argument strings
 * @returns {Object} Parsed arguments object
 */
function parseArgs(args) {
	return args
		.filter((i) => i.charAt(INT_0) === HYPHEN && i.charAt(INT_1) === HYPHEN)
		.reduce((a, v) => {
			const x = v.split(`${HYPHEN}${HYPHEN}`)[INT_1].split(EQUAL);
			a[x[INT_0]] = tinyCoerce.coerce(x[INT_1]);
			return a;
		}, {});
}

/**
 * Validate port number
 * @param {*} port - Port value to validate
 * @returns {Object} Validation result with valid flag and error message
 */
function validatePort(port) {
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
function validateIP(ip) {
	const validIP = isValidIP(ip);
	if (!validIP) {
		return { valid: false, error: MSG_INVALID_IP };
	}
	return { valid: true, ip };
}

/**
 * Main CLI entry point function
 * @param {Array} [args=process.argv] - Arguments array (defaults to process.argv)
 * @returns {Object} Server object for testing purposes
 */
function main(args = process.argv) {
	const argv = parseArgs(args);
	const ip = argv.ip ?? LOCALHOST;
	const logging = argv.logging ?? true;
	const port = argv.port ?? INT_8000;
	const app = woodland.woodland({
		autoIndex: true,
		defaultHeaders: { [CACHE_CONTROL]: NO_CACHE, [CONTENT_TYPE]: `${TEXT_PLAIN}; ${CHAR_SET}` },
		logging: {
			enabled: logging,
		},
		time: true,
	});

	const portValidation = validatePort(port);
	if (!portValidation.valid) {
		console.error(portValidation.error);
		process.exit(1);
		return;
	}

	const ipValidation = validateIP(ip);
	if (!ipValidation.valid) {
		console.error(ipValidation.error);
		process.exit(1);
		return;
	}

	app.files();
	const server = node_http.createServer(app.route);
	server.listen(portValidation.port, ip);
	/* node:coverage ignore next 6 */
	server.on(EVT_LISTENING, () => {
		const actualPort = server.address().port;
		app.logger.log(
			`id=woodland, hostname=${process.env.HOSTNAME ?? "localhost"}, ip=${ip}, port=${actualPort}`,
			INFO,
		);
	});

	return server;
}

// CLI entry point - always run main
/* node:coverage ignore next */
main();

exports.main = main;
