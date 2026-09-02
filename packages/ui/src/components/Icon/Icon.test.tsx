/**
 * @vitest-environment jsdom
 */
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createSemantic } from '@salmon/shared';

import { BitcoinSvgIcon, EthereumSvgIcon, SolanaSvgIcon } from './Icon';

afterEach(cleanup);

describe('the blockchain marks (DOM)', () => {
  it('draw a square box of the given size and take the caller ink', () => {
    const { container } = render(<SolanaSvgIcon size={18} color="rgb(1, 2, 3)" />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('width')).toBe('18');
    expect(svg.getAttribute('height')).toBe('18');
    expect(svg.getAttribute('fill')).toBe('rgb(1, 2, 3)');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
  });

  it("default to the mode's secondary ink — dark outside a provider", () => {
    const { container } = render(<BitcoinSvgIcon />);
    expect(container.querySelector('svg')!.getAttribute('fill')).toBe(
      createSemantic('dark').text.secondary
    );
  });

  it('keep their own viewBox — a mark is drawn, not fitted', () => {
    const { container } = render(<EthereumSvgIcon />);
    expect(container.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 34 54');
  });
});
