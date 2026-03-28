import assert from "node:assert";
import { describe, it, beforeEach, afterEach } from "node:test";
import { main, parseArgs, validatePort, validateIP } from "../../src/cli.js";

describe("CLI", () => {
	describe("parseArgs", () => {
		it("should parse --port argument", () => {
			const args = parseArgs(["--port=3000"]);
			assert.strictEqual(args.port, 3000);
		});

		it("should parse --ip argument", () => {
			const args = parseArgs(["--ip=127.0.0.1"]);
			assert.strictEqual(args.ip, "127.0.0.1");
		});

		it("should parse --logging argument", () => {
			const args = parseArgs(["--logging=false"]);
			assert.strictEqual(args.logging, false);
		});

		it("should parse multiple arguments", () => {
			const args = parseArgs(["--port=3000", "--ip=127.0.0.1", "--logging=true"]);
			assert.strictEqual(args.port, 3000);
			assert.strictEqual(args.ip, "127.0.0.1");
			assert.strictEqual(args.logging, true);
		});

		it("should coerce string to boolean", () => {
			const args = parseArgs(["--logging=true"]);
			assert.strictEqual(args.logging, true);
		});

		it("should coerce string to number", () => {
			const args = parseArgs(["--port=8080"]);
			assert.strictEqual(args.port, 8080);
		});

		it("should ignore non-double-dash arguments", () => {
			const args = parseArgs(["node", "cli.js", "--port=3000", "extra"]);
			assert.strictEqual(args.port, 3000);
			assert.strictEqual(args.extra, undefined);
		});

		it("should handle empty arguments", () => {
			const args = parseArgs([]);
			assert.deepStrictEqual(args, {});
		});
	});

	describe("validatePort", () => {
		it("should accept valid port 0", () => {
			const result = validatePort(0);
			assert.strictEqual(result.valid, true);
			assert.strictEqual(result.port, 0);
		});

		it("should accept valid port 3000", () => {
			const result = validatePort(3000);
			assert.strictEqual(result.valid, true);
			assert.strictEqual(result.port, 3000);
		});

		it("should accept valid port 65535", () => {
			const result = validatePort(65535);
			assert.strictEqual(result.valid, true);
			assert.strictEqual(result.port, 65535);
		});

		it("should reject negative port", () => {
			const result = validatePort(-1);
			assert.strictEqual(result.valid, false);
			assert.match(result.error, /Invalid port/);
		});

		it("should reject port above 65535", () => {
			const result = validatePort(70000);
			assert.strictEqual(result.valid, false);
			assert.match(result.error, /Invalid port/);
		});

		it("should reject non-integer port", () => {
			const result = validatePort(3.14);
			assert.strictEqual(result.valid, false);
			assert.match(result.error, /Invalid port/);
		});

		it("should reject empty string port", () => {
			const result = validatePort("");
			assert.strictEqual(result.valid, false);
			assert.match(result.error, /Invalid port/);
		});

		it("should reject whitespace-only port", () => {
			const result = validatePort("   ");
			assert.strictEqual(result.valid, false);
			assert.match(result.error, /Invalid port/);
		});
	});

	describe("validateIP", () => {
		it("should accept valid IPv4 127.0.0.1", () => {
			const result = validateIP("127.0.0.1");
			assert.strictEqual(result.valid, true);
			assert.strictEqual(result.ip, "127.0.0.1");
		});

		it("should accept valid IPv4 192.168.1.1", () => {
			const result = validateIP("192.168.1.1");
			assert.strictEqual(result.valid, true);
		});

		it("should accept valid IPv4 0.0.0.0", () => {
			const result = validateIP("0.0.0.0");
			assert.strictEqual(result.valid, true);
		});

		it("should reject invalid IP 256.1.1.1", () => {
			const result = validateIP("256.1.1.1");
			assert.strictEqual(result.valid, false);
			assert.match(result.error, /Invalid IP/);
		});

		it("should reject incomplete IP 192.168.1", () => {
			const result = validateIP("192.168.1");
			assert.strictEqual(result.valid, false);
			assert.match(result.error, /Invalid IP/);
		});

		it("should reject empty IP", () => {
			const result = validateIP("");
			assert.strictEqual(result.valid, false);
			assert.match(result.error, /Invalid IP/);
		});
	});

	describe("main", () => {
		let originalExit;
		let originalConsoleError;
		let server;

		beforeEach(() => {
			originalExit = process.exit;
			originalConsoleError = console.error;
			process.exit = () => {};
			console.error = () => {};
			server = null;
		});

		afterEach(() => {
			process.exit = originalExit;
			console.error = originalConsoleError;
			if (server) {
				server.closeAllConnections?.();
				server.close();
				server = null;
			}
		});

		it("should create and start server with default arguments", () => {
			server = main(["node", "cli.js", "--port=0"]);
			assert.ok(server);
			assert.strictEqual(typeof server.listen, "function");
		});

		it("should create and start server with custom port", () => {
			server = main(["node", "cli.js", "--port=0"]);
			assert.ok(server);
		});

		it("should create and start server with custom IP", () => {
			server = main(["node", "cli.js", "--port=0", "--ip=127.0.0.1"]);
			assert.ok(server);
		});

		it("should create and start server with custom logging", () => {
			server = main(["node", "cli.js", "--port=0", "--logging=false"]);
			assert.ok(server);
		});

		it("should exit with invalid port", () => {
			let exitCalled = false;
			let errorMessage = "";
			process.exit = () => {
				exitCalled = true;
			};
			console.error = (msg) => {
				errorMessage = msg;
			};

			main(["node", "cli.js", "--port=-1"]);
			assert.strictEqual(exitCalled, true);
			assert.match(errorMessage, /Invalid port/);
		});

		it("should exit with invalid IP", () => {
			let exitCalled = false;
			let errorMessage = "";
			process.exit = () => {
				exitCalled = true;
			};
			console.error = (msg) => {
				errorMessage = msg;
			};

			main(["node", "cli.js", "--ip=invalid"]);
			assert.strictEqual(exitCalled, true);
			assert.match(errorMessage, /Invalid IP/);
		});
	});
});
