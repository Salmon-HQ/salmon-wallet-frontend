/**
 * withAlpha — a token's colour at another opacity.
 *
 * The one place a fade is allowed to end. A gradient stop of `'transparent'`
 * is `rgba(0, 0, 0, 0)`, and React Native interpolates colour and alpha
 * separately, so every fade that ended on it passed through a black tint on
 * its way to nothing — invisible on the deep-water ground, a dirty grey band
 * on a pale one. A fade ends on *its own colour at alpha 0*, and this is how
 * that colour is written without a second literal.
 *
 * Accepts the two forms the palette and the semantic layer use: `#rrggbb`
 * (and `#rgb`) hex, and `rgb()`/`rgba()` strings. Anything else throws —
 * a silent fallback would ship the black tint back in.
 */
export function withAlpha(color: string, alpha: number): string {
  if (alpha < 0 || alpha > 1 || Number.isNaN(alpha)) {
    throw new Error(`withAlpha: alpha must be within [0, 1], got ${alpha}`);
  }
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (hex) {
    const digits = hex[1].length === 3 ? hex[1].replace(/./g, (c) => c + c) : hex[1];
    const r = parseInt(digits.slice(0, 2), 16);
    const g = parseInt(digits.slice(2, 4), 16);
    const b = parseInt(digits.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*[\d.]+\s*)?\)$/i.exec(
    color.trim()
  );
  if (rgb) {
    return `rgba(${rgb[1]}, ${rgb[2]}, ${rgb[3]}, ${alpha})`;
  }
  throw new Error(`withAlpha: unsupported colour "${color}"`);
}
