import { createServer } from "node:http";
import { execSync } from "node:child_process";

const PORT_CONFIG = { port: 0, host: "127.0.0.1" };
const DATA = { message: "Hello World", timestamp: Date.now(), success: true };

// Start raw server
const rawServer = createServer((req, res) => {
	res.setHeader("Content-Type", "application/json");
	res.writeHead(200);
	res.end(JSON.stringify(DATA));
});
await new Promise((resolve) => rawServer.listen(PORT_CONFIG.port, PORT_CONFIG.host, resolve));
const rawPort = rawServer.address().port;
const rawUrl = `http://127.0.0.1:${rawPort}`;

// Start woodland server
const { woodland } = await import("../../dist/woodland.js");
const woodlandApp = woodland({
	cacheSize: 1000,
	cacheTTL: 10000,
	etags: false,
	logging: { enabled: false },
	time: false,
});
woodlandApp.get("/", (_req, res) => res.json(DATA));
const woodlandServer = createServer(woodlandApp.route);
await new Promise((resolve) => woodlandServer.listen(PORT_CONFIG.port, PORT_CONFIG.host, resolve));
const woodlandPort = woodlandServer.address().port;
const woodlandUrl = `http://127.0.0.1:${woodlandPort}`;

// Start Express server
const express = await import("express");
const expressApp = express.default();
expressApp.get("/", (_req, res) => res.json(DATA));
const expressServer = createServer(expressApp);
await new Promise((resolve) => expressServer.listen(PORT_CONFIG.port, PORT_CONFIG.host, resolve));
const expressPort = expressServer.address().port;
const expressUrl = `http://127.0.0.1:${expressPort}`;

// Start Fastify server
try {
	const fastify = await import("fastify");
	const fastifyApp = fastify.default({ logger: false });
	fastifyApp.get("/", async () => DATA);
	await fastifyApp.listen({ port: PORT_CONFIG.port, host: PORT_CONFIG.host });
	const fastifyUrl = `http://127.0.0.1:${fastifyApp.server.address().port}`;

	console.log("=== Framework Comparison Benchmarks ===\n");

	const benchmarks = [
		{ name: "Raw Node.js HTTP", url: rawUrl },
		{ name: "Woodland", url: woodlandUrl },
		{ name: "Express", url: expressUrl },
		{ name: "Fastify", url: fastifyUrl },
	];

	console.log("Running autocannon benchmarks (3s duration, 10 connections)...\n");

	for (const { name, url } of benchmarks) {
		console.log(`Running: ${name} (${url})`);
		try {
			const output = execSync(`npx --yes autocannon ${url} --duration 3 --connections 10`, {
				encoding: "utf-8",
			});
			console.log(output);
		} catch (err) {
			console.log(`  Error: ${err.message}\n`);
		}
	}

	// Cleanup fastify
	await fastifyApp.close();
} catch (err) {
	console.log("=== Framework Comparison Benchmarks ===\n");
	console.log(`Fastify unavailable (${err.message}), skipping\n`);

	console.log("Running autocannon benchmarks (3s duration, 10 connections)...\n");

	const benchmarks = [
		{ name: "Raw Node.js HTTP", url: rawUrl },
		{ name: "Woodland", url: woodlandUrl },
		{ name: "Express", url: expressUrl },
	];

	for (const { name, url } of benchmarks) {
		console.log(`Running: ${name} (${url})`);
		try {
			const output = execSync(`npx --yes autocannon ${url} --duration 3 --connections 10`, {
				encoding: "utf-8",
			});
			console.log(output);
		} catch (err) {
			console.log(`  Error: ${err.message}\n`);
		}
	}
}

// Cleanup servers
rawServer.close();
woodlandServer.close();
expressServer.close();

console.log("\nBenchmark complete!");
