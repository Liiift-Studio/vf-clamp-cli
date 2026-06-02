// vitest.config.ts — test configuration for vf-clamp-cli
import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		include: ['src/__tests__/**/*.test.ts'],
		coverage: {
			provider: 'v8',
			include: ['src/**/*.ts'],
			exclude: ['src/__tests__/**', 'src/index.ts'],
			reporter: ['text', 'json-summary'],
			thresholds: {
				lines: 70,
				functions: 70,
				branches: 65,
				statements: 70,
			},
		},
	},
})
