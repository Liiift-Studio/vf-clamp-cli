// Generic UI formatting helpers — colocated here rather than in `utils/font.ts`
// so font I/O stays decoupled from presentation concerns.

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
 * Returns the arrow glyph (U+2192) when the host terminal supports UTF-8,
 * otherwise `->` for compatibility with cmd.exe and non-UTF locales.
 */
export function arrowGlyph(): string {
	return supportsUtf8() ? '→' : '->';
}

/**
 * Returns the ellipsis glyph (U+2026) when UTF-8 is supported, else `...`.
 */
export function ellipsisGlyph(): string {
	return supportsUtf8() ? '…' : '...';
}

/**
 * Conservative UTF-8 detection — true when stdout looks Unicode-capable.
 * Falls back to ASCII on Windows cmd.exe and non-UTF locales.
 */
function supportsUtf8(): boolean {
	if (process.platform === 'win32') {
		// PowerShell/Windows Terminal set this; cmd.exe does not.
		return Boolean(process.env.WT_SESSION || process.env.TERM_PROGRAM);
	}
	const lang = process.env.LC_ALL || process.env.LC_CTYPE || process.env.LANG || '';
	return /UTF-?8/i.test(lang);
}
