// src/__tests__/formatTable.test.ts — unit tests for the table formatter helper.
import { describe, it, expect } from 'vitest'
import { formatTable } from '../utils/format.js'

describe('formatTable', () => {
	it('formats rows with the default label width', () => {
		const out = formatTable([['a', 'b'], ['c', 'd']])
		const lines = out.split('\n')
		expect(lines).toHaveLength(2)
		// Default label width is 18, plus the 2-space leading indent.
		expect(lines[0]!.length).toBeGreaterThanOrEqual(18 + 2)
		expect(lines[0]).toMatch(/^  a/)
	})

	it('respects a custom label width', () => {
		const out = formatTable([['x', 'y']], 6)
		expect(out).toBe('  x     y')
	})

	it('returns an empty string for no rows', () => {
		expect(formatTable([])).toBe('')
	})
})
