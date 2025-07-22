import {createServer} from "node:http";
import express from "express";
import {woodland} from "../dist/woodland.js";

// Test server configuration
const SERVER_CONFIG = {
	port: 0, // Use random available port
	host: "127.0.0.1"
};

// Server instances
let rawServer = null;
let woodlandServer = null;
let expressServer = null;
let rawServerUrl = null;
let woodlandServerUrl = null;
let expressServerUrl = null;

/**
 * Creates a raw Node.js HTTP server for JSON responses
 * @returns {Object} HTTP server instance
 */
function createRawServer () {
	return createServer((req, res) => {
		// Set headers
		res.setHeader("Content-Type", "application/json; charset=utf-8");
		res.setHeader("X-Powered-By", "nodejs");

		// Simple JSON response
		const data = {
			message: "Hello World",
			timestamp: Date.now(),
			success: true
		};

		res.writeHead(200);
		res.end(JSON.stringify(data));
	});
}

/**
 * Creates a Woodland server for JSON responses
 * @returns {Object} Woodland app instance
 */
function createWoodlandServer () {
	const app = woodland({
		cacheSize: 1000,
		cacheTTL: 10000,
		etags: false, // Disable for fair comparison
		logging: {enabled: false}, // Disable logging for benchmarks
		time: false // Disable timing for fair comparison
	});

	app.get("/", (req, res) => {
		res.json({
			message: "Hello World",
			timestamp: Date.now(),
			success: true
		});
	});

	return app;
}

/**
 * Creates an Express server for JSON responses
 * @returns {Object} Express app instance
 */
function createExpressServer () {
	const app = express();

	app.get("/", (req, res) => {
		res.json({
			message: "Hello World",
			timestamp: Date.now(),
			success: true
		});
	});

	return app;
}

/**
 * Starts the raw Node.js HTTP server
 * @returns {Promise<void>}
 */
async function startRawServer () {
	if (rawServer) {
		return Promise.resolve(); // Already started
	}

	rawServer = createRawServer();

	return new Promise((resolve, reject) => {
		rawServer.listen(SERVER_CONFIG.port, SERVER_CONFIG.host, () => {
			const address = rawServer.address();
			rawServerUrl = `http://${address.address}:${address.port}`;
			resolve();
		});

		rawServer.on("error", reject);
	});
}

/**
 * Starts the Woodland server
 * @returns {Promise<void>}
 */
async function startWoodlandServer () {
	if (woodlandServer) {
		return Promise.resolve(); // Already started
	}

	const app = createWoodlandServer();
	woodlandServer = createServer(app.route);

	return new Promise((resolve, reject) => {
		woodlandServer.listen(SERVER_CONFIG.port, SERVER_CONFIG.host, () => {
			const address = woodlandServer.address();
			woodlandServerUrl = `http://${address.address}:${address.port}`;
			resolve();
		});

		woodlandServer.on("error", reject);
	});
}

/**
 * Stops the raw server
 * @returns {Promise<void>}
 */
async function stopRawServer () {
	if (!rawServer) {
		return Promise.resolve();
	}

	return new Promise(resolve => {
		rawServer.close(() => {
			rawServer = null;
			rawServerUrl = null;
			resolve();
		});
	});
}

/**
 * Stops the Woodland server
 * @returns {Promise<void>}
 */
async function stopWoodlandServer () {
	if (!woodlandServer) {
		return Promise.resolve();
	}

	return new Promise(resolve => {
		woodlandServer.close(() => {
			woodlandServer = null;
			woodlandServerUrl = null;
			resolve();
		});
	});
}

/**
 * Starts the Express server
 * @returns {Promise<void>}
 */
async function startExpressServer () {
	if (expressServer) {
		return Promise.resolve(); // Already started
	}

	const app = createExpressServer();
	expressServer = createServer(app);

	return new Promise((resolve, reject) => {
		expressServer.listen(SERVER_CONFIG.port, SERVER_CONFIG.host, () => {
			const address = expressServer.address();
			expressServerUrl = `http://${address.address}:${address.port}`;
			resolve();
		});

		expressServer.on("error", reject);
	});
}

/**
 * Stops the Express server
 * @returns {Promise<void>}
 */
async function stopExpressServer () {
	if (!expressServer) {
		return Promise.resolve();
	}

	return new Promise(resolve => {
		expressServer.close(() => {
			expressServer = null;
			expressServerUrl = null;
			resolve();
		});
	});
}

/**
 * Makes an HTTP request to a server
 * @param {string} url - Server URL
 * @returns {Promise<Object>} Response data
 */
async function makeRequest (url) {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`HTTP ${response.status}: ${response.statusText}`);
	}

	return response.json();
}

/**
 * Benchmark raw Node.js HTTP server JSON response
 */
function benchmarkRawServer () {
	return makeRequest(rawServerUrl);
}

/**
 * Benchmark Woodland JSON response
 */
function benchmarkWoodlandServer () {
	return makeRequest(woodlandServerUrl);
}

/**
 * Benchmark Express JSON response
 */
function benchmarkExpressServer () {
	return makeRequest(expressServerUrl);
}

/**
 * Initialize servers for comparison benchmarks
 * @returns {Promise<void>}
 */
async function initializeComparisonServers () {
	await Promise.all([
		startRawServer(),
		startWoodlandServer(),
		startExpressServer()
	]);
}

/**
 * Cleanup servers after comparison benchmarks
 * @returns {Promise<void>}
 */
async function cleanupComparisonServers () {
	await Promise.all([
		stopRawServer(),
		stopWoodlandServer(),
		stopExpressServer()
	]);
}

// Initialize servers when module loads
await initializeComparisonServers();

// Export benchmark functions
const benchmarks = {
	"raw Node.js HTTP server": benchmarkRawServer,
	"Express.js framework": benchmarkExpressServer,
	"Woodland framework": benchmarkWoodlandServer
};

// Add cleanup function to benchmark exports
benchmarks.cleanup = cleanupComparisonServers;

export default benchmarks;

// Cleanup when process exits
process.on("exit", () => {
	cleanupComparisonServers();
});

process.on("SIGINT", () => {
	cleanupComparisonServers();
	process.exit(0);
});
