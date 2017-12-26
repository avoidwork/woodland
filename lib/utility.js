"use strict";

function clone (arg) {
	return JSON.parse(JSON.stringify(arg));
}

function each (arr, fn) {
	const nth = arr.length;
	let i = -1;

	while (++i < nth) {
		fn(arr[i], i);
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
