"use strict";

const path = require("path"),
	each = require("retsu").each,
	regex = require(path.join(__dirname, "lib", "regex.js")),
	Woodland = require(path.join(__dirname, "lib", "woodland.js")),
	max = 1000,
	random = Math.floor(Math.random() * max) + 1;

function valid (req, res, next) {
	const pathname = req.parsed.pathname.replace(regex.root, ""),
		invalid = (pathname.replace(regex.dir, "").split("/").filter(i => i !== ".")[0] || "") === "..",
		outDir = !invalid ? (pathname.match(/\.{2}\//g) || []).length : 0,
		inDir = !invalid ? (pathname.match(/\w+?(\.\w+|\/)+/g) || []).length : 0;

	if (invalid) {
		next(new Error(404));
	} else if (outDir > 0 && outDir >= inDir) {
		next(new Error(404));
	} else {
		next();
	}
}

function factory ({cacheSize = max, defaultHeaders = {}, defaultHost = "localhost", hosts = ["localhost"], seed = random} = {}) {
	const router = new Woodland(defaultHost, defaultHeaders, cacheSize, seed);

	router.route = router.route.bind(router);
	router.setHost("all");
	each(hosts, host => router.setHost(host));
	router.use("/.*", valid, "all", "all").blacklist(valid);

	return router;
}

module.exports = factory;
