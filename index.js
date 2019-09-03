"use strict";

const path = require("path"),
	Woodland = require(path.join(__dirname, "lib", "woodland.js"));

function factory ({cacheSize = 1e3, cacheTTL = 0, defaultHeaders = {}, http2 = false, dtrace = false, origins = ["*"]} = {}) {
	const router = new Woodland(defaultHeaders, cacheSize, http2, cacheTTL, dtrace, origins);

	router.route = router.route.bind(router);
	router.on("connect", router.decorate);
	router.on("error", router.error);

	return router;
}

module.exports = factory;
