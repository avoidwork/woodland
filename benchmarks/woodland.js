import {createServer} from "node:http";
import {woodland} from "../dist/woodland.js";

const router = woodland({etags: false, logging: {enabled: false}});

router.use("/", (req, res) => res.json("Hello World!"));
createServer(router.route).listen(8000);
