"use strict";

const http2 = require("http2"),
	fs = require("fs"),
	router = require("./index")({
		defaultHeaders: {"Cache-Control": "no-cache", "Content-Type": "text/plain"},
		http2: true
	});

router.onfinish = (req, res) => console.log(res.statusCode);

router.use("/", (req, res) => res.send("Hello World!"));
router.use("/", (req, res) => res.send("Make a GET request to retrieve the representation"), "options");
router.use("/:user", (req, res) => res.send("Hello " + req.params.user + "!"));

http2.createSecureServer({
	key: fs.readFileSync("./ssl/localhost.key"),
	cert: fs.readFileSync("./ssl/localhost.crt")
}).on("stream", router.route).listen(8443);
