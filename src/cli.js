#!/usr/bin/env node

import {createServer} from "node:http";
import {coerce} from "tiny-coerce";
import {woodland} from "woodland";
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
	TEXT_PLAIN
} from "./constants.js";

const argv = process.argv.filter(i => i.charAt(0) === HYPHEN && i.charAt(1) === HYPHEN).reduce((a, v) => {
		const x = v.split(`${HYPHEN}${HYPHEN}`)[1].split(EQUAL);

		a[x[0]] = coerce(x[1]);

		return a;
	}, {}),
	ip = argv.ip ?? LOCALHOST,
	logging = argv.logging ?? true,
	port = argv.port ?? INT_8000,
	app = woodland({
		autoindex: true,
		defaultHeaders: {[CACHE_CONTROL]: NO_CACHE, [CONTENT_TYPE]: `${TEXT_PLAIN}; ${CHAR_SET}`},
		logging: {
			enabled: logging
		},
		time: true
	});

let validPort = Number(port);
if (!Number.isInteger(validPort) || validPort < INT_0 || validPort > INT_65535) {
	console.error("Invalid port: must be an integer between 0 and 65535.");
	process.exit(1);
}
let validIP = typeof ip === "string" && (/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/).test(ip);
if (!validIP) {
	console.error("Invalid IP: must be a valid IPv4 address.");
	process.exit(1);
}

app.files();
createServer(app.route).listen(validPort, ip);
app.log(`id=woodland, hostname=localhost, ip=${ip}, port=${validPort}`, INFO);
