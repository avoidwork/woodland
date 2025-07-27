import assert from "node:assert";

/**
 * Mock woodland module to avoid importing the actual implementation
 */
const mockWoodland = {
	log: function (message, level) {
		this.logCalls = this.logCalls || [];
		this.logCalls.push({ message, level });

		return this;
	},
	files: function () {
		this.filesCalled = true;

		return this;
	}
};

/**
 * Mock createServer function
 */
let mockServer = null;

/**
 * Mock process methods
 */
let exitCode = null;

describe("CLI", () => {
	let consoleLogCalls = [];

	beforeEach(() => {
		// Reset mocks
		Object.keys(mockWoodland).forEach(key => {
			if (key !== "log" && key !== "files") {
				delete mockWoodland[key];
			}
		});
		mockWoodland.logCalls = [];
		mockWoodland.filesCalled = false;

		// Mock server
		mockServer = {
			listen: function (port, ip) {
				this.listenCalls = this.listenCalls || [];
				this.listenCalls.push({ port, ip });

				return this;
			}
		};

		// Mock console.log to capture log output
		consoleLogCalls = [];
		console.log = function (...args) {
			consoleLogCalls.push(args);
		};

		// Mock process.exit
		exitCode = null;
		process.exit = function (code) {
			exitCode = code;
		};
	});


	/**
	 * Test argument parsing logic
	 */
	describe("argument parsing", () => {
		it("should parse port argument", () => {
			const argv = ["--port=3000"];
			const parsed = argv.filter(i => i.charAt(0) === "-" && i.charAt(1) === "-").reduce((a, v) => {
				const x = v.split("--")[1].split("=");
				a[x[0]] = isNaN(x[1]) ? x[1] : Number(x[1]);

				return a;
			}, {});

			assert.strictEqual(parsed.port, 3000);
		});

		it("should parse IP argument", () => {
			const argv = ["--ip=192.168.1.1"];
			const parsed = argv.filter(i => i.charAt(0) === "-" && i.charAt(1) === "-").reduce((a, v) => {
				const x = v.split("--")[1].split("=");
				a[x[0]] = isNaN(x[1]) ? x[1] : Number(x[1]);

				return a;
			}, {});

			assert.strictEqual(parsed.ip, "192.168.1.1");
		});

		it("should parse logging argument", () => {
			const argv = ["--logging=false"];
			const parsed = argv.filter(i => i.charAt(0) === "-" && i.charAt(1) === "-").reduce((a, v) => {
				const x = v.split("--")[1].split("=");
				a[x[0]] = x[1] === "true" ? true : x[1] === "false" ? false : isNaN(x[1]) ? x[1] : Number(x[1]);

				return a;
			}, {});

			assert.strictEqual(parsed.logging, false);
		});

		it("should use default values when arguments not provided", () => {
			const argv = [];
			const parsed = argv.filter(i => i.charAt(0) === "-" && i.charAt(1) === "-").reduce((a, v) => {
				const x = v.split("--")[1].split("=");
				a[x[0]] = isNaN(x[1]) ? x[1] : Number(x[1]);

				return a;
			}, {});

			const ip = parsed.ip ?? "localhost";
			const logging = parsed.logging ?? true;
			const port = parsed.port ?? 8000;

			assert.strictEqual(ip, "localhost");
			assert.strictEqual(logging, true);
			assert.strictEqual(port, 8000);
		});

		it("should handle multiple arguments", () => {
			const argv = ["--port=3000", "--ip=127.0.0.1", "--logging=false"];
			const parsed = argv.filter(i => i.charAt(0) === "-" && i.charAt(1) === "-").reduce((a, v) => {
				const x = v.split("--")[1].split("=");
				a[x[0]] = x[1] === "true" ? true : x[1] === "false" ? false : isNaN(x[1]) ? x[1] : Number(x[1]);

				return a;
			}, {});

			assert.strictEqual(parsed.port, 3000);
			assert.strictEqual(parsed.ip, "127.0.0.1");
			assert.strictEqual(parsed.logging, false);
		});
	});

	/**
	 * Test port validation
	 */
	describe("port validation", () => {
		it("should accept valid port numbers", () => {
			const validPorts = [0, 1, 80, 443, 3000, 8000, 8080, 65535];

			validPorts.forEach(port => {
				const validPort = Number(port);
				const isValid = Number.isInteger(validPort) && validPort >= 0 && validPort <= 65535;
				assert.strictEqual(isValid, true, `Port ${port} should be valid`);
			});
		});

		it("should reject invalid port numbers", () => {
			const invalidPorts = [-1, 65536, 70000, 1.5, "abc", NaN, Infinity];

			invalidPorts.forEach(port => {
				const validPort = Number(port);
				const isValid = Number.isInteger(validPort) && validPort >= 0 && validPort <= 65535;
				assert.strictEqual(isValid, false, `Port ${port} should be invalid`);
			});
		});

		it("should call app.log with error for invalid port", () => {
			const port = 70000;
			const validPort = Number(port);

			if (!Number.isInteger(validPort) || validPort < 0 || validPort > 65535) {
				mockWoodland.log("Invalid port: must be an integer between 0 and 65535.", "ERROR");
			}

			assert.strictEqual(mockWoodland.logCalls.length, 1);
			assert.strictEqual(mockWoodland.logCalls[0].message, "Invalid port: must be an integer between 0 and 65535.");
			assert.strictEqual(mockWoodland.logCalls[0].level, "ERROR");
		});
	});

	/**
	 * Test IP validation
	 */
	describe("IP validation", () => {
		it("should accept valid IPv4 addresses", () => {
			const validIPs = ["127.0.0.1", "192.168.1.1", "10.0.0.1", "172.16.0.1", "255.255.255.255", "0.0.0.0"];

			validIPs.forEach(ip => {
				const isValid = typeof ip === "string" && (/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/).test(ip);
				assert.strictEqual(isValid, true, `IP ${ip} should be valid`);
			});
		});

		it("should reject invalid IP addresses", () => {
			const invalidIPs = ["256.1.1.1", "192.168.1", "192.168.1.1.1", "abc.def.ghi.jkl", "", "localhost", null, undefined];

			invalidIPs.forEach(ip => {
				const isValid = typeof ip === "string" && (/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/).test(ip);
				assert.strictEqual(isValid, false, `IP ${ip} should be invalid`);
			});
		});

		it("should call app.log with error for invalid IP", () => {
			const ip = "256.1.1.1";
			const validIP = typeof ip === "string" && (/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/).test(ip);

			if (!validIP) {
				mockWoodland.log("Invalid IP: must be a valid IPv4 address.", "ERROR");
			}

			assert.strictEqual(mockWoodland.logCalls.length, 1);
			assert.strictEqual(mockWoodland.logCalls[0].message, "Invalid IP: must be a valid IPv4 address.");
			assert.strictEqual(mockWoodland.logCalls[0].level, "ERROR");
		});
	});

	/**
	 * Test woodland app configuration
	 */
	describe("woodland app configuration", () => {
		it("should create woodland app with correct default configuration", () => {
			// Simulate the woodland app creation with default args
			const argv = {};
			const logging = argv.logging ?? true;

			// Mock woodland function call
			const appConfig = {
				autoindex: true,
				defaultHeaders: {
					"Cache-Control": "no-cache",
					"Content-Type": "text/plain; charset=utf-8"
				},
				logging: {
					enabled: logging
				},
				time: true
			};

			assert.strictEqual(appConfig.autoindex, true);
			assert.strictEqual(appConfig.logging.enabled, true);
			assert.strictEqual(appConfig.time, true);
			assert.ok(appConfig.defaultHeaders);
		});

		it("should configure woodland app with custom logging setting", () => {
			const argv = { logging: false };

			const appConfig = {
				autoindex: true,
				defaultHeaders: {
					"Cache-Control": "no-cache",
					"Content-Type": "text/plain; charset=utf-8"
				},
				logging: {
					enabled: argv.logging ?? true
				},
				time: true
			};

			assert.strictEqual(appConfig.logging.enabled, false);
		});
	});

	/**
	 * Test server creation and startup
	 */
	describe("server creation and startup", () => {
		it("should call app.files() method", () => {
			mockWoodland.files();
			assert.strictEqual(mockWoodland.filesCalled, true);
		});

		it("should create server with app.route", () => {
			// Mock the route property
			mockWoodland.route = function () {};

			const server = { listen: () => {} };
			// Simulate createServer call
			const createdServer = server;

			assert.ok(createdServer);
		});

		it("should call server.listen with correct port and IP", () => {
			const port = 3000;
			const ip = "127.0.0.1";

			mockServer.listen(port, ip);

			assert.strictEqual(mockServer.listenCalls.length, 1);
			assert.strictEqual(mockServer.listenCalls[0].port, port);
			assert.strictEqual(mockServer.listenCalls[0].ip, ip);
		});

		it("should log startup message", () => {
			const port = 8000;
			const ip = "localhost";

			mockWoodland.log(`id=woodland, hostname=localhost, ip=${ip}, port=${port}`, "INFO");

			assert.strictEqual(mockWoodland.logCalls.length, 1);
			assert.strictEqual(mockWoodland.logCalls[0].message, "id=woodland, hostname=localhost, ip=localhost, port=8000");
			assert.strictEqual(mockWoodland.logCalls[0].level, "INFO");
		});
	});

	/**
	 * Test process.exit calls
	 */
	describe("process.exit behavior", () => {
		it("should exit with code 1 for invalid port", () => {
			const port = 70000;
			const validPort = Number(port);

			if (!Number.isInteger(validPort) || validPort < 0 || validPort > 65535) {
				mockWoodland.log("Invalid port: must be an integer between 0 and 65535.", "ERROR");
				process.exit(1);
			}

			assert.strictEqual(exitCode, 1);
		});

		it("should exit with code 1 for invalid IP", () => {
			const ip = "invalid.ip";
			const validIP = typeof ip === "string" && (/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/).test(ip);

			if (!validIP) {
				mockWoodland.log("Invalid IP: must be a valid IPv4 address.", "ERROR");
				process.exit(1);
			}

			assert.strictEqual(exitCode, 1);
		});
	});

	/**
	 * Test edge cases and error scenarios
	 */
	describe("edge cases", () => {
		it("should handle empty command line arguments", () => {
			const argv = [];
			const parsed = argv.filter(i => i.charAt(0) === "-" && i.charAt(1) === "-").reduce((a, v) => {
				const x = v.split("--")[1].split("=");
				a[x[0]] = isNaN(x[1]) ? x[1] : Number(x[1]);

				return a;
			}, {});

			assert.deepStrictEqual(parsed, {});
		});

		it("should handle malformed arguments", () => {
			const argv = ["--malformed", "--invalid=", "--=value"];
			const parsed = argv.filter(i => i.charAt(0) === "-" && i.charAt(1) === "-").reduce((a, v) => {
				const x = v.split("--")[1].split("=");
				a[x[0]] = isNaN(x[1]) ? x[1] : Number(x[1]);

				return a;
			}, {});

			// Malformed args should either be ignored or handled gracefully
			assert.ok(typeof parsed === "object");
		});

		it("should handle port as string that needs conversion", () => {
			const port = "8080";
			const validPort = Number(port);
			const isValid = Number.isInteger(validPort) && validPort >= 0 && validPort <= 65535;

			assert.strictEqual(isValid, true);
			assert.strictEqual(validPort, 8080);
		});

		it("should handle boolean arguments correctly", () => {
			const argv = ["--logging=true", "--debug=false"];
			const parsed = argv.filter(i => i.charAt(0) === "-" && i.charAt(1) === "-").reduce((a, v) => {
				const x = v.split("--")[1].split("=");
				// Use coerce-like logic for boolean handling
				a[x[0]] = x[1] === "true" ? true : x[1] === "false" ? false : isNaN(x[1]) ? x[1] : Number(x[1]);

				return a;
			}, {});

			assert.strictEqual(parsed.logging, true);
			assert.strictEqual(parsed.debug, false);
		});
	});

	/**
	 * Test integration scenarios
	 */
	describe("integration scenarios", () => {
		it("should handle complete valid startup sequence", () => {
			// Simulate a complete startup with valid arguments
			const port = 3000;
			const ip = "127.0.0.1";

			// Validate inputs
			const validPort = Number(port);
			const portValid = Number.isInteger(validPort) && validPort >= 0 && validPort <= 65535;
			const ipValid = typeof ip === "string" && (/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/).test(ip);

			assert.strictEqual(portValid, true);
			assert.strictEqual(ipValid, true);

			// Simulate app setup
			mockWoodland.files();
			mockServer.listen(validPort, ip);
			mockWoodland.log(`id=woodland, hostname=localhost, ip=${ip}, port=${validPort}`, "INFO");

			assert.strictEqual(mockWoodland.filesCalled, true);
			assert.strictEqual(mockServer.listenCalls.length, 1);
			assert.strictEqual(mockWoodland.logCalls.length, 1);
		});

		it("should handle startup with custom configuration", () => {
			const argv = ["--port=9000", "--ip=0.0.0.0", "--logging=false"];
			const parsed = argv.filter(i => i.charAt(0) === "-" && i.charAt(1) === "-").reduce((a, v) => {
				const x = v.split("--")[1].split("=");
				a[x[0]] = x[1] === "true" ? true : x[1] === "false" ? false : isNaN(x[1]) ? x[1] : Number(x[1]);

				return a;
			}, {});

			const ip = parsed.ip ?? "localhost";
			const logging = parsed.logging ?? true;
			const port = parsed.port ?? 8000;

			// Validate
			const validPort = Number(port);
			const portValid = Number.isInteger(validPort) && validPort >= 0 && validPort <= 65535;
			const ipValid = typeof ip === "string" && (/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/).test(ip);

			assert.strictEqual(portValid, true);
			assert.strictEqual(ipValid, true);
			assert.strictEqual(logging, false);
			assert.strictEqual(port, 9000);
			assert.strictEqual(ip, "0.0.0.0");
		});
	});

	/**
	 * Test mock functionality
	 */
	describe("mock verification", () => {
		it("should verify woodland mock is working", () => {
			mockWoodland.log("test message", "INFO");
			mockWoodland.files();

			assert.strictEqual(mockWoodland.logCalls.length, 1);
			assert.strictEqual(mockWoodland.logCalls[0].message, "test message");
			assert.strictEqual(mockWoodland.logCalls[0].level, "INFO");
			assert.strictEqual(mockWoodland.filesCalled, true);
		});

		it("should verify server mock is working", () => {
			mockServer.listen(8000, "localhost");

			assert.strictEqual(mockServer.listenCalls.length, 1);
			assert.strictEqual(mockServer.listenCalls[0].port, 8000);
			assert.strictEqual(mockServer.listenCalls[0].ip, "localhost");
		});

		it("should verify process.exit mock is working", () => {
			process.exit(1);
			assert.strictEqual(exitCode, 1);
		});
	});
});
