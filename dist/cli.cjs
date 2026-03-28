#!/usr/bin/env node
/**
 * woodland
 *
 * @copyright 2026 Jason Mulligan <jason.mulligan@avoidwork.com>
 * @license BSD-3-Clause
 * @version 22.0.0
 */
'use strict';

var node_http = require('node:http');
var node_url = require('node:url');
var node_path = require('node:path');
var tinyCoerce = require('tiny-coerce');
var woodland = require('woodland');
var node_module = require('node:module');
var mimeDb = require('mime-db');

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
const COLON = ":";
const DOUBLE_COLON = "::";
const EMPTY = "";
const EQUAL = "=";
const HYPHEN = "-";
const WOODLAND = "woodland";
const STRING = "string";
`nodejs/${process.version}, ${process.platform}/${process.arch}`;
const LOCALHOST = "127.0.0.1";
const EXTENSIONS = "extensions";
const INFO = "info";
const NO_CACHE = "no-cache";
const EN_US = "en-US";
const SHORT = "short";

Object.freeze(
	Array.from({ length: 12 }, (_, idx) => {
		const d = new Date();
		d.setMonth(idx);

		return Object.freeze(d.toLocaleString(EN_US, { month: SHORT }));
	}),
);

const valid = Object.entries(mimeDb).filter((i) => EXTENSIONS in i[1]);
	valid.reduce((a, v) => {
		const result = Object.assign({ type: v[0] }, v[1]);
		const extCount = result.extensions.length;
		for (let i = 0; i < extCount; i++) {
			a[`.${result.extensions[i]}`] = result;
		}
		return a;
	}, {});

const IPV4_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/,
	IPV6_CHAR_PATTERN = /^[0-9a-fA-F:.]+$/,
	IPV4_MAPPED_PATTERN = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i,
	HEX_GROUP_PATTERN = /^[0-9a-fA-F]{1,4}$/;

/**
 * Validates if an IP address is properly formatted
 * @param {string} ip - IP address to validate
 * @returns {boolean} True if IP is valid format
 */
function isValidIP(ip) {
	if (!ip || typeof ip !== STRING) {
		return false;
	}

	if (ip.indexOf(COLON) === -1) {
		const match = IPV4_PATTERN.exec(ip);

		if (!match) {
			return false;
		}

		for (let i = 1; i < INT_5; i++) {
			const num = parseInt(match[i], INT_10);
			if (num > INT_255) {
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

	if (ip === DOUBLE_COLON) {
		return true;
	}

	const doubleColonIndex = ip.indexOf(DOUBLE_COLON);
	const isCompressed = doubleColonIndex !== -1;

	if (isCompressed) {
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

		let leftGroups;
		if (beforeDoubleColon) {
			leftGroups = beforeDoubleColon.split(COLON);
		} else {
			leftGroups = [];
		}

		let rightGroups;
		if (afterDoubleColon) {
			rightGroups = afterDoubleColon.split(COLON);
		} else {
			rightGroups = [];
		}

		const nonEmptyLeft = leftGroups.filter((g) => g !== EMPTY);
		const nonEmptyRight = rightGroups.filter((g) => g !== EMPTY);
		const totalGroups = nonEmptyLeft.length + nonEmptyRight.length;

		if (totalGroups >= INT_8) {
			return false;
		}

		/* node:coverage ignore next 5 */
		for (let i = INT_0; i < nonEmptyLeft.length; i++) {
			if (!HEX_GROUP_PATTERN.test(nonEmptyLeft[i])) {
				return false;
			}
		}

		/* node:coverage ignore next 5 */
		for (let i = INT_0; i < nonEmptyRight.length; i++) {
			if (!HEX_GROUP_PATTERN.test(nonEmptyRight[i])) {
				return false;
			}
		}

		return true;
	} else {
		const groups = ip.split(COLON);
		if (groups.length !== INT_8) {
			return false;
		}

		/* node:coverage ignore next 5 */
		for (let i = INT_0; i < INT_8; i++) {
			if (!groups[i] || !HEX_GROUP_PATTERN.test(groups[i])) {
				return false;
			}
		}

		return true;
	}
}

/**
 * Parse CLI arguments from process.argv style array
 * @param {Array} args - Array of argument strings
 * @returns {Object} Parsed arguments object
 */
function parseArgs(args) {
	return args
		.filter((i) => i.charAt(0) === HYPHEN && i.charAt(1) === HYPHEN)
		.reduce((a, v) => {
			const x = v.split(`${HYPHEN}${HYPHEN}`)[1].split(EQUAL);
			a[x[0]] = tinyCoerce.coerce(x[1]);
			return a;
		}, {});
}

/**
 * Validate port number
 * @param {*} port - Port value to validate
 * @returns {Object} Validation result with valid flag and error message
 */
function validatePort(port) {
	// Reject empty strings and whitespace-only values
	if (port === EMPTY || (typeof port === STRING && port.trim() === EMPTY)) {
		return { valid: false, error: "Invalid port: must be an integer between 0 and 65535." };
	}
	const validPort = Number(port);
	if (!Number.isInteger(validPort) || validPort < INT_0 || validPort > INT_65535) {
		return { valid: false, error: "Invalid port: must be an integer between 0 and 65535." };
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
		return { valid: false, error: "Invalid IP: must be a valid IPv4 or IPv6 address." };
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
	server.on("listening", () => {
		const actualPort = server.address().port;
		app.logger.log(
			`id=woodland, hostname=${process.env.HOSTNAME ?? "localhost"}, ip=${ip}, port=${actualPort}`,
			INFO,
		);
	});

	return server;
}

// CLI entry point - only run when executed directly
const __filename$1 = node_url.fileURLToPath((typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === 'SCRIPT' && _documentCurrentScript.src || new URL('cli.cjs', document.baseURI).href)));
/* node:coverage ignore next 7 */
if (process.argv[1]) {
	const scriptPath = node_path.resolve(process.argv[1]);
	if (scriptPath === __filename$1 || node_path.basename(scriptPath) === WOODLAND) {
		main();
	}
}

exports.main = main;
exports.parseArgs = parseArgs;
exports.validateIP = validateIP;
exports.validatePort = validatePort;
