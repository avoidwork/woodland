"use strict";

const path = require("path"),
	fs = require("fs"),
	html = fs.readFileSync(path.join(__dirname, "..", "tpl", "autoindex.html"), {encoding: "utf8"});

function autoindex (title = "", files = []) { // eslint-disable-line no-unused-vars
	return eval("`" + html + "`"); // eslint-disable-line no-eval
}

module.exports = autoindex;
