"use strict";

module.exports = {
	braceLeft: /\(/,
	hasGet: /GET/,
	hasParam: /\/:(\w*)/,
	isHead: /^HEAD$/,
	isParam: /^:/,
	isOptions: /^OPTIONS$/,
	slashEnd: /\/$/,
	slashStart: /^\//,
	wrappedQuotes: /^".*"$/
};
