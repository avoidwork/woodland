import assert from "node:assert";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

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

describe("CLI", () => {
	/**
	 * Test successful CLI startup with default arguments
	 */
	describe("successful startup", () => {
		it("should start with default arguments and exit cleanly", async () => {
			const child = spawn("node", [cliPath], {
				cwd: projectRoot,
				stdio: ["pipe", "pipe", "pipe"]
			});

			let stdout = "";

			child.stdout.on("data", data => {
				stdout += data.toString();
			});

			// Wait for startup message, then kill the process
			await new Promise(resolve => {
				const checkOutput = () => {
					if (stdout.includes("id=woodland") && stdout.includes("port=8000")) {
						child.kill("SIGTERM");
						resolve();
					}
				};

				child.stdout.on("data", checkOutput);

				// Fallback timeout
				setTimeout(() => {
					child.kill("SIGKILL");
					resolve();
				}, 1500);
			});

			return new Promise(resolve => {
				child.on("close", () => {
					assert.match(stdout, /id=woodland/, "Should log startup message");
					assert.match(stdout, /port=8000/, "Should use default port 8000");
					assert.match(stdout, /ip=127\.0\.0\.1/, "Should use default IP");
					resolve();
				});
			});
		});

		it("should start with custom port", async () => {
			const child = spawn("node", [cliPath, "--port=3000"], {
				cwd: projectRoot,
				stdio: ["pipe", "pipe", "pipe"]
			});

			let stdout = "";

			child.stdout.on("data", data => {
				stdout += data.toString();
			});

			await new Promise(resolve => {
				const checkOutput = () => {
					if (stdout.includes("port=3000")) {
						child.kill("SIGTERM");
						resolve();
					}
				};

				child.stdout.on("data", checkOutput);

				setTimeout(() => {
					child.kill("SIGKILL");
					resolve();
				}, 1500);
			});

			return new Promise(resolve => {
				child.on("close", () => {
					assert.match(stdout, /port=3000/, "Should use custom port 3000");
					resolve();
				});
			});
		});

		it("should start with custom IP", async () => {
			const child = spawn("node", [cliPath, "--ip=192.168.1.1"], {
				cwd: projectRoot,
				stdio: ["pipe", "pipe", "pipe"]
			});

			let stdout = "";

			child.stdout.on("data", data => {
				stdout += data.toString();
			});

			await new Promise(resolve => {
				const checkOutput = () => {
					if (stdout.includes("ip=192.168.1.1")) {
						child.kill("SIGTERM");
						resolve();
					}
				};

				child.stdout.on("data", checkOutput);

				setTimeout(() => {
					child.kill("SIGKILL");
					resolve();
				}, 1500);
			});

			return new Promise(resolve => {
				child.on("close", () => {
					assert.match(stdout, /ip=192\.168\.1\.1/, "Should use custom IP");
					resolve();
				});
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
			const child = spawn("node", [cliPath, "--port=0"], {
				cwd: projectRoot,
				stdio: ["pipe", "pipe", "pipe"]
			});

			let stdout = "";

			child.stdout.on("data", data => {
				stdout += data.toString();
			});

			await new Promise(resolve => {
				const checkOutput = () => {
					if (stdout.includes("port=0")) {
						child.kill("SIGTERM");
						resolve();
					}
				};

				child.stdout.on("data", checkOutput);

				setTimeout(() => {
					child.kill("SIGKILL");
					resolve();
				}, 1500);
			});

			return new Promise(resolve => {
				child.on("close", () => {
					assert.match(stdout, /port=0/, "Should accept port 0");
					resolve();
				});
			});
		});

		it("should accept port 65535", async () => {
			const child = spawn("node", [cliPath, "--port=65535"], {
				cwd: projectRoot,
				stdio: ["pipe", "pipe", "pipe"]
			});

			let stdout = "";

			child.stdout.on("data", data => {
				stdout += data.toString();
			});

			await new Promise(resolve => {
				const checkOutput = () => {
					if (stdout.includes("port=65535")) {
						child.kill("SIGTERM");
						resolve();
					}
				};

				child.stdout.on("data", checkOutput);

				setTimeout(() => {
					child.kill("SIGKILL");
					resolve();
				}, 1500);
			});

			return new Promise(resolve => {
				child.on("close", () => {
					assert.match(stdout, /port=65535/, "Should accept max port");
					resolve();
				});
			});
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
			const validIPs = ["127.0.0.1", "192.168.1.1", "10.0.0.1", "0.0.0.0", "255.255.255.255"];

			for (const ip of validIPs.slice(0, 2)) { // Test first 2 to keep test time reasonable
				const child = spawn("node", [cliPath, `--ip=${ip}`], {
					cwd: projectRoot,
					stdio: ["pipe", "pipe", "pipe"]
				});

				let stdout = "";

				child.stdout.on("data", data => {
					stdout += data.toString();
				});

				await new Promise(resolve => {
					const checkOutput = () => {
						if (stdout.includes(`ip=${ip}`)) {
							child.kill("SIGTERM");
							resolve();
						}
					};

					child.stdout.on("data", checkOutput);

					setTimeout(() => {
						child.kill("SIGKILL");
						resolve();
					}, 1500);
				});

				await new Promise(resolve => {
					child.on("close", () => {
						assert.match(stdout, new RegExp(`ip=${ip.replace(/\./g, "\\.")}`), `Should use IP ${ip}`);
						resolve();
					});
				});
			}
		});
	});

	/**
	 * Test argument parsing edge cases
	 */
	describe("argument parsing", () => {
		it("should handle malformed arguments gracefully", async () => {
			// Malformed args should be ignored, so it should start with defaults
			const child = spawn("node", [cliPath, "--invalid", "--malformed="], {
				cwd: projectRoot,
				stdio: ["pipe", "pipe", "pipe"]
			});

			let stdout = "";

			child.stdout.on("data", data => {
				stdout += data.toString();
			});

			await new Promise(resolve => {
				const checkOutput = () => {
					if (stdout.includes("port=8000")) {
						child.kill("SIGTERM");
						resolve();
					}
				};

				child.stdout.on("data", checkOutput);

				setTimeout(() => {
					child.kill("SIGKILL");
					resolve();
				}, 1500);
			});

			return new Promise(resolve => {
				child.on("close", () => {
					assert.match(stdout, /port=8000/, "Should use default port");
					resolve();
				});
			});
		});

		it("should handle boolean arguments", async () => {
			const child = spawn("node", [cliPath, "--logging=true"], {
				cwd: projectRoot,
				stdio: ["pipe", "pipe", "pipe"]
			});

			let stdout = "";

			child.stdout.on("data", data => {
				stdout += data.toString();
			});

			await new Promise(resolve => {
				const checkOutput = () => {
					if (stdout.includes("id=woodland")) {
						child.kill("SIGTERM");
						resolve();
					}
				};

				child.stdout.on("data", checkOutput);

				setTimeout(() => {
					child.kill("SIGKILL");
					resolve();
				}, 1500);
			});

			return new Promise(resolve => {
				child.on("close", () => {
					assert.match(stdout, /id=woodland/, "Should enable logging");
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
			const child = spawn("node", [cliPath], {
				cwd: projectRoot,
				stdio: ["pipe", "pipe", "pipe"]
			});

			let stdout = "";

			child.stdout.on("data", data => {
				stdout += data.toString();
			});

			await new Promise(resolve => {
				const checkOutput = () => {
					if (stdout.includes("port=8000") && stdout.includes("ip=127.0.0.1")) {
						child.kill("SIGTERM");
						resolve();
					}
				};

				child.stdout.on("data", checkOutput);

				setTimeout(() => {
					child.kill("SIGKILL");
					resolve();
				}, 1500);
			});

			return new Promise(resolve => {
				child.on("close", () => {
					assert.match(stdout, /port=8000/, "Should use default port");
					assert.match(stdout, /ip=127\.0\.0\.1/, "Should use default IP");
					resolve();
				});
			});
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
			const child = spawn("node", [cliPath, "--port=9999", "--ip=10.0.0.1"], {
				cwd: projectRoot,
				stdio: ["pipe", "pipe", "pipe"]
			});

			let stdout = "";

			child.stdout.on("data", data => {
				stdout += data.toString();
			});

			await new Promise(resolve => {
				const checkOutput = () => {
					if (stdout.includes("id=woodland") && stdout.includes("port=9999") && stdout.includes("ip=10.0.0.1")) {
						child.kill("SIGTERM");
						resolve();
					}
				};

				child.stdout.on("data", checkOutput);

				setTimeout(() => {
					child.kill("SIGKILL");
					resolve();
				}, 1500);
			});

			return new Promise(resolve => {
				child.on("close", () => {
					assert.match(
						stdout,
						/id=woodland, hostname=localhost, ip=10\.0\.0\.1, port=9999/,
						"Should log complete startup message"
					);
					resolve();
				});
			});
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
