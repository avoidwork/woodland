module.exports = function (grunt) {
	grunt.initConfig({
		eslint: {
			target: [
				"Gruntfile.js",
				"lib/*.js",
				"test/*.js"
			]
		},
		mochaTest: {
			options: {
				reporter: "spec"
			},
			test: {
				src: ["test/*.js"]
			}
		}
	});

	// tasks
	grunt.loadNpmTasks("grunt-eslint");
	grunt.loadNpmTasks("grunt-mocha-test");

	// aliases
	grunt.registerTask("test", ["eslint", "mochaTest"]);
	grunt.registerTask("default", ["test"]);
};
