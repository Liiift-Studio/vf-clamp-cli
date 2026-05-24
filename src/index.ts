#!/usr/bin/env node
// CLI entry point — sets up the vf-clamp program and registers all subcommands.

import { createRequire } from 'node:module';
import { program } from 'commander';
import { registerInstancesCommand } from './commands/instances.js';
import { registerClampCommand } from './commands/clamp.js';

/**
 * Read the package version at runtime from package.json so it never drifts
 * from the declared version.  `createRequire` is used because this is an ESM
 * module and `import.meta.url` is available in the Node.js ESM context.
 */
const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pkg = require('../package.json') as { version: string };
const VERSION: string = pkg.version;

program
	.name('vf-clamp')
	.description(
		'Restrict variable font axis ranges from the command line.\n' +
		'Powered by @liiift-studio/vf-clamp (Pyodide WASM engine).',
	)
	.version(VERSION, '-v, --version', 'Print version number');

registerInstancesCommand(program);
registerClampCommand(program);

program.parse(process.argv);
