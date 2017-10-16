"use strict";

const path = require("path"),
	all = require(path.join(__dirname, "lib", "all.js")),
	valid = require(path.join(__dirname, "lib", "valid.js")),
	Woodland = require(path.join(__dirname, "lib", "woodland.js"));

function factory ({cacheSize = 1000, coerce = true, defaultHeaders = {}, seed = Math.floor(Math.random() * 1000) + 1} = {}) {
	const router = new Woodland(defaultHeaders, cacheSize, seed, coerce);

	router.use("/.*", valid, all).blacklist(valid);

	return router;
}

module.exports = factory;
