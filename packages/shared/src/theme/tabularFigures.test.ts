/**
 * The Tabular Rule, asserted against the bytes that actually ship.
 *
 * A balance ticking `$17.29 → $17.30` must not move the line. That is only
 * true if every digit in the face rendering numbers has the same advance
 * width, and it is the reason the interface typeface was once swapped out
 * entirely. DM Sans has no `tnum` feature, so `font-variant-numeric` and React
 * Native's `fontVariant` cannot deliver it — `scripts/dmsans.py` bakes the
 * widths into the binaries instead, and this test is what stops a future
 * upstream refresh from quietly dropping the patch on the floor.
 *
 * It reads the TTFs directly rather than trusting a token, because a token can
 * be right while the file it names is wrong.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const FONTS = join(dirname(fileURLToPath(import.meta.url)), '../../../assets/src/fonts');

/** The faces that render numbers: the interface ramp, and mono for addresses. */
const FACES = [
  'DMSans-Regular.ttf',
  'DMSans-Medium.ttf',
  'DMSans-SemiBold.ttf',
  'DMSans-Bold.ttf',
  'GeistMono-Regular.ttf',
];

const DIGITS = [...'0123456789'].map((d) => d.codePointAt(0) as number);

/**
 * Minimal TTF reader: enough of the table directory, `cmap` and `hmtx` to ask
 * how wide a character is. Deliberately not a dependency — this is ~60 lines
 * against a stable, forty-year-old binary format, and a font parser in the
 * bundle graph would be a far larger thing to own than this.
 */
function readTables(font: DataView): Map<string, number> {
  const tables = new Map<string, number>();
  const count = font.getUint16(4);
  for (let i = 0; i < count; i += 1) {
    const record = 12 + i * 16;
    const tag = String.fromCharCode(...[0, 1, 2, 3].map((n) => font.getUint8(record + n)));
    tables.set(tag, font.getUint32(record + 8));
  }
  return tables;
}

/** Unicode code point -> glyph id, via a format 4 or format 12 `cmap` subtable. */
function readCmap(font: DataView, cmap: number): Map<number, number> {
  const subtables = font.getUint16(cmap + 2);
  let best = -1;
  let bestFormat = -1;
  for (let i = 0; i < subtables; i += 1) {
    // Encoding records are 8 bytes each and start right after the 4-byte header.
    const offset = cmap + font.getUint32(cmap + 4 + i * 8 + 4);
    const format = font.getUint16(offset);
    // Prefer 12 (full Unicode) over 4 (BMP); ignore anything else.
    if ((format === 4 || format === 12) && format > bestFormat) {
      best = offset;
      bestFormat = format;
    }
  }
  if (best < 0) throw new Error('no format 4 or 12 cmap subtable');

  const glyphs = new Map<number, number>();
  if (bestFormat === 12) {
    const groups = font.getUint32(best + 12);
    for (let g = 0; g < groups; g += 1) {
      const at = best + 16 + g * 12;
      const start = font.getUint32(at);
      const end = font.getUint32(at + 4);
      const startGlyph = font.getUint32(at + 8);
      for (let c = start; c <= end; c += 1) glyphs.set(c, startGlyph + (c - start));
    }
    return glyphs;
  }

  const segments = font.getUint16(best + 6) / 2;
  const ends = best + 14;
  const starts = ends + segments * 2 + 2;
  const deltas = starts + segments * 2;
  const ranges = deltas + segments * 2;
  for (let s = 0; s < segments; s += 1) {
    const end = font.getUint16(ends + s * 2);
    const start = font.getUint16(starts + s * 2);
    const delta = font.getInt16(deltas + s * 2);
    const rangeOffset = font.getUint16(ranges + s * 2);
    for (let c = start; c <= end && c !== 0xffff; c += 1) {
      let glyph: number;
      if (rangeOffset === 0) {
        glyph = (c + delta) & 0xffff;
      } else {
        const at = ranges + s * 2 + rangeOffset + (c - start) * 2;
        glyph = font.getUint16(at);
        if (glyph !== 0) glyph = (glyph + delta) & 0xffff;
      }
      if (glyph !== 0) glyphs.set(c, glyph);
    }
  }
  return glyphs;
}

/** Advance widths, in font units, of the ten digits of one shipped face. */
function digitAdvances(file: string): number[] {
  const bytes = readFileSync(join(FONTS, file));
  const font = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tables = readTables(font);
  const hhea = tables.get('hhea');
  const hmtx = tables.get('hmtx');
  const cmap = tables.get('cmap');
  if (hhea === undefined || hmtx === undefined || cmap === undefined) {
    throw new Error(`${file}: missing hhea/hmtx/cmap`);
  }

  const metrics = font.getUint16(hhea + 34);
  const glyphs = readCmap(font, cmap);
  return DIGITS.map((code) => {
    const glyph = glyphs.get(code);
    if (glyph === undefined) throw new Error(`${file}: no glyph for U+${code.toString(16)}`);
    // Glyphs past the last hMetric all reuse its advance, which would make a
    // proportional font look tabular — clamp so the assertion stays honest.
    return font.getUint16(hmtx + Math.min(glyph, metrics - 1) * 4);
  });
}

describe('tabular figures', () => {
  it.each(FACES)('%s renders all ten digits at one advance width', (file) => {
    const advances = digitAdvances(file);

    expect(advances).toHaveLength(10);
    expect(new Set(advances).size).toBe(1);
  });

  it('is not accidentally passing on a font that failed to load', () => {
    // The clamp above cannot manufacture uniformity here: an unpatched DM Sans
    // sets `1` at 342 against `0` at 656, so this is the control.
    const advances = digitAdvances('DMSans-Regular.ttf');

    expect(advances[0]).toBeGreaterThan(500);
    expect(advances[1]).toBe(advances[0]);
  });
});
