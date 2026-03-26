import assert from "node:assert";
import { describe, it } from "node:test";
import { coerce } from "tiny-coerce";
import { HYPHEN, EQUAL } from "../../src/constants.js";
import { isValidIP } from "../../src/request.js";

/**
 * Parse CLI arguments from process.argv style array
 * @param {Array} args - Array of argument strings
 * @returns {Object} Parsed arguments object
 */
function parseArgs(args) {
	return args
		.filter((i) => i.charAt(0) === HYPHEN && i.charAt(1) === HYPHEN)
		.reduce((a, v) => {
			const x = v.split(`${HYPHEN}${HYPHEN}`)[1].split(EQUAL);
			a[x[0]] = coerce(x[1]);
			return a;
		}, {});
}

/**
 * Validate port number
 * @param {*} port - Port value to validate
 * @returns {Object} Validation result with valid flag and error message
 */
function validatePort(port) {
	const validPort = Number(port);
	if (!Number.isInteger(validPort) || validPort < 0 || validPort > 65535) {
		return { valid: false, error: "Invalid port: must be an integer between 0 and 65535." };
	}
	return { valid: true, port: validPort };
}

/**
 * Validate IP address
 * @param {string} ip - IP address to validate
 * @returns {Object} Validation result with valid flag and error message
 */
function validateIP(ip) {
	const validIP = isValidIP(ip);
	if (!validIP) {
		return { valid: false, error: "Invalid IP: must be a valid IPv4 address." };
	}
	return { valid: true, ip };
}

describe("CLI", () => {
	describe("argument parsing", () => {
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

	describe("port validation", () => {
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

		it("should reject non-numeric port", () => {
			const result = validatePort("abc");
			assert.strictEqual(result.valid, false);
			assert.match(result.error, /Invalid port/);
		});

		it("should reject non-integer port", () => {
			const result = validatePort(3.14);
			assert.strictEqual(result.valid, false);
			assert.match(result.error, /Invalid port/);
		});
	});

	describe("IP validation", () => {
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

	describe("coerce function", () => {
		it("should coerce 'true' to boolean true", () => {
			assert.strictEqual(coerce("true"), true);
		});

		it("should coerce 'false' to boolean false", () => {
			assert.strictEqual(coerce("false"), false);
		});

		it("should coerce numeric strings to numbers", () => {
			assert.strictEqual(coerce("3000"), 3000);
		});

		it("should keep non-numeric strings as strings", () => {
			assert.strictEqual(coerce("localhost"), "localhost");
		});
	});
});
