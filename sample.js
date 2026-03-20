import { createServer } from "node:http";
import { woodland } from "woodland";

const app = woodland();

app.get("/", (req, res) => res.send("Hello World!"));

createServer(app.route).listen(3000, () => console.log("Server running at http://localhost:3000"));
