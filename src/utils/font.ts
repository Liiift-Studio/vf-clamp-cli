// File I/O helpers for reading font files and writing clamped outputs.

import fs from 'node:fs/promises';
import path from 'node:path';

/** Reads a font file from disk and returns its contents as a Buffer. */
export async function readFontFile(filePath: string): Promise<Buffer> {
	const resolved = path.resolve(filePath);
	try {
		return await fs.readFile(resolved);
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		throw new Error(`Could not read font file "${resolved}": ${message}`);
	}
}

/**
 * Writes one or more clamped font output buffers to disk.
 * Each entry uses `name` as the filename stem and `format` as the extension.
 * Returns the list of file paths written.
 */
export async function writeOutputs(
	results: Array<{ name: string; buffer: Uint8Array; format: string }>,
	outputDir: string,
): Promise<string[]> {
	const resolved = path.resolve(outputDir);

	// Ensure the output directory exists.
	await fs.mkdir(resolved, { recursive: true });

	const written: string[] = [];

	for (const result of results) {
		const filename = `${result.name}.${result.format}`;
		const dest = path.join(resolved, filename);
		await fs.writeFile(dest, result.buffer);
		written.push(dest);
	}

	return written;
}

/**
 * Formats a two-column table for stdout.
 * Each row is [label, value]; label column is padded to `labelWidth` characters.
 */
export function formatTable(
	rows: Array<[string, string]>,
	labelWidth = 18,
): string {
	return rows
		.map(([label, value]) => `  ${label.padEnd(labelWidth)}${value}`)
		.join('\n');
}

/**
 * Validates that a font file path has a recognised variable-font extension.
 * Throws if not recognised — warns only, since format detection is done by the engine.
 */
export function assertFontExtension(filePath: string): void {
	const SUPPORTED_EXTENSIONS = ['.ttf', '.otf', '.woff', '.woff2'];
	const ext = path.extname(filePath).toLowerCase();
	if (!SUPPORTED_EXTENSIONS.includes(ext)) {
		throw new Error(
			`Unrecognised font extension "${ext}". Supported: ${SUPPORTED_EXTENSIONS.join(', ')}`,
		);
	}
}
