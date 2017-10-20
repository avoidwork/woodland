"use strict";

module.exports = {
	escape: arg => arg.replace(/[-[\]\/{}()*+?.,\\^$|#]/g, "\\$&"),
	schemeless: arg => arg.replace(/^.*:\/\//, "")
};
