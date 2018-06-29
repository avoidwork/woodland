"use strict";

const path = require("path"),
	http = require("http"),
	methods = http.METHODS,
	{each} = require(path.join(__dirname, "utility.js"));

function Base () {
	void 0;
}

Base.prototype.use = function () {
};

each(methods, i => {
	Base.prototype[i.toLowerCase()] = function (...args) {
		this.use(...args);
	};
});

module.exports = Base;
