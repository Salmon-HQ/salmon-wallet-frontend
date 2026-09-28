/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ValueActionsRow } from './ValueActionsRow';

afterEach(cleanup);

describe('ValueActionsRow', () => {
  it('draws the text first and pins the controls to the trailing edge', () => {
    render(
      <ValueActionsRow
        testID="row"
        leading={<span>+$1 · 2%</span>}
        actions={<button data-testid="control">send</button>}
      />
    );
    expect(screen.getByText('+$1 · 2%')).toBeTruthy();
    expect(screen.getByTestId('row-actions').style.marginLeft).toBe('auto');
  });

  it('draws no control group when there are no controls', () => {
    render(<ValueActionsRow testID="row" leading={<span>only</span>} />);
    expect(screen.queryByTestId('row-actions')).toBeNull();
  });
});
