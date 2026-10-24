#!/usr/bin/env bun
import { basename, dirname, resolve } from "node:path";
import { parseArgs } from "node:util";
import { build } from "bun";

const { values } = parseArgs({
	options: {
		side: { type: "string", default: "server" },
		entry: { type: "string", default: "src/index.ts" },
		outfile: { type: "string", default: "dist/build.js" },
		external: { type: "string" },
	},
});

const side = values.side;
if (side !== "server" && side !== "client") {
	console.error(`Invalid --side "${side}", expected "server" or "client"`);
	process.exit(1);
}

const outfile = resolve(values.outfile);

const result = await build({
	entrypoints: [resolve(values.entry)],
	outdir: dirname(outfile),
	naming: basename(outfile),
	target: side === "server" ? "node" : "browser",
	minify: true,
	sourcemap: "none",
	format: "cjs",
	external: [`@citizenfx/${side}`, ...(values.external?.split(",") ?? [])],
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
