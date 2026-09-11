/**
 * @vitest-environment jsdom
 *
 * The install/uninstall control turns one glyph instead of swapping two
 * icons — the mobile twin's suite is
 * `apps/mobile/src/components/PlusMinusGlyph/PlusMinusGlyph.test.tsx`. This
 * pins that the turning bar's rotation flips with `minus`, landing on the
 * fixed bar's own angle.
 */
import React from 'react';
import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { PlusMinusGlyph } from './PlusMinusGlyph';

afterEach(cleanup);

describe('PlusMinusGlyph', () => {
  it('starts vertical — a plus — when not installed', () => {
    render(<PlusMinusGlyph minus={false} />);
    expect(screen.getByTestId('plus-minus-glyph-turning-bar').style.transform).toBe(
      'rotate(90deg)'
    );
  });

  it('turns the vertical bar flat onto the fixed one — a minus — once installed', () => {
    const { rerender } = render(<PlusMinusGlyph minus={false} />);

    rerender(<PlusMinusGlyph minus />);

    expect(screen.getByTestId('plus-minus-glyph-turning-bar').style.transform).toBe(
      'rotate(180deg)'
    );
  });

  it('turns back to a plus on uninstall', () => {
    const { rerender } = render(<PlusMinusGlyph minus />);
    expect(screen.getByTestId('plus-minus-glyph-turning-bar').style.transform).toBe(
      'rotate(180deg)'
    );

    rerender(<PlusMinusGlyph minus={false} />);

    expect(screen.getByTestId('plus-minus-glyph-turning-bar').style.transform).toBe(
      'rotate(90deg)'
    );
  });
});
