// src/__tests__/assertFormat.test.ts — unit tests for output-format validation
import { describe, it, expect } from 'vitest'
import { assertFormat, isSupportedFormat, SUPPORTED_FORMATS } from '../core/format.js'

describe('assertFormat', () => {
	it('accepts every supported format', () => {
		for (const fmt of SUPPORTED_FORMATS) {
			expect(() => assertFormat(fmt)).not.toThrow()
		}
	})

	it('rejects unsupported strings with a descriptive error', () => {
		expect(() => assertFormat('eot')).toThrow(/Unsupported format "eot"/)
		expect(() => assertFormat('TTF')).toThrow(/Unsupported format/)
		expect(() => assertFormat('')).toThrow(/Unsupported format/)
	})

	it('isSupportedFormat returns booleans', () => {
		expect(isSupportedFormat('ttf')).toBe(true)
		expect(isSupportedFormat('eot')).toBe(false)
	})
})
