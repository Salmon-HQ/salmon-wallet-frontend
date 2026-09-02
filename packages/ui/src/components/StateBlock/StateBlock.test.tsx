/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { createSemantic } from '@salmon/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { asRenderedColor, renderInMode } from '../../test/renderInMode';
import { StateBlock } from './StateBlock';

afterEach(cleanup);

describe('StateBlock', () => {
  it('announces as an alert only in the error tone', () => {
    renderInMode('dark', <StateBlock tone="error" title="Failed" testID="block" />);
    expect(screen.getByTestId('block').getAttribute('role')).toBe('alert');
  });

  it('carries no alert role for the empty tone', () => {
    renderInMode('dark', <StateBlock tone="empty" title="Nothing here" testID="block" />);
    expect(screen.getByTestId('block').getAttribute('role')).toBeNull();
  });

  it('renders the body only when given', () => {
    renderInMode('dark', <StateBlock tone="empty" title="Nothing" body="Try again later" />);
    expect(screen.getByText('Try again later')).toBeTruthy();
  });

  it('renders a retry control that fires onRetry', () => {
    const onRetry = vi.fn();
    renderInMode(
      'dark',
      <StateBlock tone="error" title="Failed" onRetry={onRetry} retryLabel="Retry" testID="block" />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('takes the dark title ink from the active tokens', () => {
    renderInMode('dark', <StateBlock tone="empty" title="Nothing" />);
    expect(screen.getByText('Nothing').style.color).toBe(
      asRenderedColor(createSemantic('dark').text.primary)
    );
  });

  it('takes a different title ink in light mode', () => {
    const dark = createSemantic('dark').text.primary;
    const light = createSemantic('light').text.primary;
    expect(dark).not.toBe(light);

    renderInMode('light', <StateBlock tone="empty" title="Nothing" />);
    expect(screen.getByText('Nothing').style.color).toBe(asRenderedColor(light));
  });
});
