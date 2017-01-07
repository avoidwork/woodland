"use strict";

const path = require("path"),
	Woodland = require(path.join(__dirname, "lib", "woodland.js")),
	max = 1000,
	random = Math.floor(Math.random() * max) + 1;

function factory ({cacheSize = max, defaultHeaders = {}, defaultHost = "localhost", hosts = ["localhost"], seed = random} = {}) {
	let router = new Woodland(defaultHost, defaultHeaders, cacheSize, seed);

	router.route = router.route.bind(router);
	router.setHost("all");
	hosts.forEach(host => {
		router.setHost(host);
	});

	return router;
}

module.exports = factory;
