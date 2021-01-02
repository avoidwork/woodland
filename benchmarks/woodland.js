"use strict";

const path = require("path"),
	http = require("http"),
	router = require(path.join(__dirname, "..", "index.js"))({logging:{enabled: false}});

router.use("/", (req, res) => res.json("Hello World!"));
http.createServer(router.route).listen(8000);
