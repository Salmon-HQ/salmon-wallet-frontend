/**
 * @vitest-environment jsdom
 *
 * Every word below is a placeholder, not a BIP-39 word, and no arrangement of
 * them is a phrase. A fixture that looks like a real recovery phrase is a real
 * recovery phrase as far as anything scraping this repo is concerned.
 *
 * What is pinned here is the Bedrock Rule at the surface the words actually
 * rest on. The screen behind this grid already stands on bedrock, which is
 * exactly what hid the problem: the numbered cells drawn over it were
 * translucent, so a live backdrop sat directly under the phrase. A cell that
 * lets anything through is the violation, whatever its container is made of.
 */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { createSemantic, semantic, shadows, ThemeContext } from '@salmon/shared';
import type { ThemeContextValue } from '@salmon/shared';
import { SeedWordGrid } from './SeedWordGrid';

const placeholders = ['alpha', 'bravo', 'charlie', 'delta'];

afterEach(cleanup);

describe('SeedWordGrid', () => {
  it('rests every word on an opaque bedrock cell, never a translucent one', () => {
    render(<SeedWordGrid words={placeholders} columns={2} />);

    for (let position = 1; position <= placeholders.length; position += 1) {
      const cell = screen.getByTestId(`seed-word-cell-${position}`);
      const background = getComputedStyle(cell).backgroundColor;

      expect(background).not.toContain('rgba');
      expect(background).toBe(hexToRgb(semantic.surface.bedrock));
    }
  });

  it("rests on light's bedrock when the mode is light — still opaque", () => {
    const light = createSemantic('light');
    const value = {
      mode: 'light',
      preference: 'light',
      setPreference: async () => undefined,
      semantic: light,
      shadows,
      ready: true,
    } as unknown as ThemeContextValue;

    render(
      <ThemeContext.Provider value={value}>
        <SeedWordGrid words={placeholders} columns={2} />
      </ThemeContext.Provider>
    );

    const background = getComputedStyle(screen.getByTestId('seed-word-cell-1')).backgroundColor;
    expect(background).not.toContain('rgba');
    expect(background).toBe(hexToRgb(light.surface.bedrock));
  });

  it('numbers every cell so an index is never read as part of the phrase', () => {
    render(<SeedWordGrid words={placeholders} columns={2} />);

    placeholders.forEach((word, index) => {
      const cell = screen.getByTestId(`seed-word-cell-${index + 1}`);
      expect(cell.textContent).toContain(String(index + 1));
      expect(cell.textContent).toContain(word);
    });
  });
});

/** jsdom reports computed colours as `rgb(...)`, the tokens are hex. */
function hexToRgb(hex: string): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgb(${r}, ${g}, ${b})`;
}
