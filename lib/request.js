const http = require("http");

class WoodlandHttp2Request extends http.IncomingMessage {
	constructor (arg) {
		super(arg);
	}
}

module.exports = arg => new WoodlandHttp2Request(arg);
