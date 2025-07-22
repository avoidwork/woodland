import {woodland} from "../dist/woodland.js";
import {join} from "node:path";
import {writeFileSync, mkdirSync, rmSync, existsSync} from "node:fs";
import {fileURLToPath} from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const testDir = join(__dirname, "..", "test-files");

// Create test app instance
// const app = woodland({
// 	cacheSize: 1000,
// 	cacheTTL: 10000,
// 	etags: true,
// 	logging: {enabled: false} // Disable logging for benchmarks
// });

// Mock request and response objects for testing
const createMockRequest = (method = "GET", url = "/", headers = {}) => ({
	method,
	url,
	headers: {
		host: "localhost:3000",
		"user-agent": "benchmark-test",
		...headers
	},
	connection: {
		remoteAddress: "127.0.0.1"
	},
	socket: {
		server: {
			_connectionKey: "6::::3000"
		}
	}
});

const createMockResponse = () => {
	const headers = new Map();
	const response = {
		statusCode: 200,
		headersSent: false,
		setHeader: (name, value) => headers.set(name.toLowerCase(), value),
		getHeader: name => headers.get(name.toLowerCase()),
		removeHeader: name => headers.delete(name.toLowerCase()),
		setHeaders: hdrs => {
			if (hdrs instanceof Map) {
				for (const [key, value] of hdrs) {
					headers.set(key.toLowerCase(), value);
				}
			}
		},
		writeHead: (statusCode, statusMessage, hdrs) => {
			response.statusCode = statusCode;
			if (hdrs) {
				Object.entries(hdrs).forEach(([key, value]) => {
					headers.set(key.toLowerCase(), value);
				});
			}
		},
		end: () => {
			response.headersSent = true;
		},
		on: () => {},
		emit: () => {},
		pipe: () => {},
		headers: headers,
		// Add woodland-specific methods
		header: (name, value) => headers.set(name.toLowerCase(), value),
		error: (status = 500) => {
			response.statusCode = status;
			response.end();
		},
		redirect: (url, permanent = true) => {
			response.statusCode = permanent ? 308 : 307;
			headers.set("location", url);
			response.end();
		},
		send: (body, status = 200) => {
			response.statusCode = status;
			response.end(body);
		}
	};

	return response;
};

// Test file contents of different sizes
const testContents = {
	small: "Hello World",
	medium: "A".repeat(1000),
	large: "B".repeat(10000),
	xlarge: "C".repeat(100000)
};

/**
 * Setup test files for benchmarking
 */
function setupTestFiles () {
	try {
		mkdirSync(testDir, {recursive: true});

		// Create files of different sizes
		writeFileSync(join(testDir, "small.txt"), testContents.small);
		writeFileSync(join(testDir, "medium.txt"), testContents.medium);
		writeFileSync(join(testDir, "large.txt"), testContents.large);
		writeFileSync(join(testDir, "xlarge.txt"), testContents.xlarge);

		// Create different file types
		writeFileSync(join(testDir, "test.js"), 'console.log("test");');
		writeFileSync(join(testDir, "test.css"), "body { color: red; }");
		writeFileSync(join(testDir, "test.json"), '{"test": true}');
		writeFileSync(join(testDir, "test.html"), "<html><body>Test</body></html>");
		writeFileSync(join(testDir, "test.xml"), '<?xml version="1.0"?><root>test</root>');

		// Create binary-like file
		const binaryData = Buffer.from(Array.from({length: 1000}, (_, i) => i % 256));
		writeFileSync(join(testDir, "binary.dat"), binaryData);

		// Create subdirectory with files
		mkdirSync(join(testDir, "subdir"), {recursive: true});
		writeFileSync(join(testDir, "subdir", "nested.txt"), "Nested file content");
		writeFileSync(join(testDir, "subdir", "index.html"), "<html><body>Index</body></html>");

	} catch (error) {
		console.warn("Could not setup test files:", error.message);
	}
}

/**
 * Cleanup test files after benchmarking
 */
function cleanupTestFiles () {
	try {
		rmSync(testDir, {recursive: true, force: true});
	} catch (error) {
		console.warn("Could not cleanup test files:", error.message);
	}
}

// Setup test files
setupTestFiles();

/**
 * Benchmark serve() function for small files
 */
async function benchmarkServeSmallFile () {
	const freshApp = woodland({
		cacheSize: 1000,
		cacheTTL: 10000,
		etags: true,
		logging: {enabled: false}
	});

	const req = createMockRequest("GET", "/small.txt");
	req.parsed = {pathname: "/small.txt"};
	const res = createMockResponse();

	return await freshApp.serve(req, res, "small.txt", testDir);
}

/**
 * Benchmark serve() function for medium files
 */
