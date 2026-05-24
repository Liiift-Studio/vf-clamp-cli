# @liiift-studio/vf-clamp-cli

A command-line interface for [`@liiift-studio/vf-clamp`](https://www.npmjs.com/package/@liiift-studio/vf-clamp) — restrict variable font axis ranges from the terminal without writing any JavaScript.

## Install

```bash
npm install -g @liiift-studio/vf-clamp-cli
```

## Usage

### Inspect a font

List all variable axes and named instances in a font file:

```bash
vf-clamp instances MyFont.ttf
```

Output:

```
Axes:
  wght  Weight     100 → 900  (default: 400)
  slnt  Slant      -10 → 0    (default: 0)

Instances (18):
  Thin              wght=100 slnt=0
  ExtraLight        wght=200 slnt=0
  Light             wght=300 slnt=0
  Regular           wght=400 slnt=0
  Medium            wght=500 slnt=0
  SemiBold          wght=600 slnt=0
  Bold              wght=700 slnt=0
  ...
```

### Clamp a font

Produce a restricted VF spanning the hull of named instances:

```bash
vf-clamp clamp MyFont.ttf --instance Light --instance Bold --name Light-Bold
```

Restrict using explicit axis ranges:

```bash
vf-clamp clamp MyFont.ttf --axis wght:300:700 --name Custom --format woff2
```

Pin a single axis value:

```bash
vf-clamp clamp MyFont.ttf --axis wght:400 --name Regular-Only
```

Combine instances and axis overrides:

```bash
vf-clamp clamp MyFont.ttf --instance Light --instance Bold --axis slnt:-5:0 --name LightBold-Slanted
```

Write output to a specific directory:

```bash
vf-clamp clamp MyFont.ttf --instance Light --instance Bold --output ./dist/fonts
```

### Clamp using a config file

For multiple outputs in one pass, use a JSON config file:

```bash
vf-clamp clamp MyFont.ttf --config clamp.config.json
```

**clamp.config.json:**

```json
{
  "format": "ttf",
  "outputDir": "./output",
  "outputs": [
    {
      "name": "Light-Bold",
      "instances": ["Light", "Bold"]
    },
    {
      "name": "Condensed",
      "axes": { "wdth": { "min": 50, "max": 75 } }
    }
  ]
}
```

## Options

### `vf-clamp instances <font>`

| Argument | Description |
|----------|-------------|
| `<font>` | Path to TTF, OTF, WOFF, or WOFF2 file |

### `vf-clamp clamp <font> [options]`

| Option | Description |
|--------|-------------|
| `--instance <name>` | Named instance to include (repeatable) |
| `--axis <tag:value>` | Pin an axis to a fixed value |
| `--axis <tag:min:max>` | Restrict an axis to a range |
| `--name <name>` | Output name (used for filename and name table) |
| `--format <fmt>` | Output format: `ttf` (default), `otf`, `woff`, `woff2` |
| `--output <dir>` | Output directory (default: current directory) |
| `--config <file>` | JSON config file (for multiple outputs) |

## Performance Note

The underlying engine uses Pyodide (Python WASM). The first run in a process takes approximately **10–20 seconds** to initialise. Subsequent calls in the same process are **1–2 seconds**. This is expected — plan config-file batching for large workflows.

## Related

- [`@liiift-studio/vf-clamp`](https://www.npmjs.com/package/@liiift-studio/vf-clamp) — the core library
- [vfclamp.com](https://vfclamp.com) — web interface

## License

MIT © [Liiift Studio](https://liiift.studio)
