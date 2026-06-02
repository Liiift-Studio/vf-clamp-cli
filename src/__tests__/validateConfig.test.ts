// src/__tests__/validateConfig.test.ts — unit tests for JSON config validation
import { describe, it, expect } from 'vitest'
import { validateConfig } from '../core/config.js'

describe('validateConfig', () => {
	it('accepts a minimal valid config', () => {
		const cfg = validateConfig({
			outputs: [{ name: 'a', instances: ['Light'] }],
		})
		expect(cfg.outputs).toHaveLength(1)
		expect(cfg.outputs[0]?.name).toBe('a')
	})

	it('accepts format and outputDir', () => {
		const cfg = validateConfig({
			format: 'woff2',
			outputDir: './out',
			outputs: [{ name: 'a', axes: { wght: 400 } }],
		})
		expect(cfg.format).toBe('woff2')
		expect(cfg.outputDir).toBe('./out')
	})

	it('accepts the axes null form (keep full range)', () => {
		const cfg = validateConfig({
			outputs: [{ name: 'a', axes: { wght: null } }],
		})
		expect(cfg.outputs[0]?.axes?.wght).toBeNull()
	})

	it('accepts axis range form', () => {
		const cfg = validateConfig({
			outputs: [{ name: 'a', axes: { wght: { min: 100, max: 900 } } }],
		})
		expect(cfg.outputs[0]?.axes?.wght).toEqual({ min: 100, max: 900 })
	})

	it('rejects non-object top-level', () => {
		expect(() => validateConfig('not an object')).toThrow(/JSON object/)
		expect(() => validateConfig([])).toThrow(/JSON object/)
		expect(() => validateConfig(null)).toThrow(/JSON object/)
	})

	it('rejects missing or empty outputs', () => {
		expect(() => validateConfig({})).toThrow(/non-empty "outputs"/)
		expect(() => validateConfig({ outputs: [] })).toThrow(/non-empty "outputs"/)
	})

	it('rejects non-string format', () => {
		expect(() => validateConfig({ format: 42, outputs: [{ name: 'a', instances: ['Light'] }] }))
			.toThrow(/"format" must be a string/)
	})

	it('rejects unsupported format string', () => {
		expect(() => validateConfig({ format: 'eot', outputs: [{ name: 'a', instances: ['Light'] }] }))
			.toThrow(/Unsupported format/)
	})

	it('rejects non-string outputDir', () => {
		expect(() => validateConfig({ outputDir: 7, outputs: [{ name: 'a', instances: ['Light'] }] }))
			.toThrow(/"outputDir" must be a string/)
	})

	it('rejects non-string output name', () => {
		expect(() => validateConfig({ outputs: [{ name: 123, instances: ['Light'] }] }))
			.toThrow(/"name" must be a string/)
	})

	it('rejects non-array or non-string instances', () => {
		expect(() => validateConfig({ outputs: [{ instances: 'Light' }] }))
			.toThrow(/"instances" must be an array of strings/)
		expect(() => validateConfig({ outputs: [{ instances: [1, 2] }] }))
			.toThrow(/"instances" must be an array of strings/)
	})

	it('rejects axes that are not an object', () => {
		expect(() => validateConfig({ outputs: [{ name: 'a', axes: 'not-an-object' }] }))
			.toThrow(/"axes" must be an object/)
	})

	it('rejects empty axes map', () => {
		expect(() => validateConfig({ outputs: [{ name: 'a', axes: {} }] }))
			.toThrow(/at least one entry/)
	})

	it('rejects non-finite pin values', () => {
		expect(() => validateConfig({ outputs: [{ name: 'a', axes: { wght: Infinity } }] }))
			.toThrow(/must be finite/)
		expect(() => validateConfig({ outputs: [{ name: 'a', axes: { wght: Number.NaN } }] }))
			.toThrow(/must be finite/)
	})

	it('rejects partial {min} or {max} only ranges', () => {
		expect(() => validateConfig({ outputs: [{ name: 'a', axes: { wght: { min: 100 } } }] }))
			.toThrow(/range must be \{ min: number, max: number \}/)
	})

	it('rejects min > max in axes', () => {
		expect(() => validateConfig({ outputs: [{ name: 'a', axes: { wght: { min: 700, max: 100 } } }] }))
			.toThrow(/must not exceed/)
	})

	it('rejects axis values that are arrays', () => {
		expect(() => validateConfig({ outputs: [{ name: 'a', axes: { wght: [100, 700] } }] }))
			.toThrow(/must be number, \{ min, max \}, or null/)
	})

	it('rejects outputs missing both instances and axes', () => {
		expect(() => validateConfig({ outputs: [{ name: 'a' }] }))
			.toThrow(/must have "instances" or non-empty "axes"/)
	})
})
