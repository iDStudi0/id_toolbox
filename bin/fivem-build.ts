#!/usr/bin/env bun
import { join } from "node:path";
import { parseArgs } from "node:util";
import { build } from "bun";

const { values } = parseArgs({ options: { external: { type: "string" } } });

const rootDir = process.cwd();

const result = await build({
	entrypoints: [join(rootDir, "src/index.ts")],
	outdir: join(rootDir, "dist"),
	naming: "build.js",
	target: "node",
	minify: true,
	sourcemap: "none",
	format: "cjs",
	external: ["@citizenfx/server", ...(values.external?.split(",") ?? [])],
	banner: "(function(){",
	footer: "})();",
	throw: false,
});

if (result.success) {
	console.log("Build successful! 🚀");
} else {
	console.error("Build failed:");
	for (const log of result.logs) console.error(log);
	process.exit(1);
}
