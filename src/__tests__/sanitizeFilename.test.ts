// src/__tests__/sanitizeFilename.test.ts — unit tests for filename sanitization
import { describe, it, expect } from 'vitest'
import { sanitizeFilename } from '../utils/font.js'

describe('sanitizeFilename', () => {
	it('passes through a safe name unchanged', () => {
		expect(sanitizeFilename('Inter-Light-Bold')).toBe('Inter-Light-Bold')
	})

	it('replaces path separators with hyphens', () => {
		expect(sanitizeFilename('fonts/output')).toBe('fonts-output')
		expect(sanitizeFilename('fonts\\output')).toBe('fonts-output')
	})

	it('strips null bytes', () => {
		expect(sanitizeFilename('Inter\0Bold')).toBe('InterBold')
	})

	it('strips leading dots to avoid hidden files', () => {
		expect(sanitizeFilename('.hidden')).toBe('hidden')
	})

	it('collapses multiple hyphens', () => {
		expect(sanitizeFilename('Inter---Bold')).toBe('Inter-Bold')
	})

	it('strips leading and trailing hyphens', () => {
		expect(sanitizeFilename('-Inter-')).toBe('Inter')
	})

	it('replaces shell-special characters', () => {
		expect(sanitizeFilename('font:name*?')).not.toContain(':')
		expect(sanitizeFilename('font:name*?')).not.toContain('*')
	})

	it('falls back to "output" for empty result', () => {
		expect(sanitizeFilename('')).toBe('output')
		expect(sanitizeFilename('---')).toBe('output')
	})
})
