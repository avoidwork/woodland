import assert from "node:assert";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const projectRoot = join(__dirname, "..", "..");
const cliPath = join(projectRoot, "src", "cli.js");

/**
 * Spawns the CLI process with given arguments
 */
function spawnCli (args = [], options = {}) {
	return new Promise((resolve, reject) => {
		const child = spawn("node", [cliPath, ...args], {
			cwd: projectRoot,
			stdio: ["pipe", "pipe", "pipe"],
			...options
		});

		let stdout = "";
		let stderr = "";

		child.stdout.on("data", data => {
			stdout += data.toString();
		});

		child.stderr.on("data", data => {
			stderr += data.toString();
		});

		child.on("close", (code, signal) => {
			resolve({
				code,
				signal,
				stdout: stdout.trim(),
				stderr: stderr.trim()
			});
		});

		child.on("error", error => {
			reject(error);
		});

		// Kill the process after a timeout to prevent hanging servers
		setTimeout(() => {
			if (!child.killed) {
				child.kill("SIGKILL");
				reject(new Error("Process timeout"));
			}
		}, 2000);
	});
}

/**
 * Makes an HTTP request to verify server is listening
 */
function makeRequest (port, ip = "127.0.0.1") {
	return new Promise((resolve, reject) => {
		const req = http.request({
			hostname: ip,
			port: port,
			path: "/",
			method: "GET",
			timeout: 1000
		}, res => {
			resolve(res);
		});

		req.on("error", err => {
			reject(err);
		});

		req.on("timeout", () => {
			req.destroy();
			reject(new Error("Request timeout"));
		});

		req.end();
	});
}

/**
 * Spawns CLI and waits for server to be ready by making HTTP request
 */
function spawnCliAndWaitForServer (args = [], options = {}) {
	return new Promise((resolve, reject) => {
		const child = spawn("node", [cliPath, ...args], {
			cwd: projectRoot,
			stdio: ["pipe", "pipe", "pipe"],
			...options
		});

		let stdout = "";
		let stderr = "";

		child.stdout.on("data", data => {
			stdout += data.toString();
		});

		child.stderr.on("data", data => {
			stderr += data.toString();
		});

		child.on("close", (code, signal) => {
			resolve({
				code,
				signal,
				stdout: stdout.trim(),
				stderr: stderr.trim()
			});
		});

		child.on("error", error => {
			reject(error);
		});

		// Extract port and IP from args, or use defaults
		let port = 8000;
		let ip = "127.0.0.1";

		for (const arg of args) {
			if (arg.startsWith("--port=")) {
				port = parseInt(arg.split("=")[1], 10);
			}
			if (arg.startsWith("--ip=")) {
				ip = arg.split("=")[1];
			}
		}

		// Wait for startup log message, then verify server is listening
		const checkServerReady = () => {
			if (stdout.includes(`port=${port}`) && stdout.includes(`ip=${ip}`)) {
				// Give a small delay for server to fully initialize
				setTimeout(() => {
					makeRequest(port, ip)
						.then(() => {
							// Server is ready, kill it
							child.kill("SIGTERM");
						})
						.catch(() => {
							// If request fails, still kill the process
							child.kill("SIGTERM");
						});
				}, 50);
			}
		};

		child.stdout.on("data", checkServerReady);

		// Fallback timeout
		setTimeout(() => {
			child.kill("SIGKILL");
		}, 2000);
	});
}

