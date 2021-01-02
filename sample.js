"use strict";

const http = require("http"),
	{join} = require("path"),
	router = require("./index")({autoindex: true, defaultHeaders: {"cache-control": "no-cache", "content-type": "text/plain; charset=utf-8"}, logging: {level: "debug"}, time: true});

router.get("/", (req, res) => res.send("Hello World!"));
router.options("/", (req, res) => res.send("Make a GET request to retrieve the representation"));
router.get("/error", (req, res) => res.error(404));
router.get("/favicon.ico", (req, res) => res.error(404));
router.get("/test(/.*)?", (req, res) => router.serve(req, res, req.parsed.pathname.replace(/^\/test\/?/, ""), join(__dirname, "test")));
router.get("/:user", (req, res) => res.send("Hello " + req.params.user + "!"));
http.createServer(router.route).listen(8000);
