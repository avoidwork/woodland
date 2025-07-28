#!/usr/bin/env node
/**
 * woodland
 *
 * @copyright 2025 Jason Mulligan <jason.mulligan@avoidwork.com>
 * @license BSD-3-Clause
 * @version 21.0.0
 */
'use strict';

var node_http = require('node:http');
var tinyCoerce = require('tiny-coerce');
var woodland = require('woodland');
var node_path = require('node:path');
var node_fs = require('node:fs');
var node_url = require('node:url');
var tinyLru = require('tiny-lru');
var mimeDb = require('mime-db');
var node_module = require('node:module');

var _documentCurrentScript = typeof document !== 'undefined' ? document.currentScript : null;
const __dirname$2 = node_url.fileURLToPath(new node_url.URL(".", (typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === 'SCRIPT' && _documentCurrentScript.src || new URL('cli.cjs', document.baseURI).href))));
const require$1 = node_module.createRequire((typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === 'SCRIPT' && _documentCurrentScript.src || new URL('cli.cjs', document.baseURI).href)));
const {name, version} = require$1(node_path.join(__dirname$2, "..", "package.json"));
const CACHE_CONTROL = "cache-control";
const CONTENT_TYPE = "content-type";
const TEXT_PLAIN = "text/plain";
const CHAR_SET = "charset=utf-8";
const UTF8 = "utf8";
`nodejs/${process.version}, ${process.platform}/${process.arch}`;
const LOCALHOST = "127.0.0.1";
const INT_8000 = 8000;
const EXTENSIONS = "extensions";

// =============================================================================
// NUMERIC CONSTANTS
// =============================================================================
const INT_0 = 0;
const INT_1 = 1;
const INT_4 = 4;
const INT_8 = 8;
const INT_10 = 10;
const INT_255 = 255;
const INT_65535 = 65535;

// =============================================================================
// STRING & CHARACTER CONSTANTS
// =============================================================================
const COLON = ":";
const EMPTY = "";
const EQUAL = "=";
const HYPHEN = "-";

// =============================================================================
// IP ADDRESS CONSTANTS
// =============================================================================
const IPV6_ALL_ZEROS = "::";
const IPV6_IPV4_MAPPED_PREFIX = "::ffff:";
const IPV6_INVALID_TRIPLE_COLON = ":::";
const IPV6_DOUBLE_COLON = "::";
const STRING = "string";
const INFO = "info";
const NO_CACHE = "no-cache";

// =============================================================================
// UTILITY & MISC
// =============================================================================
const EN_US = "en-US";
const SHORT = "short";

Object.freeze(Array.from(Array(12).values()).map((i, idx) => {
	const d = new Date();
	d.setMonth(idx);

	return Object.freeze(d.toLocaleString(EN_US, {month: SHORT}));
}));

const __dirname$1 = node_url.fileURLToPath(new node_url.URL(".", (typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === 'SCRIPT' && _documentCurrentScript.src || new URL('cli.cjs', document.baseURI).href))));
	node_fs.readFileSync(node_path.join(__dirname$1, "..", "tpl", "autoindex.html"), {encoding: UTF8});
	const valid = Object.entries(mimeDb).filter(i => EXTENSIONS in i[1]);
	valid.reduce((a, v) => {
		const result = Object.assign({type: v[0]}, v[1]);

		for (const key of result.extensions) {
			a[`.${key}`] = result;
		}

		return a;
	}, {});
	const // Optimized caching for frequently called validation functions
	ipValidationCache = tinyLru.lru(500, 300000); // Cache 500 IPs for 5 minutes

/**
 * Internal function that performs the actual IP validation without caching
 * @param {string} ip - IP address to validate
 * @returns {boolean} True if IP is valid format
 */
