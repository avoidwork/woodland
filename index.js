"use strict";

const path = require("path"),
	Woodland = require(path.join(__dirname, "lib", "woodland.js")),
	all = "all",
	max = 1000,
	random = Math.floor(Math.random() * max) + 1;

function factory ({defaultHost = "localhost", cacheSize = max, hosts = [], seed = random} = {}) {
	let router = new Woodland(defaultHost, cacheSize, seed);

	router.setHost(all);
	hosts.forEach(host => {
		router.setHost(host);
	});

	router.use("/*", router.decorate);

	return router;
}

module.exports = factory;
