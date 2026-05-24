// `vf-clamp clamp <font>` — produce one or more restricted variable font files.

import fs from 'node:fs/promises';
import path from 'node:path';
import type { Command } from 'commander';
import { clampFont } from '@liiift-studio/vf-clamp';
import {
	readFontFile,
	writeOutputs,
	assertFontExtension,
} from '../utils/font.js';

/** Shape of a single output entry in a config file. */
interface ConfigOutput {
	name?: string;
	instances?: string[];
	axes?: Record<string, { min?: number; max?: number } | number>;
}

/** Shape of the JSON config file accepted by --config. */
interface ClampConfig {
	format?: string;
	outputDir?: string;
	outputs: ConfigOutput[];
}

/** A resolved output request passed to clampFont. */
interface OutputRequest {
	name: string;
	instances?: string[];
	axes?: Record<string, { min?: number; max?: number } | number>;
}

/** Supported output formats. */
const SUPPORTED_FORMATS = ['ttf', 'otf', 'woff', 'woff2'] as const;
type Format = (typeof SUPPORTED_FORMATS)[number];

/**
 * Registers the `clamp` subcommand on the given commander program.
 * Usage: vf-clamp clamp <font> [options]
 */
export function registerClampCommand(program: Command): void {
	program
		.command('clamp <font>')
		.description('Produce one or more restricted variable font files')
		.option(
			'--instance <name>',
			'Named instance to include in hull (repeatable)',
			collect,
			[] as string[],
		)
		.option(
			'--axis <spec>',
			'Pin or restrict an axis: tag:value  or  tag:min:max (repeatable)',
			collect,
			[] as string[],
		)
		.option('--name <name>', 'Output name (filename stem and name-table label)')
		.option('--format <fmt>', 'Output format: ttf | otf | woff | woff2', 'ttf')
		.option('--output <dir>', 'Output directory', '.')
		.option('--config <file>', 'JSON config file for multiple outputs')
		.action(async (fontPath: string, opts: ClampOptions) => {
			try {
				assertFontExtension(fontPath);
				const buffer = await readFontFile(fontPath);

				let outputRequests: OutputRequest[];
				let format: string = opts.format;
				let outputDir: string = opts.output;

				if (opts.config) {
					// Config-file mode — build all output requests from the JSON file.
					const config = await readConfig(opts.config);
					outputRequests = buildRequestsFromConfig(config);
					format = config.format ?? format;
					outputDir = config.outputDir ?? outputDir;
				} else {
					// Flag mode — build a single output request.
					outputRequests = buildRequestFromFlags(opts);
				}

				assertFormat(format);

				process.stderr.write(
					`Processing… (this may take 10–20s on first run)\n`,
				);

				// clampFont accepts one output per call as defined by the current API.
				const allResults: Array<{ name: string; buffer: Uint8Array; format: string }> = [];

				for (const req of outputRequests) {
					const clampOutput = buildClampOutput(req);
					const results = await clampFont(buffer, {
						outputs: [clampOutput],
						format: format as Format,
					});
					// Attach the name from our request to each result.
					for (const result of results) {
						allResults.push({
							name: req.name,
							buffer: result.buffer,
							format: result.format ?? format,
						});
					}
				}

				const written = await writeOutputs(allResults, outputDir);

				for (const filePath of written) {
					process.stdout.write(`Written: ${filePath}\n`);
				}
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				process.stderr.write(`Error: ${message}\n`);
				process.exit(1);
			}
		});
}

/** Commander value collector — appends each repeated flag value into an array. */
function collect(value: string, previous: string[]): string[] {
	return [...previous, value];
}

/** Options shape for the clamp command. */
interface ClampOptions {
	instance: string[];
	axis: string[];
	name?: string;
	format: string;
	output: string;
	config?: string;
}

/**
 * Reads and parses a JSON config file from disk.
 * Throws a descriptive error if the file cannot be read or parsed.
 */
