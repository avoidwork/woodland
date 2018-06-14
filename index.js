"use strict";

const path = require("path"),
	Woodland = require(path.join(__dirname, "lib", "woodland.js"));

function factory ({cacheSize = 1000, cacheTTL = 0, coerce = true, defaultHeaders = {}, http2 = false} = {}) {
	const router = new Woodland(defaultHeaders, cacheSize, coerce, http2, cacheTTL);

	router.route = (...args) => router._route.apply(router, args);

	return router;
}

module.exports = factory;
