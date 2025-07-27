import assert from "node:assert";
import {
	isSafeFilePath,
	sanitizeFilePath,
	autoindex
} from "../../src/utility.js";

describe("Security Utility Functions", () => {
	describe("isSafeFilePath", () => {
		it("should return true for paths with ../ (now allowed on absolute paths)", () => {
			assert.strictEqual(isSafeFilePath("../../../etc/passwd"), true);
			assert.strictEqual(isSafeFilePath("dir/../file.txt"), true);
			assert.strictEqual(isSafeFilePath("./../../file.txt"), true);
		});

		it("should return true for paths with ..\\ (Windows, now allowed)", () => {
			assert.strictEqual(isSafeFilePath("..\\..\\file.txt"), true);
			assert.strictEqual(isSafeFilePath("dir\\..\\file.txt"), true);
		});

		it("should return true for paths ending with .. (now allowed)", () => {
			assert.strictEqual(isSafeFilePath("dir/.."), true);
			assert.strictEqual(isSafeFilePath(".."), true);
		});

		it("should return true for paths starting with .. (now allowed)", () => {
			assert.strictEqual(isSafeFilePath("../file.txt"), true);
			assert.strictEqual(isSafeFilePath("..\\file.txt"), true);
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
