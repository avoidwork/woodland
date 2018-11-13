"use strict";

module.exports = {
	all: /^\*$/,
	braceLeft: /\(/,
	hasGet: /GET/,
	hasParam: /\/:\w*/,
	isHead: /^HEAD$/,
	isParam: /^:/,
	isOptions: /^OPTIONS$/,
	invalid: /^(transfer-encoding|connection)$/i,
	partial: /^bytes=/
};
