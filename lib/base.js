"use strict";

const path = require("path"),
	methods = require("http").METHODS,
	{each} = require(path.join(__dirname, "utility.js"));

function Base () {
}

Base.prototype.use = function () {
};

Base.prototype.del = function (...args) {
	this.use(...args, "DELETE");
};

each(methods, i => {
	Base.prototype[i.toLowerCase()] = function (...args) {
		this.use(...args, i);
	};
});

module.exports = Base;
