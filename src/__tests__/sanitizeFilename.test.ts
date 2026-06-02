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

	it('strips ASCII control characters', () => {
		expect(sanitizeFilename('Inter\nBold')).toBe('InterBold')
		expect(sanitizeFilename('Inter\tBold')).toBe('InterBold')
		expect(sanitizeFilename('Inter\rBold')).toBe('InterBold')
	})

	it('collapses embedded .. segments so the result cannot describe a parent', () => {
		expect(sanitizeFilename('foo..bar')).toBe('foo.bar')
		expect(sanitizeFilename('foo..../bar')).toBe('foo.-bar')
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
		expect(sanitizeFilename('font|name')).not.toContain('|')
		expect(sanitizeFilename('font"name')).not.toContain('"')
	})

	it('falls back to "output" for empty result', () => {
		expect(sanitizeFilename('')).toBe('output')
		expect(sanitizeFilename('---')).toBe('output')
		expect(sanitizeFilename('...')).toBe('output')
	})

	it('rejects Windows reserved device names', () => {
		expect(sanitizeFilename('CON')).toBe('output')
		expect(sanitizeFilename('PRN')).toBe('output')
		expect(sanitizeFilename('COM1')).toBe('output')
		expect(sanitizeFilename('lpt9')).toBe('output')
		expect(sanitizeFilename('NUL')).toBe('output')
	})

	it('truncates very long names', () => {
		const long = 'a'.repeat(500)
		expect(sanitizeFilename(long).length).toBeLessThanOrEqual(200)
	})

	it('produces a name that path.relative cannot escape', () => {
		// After sanitisation, the result should never describe a parent directory.
		const safe = sanitizeFilename('../../etc/passwd')
		expect(safe.includes('..')).toBe(false)
		expect(safe.startsWith('/')).toBe(false)
		expect(safe.startsWith('\\')).toBe(false)
	})
})
