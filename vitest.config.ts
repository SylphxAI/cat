import { defineConfig } from "vitest/config"

export default defineConfig({
	test: {
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html", "lcov"],
			include: ["src/**/*.ts"],
			exclude: ["src/**/*.d.ts", "src/index.ts", "src/transports/file.ts"],
			thresholds: {
				lines: 95,
				functions: 100,
				branches: 89,
				statements: 95,
			},
		},
		include: ["tests/**/*.test.ts"],
		benchmark: {
			include: ["benchmarks/**/*.bench.ts"],
		},
		globals: true,
		environment: "node",
	},
})
