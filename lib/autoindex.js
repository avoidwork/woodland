"use strict";

const path = require("path"),
	fs = require("fs"),
	html = fs.readFileSync(path.join(__dirname, "..", "tpl", "autoindex.html"), {encoding: "utf8"});

function autoindex (title = "", files = []) { // eslint-disable-line no-unused-vars
	let result = "";

	try {
		result = eval("`" + html + "`"); // eslint-disable-line no-eval
	} catch (err) {
		void 0;
	}

	return result;
}

module.exports = autoindex;
