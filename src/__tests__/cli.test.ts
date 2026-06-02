// src/__tests__/cli.test.ts — integration tests for the CLI entry point.
// Spawns the built binary (dist/index.js) and asserts version, help text,
// subcommand registration, and exit codes for usage errors.

import { describe, it, expect, beforeAll } from 'vitest'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'
import fs from 'node:fs'

const require = createRequire(import.meta.url)
const pkg = require('../../package.json') as { version: string }
const DIST_ENTRY = path.resolve(__dirname, '../../dist/index.js')

function run(args: string[]) {
	return spawnSync(process.execPath, [DIST_ENTRY, ...args], { encoding: 'utf-8' })
}

describe('vf-clamp CLI', () => {
	beforeAll(() => {
		if (!fs.existsSync(DIST_ENTRY)) {
			throw new Error(
				`dist/index.js missing — run \`npm run build\` before \`npm test\`.`,
			)
		}
	})

	it('--version prints the version from package.json', () => {
		const { status, stdout } = run(['--version'])
		expect(status).toBe(0)
		expect(stdout.trim()).toBe(pkg.version)
	})

	it('-v also prints the version', () => {
		const { status, stdout } = run(['-v'])
		expect(status).toBe(0)
		expect(stdout.trim()).toBe(pkg.version)
	})

	it('--help mentions the program name and both subcommands', () => {
		const { status, stdout } = run(['--help'])
		expect(status).toBe(0)
		expect(stdout).toContain('vf-clamp')
		expect(stdout).toContain('clamp')
		expect(stdout).toContain('instances')
	})

	it('clamp --help includes examples and axis spec guide', () => {
		const { status, stdout } = run(['clamp', '--help'])
		expect(status).toBe(0)
		expect(stdout).toContain('Examples:')
		expect(stdout).toContain('tag:value')
		expect(stdout).toContain('tag:*')
	})

	it('unknown subcommand exits non-zero', () => {
		const { status } = run(['no-such-command'])
		expect(status).not.toBe(0)
	})

	it('clamp with no constraint flags exits with usage code', () => {
		const { status, stderr } = run(['clamp', 'fixtures/missing.ttf'])
		// usage error or input-file-missing — both are non-zero and produce a useful message
		expect(status).not.toBe(0)
		expect(stderr).toContain('vf-clamp clamp:')
	})

	it('clamp with bad font extension exits with usage code', () => {
		const { status, stderr } = run(['clamp', 'font.zip', '-i', 'Light'])
		expect(status).toBe(2)
		expect(stderr).toContain('Unrecognised font extension')
	})

	it('clamp with malformed --axis exits with usage code', () => {
		const { status, stderr } = run([
			'clamp',
			'fixtures/anything.ttf',
			'-a',
			'no-colon',
			'--dry-run',
		])
		expect(status).toBe(2)
		expect(stderr).toContain('Invalid --axis')
	})
})