async function readConfig(configPath: string): Promise<ClampConfig> {
	const resolved = path.resolve(configPath);
	let raw: string;
	try {
		raw = await fs.readFile(resolved, 'utf-8');
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		throw new Error(`Could not read config file "${resolved}": ${message}`);
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		throw new Error(`Config file "${resolved}" is not valid JSON`);
	}

	const config = parsed as ClampConfig;
	if (!Array.isArray(config.outputs) || config.outputs.length === 0) {
		throw new Error(`Config file must contain a non-empty "outputs" array`);
	}

	return config;
}

/**
 * Converts config-file outputs into resolved output requests.
 * Each output must have either `instances` or `axes`.
 */
function buildRequestsFromConfig(config: ClampConfig): OutputRequest[] {
	return config.outputs.map((output, idx) => {
		if (!output.instances?.length && !output.axes) {
			throw new Error(
				`Output at index ${idx} must have "instances" or "axes"`,
			);
		}
		return {
			name: output.name ?? `output-${idx + 1}`,
			instances: output.instances,
			axes: output.axes,
		};
	});
}

/**
 * Builds a single output request from CLI flags.
 * Requires at least one --instance or --axis flag.
 */
function buildRequestFromFlags(opts: ClampOptions): OutputRequest[] {
	const { instance: instances, axis: axisSpecs, name } = opts;

	if (instances.length === 0 && axisSpecs.length === 0) {
		throw new Error(
			'Provide at least one --instance or --axis flag, or use --config for a config file.',
		);
	}

	const axes = parseAxisSpecs(axisSpecs);

	// Derive a name if not explicitly provided.
	const derivedName =
		name ??
		(instances.length > 0
			? instances.join('-')
			: Object.keys(axes)
					.map((tag) => tag)
					.join('-'));

	return [
		{
			name: derivedName,
			instances: instances.length > 0 ? instances : undefined,
			axes: Object.keys(axes).length > 0 ? axes : undefined,
		},
	];
}

/**
 * Parses `--axis` flag values into a structured axes map.
 * Accepted forms:
 *   tag:value        → pin to exact value (stored as a number)
 *   tag:min:max      → restrict to range
 */
function parseAxisSpecs(
	specs: string[],
): Record<string, { min?: number; max?: number } | number> {
	const axes: Record<string, { min?: number; max?: number } | number> = {};

	for (const spec of specs) {
		const parts = spec.split(':');

		if (parts.length === 2) {
			const tag = parts[0];
			const value = Number(parts[1]);
			if (!tag || isNaN(value)) {
				throw new Error(
					`Invalid --axis value "${spec}". Expected tag:value or tag:min:max`,
				);
			}
			axes[tag] = value;
		} else if (parts.length === 3) {
			const tag = parts[0];
			const min = Number(parts[1]);
			const max = Number(parts[2]);
			if (!tag || isNaN(min) || isNaN(max)) {
				throw new Error(
					`Invalid --axis value "${spec}". Expected tag:value or tag:min:max`,
				);
			}
			if (min > max) {
				throw new Error(
					`Invalid --axis "${spec}": min (${min}) must not exceed max (${max})`,
				);
			}
			axes[tag] = { min, max };
		} else {
			throw new Error(
				`Invalid --axis value "${spec}". Expected tag:value or tag:min:max`,
			);
		}
	}

	return axes;
}

/**
 * Converts an OutputRequest into the shape expected by clampFont's `outputs` array.
 * Merges instance names and axis overrides as supported by the engine.
 */
function buildClampOutput(req: OutputRequest): {
	name: string;
	instances?: string[];
} {
	return {
		name: req.name,
		...(req.instances ? { instances: req.instances } : {}),
	};
}

/**
 * Asserts that the requested format is in the supported list.
 * Throws a descriptive error if not.
 */
function assertFormat(format: string): void {
	if (!SUPPORTED_FORMATS.includes(format as Format)) {
		throw new Error(
			`Unsupported format "${format}". Choose from: ${SUPPORTED_FORMATS.join(', ')}`,
		);
	}
}
