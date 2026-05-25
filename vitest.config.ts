// vitest.config.ts — test configuration for vf-clamp-cli
import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		include: ['src/__tests__/**/*.test.ts'],
	},
})
