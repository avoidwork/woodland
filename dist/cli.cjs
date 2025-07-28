#!/usr/bin/env node
/**
 * woodland
 *
 * @copyright 2025 Jason Mulligan <jason.mulligan@avoidwork.com>
 * @license BSD-3-Clause
 * @version 20.2.0
 */
'use strict';

var node_http = require('node:http');
var tinyCoerce = require('tiny-coerce');
var woodland = require('woodland');
var node_path = require('node:path');
var node_fs = require('node:fs');
var node_url = require('node:url');
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
const INT_65535 = 65535;
const EQUAL = "=";
const HYPHEN = "-";
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

/**
 * Validates if an IP address is properly formatted
 * @param {string} ip - IP address to validate
 * @returns {boolean} True if IP is valid format
 */
function isValidIP (ip) {
	if (!ip || typeof ip !== "string") {
		return false;
	}

	// Basic IPv4 validation
	const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
	const ipv4Match = ip.match(ipv4Regex);

	if (ipv4Match) {
		const octets = ipv4Match.slice(1).map(Number);

		// Check if all octets are valid (0-255)
		if (octets.some(octet => octet > 255)) {
			return false;
		}

		return true;
	}

	// IPv6 validation
	if (ip.includes(":")) {
		// Check for valid characters (hex digits, colons, and dots for IPv4-mapped addresses)
		if (!(/^[0-9a-fA-F:.]+$/).test(ip)) {
			return false;
		}

		// Check for three or more consecutive colons (invalid)
		if (ip.includes(":::")) {
			return false;
		}

		// Handle IPv4-mapped IPv6 addresses (e.g., ::ffff:192.0.2.1)
		const ipv4MappedMatch = ip.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i);
		if (ipv4MappedMatch) {
			return isValidIP(ipv4MappedMatch[1]);
		}

		// Split on "::" to handle compressed notation
		const parts = ip.split("::");
		if (parts.length > 2) {
			return false; // More than one "::" is invalid
		}

		let leftPart = parts[0] || "";
		let rightPart = parts[1] || "";

		// Split each part by ":"
		const leftGroups = leftPart ? leftPart.split(":") : [];
		const rightGroups = rightPart ? rightPart.split(":") : [];

		// Check each group
		const allGroups = [...leftGroups, ...rightGroups];
		for (const group of allGroups) {
			if (group === "") {
				// Empty groups are only allowed in compressed notation context
				if (parts.length === 1) {
					return false; // Empty group without "::" compression
				}
			} else if (!(/^[0-9a-fA-F]{1,4}$/).test(group)) {
				// Each group must be 1-4 hex digits
				return false;
			}
		}

		// Calculate total number of groups
		const totalGroups = leftGroups.length + rightGroups.length;

		if (parts.length === 2) {
			// Compressed notation: total groups should be less than 8
			// Special case: "::" alone represents all zeros
			if (ip === "::") {
				return true;
			}
			// Remove empty groups from count (they represent compressed zeros)
			const nonEmptyGroups = allGroups.filter(g => g !== "").length;

			return nonEmptyGroups <= 8 && nonEmptyGroups < 8; // Must be compressed (< 8 groups)
		} else {
			// Full notation: must have exactly 8 groups
			return totalGroups === 8 && allGroups.every(g => g !== "");
		}
	}

	return false;
}

const argv = process.argv.filter(i => i.charAt(0) === HYPHEN && i.charAt(1) === HYPHEN).reduce((a, v) => {
		const x = v.split(`${HYPHEN}${HYPHEN}`)[1].split(EQUAL);

		a[x[0]] = tinyCoerce.coerce(x[1]);

		return a;
	}, {}),
	ip = argv.ip ?? LOCALHOST,
	logging = argv.logging ?? true,
	port = argv.port ?? INT_8000,
	app = woodland.woodland({
		autoindex: true,
		defaultHeaders: {[CACHE_CONTROL]: NO_CACHE, [CONTENT_TYPE]: `${TEXT_PLAIN}; ${CHAR_SET}`},
		logging: {
			enabled: logging
		},
		time: true
	});

const validPort = Number(port);
if (!Number.isInteger(validPort) || validPort < INT_0 || validPort > INT_65535) {
	console.error("Invalid port: must be an integer between 0 and 65535.");
	process.exit(1);
}
const validIP = isValidIP(ip);
if (!validIP) {
	console.error("Invalid IP: must be a valid IPv4 or IPv6 address.");
	process.exit(1);
}

app.files();
node_http.createServer(app.route).listen(validPort, ip);
app.log(`id=woodland, hostname=localhost, ip=${ip}, port=${validPort}`, INFO);
