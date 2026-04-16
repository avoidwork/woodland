import { STATUS_CODES } from "node:http";
import { readdir, stat, realpath } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
	BACKSLASH,
	COLLECTION,
	CONTENT_TYPE,
	CURRENT_DIR,
	EMPTY,
	FUNCTION,
	INDEX_HTML_FILE,
	INT_0,
	INT_1,
	INT_3,
	INT_400,
	ITEM,
	INT_403,
	INT_404,
	MSG_ROUTING_FILE,
	MSG_SERVE_PATH_OUTSIDE,
	MSG_USE_MIDDLEWARE_REQUIRED,
	NEWLINE,
	PARENT_DIR,
	SLASH,
	TEXT_HTML,
	TPL_DIR,
	UTF8,
	COLON,
	ROUTE_PATTERN,
} from "./constants.js";
import { escapeHtml } from "./response.js";

const __dirname = fileURLToPath(new URL(CURRENT_DIR, import.meta.url));
const html = readFileSync(join(__dirname, PARENT_DIR, TPL_DIR, INDEX_HTML_FILE), {
	encoding: UTF8,
});

/**
 * Generates HTML list item for a file entry
 * @param {Object} file - File object from fs.readdir
 * @returns {string} HTML list item
 */
function renderFileItem(file) {
	const fileName = file.name;
	const safeName = escapeHtml(fileName);
	const safeHref = encodeURIComponent(fileName);
	const isDir = file.isDirectory();

	return isDir
		? `    <li><a href="${safeHref}/" rel="${COLLECTION}">${safeName}/</a></li>`
		: `    <li><a href="${safeHref}" rel="${ITEM}">${safeName}</a></li>`;
}

/**
 * Generates an HTML index page for directory listings
 * @param {string} [title=""] - The title for the index page
 * @param {Array} [files=[]] - Array of file objects from fs.readdir with withFileTypes: true
 * @returns {string} The complete HTML string for the index page
 */
export function autoIndex(title = EMPTY, files = []) {
	const safeTitle = escapeHtml(title);
	const parentDirItem = `    <li><a href="${PARENT_DIR}" rel="${COLLECTION}">${PARENT_DIR}/</a></li>`;

	const fileItems = files.map((file) => renderFileItem(file));
	const safeFiles = [parentDirItem, ...fileItems].join(NEWLINE);

	return html.replace(/\$\{\s*FILES\s*\}/g, safeFiles).replace(/\$\{\s*TITLE\s*\}/g, safeTitle);
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

	const realFp = await realpath(fp).catch(() => fp);
	const realFolder = await realpath(resolvedFolder).catch(() => resolvedFolder);

	const isRoot =
		realFolder === sep ||
		(realFolder.length === INT_3 && realFolder[INT_1] === COLON && realFolder.endsWith(BACKSLASH));
	const isWithin = isRoot
		? realFp.startsWith(realFolder)
		: realFp === realFolder || (realFp.startsWith(realFolder) && realFp[realFolder.length] === sep);

	if (!isWithin) {
		config.logger.logServe(req, MSG_SERVE_PATH_OUTSIDE);
		res.error(INT_403, new Error(STATUS_CODES[INT_403]));

		return;
	}

	let valid = true;
	let stats;

	config.logger.logServe(req, MSG_ROUTING_FILE);

	try {
		stats = await stat(realFp, { bigint: false });
	} catch {
		valid = false;
	}

	if (!valid) {
		res.error(INT_404, new Error(STATUS_CODES[INT_404]));
	} else if (!stats.isDirectory()) {
		config.stream(req, res, {
			charset: config.charset,
			etag: config.etag(req.method, stats.ino, stats.size, stats.mtimeMs),
			path: realFp,
			stats: stats,
		});
	} else if (!req.parsed.pathname.endsWith(SLASH)) {
		res.redirect(`${req.parsed.pathname}${SLASH}${req.parsed.search}`);
	} else {
		let files;
		/* node:coverage ignore next 7 */
		try {
			files = await readdir(realFp, { encoding: UTF8, withFileTypes: true });
		} catch {
			res.error(INT_404, new Error(STATUS_CODES[INT_404]));
			return;
		}

		let result = EMPTY;
		const fileCount = files.length;

		for (let i = INT_0; i < fileCount; i++) {
			const file = files[i];
			if (config.indexes.includes(file.name)) {
				result = join(realFp, file.name);
				break;
			}
		}

		if (!result.length) {
			if (!config.autoIndex) {
				res.error(INT_404, new Error(STATUS_CODES[INT_404]));
			} else {
				try {
					const body = autoIndex(decodeURIComponent(req.parsed.pathname), files);
					res.header(CONTENT_TYPE, `${TEXT_HTML}; charset=${config.charset}`);
					res.send(body);
				} catch {
					res.error(INT_400, new Error(STATUS_CODES[INT_400]));
				}
			}
		} else {
			let rstats;
			/* node:coverage ignore next 7 */
			try {
				rstats = await stat(result, { bigint: false });
			} catch {
				res.error(INT_404, new Error(STATUS_CODES[INT_404]));
				return;
			}

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
	const rootPattern =
		normalizedRoot === SLASH ? ROUTE_PATTERN : `${normalizedRoot}${ROUTE_PATTERN}`;

	useMiddleware(rootPattern, (req, res) => {
		const pathname = decodeURIComponent(req.parsed.pathname);
		// For root mount "/", strip leading "/" (slice(1))
		// For other mounts like "/static", strip "/static" prefix
		const relativePath =
			pathname === normalizedRoot
				? EMPTY
				: normalizedRoot === SLASH
					? pathname.slice(INT_1)
					: pathname.slice(normalizedRoot.length + INT_1);
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
			if (typeof fn !== FUNCTION) {
				throw new TypeError(MSG_USE_MIDDLEWARE_REQUIRED);
			}
			register(config, root, folder, fn);
		},
		serve: (req, res, arg, folder) => serve(config, req, res, arg, folder),
	});
}
