"use strict";

const http = require("http"),
	router = require("./index")();

router.use("/", (req, res) => res.json("Hello World!"));
http.createServer(router.route).listen(8000);
