# woodland

[![build status](https://secure.travis-ci.org/avoidwork/woodland.svg)](http://travis-ci.org/avoidwork/woodland)

Lightweight HTTP/HTTPS router with virtual hosts. Sets an accurate `Allow` header based on routes.

## Example

```javascript
"use strict";

const http = require("http");
let router = require("woodland")({defaultHeaders: {"Cache-Control": "no-cache"}});

router.use("/", (req, res) => {
	res.writeHead(200, {"Content-Type": "text/plain"});
	res.end("Hello World!");
});

http.createServer(router.route).listen(8000);
```

## Event Handlers
##### onclose (req, res)
Executes if the connection was terminated before `res.end()` was called or able to flush.

##### onerror (req, res, err)
Executes if the request cannot be routed, default handler sends a basic text response.

##### onfinish (req, res)
Executes after the response has been sent.

## API

##### allowed (method, uri, host, override = false)

##### allows (uri, host, override = false)

##### blacklist (fn)

##### decorate (req, res)

##### hash (arg)

##### host (arg)

##### route (req, res)

##### routes (uri, host, method, override = false)

##### setHost (arg)

##### use (path, fn, method, host)

##### url (req)

## License
Copyright (c) 2016 Jason Mulligan
Licensed under the BSD-3 license.