/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { renderInMode } from '../../test/renderInMode';
import { ProgressBar } from './ProgressBar';

afterEach(cleanup);

describe('ProgressBar', () => {
  it('fills its share of the track and announces it', () => {
    renderInMode(
      'dark',
      <ProgressBar
        testID="bar"
        value={0.7}
        startLabel="Staked 5.03B"
        endLabel="Liquid 2.11B"
        accessibilityLabel="Staked share of circulating SKR"
      />
    );

    expect(screen.getByTestId('bar-fill').style.width).toBe('70%');
    const track = screen.getByRole('progressbar', { name: 'Staked share of circulating SKR' });
    expect(track.getAttribute('aria-valuenow')).toBe('70');
    expect(screen.getByText('Liquid 2.11B')).toBeTruthy();
  });

  it('never fills past either end', () => {
    renderInMode('dark', <ProgressBar testID="bar" value={1.4} accessibilityLabel="x" />);
    expect(screen.getByTestId('bar-fill').style.width).toBe('100%');
    cleanup();

    renderInMode('dark', <ProgressBar testID="bar" value={-0.2} accessibilityLabel="x" />);
    expect(screen.getByTestId('bar-fill').style.width).toBe('0%');
  });
});
