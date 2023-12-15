#!/usr/bin/env node
/**
 * woodland
 *
 * @copyright 2023 Jason Mulligan <jason.mulligan@avoidwork.com>
 * @license BSD-3-Clause
 * @version 18.2.0
 */
'use strict';

var node_http = require('node:http');
var tinyCoerce = require('tiny-coerce');
var woodland = require('woodland');
var node_module = require('node:module');
var node_path = require('node:path');
var node_url = require('node:url');

var _documentCurrentScript = typeof document !== 'undefined' ? document.currentScript : null;
const __dirname$1 = node_url.fileURLToPath(new node_url.URL(".", (typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.src || new URL('cli.cjs', document.baseURI).href))));
const require$1 = node_module.createRequire((typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.src || new URL('cli.cjs', document.baseURI).href)));
require$1(node_path.join(__dirname$1, "..", "package.json"));
const CACHE_CONTROL = "cache-control";
const CHAR_SET = "charset=utf-8";
const CONTENT_TYPE = "content-type";
const EQUAL = "=";
const EN_US = "en-US";
const HYPHEN = "-";
const LOCALHOST = "127.0.0.1";
const SHORT = "short";
Object.freeze(Array.from(Array(12).values()).map((i, idx) => {
	const d = new Date();
	d.setMonth(idx);

	return Object.freeze(d.toLocaleString(EN_US, {month: SHORT}));
}));
const NO_CACHE = "no-cache";
const TEXT_PLAIN = "text/plain";
`nodejs/${process.version}, ${process.platform}/${process.arch}`;

const app = woodland.woodland({
		autoindex: true,
		defaultHeaders: {[CACHE_CONTROL]: NO_CACHE, [CONTENT_TYPE]: `${TEXT_PLAIN}; ${CHAR_SET}`},
		time: true
	}),
	argv = process.argv.filter(i => i.charAt(0) === HYPHEN && i.charAt(1) === HYPHEN).reduce((a, v) => {
		const x = v.split(`${HYPHEN}${HYPHEN}`)[1].split(EQUAL);

		a[x[0]] = tinyCoerce.coerce(x[1]);

		return a;
	}, {}),
	ip = argv.ip || LOCALHOST,
	port = argv.port || 8000;

app.staticFiles();
node_http.createServer(app.route).listen(port, ip);
console.log(`id=woodland, hostname=localhost, ip=${ip}, port=${port}`);
