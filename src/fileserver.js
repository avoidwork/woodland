import { readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
	COLLECTION,
	CONTENT_TYPE,
	EMPTY,
	INT_403,
	INT_404,
	ITEM,
	MSG_SERVE_PATH_OUTSIDE,
	MSG_ROUTING_FILE,
	SLASH,
	TEXT_HTML,
	UTF8,
} from "./constants.js";
import { escapeHtml } from "./response.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const html = readFileSync(join(__dirname, "..", "tpl", "autoindex.html"), {
	encoding: UTF8,
});

/**
 * Generates an HTML autoindex page for directory listings
 * @param {string} [title=""] - The title for the autoindex page
 * @param {Array} [files=[]] - Array of file objects from fs.readdir with withFileTypes: true
 * @returns {string} The complete HTML string for the autoindex page
 */
export function autoindex(title = EMPTY, files = []) {
	const safeTitle = escapeHtml(title);

	if (files.length === 0) {
		return html.replace(/\$\{\s*(TITLE|FILES)\s*\}/g, (match, key) => {
			return key === "TITLE" ? safeTitle : `    <li><a href=".." rel="${COLLECTION}">../</a></li>`;
		});
	}

	const listItems = Array.from({ length: files.length + 1 });
	listItems[0] = `    <li><a href=".." rel="${COLLECTION}">../</a></li>`;

	const fileCount = files.length;
	for (let i = 0; i < fileCount; i++) {
		const file = files[i];
		const fileName = file.name;
		const safeName = escapeHtml(fileName);
		const safeHref = encodeURIComponent(fileName);
		const isDir = file.isDirectory();

		listItems[i + 1] = isDir
			? `    <li><a href="${safeHref}/" rel="${COLLECTION}">${safeName}/</a></li>`
			: `    <li><a href="${safeHref}" rel="${ITEM}">${safeName}</a></li>`;
	}

	const safeFiles = listItems.join("\n");

	return html.replace(/\$\{\s*(TITLE|FILES)\s*\}/g, (match, key) =>
		key === "TITLE" ? safeTitle : safeFiles,
	);
}

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
		app.logger.logServe(req, MSG_SERVE_PATH_OUTSIDE);
		res.error(INT_403);

		return;
	}

	let valid = true;
	let stats;

	app.logger.logServe(req, MSG_ROUTING_FILE);

	try {
		stats = await stat(fp, { bigint: false });
	} catch {
		valid = false;
	}

	if (!valid) {
		res.error(INT_404);
	} else if (!stats.isDirectory()) {
		app.stream(req, res, {
			charset: app.charset,
			etag: app.etag(req.method, stats.ino, stats.size, stats.mtimeMs),
			path: fp,
			stats: stats,
		});
	} else if (!req.parsed.pathname.endsWith(SLASH)) {
		res.redirect(`${req.parsed.pathname}/${req.parsed.search}`);
	} else {
		const files = await readdir(fp, { encoding: UTF8, withFileTypes: true });
		let result = EMPTY;

		const indexes = app.indexes;
		for (let i = 0; i < files.length; i++) {
			const file = files[i];
			if (indexes.includes(file.name)) {
				result = join(fp, file.name);
				break;
			}
		}

		if (!result.length) {
			if (!app.autoindex) {
				res.error(INT_404);
			} else {
				const body = autoindex(decodeURIComponent(req.parsed.pathname), files);
				res.header(CONTENT_TYPE, `${TEXT_HTML}; charset=${app.charset}`);
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
