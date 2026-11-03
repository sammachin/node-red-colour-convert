# @sammachin/node-red-colour-convert

A Node-RED node that converts a colour between **RGB**, **HSL** and **CIE xy**,
and outputs every representation in `msg.payload`.

## Install

From your Node-RED user directory (`~/.node-red`):

```bash
npm install @sammachin/node-red-colour-convert
```

Or install from a local checkout:

```bash
cd ~/.node-red
npm install /path/to/node-red-colour-convert
```

## Usage

Drop the **colour convert** node into a flow, then choose which colour space the
incoming value is in and supply the value. Whatever you provide is converted into
all three representations.

### Configuration

| Field    | Description |
|----------|-------------|
| Input is | Which colour space the supplied value is in: `RGB`, `HSL` or `CIE xy`. |
| Value    | The colour to convert, as a typed input (string, JSON, `msg`, `flow`, `global`, `env`). Leave blank to use `msg.payload`. |

### Accepted value formats

- **RGB** — `"255,100,0"`, hex `"#ff6400"` (or `"#f60"`), `{r:255,g:100,b:0}`, or `[255,100,0]`. Channels are 0–255.
- **HSL** — `"30,100,50"`, `{h:30,s:100,l:50}`, or `[30,100,50]`. H is 0–360, S and L are 0–100.
- **CIE xy** — `"0.64,0.33"`, `{x:0.64,y:0.33}`, or `[0.64,0.33]`. An optional third
  value is the `Y` luminance (0–1); without it the colour is returned at full brightness.

### Output

`msg.payload` is set to an object containing every representation:

```json
{
  "rgb": { "r": 255, "g": 100, "b": 0 },
  "hex": "#ff6400",
  "hsl": { "h": 24, "s": 100, "l": 50 },
  "xy":  { "x": 0.6008, "y": 0.3663, "Y": 0.2416 }
}
```

CIE xy conversions use the sRGB colour space with a D65 white point, which is the
convention used by most smart-home colour lights (Philips Hue, Matter, Zigbee).

## Licence

MIT
