import { STATUS_CODES } from "node:http";
import { readdir, stat } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
	COLLECTION,
	CONTENT_TYPE,
	EMPTY,
	ITEM,
	INT_403,
	INT_404,
	MSG_ROUTING_FILE,
	MSG_SERVE_PATH_OUTSIDE,
	SLASH,
	TEXT_HTML,
	TOKEN_TITLE,
	UTF8,
} from "./constants.js";
import { escapeHtml } from "./response.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const html = readFileSync(join(__dirname, "..", "tpl", "index.html"), {
	encoding: UTF8,
});

/**
 * Generates an HTML index page for directory listings
 * @param {string} [title=""] - The title for the index page
 * @param {Array} [files=[]] - Array of file objects from fs.readdir with withFileTypes: true
 * @returns {string} The complete HTML string for the index page
 */
export function autoIndex(title = EMPTY, files = []) {
	const safeTitle = escapeHtml(title);

	if (files.length === 0) {
		return html.replace(/\$\{\s*(TITLE|FILES)\s*\}/g, (match, key) => {
			return key === TOKEN_TITLE
				? safeTitle
				: `    <li><a href=".." rel="${COLLECTION}">../</a></li>`;
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
		key === TOKEN_TITLE ? safeTitle : safeFiles,
	);
}

/**
 * Serves files from filesystem
 * @param {Object} config - File server config (autoIndex, charset, indexes, logger, stream, etag)
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {string} arg - File path argument
 * @param {string} [folder=process.cwd()] - Root folder to serve from
 */
export async function serve(config, req, res, arg, folder = process.cwd()) {
	const fp = resolve(folder, arg);
	const resolvedFolder = resolve(folder);

	// Path traversal protection: ensure fp is within resolvedFolder
	// Must match exactly or be a subdirectory (not a sibling like /public2 vs /public)
	// Use path.sep for platform compatibility (\\ on Windows, / on Unix)
	// Special case: if resolvedFolder is root (e.g., "/" or "C:\\"), containment is implicit
	const isRoot =
		resolvedFolder === sep ||
		(resolvedFolder.length === 3 && resolvedFolder[1] === ":" && resolvedFolder.endsWith("\\"));
	const isWithin = isRoot
		? fp.startsWith(resolvedFolder)
		: fp === resolvedFolder || (fp.startsWith(resolvedFolder) && fp[resolvedFolder.length] === sep);

	if (!isWithin) {
		config.logger.logServe(req, MSG_SERVE_PATH_OUTSIDE);
		res.error(INT_403, new Error(STATUS_CODES[INT_403]));

		return;
	}

	let valid = true;
	let stats;

	config.logger.logServe(req, MSG_ROUTING_FILE);

	try {
		stats = await stat(fp, { bigint: false });
	} catch {
		valid = false;
	}

	if (!valid) {
		res.error(INT_404, new Error(STATUS_CODES[INT_404]));
	} else if (!stats.isDirectory()) {
		config.stream(req, res, {
			charset: config.charset,
			etag: config.etag(req.method, stats.ino, stats.size, stats.mtimeMs),
			path: fp,
			stats: stats,
		});
	} else if (!req.parsed.pathname.endsWith(SLASH)) {
		res.redirect(`${req.parsed.pathname}/${req.parsed.search}`);
	} else {
		const files = await readdir(fp, { encoding: UTF8, withFileTypes: true });
		let result = EMPTY;

		for (let i = 0; i < files.length; i++) {
			const file = files[i];
			if (config.indexes.includes(file.name)) {
				result = join(fp, file.name);
				break;
			}
		}

		if (!result.length) {
			if (!config.autoIndex) {
				res.error(INT_404, new Error(STATUS_CODES[INT_404]));
			} else {
				const body = autoIndex(decodeURIComponent(req.parsed.pathname), files);
				res.header(CONTENT_TYPE, `${TEXT_HTML}; charset=${config.charset}`);
				res.send(body);
			}
		} else {
			const rstats = await stat(result, { bigint: false });

			config.stream(req, res, {
				charset: config.charset,
				etag: config.etag(req.method, rstats.ino, rstats.size, rstats.mtimeMs),
				path: result,
				stats: rstats,
			});
		}
	}
}

/**
 * Registers file serving middleware for a root path
 * @param {Object} config - File server config
 * @param {string} root - Root path to register
 * @param {string} folder - Folder to serve files from
 * @param {Function} useMiddleware - Middleware registration function
 */
export function register(config, root, folder, useMiddleware) {
	const normalizedRoot = root.replace(/\/$/, EMPTY) || SLASH;
	// Match mount root and any path beneath it: /static, /static/, /static/foo
	const rootPattern = normalizedRoot === SLASH ? "(/.*)?" : `${normalizedRoot}(/.*)?`;

	useMiddleware(rootPattern, (req, res) => {
		const pathname = req.parsed.pathname;
		// For root mount "/", strip leading "/" (slice(1))
		// For other mounts like "/static", strip "/static" prefix
		const relativePath =
			pathname === normalizedRoot
				? EMPTY
				: normalizedRoot === SLASH
					? pathname.slice(1)
					: pathname.slice(normalizedRoot.length + 1);
		return serve(config, req, res, relativePath, folder);
	});
}

/**
 * Creates file server middleware for serving static files
 * @param {Object} config - File server config (autoIndex, charset, indexes, logger, stream, etag)
 * @returns {Object} File server with register, serve methods
 */
export function createFileServer(config) {
	return Object.freeze({
		register: (root, folder, useMiddleware) => {
			const fn = useMiddleware ?? config.use;
			if (typeof fn !== "function") {
				throw new TypeError("useMiddleware is required or config.use must be a function");
			}
			register(config, root, folder, fn);
		},
		serve: (req, res, arg, folder) => serve(config, req, res, arg, folder),
	});
}
