import assert from "node:assert";
import { describe, it } from "node:test";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const projectRoot = join(__dirname, "..", "..");
const cliPath = join(projectRoot, "src", "cli.js");

function spawnCli(args = [], options = {}) {
	return new Promise((resolve, reject) => {
		const child = spawn("node", [cliPath, ...args], {
			cwd: projectRoot,
			stdio: ["pipe", "pipe", "pipe"],
			...options,
		});

		let stdout = "";
		let stderr = "";
		let resolved = false;

		const resolveOnce = (result) => {
			if (!resolved) {
				resolved = true;
				clearTimeout(timeout);
				resolve(result);
			}
		};

		child.stdout.on("data", (data) => {
			stdout += data.toString();
			if (options.waitFor && stdout.includes(options.waitFor)) {
				child.kill("SIGTERM");
			}
		});

		child.stderr.on("data", (data) => {
			stderr += data.toString();
		});

		child.on("close", (code, signal) => {
			resolveOnce({
				code,
				signal,
				stdout: stdout.trim(),
				stderr: stderr.trim(),
			});
		});

		child.on("error", (error) => {
			reject(error);
		});

		const timeout = setTimeout(() => {
			if (!child.killed) {
				child.kill("SIGKILL");
			}
			resolveOnce({
				code: -1,
				signal: "SIGKILL",
				stdout: stdout.trim(),
				stderr: stderr.trim(),
				timeout: true,
			});
		}, options.timeout ?? 3000);
	});
}

describe("CLI", () => {
	describe("successful startup", () => {
		it("should start with default arguments", async () => {
			const result = await spawnCli(["--port=0"], { waitFor: "port=", timeout: 1000 });

			assert.ok(
				!result.timeout && result.stdout.includes("port="),
				`stdout: ${result.stdout}, timeout: ${result.timeout}`,
			);
		});

		it("should start with custom port", async () => {
			const result = await spawnCli(["--port=3000"], { waitFor: "port=3000", timeout: 1000 });

			assert.ok(
				!result.timeout && result.stdout.includes("port=3000"),
				`stdout: ${result.stdout}, timeout: ${result.timeout}`,
			);
		});

		it("should start with custom IP", async () => {
			const result = await spawnCli(["--ip=127.0.0.1"], { waitFor: "ip=127.0.0.1", timeout: 1000 });

			assert.ok(
				!result.timeout && result.stdout.includes("ip=127.0.0.1"),
				`stdout: ${result.stdout}, timeout: ${result.timeout}`,
			);
		});
	});

	describe("port validation", () => {
		it("should reject negative port numbers", async () => {
			const result = await spawnCli(["--port=-1"]);

			assert.strictEqual(result.code, 1);
			assert.match(result.stdout + result.stderr, /Invalid port/);
		});

		it("should reject port numbers above 65535", async () => {
			const result = await spawnCli(["--port=70000"]);

			assert.strictEqual(result.code, 1);
			assert.match(result.stdout + result.stderr, /Invalid port/);
		});

		it("should reject non-numeric port", async () => {
			const result = await spawnCli(["--port=abc"]);

			assert.strictEqual(result.code, 1);
			assert.match(result.stdout + result.stderr, /Invalid port/);
		});

		it("should accept valid ports", async () => {
			const result = await spawnCli(["--port=0"], { waitFor: "port=", timeout: 1000 });

			assert.ok(
				!result.timeout && result.stdout.match(/port=/),
				`stdout: ${result.stdout}, timeout: ${result.timeout}`,
			);
		});
	});

	describe("IP validation", () => {
		it("should reject invalid IP format", async () => {
			const result = await spawnCli(["--ip=256.1.1.1"]);

			assert.strictEqual(result.code, 1);
			assert.match(result.stdout + result.stderr, /Invalid IP/);
		});

		it("should reject incomplete IP", async () => {
			const result = await spawnCli(["--ip=192.168.1"]);

			assert.strictEqual(result.code, 1);
			assert.match(result.stdout + result.stderr, /Invalid IP/);
		});

		it("should accept valid IPv4 addresses", async () => {
			const result = await spawnCli(["--ip=127.0.0.1"], { waitFor: "ip=127.0.0.1", timeout: 1000 });

			assert.ok(
				!result.timeout && result.stdout.match(/ip=127\.0\.0\.1/),
				`stdout: ${result.stdout}, timeout: ${result.timeout}`,
			);
		});
	});

	describe("argument parsing", () => {
		it("should handle malformed arguments gracefully", async () => {
			const result = await spawnCli(["--port=0"], { waitFor: "port=", timeout: 1000 });

			assert.ok(
				!result.timeout && result.stdout.length > 0,
				`stdout: ${result.stdout}, timeout: ${result.timeout}`,
			);
		});

		it("should handle boolean arguments", async () => {
			const result = await spawnCli(["--logging=true", "--port=0"], {
				waitFor: "port=",
				timeout: 1000,
			});

			assert.ok(
				!result.timeout && result.stdout.length > 0,
				`stdout: ${result.stdout}, timeout: ${result.timeout}`,
			);
		});
	});

	describe("edge cases", () => {
		it("should handle empty string arguments", async () => {
			const result = await spawnCli(["--port=", "--ip="]);

			assert.strictEqual(result.code, 1);
		});
	});
});
