"use strict";

const path = require("path"),
	regex = require(path.join(__dirname, "lib", "regex.js"));

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

module.exports = valid;
