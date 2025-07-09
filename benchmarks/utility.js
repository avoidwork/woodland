// Note: Using source utility functions since they are not exported from dist
import {
	autoindex,
	getStatus,
	mime,
	ms,
	next,
	pad,
	params,
	parse,
	partialHeaders,
	pipeable,
	reduce,
	timeOffset,
	writeHead
} from "../src/utility.js";

// Test data for benchmarking
const testUrls = [
	"http://localhost:3000/",
	"http://localhost:3000/api/users",
	"http://localhost:3000/api/users/123",
	"http://localhost:3000/api/users/123/posts/456",
	"http://localhost:3000/static/css/style.css",
	"http://localhost:3000/static/js/app.js",
	"http://localhost:3000/static/images/logo.png",
	"http://localhost:3000/blog/my-awesome-post",
	"http://localhost:3000/category/tech/posts",
	"http://localhost:3000/search?q=test&page=1",
	"http://localhost:3000/api/v1/resource/123/nested/456?include=related",
	"http://localhost:3000/admin/dashboard#section",
	"http://localhost:8080/complex/path/with/many/segments",
	"https://example.com:8443/secure/api/endpoint",
	"http://127.0.0.1:5000/local/service"
];

const testFiles = [
	"style.css",
	"app.js",
	"logo.png",
	"favicon.ico",
	"index.html",
	"document.pdf",
	"image.jpg",
	"video.mp4",
	"audio.mp3",
	"data.json",
	"config.xml",
	"archive.zip",
	"text.txt",
	"presentation.pptx",
	"spreadsheet.xlsx",
	"executable.exe",
	"unknown.xyz",
	"no-extension"
];

const testTimeValues = [
	0,
	1000000,
	5000000,
	10000000,
	50000000,
	100000000,
	500000000,
	1000000000,
	5000000000,
	10000000000
];

const testNumbers = [
	0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
	25, 30, 35, 40, 45, 50, 55, 60, 99, 100, 999, 1000, 9999, 10000
];

const testTimezoneOffsets = [
	0, -60, -120, -180, -240, -300, -360, -420, -480, -540, -600, -660, -720,
	60, 120, 180, 240, 300, 360, 420, 480, 540, 600, 660, 720
];

// Mock request objects for testing
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
	return {
		statusCode: 200,
		headersSent: false,
		setHeader: (name, value) => headers.set(name.toLowerCase(), value),
		getHeader: (name) => headers.get(name.toLowerCase()),
		removeHeader: (name) => headers.delete(name.toLowerCase()),
		headers: headers,
		end: () => {}
	};
};

// Mock file objects for autoindex testing
const createMockFiles = () => [
	{name: "file1.txt", isDirectory: () => false},
	{name: "file2.js", isDirectory: () => false},
	{name: "image.png", isDirectory: () => false},
	{name: "subdirectory", isDirectory: () => true},
	{name: "document.pdf", isDirectory: () => false},
	{name: "another-folder", isDirectory: () => true},
	{name: "index.html", isDirectory: () => false},
	{name: "style.css", isDirectory: () => false},
	{name: "script.js", isDirectory: () => false},
	{name: "data.json", isDirectory: () => false}
];

/**
 * Benchmark parse() function - URL parsing
 */
function benchmarkParse () {
	const url = testUrls[Math.floor(Math.random() * testUrls.length)];
	return parse(url);
}

/**
 * Benchmark parse() function with request objects
 */
function benchmarkParseRequest () {
	const request = createMockRequest(
		"GET", 
		testUrls[Math.floor(Math.random() * testUrls.length)].replace(/^https?:\/\/[^\/]+/, "")
	);
	return parse(request);
}

/**
 * Benchmark mime() function - MIME type detection
 */
function benchmarkMime () {
	const filename = testFiles[Math.floor(Math.random() * testFiles.length)];
	return mime(filename);
}

/**
 * Benchmark ms() function - time formatting
 */
function benchmarkMs () {
	const time = testTimeValues[Math.floor(Math.random() * testTimeValues.length)];
	const digits = Math.floor(Math.random() * 5) + 1;
	return ms(time, digits);
}

/**
 * Benchmark pad() function - number padding
 */
function benchmarkPad () {
	const num = testNumbers[Math.floor(Math.random() * testNumbers.length)];
	return pad(num);
}

/**
 * Benchmark timeOffset() function - timezone offset formatting
 */
function benchmarkTimeOffset () {
	const offset = testTimezoneOffsets[Math.floor(Math.random() * testTimezoneOffsets.length)];
	return timeOffset(offset);
}

/**
 * Benchmark autoindex() function - directory listing generation
 */
function benchmarkAutoindex () {
	const title = "/test/directory";
	const files = createMockFiles();
	return autoindex(title, files);
}

/**
 * Benchmark getStatus() function - status code determination
 */
function benchmarkGetStatus () {
	const req = createMockRequest();
	const res = createMockResponse();
	
	// Set up various scenarios
	const scenarios = [
		{allow: "GET, POST, PUT, DELETE", method: "GET"},
		{allow: "GET, POST", method: "PUT"},
		{allow: "", method: "GET"},
		{allow: "GET", method: "GET"},
		{allow: "POST", method: "GET"}
	];
	
	const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
	req.allow = scenario.allow;
	req.method = scenario.method;
	
	// Randomize response status
	res.statusCode = Math.random() > 0.5 ? 200 : 500;
	
	return getStatus(req, res);
}

/**
 * Benchmark params() function - parameter extraction
 */
