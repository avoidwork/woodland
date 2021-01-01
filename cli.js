#!/usr/bin/env node

"use strict";

const http = require("http"),
	path = require("path"),
	router = require(path.join(__dirname, "index.js"))({autoindex: true, defaultHeaders: {"cache-control": "no-cache", "content-type": "text/plain; charset=utf-8"}, time: true}),
	argv = process.argv.filter(i => i.charAt(0) === "-" && i.charAt(1) === "-").reduce((a, v) => {
		const x = v.split("--")[1].split("=");

		a[x[0]] = isNaN(x[1]) === false ? Number(x[1]) : x[1] === "true" ? true : x[1] === "false" ? false : x[1];

		return a;
	}, {}),
	ip = argv.ip || "0.0.0.0",
	port = argv.port || 8000;

router.get("/(.*)?", (req, res) => router.serve(req, res, req.parsed.pathname.substring(1), process.cwd()));
http.createServer(router.route).listen(port, ip);
console.log(`id=woodland, type=local, ip=${ip}, port=${port}`);
