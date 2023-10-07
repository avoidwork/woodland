#!/usr/bin/env node

import {createServer} from "node:http";
import {woodland} from "./dist/woodland.js";

const router = woodland({
		autoindex: true,
		defaultHeaders: {"cache-control": "no-cache", "content-type": "text/plain; charset=utf-8"},
		time: true
	}),
	argv = process.argv.filter(i => i.charAt(0) === "-" && i.charAt(1) === "-").reduce((a, v) => {
		const x = v.split("--")[1].split("=");

		a[x[0]] = isNaN(x[1]) === false ? Number(x[1]) : x[1] === "true" ? true : x[1] === "false" ? false : x[1];

		return a;
	}, {}),
	ip = argv.ip || "127.0.0.1",
	port = argv.port || 8000;

router.get("/(.*)?", (req, res) => router.serve(req, res, req.parsed.pathname.substring(1)));
createServer(router.route).listen(port, ip);
console.log(`id=woodland, hostname=localhost, ip=${ip}, port=${port}`);
