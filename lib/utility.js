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
	let [path, fn, method] = args;

	if (typeof path !== "string") {
		method = fn;
		fn = path;
		path = "/.*";
	}

	method = method !== void 0 ? method.toUpperCase() : "GET";

	return [path, fn, method];
}

module.exports = {
	clone,
	each,
	normalize
};