async function benchmarkServeMediumFile () {
	const freshApp = woodland({
		cacheSize: 1000,
		cacheTTL: 10000,
		etags: true,
		logging: {enabled: false}
	});

	const req = createMockRequest("GET", "/medium.txt");
	req.parsed = {pathname: "/medium.txt"};
	const res = createMockResponse();

	return await freshApp.serve(req, res, "medium.txt", testDir);
}

/**
 * Benchmark serve() function for large files
 */
async function benchmarkServeLargeFile () {
	const freshApp = woodland({
		cacheSize: 1000,
		cacheTTL: 10000,
		etags: true,
		logging: {enabled: false}
	});

	const req = createMockRequest("GET", "/large.txt");
	req.parsed = {pathname: "/large.txt"};
	const res = createMockResponse();

	return await freshApp.serve(req, res, "large.txt", testDir);
}

/**
 * Benchmark serve() function for different file types
 */
async function benchmarkServeDifferentTypes () {
	const freshApp = woodland({
		cacheSize: 1000,
		cacheTTL: 10000,
		etags: true,
		logging: {enabled: false}
	});

	const files = ["test.js", "test.css", "test.json", "test.html", "test.xml", "binary.dat"];
	const file = files[Math.floor(Math.random() * files.length)];

	const req = createMockRequest("GET", `/${file}`);
	req.parsed = {pathname: `/${file}`};
	const res = createMockResponse();

	return await freshApp.serve(req, res, file, testDir);
}

/**
 * Benchmark serve() function for HEAD requests
 */
async function benchmarkServeHeadRequest () {
	const freshApp = woodland({
		cacheSize: 1000,
		cacheTTL: 10000,
		etags: true,
		logging: {enabled: false}
	});

	const req = createMockRequest("HEAD", "/medium.txt");
	req.parsed = {pathname: "/medium.txt"};
	const res = createMockResponse();

	return await freshApp.serve(req, res, "medium.txt", testDir);
}

/**
 * Benchmark serve() function for OPTIONS requests
 */
async function benchmarkServeOptionsRequest () {
	const freshApp = woodland({
		cacheSize: 1000,
		cacheTTL: 10000,
		etags: true,
		logging: {enabled: false}
	});

	const req = createMockRequest("OPTIONS", "/medium.txt");
	req.parsed = {pathname: "/medium.txt"};
	const res = createMockResponse();

	return await freshApp.serve(req, res, "medium.txt", testDir);
}

/**
 * Benchmark serve() function for non-existent files
 */
async function benchmarkServeNotFound () {
	const freshApp = woodland({
		cacheSize: 1000,
		cacheTTL: 10000,
		etags: true,
		logging: {enabled: false}
	});

	const req = createMockRequest("GET", "/notfound.txt");
	req.parsed = {pathname: "/notfound.txt"};
	const res = createMockResponse();

	return await freshApp.serve(req, res, "notfound.txt", testDir);
}

/**
 * Benchmark serve() function for directory requests
 */
async function benchmarkServeDirectory () {
	const freshApp = woodland({
		cacheSize: 1000,
		cacheTTL: 10000,
		etags: true,
		logging: {enabled: false}
	});

	const req = createMockRequest("GET", "/subdir/");
	req.parsed = {pathname: "/subdir/"};
	const res = createMockResponse();

	return await freshApp.serve(req, res, "subdir", testDir);
}

/**
 * Benchmark serve() function for directory without trailing slash
 */
async function benchmarkServeDirectoryRedirect () {
	const freshApp = woodland({
		cacheSize: 1000,
		cacheTTL: 10000,
		etags: true,
		logging: {enabled: false}
	});

	const req = createMockRequest("GET", "/subdir");
	req.parsed = {pathname: "/subdir", search: ""};
	const res = createMockResponse();

	return await freshApp.serve(req, res, "subdir", testDir);
}

/**
 * Benchmark serve() function with autoindex enabled
 */
async function benchmarkServeAutoindex () {
	const freshApp = woodland({
		cacheSize: 1000,
		cacheTTL: 10000,
		etags: true,
		autoindex: true,
		logging: {enabled: false}
	});

	const req = createMockRequest("GET", "/subdir/");
	req.parsed = {pathname: "/subdir/"};
	const res = createMockResponse();

	// Create a subdirectory to test autoindex with
	const subdir = join(testDir, "subdir");
	if (!existsSync(subdir)) {
		mkdirSync(subdir, {recursive: true});
		writeFileSync(join(subdir, "file1.txt"), "Test file 1");
		writeFileSync(join(subdir, "file2.html"), "<h1>Test HTML</h1>");
	}

	return await freshApp.serve(req, res, "subdir", testDir);
}

/**
 * Benchmark serve() function with range requests
 */
