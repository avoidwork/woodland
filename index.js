"use strict";

const path = require("path"),
	Woodland = require(path.join(__dirname, "lib", "woodland.js"));

function factory (arg) {
	const router = new Woodland(arg);

	router.route = router.route.bind(router);

	return router;
}

module.exports = factory;
