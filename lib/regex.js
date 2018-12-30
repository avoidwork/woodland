"use strict";

module.exports = {
	hasParam: /\/:\w*/,
	isParam: /^:/,
	invalid: /^(transfer-encoding|connection)$/,
	partial: /^bytes=/
};
