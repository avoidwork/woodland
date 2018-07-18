"use strict";

const path = require("path"),
	Woodland = require(path.join(__dirname, "lib", "woodland.js"));

function factory ({cacheSize = 1000, cacheTTL = 0, defaultHeaders = {}, http2 = false} = {}) {
	const router = new Woodland(defaultHeaders, cacheSize, http2, cacheTTL);

	router.route = router._route.bind(router);

	return router;
}

process.on("unhandledRejection", () => void 0);
process.on("uncaughtException", () => void 0);

module.exports = factory;
