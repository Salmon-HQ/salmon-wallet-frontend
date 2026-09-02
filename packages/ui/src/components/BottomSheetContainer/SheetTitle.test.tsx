/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, screen } from '@testing-library/react';
import { createSemantic } from '@salmon/shared';
import { afterEach, describe, expect, it } from 'vitest';

import { asRenderedColor, renderInMode } from '../../test/renderInMode';
import { SheetTitle } from './SheetTitle';

afterEach(cleanup);

describe('SheetTitle', () => {
  it('draws the dark-mode ink', () => {
    renderInMode('dark', <SheetTitle>My Sheet</SheetTitle>);
    const title = screen.getByText('My Sheet');
    expect(title.style.color).toBe(asRenderedColor(createSemantic('dark').text.primary));
  });

  it('takes the light-mode ink when the mode is light', () => {
    const dark = createSemantic('dark').text.primary;
    const light = createSemantic('light').text.primary;
    expect(light).not.toBe(dark);

    renderInMode('light', <SheetTitle>My Sheet</SheetTitle>);
    expect(screen.getByText('My Sheet').style.color).toBe(asRenderedColor(light));
  });

  it('renders the leading element inline before the title', () => {
    renderInMode(
      'dark',
      <SheetTitle leading={<span data-testid="leading-icon">!</span>}>Warning</SheetTitle>
    );

    expect(screen.getByTestId('leading-icon')).toBeTruthy();
    expect(screen.getByText('Warning')).toBeTruthy();
  });
});
