"use strict";

module.exports = {
	escape: arg => arg.replace(/[-[\]\/{}()*+?.,\\^$|#]/g, "\\$&"),
	getArity: arg => arg.toString().replace(/(^.*\()|(\).*)|(\n.*)/g, "").split(",").length,
	schemeless: arg => arg.replace(/^.*:\/\//, "")
};
