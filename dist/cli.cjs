#!/usr/bin/env node
/**
 * woodland
 *
 * @copyright 2026 Jason Mulligan <jason.mulligan@avoidwork.com>
 * @license BSD-3-Clause
 * @version 20.2.10
 */
'use strict';

var node_http = require('node:http');
var tinyCoerce = require('tiny-coerce');
var woodland = require('woodland');
var node_module = require('node:module');
var node_path = require('node:path');
var node_url = require('node:url');
var mimeDb = require('mime-db');

var _documentCurrentScript = typeof document !== 'undefined' ? document.currentScript : null;
const __dirname$1 = node_url.fileURLToPath(new node_url.URL(".", (typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === 'SCRIPT' && _documentCurrentScript.src || new URL('cli.cjs', document.baseURI).href))));
const require$1 = node_module.createRequire((typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === 'SCRIPT' && _documentCurrentScript.src || new URL('cli.cjs', document.baseURI).href)));
const { name, version } = require$1(node_path.join(__dirname$1, "..", "package.json"));
const CACHE_CONTROL = "cache-control";
const CONTENT_TYPE = "content-type";
const TEXT_PLAIN = "text/plain";
const CHAR_SET = "charset=utf-8";
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

Object.freeze(
	Array.from(Array(12).values()).map((i, idx) => {
		const d = new Date();
		d.setMonth(idx);

		return Object.freeze(d.toLocaleString(EN_US, { month: SHORT }));
	}),
);

const valid = Object.entries(mimeDb).filter((i) => EXTENSIONS in i[1]);
	valid.reduce((a, v) => {
		const result = Object.assign({ type: v[0] }, v[1]);

		for (const key of result.extensions) {
			a[`.${key}`] = result;
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
	if (!ip || typeof ip !== "string") {
		return false;
	}

	if (ip.indexOf(":") === -1) {
		const match = IPV4_PATTERN.exec(ip);

		if (!match) {
			return false;
		}

		for (let i = 1; i < 5; i++) {
			const num = parseInt(match[i], 10);
			if (num > 255) {
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

	if (ip === "::") {
		return true;
	}

	const doubleColonIndex = ip.indexOf("::");
	const isCompressed = doubleColonIndex !== -1;

	if (isCompressed) {
		if (ip.indexOf("::", doubleColonIndex + 2) !== -1) {
			return false;
		}

		if (
			(doubleColonIndex > 0 && ip.charAt(doubleColonIndex - 1) === ":") ||
			(doubleColonIndex + 2 < ip.length && ip.charAt(doubleColonIndex + 2) === ":")
		) {
			return false;
		}

		const beforeDoubleColon = ip.substring(0, doubleColonIndex);
		const afterDoubleColon = ip.substring(doubleColonIndex + 2);

		const leftGroups = beforeDoubleColon ? beforeDoubleColon.split(":") : [];
		const rightGroups = afterDoubleColon ? afterDoubleColon.split(":") : [];

		const nonEmptyLeft = leftGroups.filter((g) => g !== "");
		const nonEmptyRight = rightGroups.filter((g) => g !== "");
		const totalGroups = nonEmptyLeft.length + nonEmptyRight.length;

		if (totalGroups >= 8) {
			return false;
		}

		for (let i = 0; i < nonEmptyLeft.length; i++) {
			if (!HEX_GROUP_PATTERN.test(nonEmptyLeft[i])) {
				return false;
			}
		}
		for (let i = 0; i < nonEmptyRight.length; i++) {
			if (!HEX_GROUP_PATTERN.test(nonEmptyRight[i])) {
				return false;
			}
		}

		return true;
	} else {
		const groups = ip.split(":");
		if (groups.length !== 8) {
			return false;
		}

		for (let i = 0; i < 8; i++) {
			if (!groups[i] || !HEX_GROUP_PATTERN.test(groups[i])) {
				return false;
			}
		}

		return true;
	}
}

const argv = process.argv
		.filter((i) => i.charAt(0) === HYPHEN && i.charAt(1) === HYPHEN)
		.reduce((a, v) => {
			const x = v.split(`${HYPHEN}${HYPHEN}`)[1].split(EQUAL);

			a[x[0]] = tinyCoerce.coerce(x[1]);

			return a;
		}, {}),
	ip = argv.ip ?? LOCALHOST,
	logging = argv.logging ?? true,
	port = argv.port ?? INT_8000,
	app = woodland.woodland({
		autoindex: true,
		defaultHeaders: { [CACHE_CONTROL]: NO_CACHE, [CONTENT_TYPE]: `${TEXT_PLAIN}; ${CHAR_SET}` },
		logging: {
			enabled: logging,
		},
		time: true,
	});

let validPort = Number(port);
if (!Number.isInteger(validPort) || validPort < INT_0 || validPort > INT_65535) {
	console.error("Invalid port: must be an integer between 0 and 65535.");
	process.exit(1);
}
let validIP = isValidIP(ip);
if (!validIP) {
	console.error("Invalid IP: must be a valid IPv4 address.");
	process.exit(1);
}

app.files();
node_http.createServer(app.route).listen(validPort, ip);
app.log(
	`id=woodland, hostname=${process.env.HOSTNAME ?? "localhost"}, ip=${ip}, port=${validPort}`,
	INFO,
);
