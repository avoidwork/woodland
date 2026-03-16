import { readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { EMPTY, INT_0, INT_403, INT_404, SLASH, UTF8 } from "./constants.js";
import { autoindex as aindex } from "./utility.js";

/**
 * Serves files from filesystem
 * @param {Object} app - Woodland application instance
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {string} arg - File path argument
 * @param {string} [folder=process.cwd()] - Root folder to serve from
 */
export async function serve(app, req, res, arg, folder = process.cwd()) {
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

/**
 * Registers file serving middleware for a root path
 * @param {Object} app - Woodland application instance
 * @param {string} root - Root path to register
 * @param {string} folder - Folder to serve files from
 * @param {Function} useMiddleware - Middleware registration function
 */
export function register(app, root, folder, useMiddleware) {
	useMiddleware(`${root.replace(/\/$/, EMPTY)}/(.*)?`, (req, res) =>
		serve(app, req, res, req.parsed.pathname.substring(1), folder),
	);
}

/**
 * Creates file server middleware for serving static files
 * @param {Object} app - Woodland application instance
 * @returns {Object} File server with register, serve methods
 */
export function createFileServer(app) {
	return {
		register: (root, folder, useMiddleware) =>
			register(app, root, folder, useMiddleware || app.use.bind(app)),
		serve: (req, res, arg, folder) => serve(app, req, res, arg, folder),
	};
}