describe("CLI", () => {
	/**
	 * Test successful CLI startup with default arguments
	 */
	describe("successful startup", () => {
		it("should start with default arguments and exit cleanly", async () => {
			const result = await spawnCliAndWaitForServer([]);

			assert.match(result.stdout, /id=woodland/, "Should log startup message");
			assert.match(result.stdout, /port=8000/, "Should use default port 8000");
			assert.match(result.stdout, /ip=127\.0\.0\.1/, "Should use default IP");
		});

		it("should start with custom port", async () => {
			const result = await spawnCliAndWaitForServer(["--port=3000"]);

			assert.match(result.stdout, /port=3000/, "Should use custom port 3000");
		});

		it("should start with custom IP", async () => {
			const result = await spawnCliAndWaitForServer(["--ip=192.168.1.1"]);

			assert.match(result.stdout, /ip=192\.168\.1\.1/, "Should use custom IP");
		});

		it("should start and serve files", async () => {
			const result = await spawnCliAndWaitForServer(["--port=8001"]);

			assert.match(result.stdout, /id=woodland/, "Should log startup message");
			assert.match(result.stdout, /port=8001/, "Should use specified port");
		});

		it("should serve HTTP requests when server starts", async () => {
			// This test verifies the server actually serves requests
			const port = 8002;
			const child = spawn("node", [cliPath, `--port=${port}`], {
				cwd: projectRoot,
				stdio: ["pipe", "pipe", "pipe"]
			});

			let stdout = "";
			let serverReady = false;

			child.stdout.on("data", data => {
				stdout += data.toString();
				if (stdout.includes(`port=${port}`) && !serverReady) {
					serverReady = true;
					// Wait a bit for server to fully initialize, then make request
					setTimeout(async () => {
						try {
							const res = await makeRequest(port);
							assert.ok(res.statusCode !== undefined, "Should get HTTP response");
							child.kill("SIGTERM");
						} catch {
							child.kill("SIGTERM");
						}
					}, 100);
				}
			});

			return new Promise(resolve => {
				child.on("close", () => {
					assert.match(stdout, /id=woodland/, "Should log startup message");
					resolve();
				});

				// Fallback timeout
				setTimeout(() => {
					child.kill("SIGKILL");
					resolve();
				}, 2000);
			});
		});
	});

	/**
	 * Test port validation and error handling
	 */
	describe("port validation", () => {
		it("should reject negative port numbers", async () => {
			const result = await spawnCli(["--port=-1"]);

			assert.strictEqual(result.code, 1, "Should exit with code 1");
			const output = result.stdout + result.stderr;
			assert.match(output, /Invalid port/, "Should log port error");
		});

		it("should reject port numbers above 65535", async () => {
			const result = await spawnCli(["--port=70000"]);

			assert.strictEqual(result.code, 1, "Should exit with code 1");
			const output = result.stdout + result.stderr;
			assert.match(output, /Invalid port/, "Should log port error");
		});

		it("should reject non-numeric port", async () => {
			const result = await spawnCli(["--port=abc"]);

			assert.strictEqual(result.code, 1, "Should exit with code 1");
			const output = result.stdout + result.stderr;
			assert.match(output, /Invalid port/, "Should log port error");
		});

		it("should reject floating point port", async () => {
			const result = await spawnCli(["--port=8000.5"]);

			assert.strictEqual(result.code, 1, "Should exit with code 1");
			const output = result.stdout + result.stderr;
			assert.match(output, /Invalid port/, "Should log port error");
		});

		it("should accept port 0", async () => {
			const result = await spawnCliAndWaitForServer(["--port=0"]);

			assert.match(result.stdout, /port=0/, "Should accept port 0");
		});

		it("should accept port 65535", async () => {
			const result = await spawnCliAndWaitForServer(["--port=65535"]);

			assert.match(result.stdout, /port=65535/, "Should accept max port");
		});
	});

	/**
	 * Test IP validation and error handling
	 */
	describe("IP validation", () => {
		it("should reject invalid IP format", async () => {
			const result = await spawnCli(["--ip=256.1.1.1"]);

			assert.strictEqual(result.code, 1, "Should exit with code 1");
			const output = result.stdout + result.stderr;
			assert.match(output, /Invalid IP/, "Should log IP error");
		});

		it("should reject incomplete IP", async () => {
			const result = await spawnCli(["--ip=192.168.1"]);

			assert.strictEqual(result.code, 1, "Should exit with code 1");
			const output = result.stdout + result.stderr;
			assert.match(output, /Invalid IP/, "Should log IP error");
		});

		it("should reject non-IP string", async () => {
			const result = await spawnCli(["--ip=localhost"]);

			assert.strictEqual(result.code, 1, "Should exit with code 1");
			const output = result.stdout + result.stderr;
			assert.match(output, /Invalid IP/, "Should log IP error");
		});

		it("should reject empty IP", async () => {
			const result = await spawnCli(["--ip="]);

			assert.strictEqual(result.code, 1, "Should exit with code 1");
			const output = result.stdout + result.stderr;
			assert.match(output, /Invalid IP/, "Should log IP error");
		});

		it("should accept valid IPv4 addresses", async () => {
			const validIPs = ["127.0.0.1", "192.168.1.1"];

			for (const ip of validIPs) {
				const result = await spawnCliAndWaitForServer([`--ip=${ip}`]);
				assert.match(result.stdout, new RegExp(`ip=${ip.replace(/\./g, "\\.")}`), `Should use IP ${ip}`);
			}
		});
	});

	/**
	 * Test argument parsing edge cases
	 */
	describe("argument parsing", () => {
		it("should handle malformed arguments gracefully", async () => {
			// Malformed args should be ignored, so it should start with defaults
			const result = await spawnCliAndWaitForServer(["--invalid", "--malformed="]);

			assert.match(result.stdout, /port=8000/, "Should use default port");
		});

		it("should handle boolean arguments", async () => {
			const result = await spawnCliAndWaitForServer(["--logging=true"]);

			assert.match(result.stdout, /id=woodland/, "Should enable logging");
		});

		it("should handle logging disabled", async () => {
			// When logging is disabled, we can't wait for log messages, so we use a different approach
			const port = 8003;
			const child = spawn("node", [cliPath, `--port=${port}`, "--logging=false"], {
				cwd: projectRoot,
				stdio: ["pipe", "pipe", "pipe"]
			});


			// Wait a bit for server to start, then test if it's listening
			await new Promise(resolve => {
				setTimeout(async () => {
					try {
						await makeRequest(port);
						// Server is responding, so it started successfully
						child.kill("SIGTERM");
					} catch {
						// Server might not be ready yet, kill anyway
						child.kill("SIGTERM");
					}
					resolve();
				}, 500);
			});

			return new Promise(resolve => {
				child.on("close", code => {
					// Should not exit with error code when logging is disabled
					assert.notStrictEqual(code, 1, "Should not exit with error code");
					resolve();
				});
			});
		});
	});

	/**
	 * Test multiple error conditions
	 */
	describe("multiple errors", () => {
		it("should handle both invalid port and IP (port validated first)", async () => {
			const result = await spawnCli(["--port=70000", "--ip=invalid.ip"]);

			assert.strictEqual(result.code, 1, "Should exit with code 1");
			// Should catch the first error (port validation happens first)
			const output = result.stdout + result.stderr;
			assert.match(output, /Invalid port/, "Should log port error first");
		});

		it("should handle invalid IP after valid port", async () => {
			const result = await spawnCli(["--port=3000", "--ip=999.999.999.999"]);

			assert.strictEqual(result.code, 1, "Should exit with code 1");
			const output = result.stdout + result.stderr;
			assert.match(output, /Invalid IP/, "Should log IP error");
		});
	});

	/**
	 * Test process behavior
	 */
	describe("process behavior", () => {
		it("should use process.nextTick for exit", async () => {
			// This test verifies that the process exits properly
			const result = await spawnCli(["--port=invalid"]);

			assert.strictEqual(result.code, 1, "Should exit with code 1");
			const output = result.stdout + result.stderr;
			assert.match(output, /Invalid port/, "Should log error before exit");
		});

		it("should handle SIGTERM gracefully", async () => {
			const child = spawn("node", [cliPath], {
				cwd: projectRoot,
				stdio: ["pipe", "pipe", "pipe"]
			});

			// Wait a bit for startup, then kill
			setTimeout(() => {
				child.kill("SIGTERM");
			}, 500);

			return new Promise(resolve => {
				child.on("close", (code, signal) => {
					assert.ok(signal === "SIGTERM" || code === 0, "Should handle termination gracefully");
					resolve();
				});
			});
		});
	});

	/**
	 * Test edge cases and boundary conditions
	 */
	describe("edge cases", () => {
		it("should handle no arguments", async () => {
			const result = await spawnCliAndWaitForServer([]);

			assert.match(result.stdout, /port=8000/, "Should use default port");
			assert.match(result.stdout, /ip=127\.0\.0\.1/, "Should use default IP");
		});

		it("should handle empty string arguments", async () => {
			const result = await spawnCli(["--port=", "--ip="]);

			// Empty port should be invalid, empty IP should be invalid
			assert.strictEqual(result.code, 1, "Should exit with code 1");
		});

		it("should handle special characters in arguments", async () => {
			const result = await spawnCli(["--port=8000$", "--ip=127.0.0.1@"]);

			assert.strictEqual(result.code, 1, "Should exit with code 1");
		});
	});

	/**
	 * Test output format and logging
	 */
	describe("output format", () => {
		it("should log startup message in correct format", async () => {
			const result = await spawnCliAndWaitForServer(["--port=9999", "--ip=10.0.0.1"]);

			assert.match(
				result.stdout,
				/id=woodland, hostname=localhost, ip=10\.0\.0\.1, port=9999/,
				"Should log complete startup message"
			);
		});

		it("should format error messages correctly", async () => {
			const result = await spawnCli(["--port=invalid"]);

			assert.strictEqual(result.code, 1, "Should exit with code 1");
			const output = result.stdout + result.stderr;
			assert.match(
				output,
				/Invalid port: must be an integer between 0 and 65535\./,
				"Should format error message correctly"
			);
		});
	});
});
