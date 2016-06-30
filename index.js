"use strict";

const path = require("path"),
	Woodland = require(path.join(__dirname, "lib", "woodland.js")),
	all = require(path.join(__dirname, "lib", "all.js")),
	max = 1000,
	random = Math.floor(Math.random() * max) + 1;

function factory ({cacheSize = max, defaultHeaders = {}, defaultHost = "127.0.0.1", hosts = ["127.0.0.1"], seed = random} = {}) {
	let router = new Woodland(defaultHost, defaultHeaders, cacheSize, seed);

	router.route = router.route.bind(router);
	router.setHost(all);
	hosts.forEach(host => {
		router.setHost(host);
	});

	return router;
}

module.exports = factory;
