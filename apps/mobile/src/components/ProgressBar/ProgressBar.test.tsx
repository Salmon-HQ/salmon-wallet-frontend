/**
 * The bar is a share of its own track, so it fills the same fraction on any
 * phone width; and a screen reader hears the number, not a picture.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('@salmon/shared', () => ({ ...jest.requireActual('../../../test-utils/themeTokens') }));

import { ProgressBar } from './ProgressBar';

const flatten = (style: unknown) =>
  Object.assign({}, ...(Array.isArray(style) ? style : [style]).flat(Infinity).filter(Boolean));

describe('ProgressBar', () => {
  it('fills its share of the track and announces it', () => {
    render(
      <ProgressBar
        testID="bar"
        value={0.7}
        startLabel="Staked 5.03B"
        endLabel="Liquid 2.11B"
        accessibilityLabel="Staked share of circulating SKR"
      />
    );

    expect(flatten(screen.getByTestId('bar-fill').props.style).width).toBe('70%');
    expect(screen.getByTestId('bar-track').props.accessibilityValue).toEqual({
      min: 0,
      max: 100,
      now: 70,
    });
    expect(screen.getByText('Staked 5.03B')).toBeTruthy();
    expect(screen.getByText('Liquid 2.11B')).toBeTruthy();
  });

  it('never fills past either end', () => {
    const { rerender } = render(<ProgressBar testID="bar" value={1.4} accessibilityLabel="x" />);
    expect(flatten(screen.getByTestId('bar-fill').props.style).width).toBe('100%');

    rerender(<ProgressBar testID="bar" value={-0.2} accessibilityLabel="x" />);
    expect(flatten(screen.getByTestId('bar-fill').props.style).width).toBe('0%');
  });
});
