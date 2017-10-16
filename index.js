"use strict";

const path = require("path"),
	all = require(path.join(__dirname, "lib", "all.js")),
	regex = require(path.join(__dirname, "lib", "regex.js")),
	Woodland = require(path.join(__dirname, "lib", "woodland.js")),
	max = 1000,
	random = Math.floor(Math.random() * max) + 1;

function valid (req, res, next) {
	if (req.allow.indexOf(req.method) > -1) {
		const pathname = req.parsed.pathname.replace(regex.root, ""),
			invalid = (pathname.replace(regex.dir, "").split("/").filter(i => i !== ".")[0] || "") === "..",
			outDir = !invalid ? (pathname.match(/\.{2}\//g) || []).length : 0,
			inDir = !invalid ? (pathname.match(/\w+?(\.\w+|\/)+/g) || []).length : 0;

		if (invalid === true) {
			next(new Error(404));
		} else if (outDir > 0 && outDir >= inDir) {
			next(new Error(404));
		} else {
			next();
		}
	} else {
		next(new Error(regex.empty.test(req.allow) ? 404 : 405));
	}
}

function factory ({cacheSize = max, coerce = true, defaultHeaders = {}, seed = random} = {}) {
	const router = new Woodland(defaultHeaders, cacheSize, seed, coerce);

	router.route = router.route.bind(router);
	router.use("/.*", valid, all, all).blacklist(valid);

	return router;
}

module.exports = factory;
