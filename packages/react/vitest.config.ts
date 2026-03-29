import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		include: ['tests/**/*.test.tsx', 'tests/**/*.test.ts'],
		environment: 'jsdom',
		globals: true,
	},
})
