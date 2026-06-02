// File I/O helpers for reading font files and writing clamped outputs.
// All filesystem boundaries live in this module; pure logic lives under src/core.

import fs from 'node:fs/promises';
import path from 'node:path';
import { SUPPORTED_INPUT_EXTENSIONS } from '../core/format.js';
import { isSupportedFormat } from '../core/format.js';

/** Maximum input font file size we will read into memory (in bytes). */
export const MAX_FONT_BYTES = 256 * 1024 * 1024; // 256MB

/** Maximum bytes we will accept from stdin. */
export const MAX_STDIN_BYTES = MAX_FONT_BYTES;

/**
 * Reads a font file from disk and returns its contents as a tight `Uint8Array`.
 *
 * - Rejects files larger than `MAX_FONT_BYTES` to avoid OOM.
 * - Returns a non-pooled `Uint8Array` (not a Node `Buffer`) so callers passing
 *   the bytes across the WASM boundary do not risk pool aliasing.
 * - Error messages echo the user-supplied path, not the resolved absolute
 *   path, to avoid leaking server-side layout when invoked from services.
 */
export async function readFontFile(filePath: string): Promise<Uint8Array> {
	if (filePath === '-') {
		return readStdin();
	}
	const resolved = path.resolve(filePath);
	let stat: Awaited<ReturnType<typeof fs.stat>>;
	try {
		stat = await fs.stat(resolved);
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		throw new Error(`Could not read font file "${filePath}": ${message}`);
	}
	if (!stat.isFile()) {
		throw new Error(`Path "${filePath}" is not a regular file`);
	}
	if (stat.size > MAX_FONT_BYTES) {
		throw new Error(
			`Font file "${filePath}" exceeds the ${MAX_FONT_BYTES}-byte size cap`,
		);
	}
	try {
		const buf = await fs.readFile(resolved);
		// Slice into a fresh, non-pooled Uint8Array view so the WASM bridge
		// does not see Node's pooled-slab byte range.
		return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength).slice();
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		throw new Error(`Could not read font file "${filePath}": ${message}`);
	}
}

/** Reads all bytes from stdin up to MAX_STDIN_BYTES. */
async function readStdin(): Promise<Uint8Array> {
	const chunks: Buffer[] = [];
	let total = 0;
	for await (const chunk of process.stdin) {
		const buf = typeof chunk === 'string' ? Buffer.from(chunk) : (chunk as Buffer);
		total += buf.byteLength;
		if (total > MAX_STDIN_BYTES) {
			throw new Error(`stdin input exceeds the ${MAX_STDIN_BYTES}-byte size cap`);
		}
		chunks.push(buf);
	}
	const combined = Buffer.concat(chunks, total);
	return new Uint8Array(combined.buffer, combined.byteOffset, combined.byteLength).slice();
}

/** Options accepted by writeOutputs. */
export interface WriteOptions {
	/** If false, throw rather than overwrite existing files. Defaults to true. */
	force?: boolean;
}

/**
 * Writes one or more clamped font output buffers to disk.
 *
 * - Validates each entry's format string against the supported set so a
 *   misbehaving engine cannot inject `/`, `..`, or null bytes into the
 *   filename via the extension.
 * - Computes the destination path inside `outputDir` and rejects any path
 *   that escapes the resolved output directory (defence against
 *   `..`/absolute-path injection from configs).
 * - Writes each output atomically: writes to `<dest>.tmp-<pid>-<rand>` and
 *   renames into place, so a crash never leaves a half-written font.
 * - Writes are issued in parallel via `Promise.all`.
 * - Refuses to overwrite an existing file unless `options.force` is true.
 *
 * Returns the list of file paths written.
 */
export async function writeOutputs(
	results: Array<{ name: string; buffer: Uint8Array; format: string }>,
	outputDir: string,
	options: WriteOptions = {},
): Promise<string[]> {
	const { force = true } = options;
	const resolvedDir = path.resolve(outputDir);

	// Ensure the output directory exists.
	await fs.mkdir(resolvedDir, { recursive: true });

	const dests = results.map((result) => {
		const safeName = sanitizeFilename(result.name);
		if (!isSupportedFormat(result.format)) {
			throw new Error(
				`Engine returned unsupported format "${result.format}" for output "${result.name}"`,
			);
		}
		const filename = `${safeName}.${result.format}`;
		const dest = path.join(resolvedDir, filename);
		// Defence in depth: ensure the resolved destination really sits inside
		// resolvedDir even after `path.join` normalisation.
		const rel = path.relative(resolvedDir, dest);
		if (rel.startsWith('..') || path.isAbsolute(rel)) {
			throw new Error(
				`Refusing to write output "${result.name}" outside output directory`,
			);
		}
		return { dest, buffer: result.buffer };
	});

	if (!force) {
		await Promise.all(
			dests.map(async ({ dest }) => {
				try {
					await fs.access(dest);
				} catch {
					return; // file does not exist — good
				}
				throw new Error(
					`Refusing to overwrite existing file "${dest}" (use --force to overwrite)`,
				);
			}),
		);
	}

	await Promise.all(dests.map(({ dest, buffer }) => writeAtomic(dest, buffer)));

	return dests.map(({ dest }) => dest);
}

