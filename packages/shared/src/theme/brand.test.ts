import { describe, expect, it } from 'vitest';

import {
  markAspectRatio,
  markPaths,
  markToSvg,
  markViewBox,
  markViewBoxAttr,
  wordmarkAspectRatio,
  wordmarkPaths,
  wordmarkText,
  wordmarkToSvg,
  wordmarkTypeface,
  wordmarkViewBox,
  wordmarkViewBoxAttr,
} from './brand';

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

describe('wordmark', () => {
  it('is the word the product is called, in the interface typeface', () => {
    expect(wordmarkText).toBe('Salmon');
    expect(wordmarkTypeface).toBe('DMSans-SemiBold');
  });

  it('has one path per glyph', () => {
    expect(wordmarkPaths).toHaveLength(wordmarkText.length);
  });

  it('carries no baked-in fill, so the logotype stays tintable', () => {
    for (const d of wordmarkPaths) {
      expect(d).not.toContain('#');
    }
  });

  it('is already flipped into SVG space, so no transform has to survive', () => {
    // Font space puts y up and SVG puts it down. The flip is baked into the
    // path data, which is why the viewBox origin is negative and the glyph
    // coordinates are too.
    const [minX, minY, width, height] = wordmarkViewBoxAttr.split(' ').map(Number);
    expect(minX).toBe(0);
    expect(minY).toBeLessThan(0);
    expect(width).toBe(wordmarkViewBox.width);
    expect(height).toBe(wordmarkViewBox.height);
  });

  it('derives height from width so the logotype is never stretched', () => {
    const svg = wordmarkToSvg('#FF5C45', 600);
    expect(svg).toContain('width="600"');
    expect(svg).toContain(`height="${Math.round(600 / wordmarkAspectRatio)}"`);
    expect(svg).toContain(`viewBox="${wordmarkViewBoxAttr}"`);
  });

  it('applies the requested fill to every glyph', () => {
    const svg = wordmarkToSvg('#EDF1F7');
    expect(svg.match(/fill="#EDF1F7"/g)).toHaveLength(wordmarkPaths.length);
  });
});
