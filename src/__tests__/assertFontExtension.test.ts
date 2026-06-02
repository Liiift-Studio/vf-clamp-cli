// src/__tests__/assertFontExtension.test.ts — unit tests for input-extension validation
import { describe, it, expect } from 'vitest'
import { assertFontExtension } from '../utils/font.js'

describe('assertFontExtension', () => {
	it('accepts all supported extensions', () => {
		expect(() => assertFontExtension('font.ttf')).not.toThrow()
		expect(() => assertFontExtension('font.otf')).not.toThrow()
		expect(() => assertFontExtension('font.woff')).not.toThrow()
		expect(() => assertFontExtension('font.woff2')).not.toThrow()
	})

	it('accepts upper-case extensions', () => {
		expect(() => assertFontExtension('font.TTF')).not.toThrow()
		expect(() => assertFontExtension('font.WOFF2')).not.toThrow()
	})

	it('accepts deep paths', () => {
		expect(() => assertFontExtension('/abs/path/font.ttf')).not.toThrow()
		expect(() => assertFontExtension('./rel/path/font.woff2')).not.toThrow()
	})

	it('rejects paths with no extension', () => {
		expect(() => assertFontExtension('font')).toThrow(/Unrecognised font extension/)
	})

	it('rejects unrelated extensions', () => {
		expect(() => assertFontExtension('font.zip')).toThrow(/Unrecognised font extension/)
		expect(() => assertFontExtension('font.ttf.bak')).toThrow(/Unrecognised font extension/)
	})

	it('accepts the stdin sentinel "-"', () => {
		expect(() => assertFontExtension('-')).not.toThrow()
	})
})
