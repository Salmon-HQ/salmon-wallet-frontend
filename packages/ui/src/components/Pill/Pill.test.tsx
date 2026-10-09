/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, screen } from '@testing-library/react';
import { createSemantic } from '@salmon/shared';
import { afterEach, describe, expect, it } from 'vitest';

import { asRenderedColor, renderInMode } from '../../test/renderInMode';
import { Pill } from './Pill';

afterEach(cleanup);

describe('Pill', () => {
  it('inks a gain, a fall and a status each in its own token', () => {
    const t = createSemantic('dark');
    renderInMode(
      'dark',
      <>
        <Pill label="+4.2%" tone="positive" />
        <Pill label="−4.2%" tone="negative" />
        <Pill label="Active" tone="success" />
      </>
    );

    expect(screen.getByText('+4.2%').style.color).toBe(asRenderedColor(t.change.positive));
    expect(screen.getByText('−4.2%').style.color).toBe(asRenderedColor(t.change.negative));
    expect(screen.getByText('Active').style.color).toBe(asRenderedColor(t.status.success));
  });

  it('shows the status dot only when asked', () => {
    renderInMode('dark', <Pill testID="pill" label="Active" tone="success" dot />);
    expect(screen.getByTestId('pill-dot')).toBeTruthy();
    cleanup();

    renderInMode('dark', <Pill testID="pill" label="Active" tone="success" />);
    expect(screen.queryByTestId('pill-dot')).toBeNull();
  });
});
