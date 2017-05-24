"use strict";

module.exports = {
	escape: arg => arg.replace(/[-[\]{}()*+?.,\\^$|#]/g, "\\$&"),
	getArity: arg => arg.toString().replace(/(^.*\()|(\).*)|(\n.*)/g, "").split(",").length,
	isEmpty: arg => arg.replace(/^(\s+|\t+|\n+)|(\s+|\t+|\n+)$/g, "").length === 0
};
