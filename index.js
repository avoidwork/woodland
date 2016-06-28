"use strict";

const path = require("path"),
	lru = require("tiny-lru"),
	merge = require("tiny-merge"),
	Woodland = require(path.join(__dirname, "lib", "woodland.js"));

function factory (config = {}, onErrorFn = undefined) {
	let server = new Woodland();

	if (typeof onErrorFn === "function") {
		server.onerror = onErrorFn;
	}

	// Merging configurations
	merge(server.config, config);

	// Registering virtual hosts
	server.router.setHost("all");
	array.each(Object.keys(server.config.hosts), i => {
		server.router.setHost(i);
	});

	// Setting default middleware
	array.each([middleware.decorate(server), middleware.etag, middleware.cors, middleware.connect], i => {
		obj.use(i).blacklist(i);
	});

	return obj;
}

module.exports = factory;
