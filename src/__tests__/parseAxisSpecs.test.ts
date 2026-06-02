// src/__tests__/parseAxisSpecs.test.ts — unit tests for axis spec parsing
import { describe, it, expect } from 'vitest'
import { parseAxisSpecs } from '../core/axisSpecs.js'

describe('parseAxisSpecs', () => {
	it('parses a pin value', () => {
		expect(parseAxisSpecs(['wght:400'])).toEqual({ wght: 400 })
	})

	it('parses a range', () => {
		expect(parseAxisSpecs(['wght:100:700'])).toEqual({ wght: { min: 100, max: 700 } })
	})

	it('parses multiple specs', () => {
		expect(parseAxisSpecs(['wght:400', 'wdth:75:100'])).toEqual({
			wght: 400,
			wdth: { min: 75, max: 100 },
		})
	})

	it('parses * as null (keep full range)', () => {
		expect(parseAxisSpecs(['wght:*'])).toEqual({ wght: null })
	})

	it('parses keep as null (keep full range)', () => {
		expect(parseAxisSpecs(['wdth:keep'])).toEqual({ wdth: null })
	})

	it('parses KEEP case-insensitively', () => {
		expect(parseAxisSpecs(['opsz:KEEP'])).toEqual({ opsz: null })
	})

	it('parses negative pin values', () => {
		expect(parseAxisSpecs(['slnt:-10'])).toEqual({ slnt: -10 })
	})

	it('parses negative range values', () => {
		expect(parseAxisSpecs(['slnt:-10:0'])).toEqual({ slnt: { min: -10, max: 0 } })
	})

	it('parses fractional values', () => {
		expect(parseAxisSpecs(['wdth:87.5:100'])).toEqual({ wdth: { min: 87.5, max: 100 } })
	})

	it('returns empty object for empty input', () => {
		expect(parseAxisSpecs([])).toEqual({})
	})

	it('accepts min == max range', () => {
		expect(parseAxisSpecs(['wght:400:400'])).toEqual({ wght: { min: 400, max: 400 } })
	})

	it('lets later spec override earlier for same tag', () => {
		expect(parseAxisSpecs(['wght:300', 'wght:400'])).toEqual({ wght: 400 })
	})

	it('mixes pin, range and null forms across specs', () => {
		expect(parseAxisSpecs(['wght:400', 'wdth:75:100', 'opsz:*'])).toEqual({
			wght: 400,
			wdth: { min: 75, max: 100 },
			opsz: null,
		})
	})

	it('throws on missing colon', () => {
		expect(() => parseAxisSpecs(['wght400'])).toThrow(/Invalid --axis/)
	})

	it('throws on empty tag', () => {
		expect(() => parseAxisSpecs([':400'])).toThrow(/tag is empty/)
	})

	it('throws on non-numeric pin value', () => {
		expect(() => parseAxisSpecs(['wght:bold'])).toThrow(/not a finite number/)
	})

	it('throws on the literal string NaN', () => {
		expect(() => parseAxisSpecs(['wght:NaN'])).toThrow(/not a finite number/)
	})

	it('throws on Infinity (would silently pass with global isNaN)', () => {
		expect(() => parseAxisSpecs(['wght:Infinity'])).toThrow(/not a finite number/)
		expect(() => parseAxisSpecs(['wght:-Infinity'])).toThrow(/not a finite number/)
	})

	it('throws on empty value (would silently coerce to 0 with global Number)', () => {
		expect(() => parseAxisSpecs(['wght:'])).toThrow(/not a finite number/)
	})

	it('throws on non-numeric max in range form', () => {
		expect(() => parseAxisSpecs(['wght:100:bad'])).toThrow(/max "bad" is not/)
	})

	it('throws on tag that is not 4 printable ASCII chars', () => {
		expect(() => parseAxisSpecs(['wt:400'])).toThrow(/4 printable ASCII characters/)
		expect(() => parseAxisSpecs(['weight:400'])).toThrow(/4 printable ASCII characters/)
	})

	it('throws when min > max', () => {
		expect(() => parseAxisSpecs(['wght:700:100'])).toThrow(/must not exceed/)
	})
})
