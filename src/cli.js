#!/usr/bin/env node

import { createServer } from "node:http";
import { woodland } from "woodland";
import { parseArgs, validateIP, validatePort } from "./cli-utils.js";
import {
	CACHE_CONTROL,
	CHAR_SET,
	CONTENT_TYPE,
	INFO,
	INT_8000,
	LOCALHOST,
	NO_CACHE,
	TEXT_PLAIN,
} from "./constants.js";

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
		return;
	}

	const ipValidation = validateIP(ip);
	if (!ipValidation.valid) {
		console.error(ipValidation.error);
		process.exit(1);
		return;
	}

	app.files();
	const server = createServer(app.route);
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

// CLI entry point - always run main
/* node:coverage ignore next */
main();
