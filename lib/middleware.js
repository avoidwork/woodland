"use strict";

const path = require("path"),
	regex = require(path.join(__dirname, "regex.js"));

module.exports = {
	allowed: function (req, res, next) {
		if (req.allow.indexOf(req.method) > -1) {
			next();
		} else {
			next(new Error(req.allow.length > 0 ? 405 : 404));
		}
	},
	valid: function (req, res, next) {
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
};
