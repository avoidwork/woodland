"use strict";

const http = require("http"),
	router = require("./index")({defaultHeaders: {"cache-control": "no-cache", "content-type": "text/plain; charset=utf-8"}});

router.use("/", (req, res) => res.send("Hello World!"));
router.use("/", (req, res) => res.send("Make a GET request to retrieve the representation"), "options");
router.use("/error", (req, res) => res.error(404));
router.use("/:user", (req, res) => res.send("Hello " + req.params.user + "!"));
http.createServer(router.route).listen(8000);
