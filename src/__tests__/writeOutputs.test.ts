// src/__tests__/writeOutputs.test.ts — unit tests for output writing,
// including path-containment checks and overwrite behaviour.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { writeOutputs } from '../utils/font.js'

let tmpDir: string

beforeEach(async () => {
	tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-clamp-test-'))
})

afterEach(async () => {
	await fs.rm(tmpDir, { recursive: true, force: true })
})

describe('writeOutputs', () => {
	it('writes a single output to disk', async () => {
		const written = await writeOutputs(
			[{ name: 'Inter-Light', buffer: new Uint8Array([1, 2, 3]), format: 'ttf' }],
			tmpDir,
		)
		expect(written).toHaveLength(1)
		expect(path.basename(written[0]!)).toBe('Inter-Light.ttf')
		const data = await fs.readFile(written[0]!)
		expect(Array.from(data)).toEqual([1, 2, 3])
	})

	it('creates the output directory if it does not exist', async () => {
		const nested = path.join(tmpDir, 'nested', 'dir')
		await writeOutputs(
			[{ name: 'a', buffer: new Uint8Array([0]), format: 'ttf' }],
			nested,
		)
		const stat = await fs.stat(nested)
		expect(stat.isDirectory()).toBe(true)
	})

	it('writes multiple outputs in parallel', async () => {
		const written = await writeOutputs(
			[
				{ name: 'a', buffer: new Uint8Array([1]), format: 'ttf' },
				{ name: 'b', buffer: new Uint8Array([2]), format: 'woff2' },
			],
			tmpDir,
		)
		expect(written).toHaveLength(2)
		const names = written.map((p) => path.basename(p)).sort()
		expect(names).toEqual(['a.ttf', 'b.woff2'])
	})

	it('sanitises filenames to avoid path traversal', async () => {
		const written = await writeOutputs(
			[{ name: '../../evil', buffer: new Uint8Array([1]), format: 'ttf' }],
			tmpDir,
		)
		// The sanitised name must remain inside tmpDir.
		const rel = path.relative(tmpDir, written[0]!)
		expect(rel.startsWith('..')).toBe(false)
		expect(path.isAbsolute(rel)).toBe(false)
	})

	it('rejects engine formats outside the allow-list', async () => {
		await expect(
			writeOutputs(
				[{ name: 'a', buffer: new Uint8Array([1]), format: '../evil' }],
				tmpDir,
			),
		).rejects.toThrow(/unsupported format/)
	})

	it('refuses to overwrite existing files when force is false', async () => {
		await writeOutputs(
			[{ name: 'a', buffer: new Uint8Array([1]), format: 'ttf' }],
			tmpDir,
		)
		await expect(
			writeOutputs(
				[{ name: 'a', buffer: new Uint8Array([2]), format: 'ttf' }],
				tmpDir,
				{ force: false },
			),
		).rejects.toThrow(/Refusing to overwrite/)
	})

	it('overwrites existing files when force is true (default)', async () => {
		await writeOutputs(
			[{ name: 'a', buffer: new Uint8Array([1]), format: 'ttf' }],
			tmpDir,
		)
		await writeOutputs(
			[{ name: 'a', buffer: new Uint8Array([2, 2, 2]), format: 'ttf' }],
			tmpDir,
		)
		const data = await fs.readFile(path.join(tmpDir, 'a.ttf'))
		expect(Array.from(data)).toEqual([2, 2, 2])
	})

	it('writes atomically — no .tmp files remain on success', async () => {
		await writeOutputs(
			[{ name: 'a', buffer: new Uint8Array([1]), format: 'ttf' }],
			tmpDir,
		)
		const entries = await fs.readdir(tmpDir)
		expect(entries.filter((e) => e.includes('.tmp-'))).toHaveLength(0)
	})
})
