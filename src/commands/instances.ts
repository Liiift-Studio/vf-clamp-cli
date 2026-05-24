// `vf-clamp instances <font>` — print all variable axes and named instances in a font.

import type { Command } from 'commander';
import { getInstances } from '@liiift-studio/vf-clamp';
import { readFontFile, assertFontExtension, formatTable } from '../utils/font.js';

/** Axis descriptor returned by getInstances. */
interface AxisInfo {
	tag: string;
	name: string;
	minimum: number;
	default: number;
	maximum: number;
}

/** Named instance descriptor returned by getInstances. */
interface InstanceInfo {
	name: string;
	coordinates: Record<string, number>;
}

/**
 * Registers the `instances` subcommand on the given commander program.
 * Usage: vf-clamp instances <font>
 */
export function registerInstancesCommand(program: Command): void {
	program
		.command('instances <font>')
		.description('List all variable axes and named instances in a font file')
		.action(async (fontPath: string) => {
			try {
				assertFontExtension(fontPath);
				const buffer = await readFontFile(fontPath);

				process.stderr.write('Reading font… (first run may take 10–20s)\n');

				const { axes, instances } = (await getInstances(buffer)) as {
					axes: AxisInfo[];
					instances: InstanceInfo[];
				};

				printAxes(axes);
				printInstances(instances);
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				process.stderr.write(`Error: ${message}\n`);
				process.exit(1);
			}
		});
}

/**
 * Prints the axes section to stdout.
 * Format: tag  Name   min → max  (default: N)
 */
function printAxes(axes: AxisInfo[]): void {
	process.stdout.write('\nAxes:\n');

	if (axes.length === 0) {
		process.stdout.write('  (none — this may not be a variable font)\n');
		return;
	}

	// Compute column widths from the data.
	const TAG_WIDTH = Math.max(4, ...axes.map((a) => a.tag.length)) + 2;
	const NAME_WIDTH = Math.max(4, ...axes.map((a) => a.name.length)) + 2;

	for (const axis of axes) {
		const tag = axis.tag.padEnd(TAG_WIDTH);
		const name = axis.name.padEnd(NAME_WIDTH);
		const range = `${axis.minimum} → ${axis.maximum}`;
		process.stdout.write(`  ${tag}${name}${range}  (default: ${axis.default})\n`);
	}
}

/**
 * Prints the named instances section to stdout.
 * Format: Name   wght=300 slnt=0 …
 */
function printInstances(instances: InstanceInfo[]): void {
	process.stdout.write(`\nInstances (${instances.length}):\n`);

	if (instances.length === 0) {
		process.stdout.write('  (none)\n');
		return;
	}

	const NAME_WIDTH = Math.max(4, ...instances.map((i) => i.name.length)) + 2;

	const rows: Array<[string, string]> = instances.map((inst) => {
		const coords = Object.entries(inst.coordinates)
			.map(([tag, val]) => `${tag}=${val}`)
			.join(' ');
		return [inst.name, coords];
	});

	process.stdout.write(formatTable(rows, NAME_WIDTH) + '\n');
}
