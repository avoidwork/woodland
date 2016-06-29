const http = require("http"),
	path = require("path"),
	woodland = require(path.join(__dirname, "index.js"));

let router = woodland({
	defaultHost: "localhost"
});

router.use("/*", (req, res) => {
	res.writeHead(200, {'Content-Type': 'text/plain'});
	res.end('Hello World!');
});

router.onfinish = (req, res) => {
	console.log(res.statusCode);
};

http.createServer(router.route).listen(8000);