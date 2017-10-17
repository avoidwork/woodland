"use strict";

const path = require("path"),
	Woodland = require(path.join(__dirname, "lib", "woodland.js"));

function factory ({cacheSize = 1000, coerce = true, defaultHeaders = {}, seed = Math.floor(Math.random() * 1000) + 1} = {}) {
	const router = new Woodland(defaultHeaders, cacheSize, seed, coerce);

	router.route = router.route.bind(router);

	return router;
}

module.exports = factory;
