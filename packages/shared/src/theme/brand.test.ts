import { describe, expect, it } from 'vitest';

import { markAspectRatio, markPaths, markToSvg, markViewBox, markViewBoxAttr } from './brand';

describe('brand mark geometry', () => {
  it('keeps the authored artboard', () => {
    expect(markViewBox).toEqual({ width: 253, height: 236 });
    expect(markViewBoxAttr).toBe('0 0 253 236');
  });

  it('has the three paths that compose the mark', () => {
    expect(markPaths).toHaveLength(3);
    for (const d of markPaths) {
      expect(d.startsWith('M')).toBe(true);
      expect(d.trimEnd().endsWith('Z')).toBe(true);
    }
  });

  it('carries no baked-in fill, so the mark stays tintable', () => {
    for (const d of markPaths) {
      expect(d).not.toContain('#');
    }
  });
});

describe('markToSvg', () => {
  it('defaults to the native artboard', () => {
    const svg = markToSvg('#FF5C45');
    expect(svg).toContain('width="253"');
    expect(svg).toContain('height="236"');
    expect(svg).toContain('viewBox="0 0 253 236"');
  });

  it('derives height from width so the mark is never stretched', () => {
    const svg = markToSvg('#FF5C45', 512);
    expect(svg).toContain('width="512"');
    expect(svg).toContain(`height="${Math.round(512 / markAspectRatio)}"`);
  });

  it('applies the requested fill to every path', () => {
    const svg = markToSvg('#070911');
    expect(svg.match(/fill="#070911"/g)).toHaveLength(markPaths.length);
  });
});
