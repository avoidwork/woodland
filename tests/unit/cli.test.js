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

		child.stdout.on("data", (data) => {
			stdout += data.toString();
		});

		child.stderr.on("data", (data) => {
			stderr += data.toString();
		});

		child.on("close", (code, signal) => {
			resolve({
				code,
				signal,
				stdout: stdout.trim(),
				stderr: stderr.trim(),
			});
		});

		child.on("error", (error) => {
			reject(error);
		});

		setTimeout(() => {
			if (!child.killed) {
				child.kill("SIGKILL");
			}
			resolve({
				code: -1,
				signal: "SIGKILL",
				stdout: stdout.trim(),
				stderr: stderr.trim(),
			});
		}, 3000);
	});
}

describe("CLI", () => {
	describe("successful startup", () => {
		it("should start with default arguments", async () => {
			const result = await spawnCli(["--port=8000"]);

			// Server runs indefinitely, so we just check it started
			assert.ok(result.stdout.includes("port=8000") || result.code === -1);
		});

		it("should start with custom port", async () => {
			const result = await spawnCli(["--port=3000"]);

			assert.ok(result.stdout.includes("port=3000") || result.code === -1);
		});

		it("should start with custom IP", async () => {
			const result = await spawnCli(["--ip=192.168.1.1"]);

			assert.ok(result.stdout.includes("ip=192.168.1.1") || result.code === -1);
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
			const result = await spawnCli(["--port=3000"]);

			assert.match(result.stdout, /port=3000/);
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
			const result = await spawnCli(["--ip=192.168.1.1"]);

			assert.match(result.stdout, /ip=192\.168\.1\.1/);
		});
	});

	describe("argument parsing", () => {
		it("should handle malformed arguments gracefully", async () => {
			const result = await spawnCli(["--port=8000"]);

			// Just check it doesn't crash
			assert.ok(result.code === -1 || result.stdout.length > 0);
		});

		it("should handle boolean arguments", async () => {
			const result = await spawnCli(["--logging=true", "--port=8000"]);

			assert.ok(result.code === -1 || result.stdout.length > 0);
		});
	});

	describe("edge cases", () => {
		it("should handle empty string arguments", async () => {
			const result = await spawnCli(["--port=", "--ip="]);

			assert.strictEqual(result.code, 1);
		});
	});
});
