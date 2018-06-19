"use strict";

const http = require("http"),
	path = require("path"),
	router = require(path.join(__dirname, "index.js"))();

router.get("/", (req, res) => res.send('{"hello": "world!"}', 200, {"content-type": "application/json"}));

http.createServer(router.route).listen(3000);