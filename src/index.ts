#!/usr/bin/env node
// CLI entry point — sets up the vf-clamp program and registers all subcommands.

import { program } from 'commander';
import { registerInstancesCommand } from './commands/instances.js';
import { registerClampCommand } from './commands/clamp.js';

/** Package version — kept in sync with package.json at build time. */
const VERSION = '0.1.0';

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
