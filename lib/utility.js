"use strict";

function trim (obj) {
	return obj.replace(/^(\s+|\t+|\n+)|(\s+|\t+|\n+)$/g, "");
}

function escape (arg) {
	return arg.replace(/[-[\]{}()*+?.,\\^$|#]/g, "\\$&");
}

function getArity (arg) {
	return arg.toString().replace(/(^.*\()|(\).*)|(\n.*)/g, "").split(",").length;
}

function isEmpty (obj) {
	return trim(obj).length === 0;
}

module.exports = {
	escape: escape,
	getArity: getArity,
	isEmpty: isEmpty
};
