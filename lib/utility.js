"use strict";

function clone (arg) {
	return JSON.parse(JSON.stringify(arg));
}

function each (arr, fn) {
	const items = arr.entries();

	for (let item of items) {
		fn(item[1], item[0]);
	}

	return arr;
}

function normalize (...args) {
	let [lpath, lfn, lmethod] = args;

	if (typeof lpath !== "string") {
		lmethod = lfn;
		lfn = lpath;
		lpath = "/.*";
	}

	lmethod = lmethod !== void 0 ? lmethod.toUpperCase() : "GET";

	return [lpath, lfn, lmethod];
}

module.exports = {
	clone,
	each,
	normalize
};
