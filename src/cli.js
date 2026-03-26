#!/usr/bin/env node

import { createServer } from "node:http";
import { coerce } from "tiny-coerce";
import { woodland } from "woodland";
import { isValidIP } from "./request.js";
import {
	CACHE_CONTROL,
	CHAR_SET,
	CONTENT_TYPE,
	EQUAL,
	HYPHEN,
	INFO,
	INT_0,
	INT_8000,
	INT_65535,
	LOCALHOST,
	NO_CACHE,
	TEXT_PLAIN,
} from "./constants.js";

/**
 * Parse CLI arguments from process.argv style array
 * @param {Array} args - Array of argument strings
 * @returns {Object} Parsed arguments object
 */
export function parseArgs(args) {
	return args
		.filter((i) => i.charAt(0) === HYPHEN && i.charAt(1) === HYPHEN)
		.reduce((a, v) => {
			const x = v.split(`${HYPHEN}${HYPHEN}`)[1].split(EQUAL);
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
export function validateIP(ip) {
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
export function main(args = process.argv) {
	const argv = parseArgs(args);
	const ip = argv.ip ?? LOCALHOST;
	const logging = argv.logging ?? true;
	const port = argv.port ?? INT_8000;
	const app = woodland({
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
	}

	const ipValidation = validateIP(ip);
	if (!ipValidation.valid) {
		console.error(ipValidation.error);
		process.exit(1);
	}

	app.files();
	const server = createServer(app.route);
	server.listen(portValidation.port, ip);
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
const path = process.argv[1];
if (path && (path.endsWith("cli.js") || path.endsWith("cli.cjs"))) {
	main();
}
