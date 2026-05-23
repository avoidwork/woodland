#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const MICRO_DIR = join(__dirname, "micro");
const MACRO_DIR = join(__dirname, "macro");

const SUITES = {
	micro: { dir: MICRO_DIR, type: "tinybench" },
	macro: { dir: MACRO_DIR, type: "autocannon" },
	comparison: { dir: MACRO_DIR, file: "comparison.js", type: "autocannon" },
	http: { dir: MACRO_DIR, file: "http.js", type: "autocannon" },
};

function printHelp() {
	console.log(`
Usage: node benchmarks/run.js [options] [suite-names...]

Options:
  --help, -h   Show this help message
  --suite      Run only specified suites (comma-separated)

Examples:
  node benchmarks/run.js                    # Run all benchmarks
  node benchmarks/run.js micro macro        # Run micro and macro suites
  node benchmarks/run.js --suite comparison  # Run only comparison
`);
}

async function runTinybenchSuite(suiteName, dir) {
	console.log(`\n=== ${suiteName.toUpperCase()} BENCHMARKS ===`);
	try {
		execFileSync("node", ["--test", `${dir}/*.bench.js`], {
			cwd: __dirname,
			stdio: "inherit",
		});
		console.log(`\n✓ ${suiteName} benchmarks passed`);
	} catch (error) {
		console.error(`\n✗ ${suiteName} benchmarks failed:`, error.message);
		process.exit(1);
	}
}

async function runAutocannonSuite(suiteName, dir, file) {
	console.log(`\n=== ${suiteName.toUpperCase()} BENCHMARK ===`);
	const script = file || `${suiteName}.js`;
	const scriptPath = join(dir, script);
	try {
		execFileSync("node", [scriptPath], {
			cwd: dir,
			stdio: "inherit",
		});
		console.log(`\n✓ ${suiteName} benchmark passed`);
	} catch (error) {
		console.error(`\n✗ ${suiteName} benchmark failed:`, error.message);
	}
}

async function main() {
	const args = process.argv.slice(2);
	const suitesToRun = [];
	if (args.includes("--help") || args.includes("-h")) {
		printHelp();
		process.exit(0);
	}

	// Parse arguments
	for (let i = 0; i < args.length; i++) {
		if (args[i] === "--suite" || args[i] === "-s") {
			const suiteList = args[++i];
			suitesToRun.push(...suiteList.split(",").map((s) => s.trim()));
		} else if (!args[i].startsWith("-")) {
			suitesToRun.push(args[i]);
		}
	}

	if (suitesToRun.length === 0) {
		suitesToRun.push(...Object.keys(SUITES));
	}

	const startTime = Date.now();
	console.log(`Starting benchmarks: ${suitesToRun.join(", ")}`);

	for (const suiteName of suitesToRun) {
		const suite = SUITES[suiteName];
		if (!suite) {
			console.error(`Unknown suite: ${suiteName}`);
			console.error(`Available suites: ${Object.keys(SUITES).join(", ")}`);
			process.exit(1);
		}

		if (suiteName === "comparison") {
			console.log("\nInstalling Express and Fastify for comparison benchmark...");
			try {
				execFileSync("npm", ["install", "express", "fastify", "--no-save"], {
					cwd: join(__dirname, ".."),
					stdio: "pipe",
				});
				await runAutocannonSuite(suiteName, suite.dir, suite.file);
				execFileSync("npm", ["uninstall", "express", "fastify", "--no-save"], {
					cwd: join(__dirname, ".."),
					stdio: "pipe",
				});
				console.log(`\n✓ ${suiteName} benchmark passed`);
			} catch (error) {
				console.error(`\n✗ ${suiteName} benchmark failed:`, error.message);
			}
		} else if (suite.type === "tinybench" && suite.dir) {
			await runTinybenchSuite(suiteName, suite.dir);
		} else if (suite.type === "autocannon" && suite.dir) {
			await runAutocannonSuite(suiteName, suite.dir, suite.file);
		}
	}

	const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
	console.log(`\n=== BENCHMARKS COMPLETE ===`);
	console.log(`Total time: ${totalTime}s`);
}

main().catch(console.error);
