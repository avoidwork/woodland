"use strict";

const http = require("http"),
	router = require("./index")({defaultHeaders: {"Cache-Control": "no-cache", "Content-Type": "text/plain"}});

router.use("/", (req, res) => res.end("Hello World!"));
router.use("/", (req, res) => res.end("Make a GET request to retrieve the representation"), "options");
router.use("/:user", (req, res) => res.end("Hello " + req.params.user + "!"));
http.createServer(router.route).listen(8000);
