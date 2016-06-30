"use strict";

const coerce = require("tiny-coerce"),
	url = require("url");

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

function iterate (obj, fn) {
	if (obj instanceof Object) {
		Object.keys(obj).forEach(i => {
			fn.call(obj, obj[i], i);
		});
	} else {
		obj.forEach(fn);
	}
}

function queryString (qstring = "") {
	let obj = {},
		aresult = qstring.split("?"),
		result;

	if (aresult.length > 1) {
		aresult.shift();
	}

	result = aresult.join("?");
	result.split("&").forEach(prop => {
		let aitem = prop.replace(/\+/g, " ").split("="),
			item;

		if (aitem.length > 2) {
			item = [aitem.shift(), aitem.join("=")];
		} else {
			item = aitem;
		}

		if (isEmpty(item[0])) {
			return;
		}

		if (item[1] === undefined) {
			item[1] = "";
		} else {
			item[1] = coerce(decodeURIComponent(item[1]));
		}

		if (obj[item[0]] === undefined) {
			obj[item[0]] = item[1];
		} else if (obj[item[0]] instanceof Array === false) {
			obj[item[0]] = [obj[item[0]]];
			obj[item[0]].push(item[1]);
		} else {
			obj[item[0]].push(item[1]);
		}
	});

	return obj;
}

function parse (uri) {
	let luri = uri,
		idxAscii, idxQ, parsed;

	if (luri === undefined || luri === null) {
		luri = "";
	} else {
		idxAscii = luri.indexOf("%3F");
		idxQ = luri.indexOf("?");

		switch (true) {
			case idxQ === -1 && idxAscii > -1:
			case idxAscii < idxQ:
				luri = luri.replace("%3F", "?");
				break;
			default:
				void 0;
		}
	}

	parsed = url.parse(luri);
	parsed.pathname = parsed.pathname.replace(/%20/g, " ");
	parsed.path = parsed.pathname + (parsed.search || "");
	parsed.query = parsed.search ? queryString(parsed.search) : {};

	iterate(parsed, (v, k) => {
		if (v === null) {
			parsed[k] = "";
		}
	});

	return parsed;
}

module.exports = {
	escape: escape,
	getArity: getArity,
	isEmpty: isEmpty,
	parse: parse
};
