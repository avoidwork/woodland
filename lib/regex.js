"use strict";

module.exports = {
	empty: /^$/,
	hasGet: /GET/,
	hasParam: /\/:(\w*)/,
	head: /^HEAD$/,
	endSlash: /\/$/,
	isParam: /^:/,
	leftBrace: /\(/,
	options: /^OPTIONS$/,
	startSlash: /^\//
};
