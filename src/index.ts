#!/usr/bin/env node
// CLI entry point — sets up the vf-clamp program, registers all subcommands,
// installs signal handlers, and drives commander's async parser.

import { createRequire } from 'node:module';
import { program } from 'commander';
import { registerInstancesCommand } from './commands/instances.js';
import { registerClampCommand } from './commands/clamp.js';

/**
 * Read the package version at runtime from package.json so it never drifts
 * from the declared version.  `createRequire` is used because this is an ESM
 * module and `import.meta.url` is available in the Node.js ESM context.
 * Falls back to a literal `'0.0.0'` if the file cannot be read (e.g. when the
 * package is bundled in a non-standard layout).
 */
const require = createRequire(import.meta.url);
function readVersion(): string {
	try {
		const pkg = require('../package.json') as unknown;
		if (
			pkg !== null &&
			typeof pkg === 'object' &&
			'version' in pkg &&
			typeof (pkg as { version: unknown }).version === 'string'
		) {
			return (pkg as { version: string }).version;
		}
	} catch {
		// ignore — fall through to default
	}
	return '0.0.0';
}
const VERSION = readVersion();

// Clean exit on Ctrl-C / SIGTERM with conventional exit code 130
// (128 + SIGINT(2)) and a brief stderr notice.  Without this, partially
// written outputs are an even bigger risk during long Pyodide runs.
function installSignalHandlers(): void {
	for (const signal of ['SIGINT', 'SIGTERM'] as const) {
		process.on(signal, () => {
			process.stderr.write(`\nvf-clamp: aborted on ${signal}\n`);
			// 128 + signal number — bash convention for terminated-by-signal.
			const code = signal === 'SIGINT' ? 130 : 143;
			process.exit(code);
		});
	}
}
installSignalHandlers();

program
	.name('vf-clamp')
	.description(
		'Restrict variable font axis ranges from the command line.\n' +
		'Note: first run in a fresh process takes 10–20s while the engine initialises.',
	)
	.version(VERSION, '-v, --version', 'Print version number')
	.showHelpAfterError('(run vf-clamp --help for usage)');

registerInstancesCommand(program);
registerClampCommand(program);

// Use parseAsync so unhandled rejections in async action handlers surface
// cleanly and so we control the final exit code.
program.parseAsync(process.argv).then(
	() => {
		// Explicit exit — Pyodide holds a large WASM heap and a watchdog timer
		// that can keep the event loop alive long after work is done.  Honour
		// any exit code already set by an action handler.
		process.exit(process.exitCode ?? 0);
	},
	(err: unknown) => {
		const message = err instanceof Error ? err.message : String(err);
		process.exitCode = 1;
		process.stderr.write(`vf-clamp: ${message}\n`);
		process.exit(1);
	},
);
