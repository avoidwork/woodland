"use strict";

const EventEmitter = require("events");

class Base extends EventEmitter {
	constructor () {
		super();
	}

	connect (...args) {
		this.use(...args, "CONNECT");
	}

	del (...args) {
		this.use(...args, "DELETE");
	}

	delete (...args) {
		this.use(...args, "DELETE");
	}

	get (...args) {
		this.use(...args, "GET");
	}

	head (...args) {
		this.use(...args, "HEAD");
	}

	post (...args) {
		this.use(...args, "POST");
	}

	put (...args) {
		this.use(...args, "PUT");
	}

	options (...args) {
		this.use(...args, "OPTIONS");
	}

	patch (...args) {
		this.use(...args, "PATCH");
	}

	trace (...args) {
		this.use(...args, "TRACE");
	}

	use () {}
}

module.exports = Base;
