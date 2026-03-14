import { readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { EMPTY, INT_0, INT_403, INT_404, SLASH, UTF8 } from "./constants.js";
import { autoindex as aindex } from "./utility.js";

export function createFileServer(app) {
  async function serve(req, res, arg, folder = process.cwd()) {
    const fp = resolve(folder, arg);
    const resolvedFolder = resolve(folder);

    if (!fp.startsWith(resolvedFolder)) {
      app.logger.logServe(req, "Path outside allowed directory");
      res.error(INT_403);

      return;
    }

    let valid = true;
    let stats;

    app.logger.logServe(req, "Routing request to file system");

    try {
      stats = await stat(fp, { bigint: false });
    } catch {
      valid = false;
    }

    if (valid === false) {
      res.error(INT_404);
    } else if (stats.isDirectory() === false) {
      app.stream(req, res, {
        charset: app.charset,
        etag: app.etag(req.method, stats.ino, stats.size, stats.mtimeMs),
        path: fp,
        stats: stats,
      });
    } else if (req.parsed.pathname.endsWith(SLASH) === false) {
      res.redirect(`${req.parsed.pathname}/${req.parsed.search}`);
    } else {
      const files = await readdir(fp, { encoding: UTF8, withFileTypes: true });
      let result = EMPTY;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (app.indexes.includes(file.name)) {
          result = join(fp, file.name);
          break;
        }
      }

      if (result.length === INT_0) {
        if (app.autoindex === false) {
          res.error(INT_404);
        } else {
          const body = aindex(decodeURIComponent(req.parsed.pathname), files);
          res.header("content-type", `text/html; charset=${app.charset}`);
          res.send(body);
        }
      } else {
        const rstats = await stat(result, { bigint: false });

        app.stream(req, res, {
          charset: app.charset,
          etag: app.etag(req.method, rstats.ino, rstats.size, rstats.mtimeMs),
          path: result,
          stats: rstats,
        });
      }
    }
  }

  function register(root, folder, useMiddleware) {
    useMiddleware(`${root.replace(/\/$/, EMPTY)}/(.*)?`, (req, res) =>
      serve(req, res, req.parsed.pathname.substring(1), folder),
    );
  }

  return { register, serve };
}