/**
 * Writes data to a destination path atomically by writing to a sibling
 * tempfile and renaming.  Rename is atomic on the same filesystem.
 */
async function writeAtomic(dest: string, data: Uint8Array): Promise<void> {
	const tmp = `${dest}.tmp-${process.pid}-${Math.random().toString(36).slice(2, 10)}`;
	try {
		await fs.writeFile(tmp, data);
		await fs.rename(tmp, dest);
	} catch (err) {
		// Best-effort cleanup of stray temp file.
		await fs.unlink(tmp).catch(() => {});
		throw err;
	}
}

/**
 * Validates that a font file path has a recognised variable-font extension.
 * Skips the check for `-` (stdin input).
 * Throws if the extension is not recognised.
 */
export function assertFontExtension(filePath: string): void {
	if (filePath === '-') return;
	const ext = path.extname(filePath).toLowerCase();
	if (!(SUPPORTED_INPUT_EXTENSIONS as readonly string[]).includes(ext)) {
		throw new Error(
			`Unrecognised font extension "${ext}". Supported: ${SUPPORTED_INPUT_EXTENSIONS.join(', ')}`,
		);
	}
}

/** Maximum filename length we will accept (most filesystems cap at 255). */
const MAX_FILENAME_LENGTH = 200;

/** Windows reserved device names (case-insensitive, with or without extension). */
const WINDOWS_RESERVED = new Set([
	'con', 'prn', 'aux', 'nul',
	'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7', 'com8', 'com9',
	'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9',
]);

/**
 * Sanitizes a string for safe use as a filename stem.
 *
 * Defends against:
 *   - path separators (`/`, `\`) being interpreted as directories
 *   - null bytes terminating C-string filename APIs
 *   - shell-special characters (`:*?"<>|`) on Windows
 *   - ASCII control characters (`\0`–`\x1F`, `\x7F`) and Unicode whitespace
 *   - embedded `..` segments that would resolve to a parent directory
 *   - Windows reserved device names (CON, PRN, AUX, NUL, COM1–9, LPT1–9)
 *   - names that are only dots or hyphens (would become empty after trim)
 *   - filenames longer than 200 characters
 *
 * Falls back to `"output"` when sanitisation reduces the string to nothing.
 */
export function sanitizeFilename(name: string): string {
	// Strip ASCII control characters (including null, newlines, tabs) and DEL.
	let safe = name.replace(/[\x00-\x1F\x7F]/g, '');
	// Replace path separators and common shell-special chars with a hyphen.
	safe = safe.replace(/[/\\:*?"<>|]/g, '-');
	// Collapse `..` runs (which `path.normalize` would otherwise traverse) to
	// a single dot so the result cannot describe a parent directory.
	safe = safe.replace(/\.{2,}/g, '.');
	// Collapse Unicode whitespace runs to a single space, then convert spaces
	// to nothing (most filesystems handle spaces but we prefer not to).
	safe = safe.replace(/\s+/g, ' ');
	// Collapse multiple hyphens.
	safe = safe.replace(/-{2,}/g, '-');
	// Strip leading dots, spaces, and hyphens to avoid hidden files / relative paths.
	safe = safe.replace(/^[.\s-]+/, '');
	// Strip trailing dots, spaces and hyphens.
	safe = safe.replace(/[.\s-]+$/, '');
	// Truncate to a sane length.
	if (safe.length > MAX_FILENAME_LENGTH) {
		safe = safe.slice(0, MAX_FILENAME_LENGTH);
		// Re-strip any trailing hyphens/dots produced by the truncation.
		safe = safe.replace(/[.\s-]+$/, '');
	}
	// Reject Windows reserved device names (case-insensitive).
	if (WINDOWS_RESERVED.has(safe.toLowerCase())) {
		return 'output';
	}
	// Fall back to a safe default if nothing useful is left.
	return safe || 'output';
}
