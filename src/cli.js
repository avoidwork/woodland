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
	INT_8000,
	LOCALHOST,
	NO_CACHE,
	TEXT_PLAIN
} from "./constants.js";

const app = woodland({
		autoindex: true,
		defaultHeaders: {[CACHE_CONTROL]: NO_CACHE, [CONTENT_TYPE]: `${TEXT_PLAIN}; ${CHAR_SET}`},
		time: true
	}),
	argv = process.argv.filter(i => i.charAt(0) === HYPHEN && i.charAt(1) === HYPHEN).reduce((a, v) => {
		const x = v.split(`${HYPHEN}${HYPHEN}`)[1].split(EQUAL);

		a[x[0]] = coerce(x[1]);

		return a;
	}, {}),
	ip = argv.ip ?? LOCALHOST,
	port = argv.port ?? INT_8000;

app.files();
createServer(app.route).listen(port, ip);
app.log(`id=woodland, hostname=localhost, ip=${ip}, port=${port}`, INFO);
