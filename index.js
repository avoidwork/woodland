"use strict";

const path = require("path"),
	Woodland = require(path.join(__dirname, "lib", "woodland.js"));

function factory ({cacheSize = 1e3, cacheTTL = 0, defaultHeaders = {}, http2 = false, dtrace = false} = {}) {
	const router = new Woodland(defaultHeaders, cacheSize, http2, cacheTTL, dtrace);

	router.route = router.route.bind(router);

	return router;
}

module.exports = factory;