function benchmarkParams () {
	const req = createMockRequest();
	req.parsed = {pathname: "/users/123/posts/456/comments/789"};
	req.params = {};
	
	// Create a regex similar to what woodland uses
	const regex = /^\/users\/(?<userId>[^\/]+)\/posts\/(?<postId>[^\/]+)\/comments\/(?<commentId>[^\/]+)$/;
	
	return params(req, regex);
}

/**
 * Benchmark partialHeaders() function - range request headers
 */
function benchmarkPartialHeaders () {
	const req = createMockRequest();
	const res = createMockResponse();
	
	// Set up range request
	req.headers.range = "bytes=0-1023";
	
	const size = 10000;
	const status = 200;
	const headers = {};
	const options = {};
	
	return partialHeaders(req, res, size, status, headers, options);
}

/**
 * Benchmark pipeable() function - checks if content is pipeable
 */
function benchmarkPipeable () {
	const methods = ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS"];
	const method = methods[Math.floor(Math.random() * methods.length)];
	
	// Test with different types of content
	const contents = [
		"string content",
		{pipe: () => {}}, // Stream-like object
		Buffer.from("buffer content"),
		123,
		null,
		undefined,
		{toString: () => "object with toString"}
	];
	
	const content = contents[Math.floor(Math.random() * contents.length)];
	
	return pipeable(method, content);
}

/**
 * Benchmark reduce() function - route reduction
 */
function benchmarkReduce () {
	const uri = "/api/users/123/posts";
	const map = new Map();
	
	// Add some sample middleware
	map.set("/.∗", {
		handlers: [(req, res, next) => next()],
		params: false,
		regex: /^\/\.∗$/
	});
	
	map.set("/api/users/:id/posts", {
		handlers: [(req, res, next) => next()],
		params: true,
		regex: /^\/api\/users\/([^\/]+)\/posts$/
	});
	
	map.set("/api/users", {
		handlers: [(req, res, next) => next()],
		params: false,
		regex: /^\/api\/users$/
	});
	
	const arg = {
		getParams: null,
		middleware: [],
		params: false,
		visible: 0,
		exit: -1
	};
	
	return reduce(uri, map, arg);
}

/**
 * Benchmark writeHead() function - header writing
 */
function benchmarkWriteHead () {
	const res = createMockResponse();
	const headers = {
		"Content-Type": "application/json",
		"Cache-Control": "no-cache",
		"X-Custom-Header": "test-value",
		"Access-Control-Allow-Origin": "*"
	};
	
	return writeHead(res, headers);
}

/**
 * Benchmark next() function - middleware chain progression
 */
function benchmarkNext () {
	const req = createMockRequest();
	const res = createMockResponse();
	
	// Create a simple middleware iterator
	const middleware = [
		(req, res, next) => {
			req.step1 = true;
			next();
		},
		(req, res, next) => {
			req.step2 = true;
			next();
		},
		(req, res, next) => {
			req.step3 = true;
			res.send("OK");
		}
	];
	
	const iterator = middleware[Symbol.iterator]();
	const immediate = Math.random() > 0.5;
	
	return next(req, res, iterator, immediate);
}

/**
 * Benchmark URL parsing edge cases
 */
function benchmarkParseEdgeCases () {
	const edgeCaseUrls = [
		"http://localhost/",
		"https://example.com:8080/path?query=value#fragment",
		"http://[::1]:3000/ipv6",
		"http://user:pass@example.com/auth",
		"http://localhost/path with spaces",
		"http://localhost/path%20with%20encoded%20spaces",
		"http://localhost/path?multiple=queries&and=parameters",
		"http://localhost/path#fragment-only",
		"http://localhost:8080/port-specified"
	];
	
	const url = edgeCaseUrls[Math.floor(Math.random() * edgeCaseUrls.length)];
	return parse(url);
}

/**
 * Benchmark complex MIME type detection
 */
function benchmarkComplexMime () {
	const complexFiles = [
		"file.tar.gz",
		"document.docx",
		"presentation.pptx",
		"spreadsheet.xlsx",
		"image.jpeg",
		"audio.mp3",
		"video.mp4",
		"archive.zip",
		"text.txt",
		"script.js",
		"style.css",
		"data.json",
		"config.xml",
		"binary.exe",
		"library.dll",
		"package.deb",
		"installer.msi",
		"font.woff2",
		"vector.svg",
		"3d-model.obj"
	];
	
	const filename = complexFiles[Math.floor(Math.random() * complexFiles.length)];
	return mime(filename);
}

// Export benchmark functions
export default {
	"parse() - URL strings": benchmarkParse,
	"parse() - request objects": benchmarkParseRequest,
	"mime() - basic files": benchmarkMime,
	"mime() - complex files": benchmarkComplexMime,
	"ms() - time formatting": benchmarkMs,
	"pad() - number padding": benchmarkPad,
	"timeOffset() - timezone": benchmarkTimeOffset,
	"autoindex() - directory listing": benchmarkAutoindex,
	"getStatus() - status determination": benchmarkGetStatus,
	"params() - parameter extraction": benchmarkParams,
	"partialHeaders() - range headers": benchmarkPartialHeaders,
	"pipeable() - content check": benchmarkPipeable,
	"reduce() - route reduction": benchmarkReduce,
	"writeHead() - header writing": benchmarkWriteHead,
	"next() - middleware chain": benchmarkNext,
	"parse() - edge cases": benchmarkParseEdgeCases
}; 