function validateIPInternal (ip) {
	// IPv4 validation - optimized with combined validation
	if (!ip.includes(COLON)) {
		const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
		const ipv4Match = ip.match(ipv4Regex);

		if (ipv4Match) {
			// Validate octets inline to avoid array creation and iteration
			for (let i = INT_1; i <= INT_4; i++) {
				const octet = parseInt(ipv4Match[i], INT_10);
				if (octet > INT_255) {
					return false;
				}
			}

			return true;
		}

		return false;
	}

	// IPv6 validation - optimized for performance
	// Early check for invalid patterns
	if (ip.includes(IPV6_INVALID_TRIPLE_COLON) || !(/^[0-9a-fA-F:.]+$/).test(ip)) {
		return false;
	}

	// Handle IPv4-mapped IPv6 addresses first (most common case)
	const ipv4MappedMatch = ip.match(new RegExp(`^${IPV6_IPV4_MAPPED_PREFIX.replace(/:/g, "\\:")}(\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3})$`, "i"));
	if (ipv4MappedMatch) {
		return validateIPInternal(ipv4MappedMatch[1]);
	}

	// Special case for all-zeros
	if (ip === IPV6_ALL_ZEROS) {
		return true;
	}

	// Optimized IPv6 validation
	const parts = ip.split(IPV6_DOUBLE_COLON);
	if (parts.length > 2) {
		return false;
	}

	// For compressed notation (::)
	if (parts.length === 2) {
		const leftGroups = parts[0] ? parts[0].split(COLON) : [];
		const rightGroups = parts[1] ? parts[1].split(COLON) : [];

		// Check group validity and count non-empty groups in single pass
		let nonEmptyCount = 0;
		for (const group of [...leftGroups, ...rightGroups]) {
			if (group !== EMPTY) {
				if (!(/^[0-9a-fA-F]{1,4}$/).test(group)) {
					return false;
				}
				nonEmptyCount++;
			}
		}

		return nonEmptyCount < INT_8; // Must be compressed
	}

	// Full notation (no ::)
	const groups = ip.split(COLON);
	if (groups.length !== INT_8) {
		return false;
	}

	// Validate all groups in single pass
	for (const group of groups) {
		if (!group || !(/^[0-9a-fA-F]{1,4}$/).test(group)) {
			return false;
		}
	}

	return true;
}

/**
 * Validates if an IP address is properly formatted with caching for performance
 * @param {string} ip - IP address to validate
 * @returns {boolean} True if IP is valid format
 */
function isValidIP (ip) {
	if (!ip || typeof ip !== STRING) {
		return false;
	}

	// Check cache first for performance optimization
	const cached = ipValidationCache.get(ip);
	if (cached !== undefined) {
		return cached;
	}

	// Perform validation and cache result
	const result = validateIPInternal(ip);
	ipValidationCache.set(ip, result);

	return result;
}

/**
 * Validates if a port number is valid
 * @param {number} port - Port number to validate
 * @returns {boolean} True if port is valid (integer between 0 and 65535)
 */
function isValidPort (port) {
	return Number.isInteger(port) && port >= INT_0 && port <= INT_65535;
}

const argv = process.argv.filter(i => i.charAt(0) === HYPHEN && i.charAt(1) === HYPHEN).reduce((a, v) => {
		const x = v.split(`${HYPHEN}${HYPHEN}`)[1].split(EQUAL);

		a[x[0]] = tinyCoerce.coerce(x[1]);

		return a;
	}, {}),
	ip = argv.ip ?? LOCALHOST,
	logging = argv.logging ?? true,
	port = Number(argv.port ?? INT_8000),
	app = woodland.woodland({
		autoindex: true,
		defaultHeaders: {[CACHE_CONTROL]: NO_CACHE, [CONTENT_TYPE]: `${TEXT_PLAIN}; ${CHAR_SET}`},
		logging: {
			enabled: logging
		},
		time: true
	});

if (!isValidPort(port)) {
	console.error("Invalid port: must be an integer between 0 and 65535.");
	process.exit(1);
}
if (!isValidIP(ip)) {
	console.error("Invalid IP: must be a valid IPv4 or IPv6 address.");
	process.exit(1);
}

app.files();
node_http.createServer(app.route).listen(port, ip);
app.log(`id=woodland, hostname=localhost, ip=${ip}, port=${port}`, INFO);
