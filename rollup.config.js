import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const pkg = require("./package.json");
const year = new Date().getFullYear();
const bannerLong = `/**
 * ${pkg.name}
 *
 * @copyright ${year} ${pkg.author}
 * @license ${pkg.license}
 * @version ${pkg.version}
 */`;
const defaultOutBase = {compact: true, banner: bannerLong, name: pkg.name};
const cjOutBase = {...defaultOutBase, compact: false, format: "cjs", exports: "named"};
const esmOutBase = {...defaultOutBase, format: "esm"};

export default [
	{
		external: [
			"node:http",
			"node:path",
			"node:events",
			"node:fs",
			"node:fs/promises",
			"node:module",
			"node:url",
			"mime-db",
			"precise",
			"tiny-etag",
			"tiny-lru",
			"tiny-coerce"
		],
		input: "./src/woodland.js",
		output: [
			{
				...cjOutBase,
				file: `dist/${pkg.name}.cjs`
			},
			{
				...esmOutBase,
				file: `dist/${pkg.name}.js`
			}
		]
	},
	{
		external: [
			"node:http",
			"node:module",
			"node:path",
			"node:url",
			"tiny-coerce",
			"woodland"
		],
		input: "./src/cli.js",
		output: [
			{
				...cjOutBase,
				file: "dist/cli.cjs"
			}
		]
	}
];
