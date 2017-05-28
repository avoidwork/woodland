"use strict";

const path = require("path"),
	each = require("retsu").each,
	middleware = require(path.join(__dirname, "lib", "middleware.js")),
	Woodland = require(path.join(__dirname, "lib", "woodland.js")),
	max = 1000,
	random = Math.floor(Math.random() * max) + 1;

function factory ({cacheSize = max, defaultHeaders = {}, defaultHost = "localhost", hosts = ["localhost"], seed = random} = {}) {
	const router = new Woodland(defaultHost, defaultHeaders, cacheSize, seed);

	router.route = router.route.bind(router);
	router.setHost("all");
	each(hosts, host => router.setHost(host));
	router.use("/.*", middleware.allowed, "all", "all").blacklist(middleware.allowed);
	router.use("/.*", middleware.valid, "all", "all").blacklist(middleware.valid);

	return router;
}

module.exports = factory;
