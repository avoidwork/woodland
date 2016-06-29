const http = require("http"),
	path = require("path");

let router = require(path.join(__dirname, "index.js"))();

router.use("/*", (req, res) => {
	res.writeHead(200, {"Content-Type": "text/plain"});
	res.end("Hello World!");
});

router.onfinish = (req, res) => {
	console.log("Status code", res.statusCode);
};

router.onerror = (req, res, err) => {
	if (err.message !== "Connection closed before response was flushed") {
		console.error(err.stack);
	}
};

http.createServer(router.route).listen(8000);