async function benchmarkServeRangeRequest () {
	const freshApp = woodland({
		cacheSize: 1000,
		cacheTTL: 10000,
		etags: true,
		logging: {enabled: false}
	});

	const req = createMockRequest("GET", "/large.txt", {
		range: "bytes=0-1023"
	});
	req.parsed = {pathname: "/large.txt"};
	const res = createMockResponse();

	return await freshApp.serve(req, res, "large.txt", testDir);
}

/**
 * Benchmark stream() function with small files
 */
function benchmarkStreamSmallFile () {
	const freshApp = woodland({
		cacheSize: 1000,
		cacheTTL: 10000,
		etags: true,
		logging: {enabled: false}
	});

	const req = createMockRequest("GET", "/small.txt");
	const res = createMockResponse();

	const file = {
		charset: "utf-8",
		etag: "test-etag",
		path: join(testDir, "small.txt"),
		stats: {
			mtime: new Date(),
			size: testContents.small.length
		}
	};

	return freshApp.stream(req, res, file);
}

/**
 * Benchmark stream() function with different HTTP methods
 */
function benchmarkStreamDifferentMethods () {
	const freshApp = woodland({
		cacheSize: 1000,
		cacheTTL: 10000,
		etags: true,
		logging: {enabled: false}
	});

	const methods = ["GET", "HEAD", "OPTIONS"];
	const method = methods[Math.floor(Math.random() * methods.length)];

	const req = createMockRequest(method, "/test.txt");
	const res = createMockResponse();

	const file = {
		charset: "utf-8",
		etag: "test-etag",
		path: join(testDir, "small.txt"),
		stats: {
			mtime: new Date(),
			size: testContents.small.length
		}
	};

	return freshApp.stream(req, res, file);
}

/**
 * Benchmark stream() function with ETags
 */
function benchmarkStreamWithEtags () {
	const freshApp = woodland({
		cacheSize: 1000,
		cacheTTL: 10000,
		etags: true,
		logging: {enabled: false}
	});

	const req = createMockRequest("GET", "/test.txt");
	const res = createMockResponse();

	const file = {
		charset: "utf-8",
		etag: '"test-etag-value"',
		path: join(testDir, "small.txt"),
		stats: {
			mtime: new Date(),
			size: testContents.small.length
		}
	};

	return freshApp.stream(req, res, file);
}

/**
 * Benchmark stream() function without ETags
 */
function benchmarkStreamWithoutEtags () {
	const freshApp = woodland({
		cacheSize: 1000,
		cacheTTL: 10000,
		etags: false,
		logging: {enabled: false}
	});

	const req = createMockRequest("GET", "/test.txt");
	const res = createMockResponse();

	const file = {
		charset: "utf-8",
		etag: "",
		path: join(testDir, "small.txt"),
		stats: {
			mtime: new Date(),
			size: testContents.small.length
		}
	};

	return freshApp.stream(req, res, file);
}

/**
 * Benchmark files() method - static file serving setup
 */
function benchmarkFilesMethod () {
	const freshApp = woodland({
		cacheSize: 1000,
		cacheTTL: 10000,
		etags: true,
		logging: {enabled: false}
	});

	const roots = ["/", "/static", "/assets", "/public"];
	const root = roots[Math.floor(Math.random() * roots.length)];

	return freshApp.files(root, testDir);
}

/**
 * Benchmark ETag generation
 */
function benchmarkEtagGeneration () {
	const freshApp = woodland({
		cacheSize: 1000,
		cacheTTL: 10000,
		etags: true,
		logging: {enabled: false}
	});

	const methods = ["GET", "HEAD", "OPTIONS"];
	const method = methods[Math.floor(Math.random() * methods.length)];

	const args = [12345, 1000, Date.now()]; // inode, size, mtime

	return freshApp.etag(method, ...args);
}

// Export benchmark functions
export default {
	"serve() - small file": benchmarkServeSmallFile,
	"serve() - medium file": benchmarkServeMediumFile,
	"serve() - large file": benchmarkServeLargeFile,
	"serve() - different types": benchmarkServeDifferentTypes,
	"serve() - HEAD request": benchmarkServeHeadRequest,
	"serve() - OPTIONS request": benchmarkServeOptionsRequest,
	"serve() - not found": benchmarkServeNotFound,
	"serve() - directory": benchmarkServeDirectory,
	"serve() - directory redirect": benchmarkServeDirectoryRedirect,
	"serve() - autoindex": benchmarkServeAutoindex,
	"serve() - range request": benchmarkServeRangeRequest,
	"stream() - small file": benchmarkStreamSmallFile,
	"stream() - different methods": benchmarkStreamDifferentMethods,
	"stream() - with ETags": benchmarkStreamWithEtags,
	"stream() - without ETags": benchmarkStreamWithoutEtags,
	"files() - static serving": benchmarkFilesMethod,
	"etag() - generation": benchmarkEtagGeneration
};

// Cleanup function to be called after benchmarks
export function cleanup () {
	cleanupTestFiles();
}
