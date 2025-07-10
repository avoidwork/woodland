import assert from "node:assert";
import {
	isSafeFilePath,
	sanitizeFilePath,
	isValidIpAddress,
	extractForwardedIp,
	autoindex
} from "../../src/utility.js";

describe("Security Utility Functions", () => {
	describe("isSafeFilePath", () => {
		it("should return false for paths with ../", () => {
			assert.strictEqual(isSafeFilePath("../../../etc/passwd"), false);
			assert.strictEqual(isSafeFilePath("dir/../file.txt"), false);
			assert.strictEqual(isSafeFilePath("./../../file.txt"), false);
		});

		it("should return false for paths with ..\\ (Windows)", () => {
			assert.strictEqual(isSafeFilePath("..\\..\\file.txt"), false);
			assert.strictEqual(isSafeFilePath("dir\\..\\file.txt"), false);
		});

		it("should return false for paths ending with ..", () => {
			assert.strictEqual(isSafeFilePath("dir/.."), false);
			assert.strictEqual(isSafeFilePath(".."), false);
		});

		it("should return false for paths starting with ..", () => {
			assert.strictEqual(isSafeFilePath("../file.txt"), false);
			assert.strictEqual(isSafeFilePath("..\\file.txt"), false);
		});

		it("should return false for paths with null bytes", () => {
			assert.strictEqual(isSafeFilePath("file\x00.txt"), false);
			assert.strictEqual(isSafeFilePath("file\u0000.txt"), false);
		});

		it("should return false for paths with newlines", () => {
			assert.strictEqual(isSafeFilePath("file\n.txt"), false);
			assert.strictEqual(isSafeFilePath("file\r.txt"), false);
			assert.strictEqual(isSafeFilePath("file\r\n.txt"), false);
		});

		it("should return false for non-string inputs", () => {
			assert.strictEqual(isSafeFilePath(null), false);
			assert.strictEqual(isSafeFilePath(undefined), false);
			assert.strictEqual(isSafeFilePath(123), false);
			assert.strictEqual(isSafeFilePath({}), false);
			assert.strictEqual(isSafeFilePath([]), false);
		});

		it("should return true for empty string", () => {
			assert.strictEqual(isSafeFilePath(""), true);
		});

		it("should return true for safe file paths", () => {
			assert.strictEqual(isSafeFilePath("file.txt"), true);
			assert.strictEqual(isSafeFilePath("dir/file.txt"), true);
			assert.strictEqual(isSafeFilePath("static/css/style.css"), true);
			assert.strictEqual(isSafeFilePath("images/logo.png"), true);
			assert.strictEqual(isSafeFilePath("dir/subdir/file.txt"), true);
		});

		it("should return true for paths with dots in filenames", () => {
			assert.strictEqual(isSafeFilePath("file.name.txt"), true);
			assert.strictEqual(isSafeFilePath("dir/file.backup.txt"), true);
			assert.strictEqual(isSafeFilePath(".hidden"), true);
			assert.strictEqual(isSafeFilePath("dir/.hidden"), true);
		});
	});

	describe("sanitizeFilePath", () => {
		it("should remove ../ sequences", () => {
			assert.strictEqual(sanitizeFilePath("../../../etc/passwd"), "etc/passwd");
			assert.strictEqual(sanitizeFilePath("dir/../file.txt"), "dir/file.txt");
			assert.strictEqual(sanitizeFilePath("./../../file.txt"), "./file.txt");
		});

		it("should remove ..\\ sequences", () => {
			assert.strictEqual(sanitizeFilePath("..\\..\\file.txt"), "file.txt");
			assert.strictEqual(sanitizeFilePath("dir\\..\\file.txt"), "dir\\file.txt");
		});

		it("should remove null bytes", () => {
			assert.strictEqual(sanitizeFilePath("file\x00.txt"), "file.txt");
			assert.strictEqual(sanitizeFilePath("file\u0000.txt"), "file.txt");
		});

		it("should remove newlines", () => {
			assert.strictEqual(sanitizeFilePath("file\n.txt"), "file.txt");
			assert.strictEqual(sanitizeFilePath("file\r.txt"), "file.txt");
			assert.strictEqual(sanitizeFilePath("file\r\n.txt"), "file.txt");
		});

		it("should normalize multiple slashes", () => {
			assert.strictEqual(sanitizeFilePath("dir//file.txt"), "dir/file.txt");
			assert.strictEqual(sanitizeFilePath("dir///file.txt"), "dir/file.txt");
			assert.strictEqual(sanitizeFilePath("dir////file.txt"), "dir/file.txt");
		});

		it("should remove leading slash", () => {
			assert.strictEqual(sanitizeFilePath("/file.txt"), "file.txt");
			assert.strictEqual(sanitizeFilePath("/dir/file.txt"), "dir/file.txt");
		});

		it("should return empty string for non-string inputs", () => {
			assert.strictEqual(sanitizeFilePath(null), "");
			assert.strictEqual(sanitizeFilePath(undefined), "");
			assert.strictEqual(sanitizeFilePath(123), "");
			assert.strictEqual(sanitizeFilePath({}), "");
			assert.strictEqual(sanitizeFilePath([]), "");
		});

		it("should preserve safe file paths", () => {
			assert.strictEqual(sanitizeFilePath("file.txt"), "file.txt");
			assert.strictEqual(sanitizeFilePath("dir/file.txt"), "dir/file.txt");
			assert.strictEqual(sanitizeFilePath("static/css/style.css"), "static/css/style.css");
		});
	});

	describe("isValidIpAddress", () => {
		it("should validate IPv4 addresses", () => {
			assert.strictEqual(isValidIpAddress("127.0.0.1"), true);
			assert.strictEqual(isValidIpAddress("192.168.1.1"), true);
			assert.strictEqual(isValidIpAddress("203.0.113.1"), true);
			assert.strictEqual(isValidIpAddress("255.255.255.255"), true);
			assert.strictEqual(isValidIpAddress("0.0.0.0"), true);
		});

		it("should validate IPv6 addresses", () => {
			assert.strictEqual(isValidIpAddress("2001:db8::1"), true);
			assert.strictEqual(isValidIpAddress("::1"), true);
			assert.strictEqual(isValidIpAddress("2001:db8:85a3::8a2e:370:7334"), true);
			assert.strictEqual(isValidIpAddress("::ffff:192.0.2.1"), true);
		});

		it("should reject invalid IPv4 addresses", () => {
			assert.strictEqual(isValidIpAddress("256.1.1.1"), false);
			assert.strictEqual(isValidIpAddress("192.168.1"), false);
			assert.strictEqual(isValidIpAddress("192.168.1.1.1"), false);
			assert.strictEqual(isValidIpAddress("192.168.1.300"), false);
			assert.strictEqual(isValidIpAddress("192.168.-1.1"), false);
		});

		it("should reject non-string inputs", () => {
			assert.strictEqual(isValidIpAddress(null), false);
			assert.strictEqual(isValidIpAddress(undefined), false);
			assert.strictEqual(isValidIpAddress(123), false);
			assert.strictEqual(isValidIpAddress({}), false);
			assert.strictEqual(isValidIpAddress([]), false);
		});

		it("should reject empty string", () => {
			assert.strictEqual(isValidIpAddress(""), false);
		});

		it("should reject random strings", () => {
			assert.strictEqual(isValidIpAddress("not-an-ip"), false);
			assert.strictEqual(isValidIpAddress("localhost"), false);
			assert.strictEqual(isValidIpAddress("example.com"), false);
		});
	});

	describe("extractForwardedIp", () => {
		it("should extract first public IP from X-Forwarded-For header", () => {
			assert.strictEqual(extractForwardedIp("203.0.113.1, 192.168.1.1"), "203.0.113.1");
			assert.strictEqual(extractForwardedIp("198.51.100.1, 203.0.113.1, 192.168.1.1"), "198.51.100.1");
		});

		it("should skip private IP addresses", () => {
			assert.strictEqual(extractForwardedIp("192.168.1.1, 10.0.0.1"), null);
			assert.strictEqual(extractForwardedIp("127.0.0.1, 192.168.1.1"), null);
			assert.strictEqual(extractForwardedIp("172.16.0.1, 10.0.0.1"), null);
		});

		it("should skip IPv6 local addresses", () => {
			assert.strictEqual(extractForwardedIp("::1, fc00::1"), null);
			assert.strictEqual(extractForwardedIp("fd00::1, fe80::1"), null);
		});

		it("should handle single IP", () => {
			assert.strictEqual(extractForwardedIp("203.0.113.1"), "203.0.113.1");
		});

		it("should handle IPv6 addresses", () => {
			assert.strictEqual(extractForwardedIp("2001:db8::1"), "2001:db8::1");
		});

		it("should handle malformed headers", () => {
			assert.strictEqual(extractForwardedIp("invalid-ip, not-an-ip"), null);
			assert.strictEqual(extractForwardedIp("256.1.1.1, 300.1.1.1"), null);
		});

		it("should return null for non-string inputs", () => {
			assert.strictEqual(extractForwardedIp(null), null);
			assert.strictEqual(extractForwardedIp(undefined), null);
			assert.strictEqual(extractForwardedIp(123), null);
			assert.strictEqual(extractForwardedIp({}), null);
			assert.strictEqual(extractForwardedIp([]), null);
		});

		it("should return null for empty string", () => {
			assert.strictEqual(extractForwardedIp(""), null);
		});

		it("should trim whitespace", () => {
			assert.strictEqual(extractForwardedIp("  203.0.113.1  ,  192.168.1.1  "), "203.0.113.1");
		});
	});

	describe("autoindex HTML escaping", () => {
		it("should escape HTML special characters in title", () => {
			const mockFiles = [];
			const html = autoindex("/test<script>alert('xss')</script>", mockFiles);

			assert.ok(html.includes("&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;"));
			assert.ok(!html.includes("<script>alert('xss')</script>"));
		});

		it("should escape HTML special characters in filenames", () => {
			const mockFiles = [
				{ name: "<script>alert('xss')</script>.txt", isDirectory: () => false },
				{ name: "file&name.txt", isDirectory: () => false },
				{ name: 'file"name.txt', isDirectory: () => false },
				{ name: "file'name.txt", isDirectory: () => false }
			];

			const html = autoindex("/test", mockFiles);

			assert.ok(html.includes("&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;.txt"));
			assert.ok(html.includes("file&amp;name.txt"));
			assert.ok(html.includes("file&quot;name.txt"));
			assert.ok(html.includes("file&#39;name.txt"));
			assert.ok(!html.includes("<script>alert('xss')</script>.txt"));
		});

		it("should properly encode URIs in href attributes", () => {
			const mockFiles = [
				{ name: "file with spaces.txt", isDirectory: () => false },
				{ name: "file%percent.txt", isDirectory: () => false },
				{ name: "file#hash.txt", isDirectory: () => false }
			];

			const html = autoindex("/test", mockFiles);

			assert.ok(html.includes('href="file%20with%20spaces.txt"'));
			assert.ok(html.includes('href="file%25percent.txt"'));
			assert.ok(html.includes('href="file%23hash.txt"'));
		});

		it("should handle directories properly", () => {
			const mockFiles = [
				{ name: "directory", isDirectory: () => true },
				{ name: "file.txt", isDirectory: () => false }
			];

			const html = autoindex("/test", mockFiles);

			assert.ok(html.includes('href="directory/"'));
			assert.ok(html.includes(">directory/<"));
			assert.ok(html.includes('href="file.txt"'));
			assert.ok(html.includes(">file.txt<"));
		});

		it("should include parent directory link", () => {
			const mockFiles = [
				{ name: "file.txt", isDirectory: () => false }
			];

			const html = autoindex("/test", mockFiles);

			assert.ok(html.includes('href=".."'));
			assert.ok(html.includes(">../<"));
			assert.ok(html.includes('rel="collection"'));
		});

		it("should handle empty file list", () => {
			const mockFiles = [];

			const html = autoindex("/test", mockFiles);

			// Should still include parent directory
			assert.ok(html.includes('href=".."'));
			assert.ok(html.includes(">../<"));
		});
	});
});
