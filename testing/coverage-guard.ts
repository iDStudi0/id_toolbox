import { test } from "bun:test";

const ALWAYS_IGNORED = [/\.d\.ts$/, /\.test\.ts$/];

export function coverageGuard(ignored: RegExp[] = []) {
	const patterns = [...ALWAYS_IGNORED, ...ignored];
	test("every source file is loaded for coverage", async () => {
		for await (const path of new Bun.Glob("src/**/*.ts").scan()) {
			if (patterns.some((pattern) => pattern.test(path))) continue;
			await import(`${process.cwd()}/${path}`);
		}
	});
}
