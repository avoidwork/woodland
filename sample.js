"use strict";

const http = require("http"),
	{join} = require("path"),
	router = require("./index")({autoindex: true, defaultHeaders: {"cache-control": "no-cache", "content-type": "text/plain; charset=utf-8"}, time: true});

router.use("/", (req, res) => res.send("Hello World!"));
router.use("/", (req, res) => res.send("Make a GET request to retrieve the representation"), "options");
router.use("/error", (req, res) => res.error(404));
router.use("/test(/.*)?", (req, res) => router.serve(req, res, req.parsed.pathname.replace(/^\/test\/?/, ""), join(__dirname, "test")));
router.use("/:user", (req, res) => res.send("Hello " + req.params.user + "!"));
http.createServer(router.route).listen(8000);
