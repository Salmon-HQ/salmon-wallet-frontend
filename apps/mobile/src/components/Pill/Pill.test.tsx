/**
 * A pill is read for its colour as much as its words: a gain, a fall and a
 * status must never look alike.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('@salmon/shared', () => ({ ...jest.requireActual('../../../test-utils/themeTokens') }));

import { semantic } from '@salmon/shared';
import { Pill } from './Pill';

const flatten = (style: unknown) =>
  Object.assign({}, ...(Array.isArray(style) ? style : [style]).flat(Infinity).filter(Boolean));
const inkOf = (text: string) => flatten(screen.getByText(text).props.style).color;

describe('Pill', () => {
  it('inks a gain, a fall and a status each in its own token', () => {
    render(
      <>
        <Pill label="+4.2%" tone="positive" />
        <Pill label="−4.2%" tone="negative" />
        <Pill label="Active" tone="success" />
      </>
    );

    expect(inkOf('+4.2%')).toBe(semantic.change.positive);
    expect(inkOf('−4.2%')).toBe(semantic.change.negative);
    expect(inkOf('Active')).toBe(semantic.status.success);
  });

  it('shows the status dot only when asked', () => {
    const { rerender } = render(<Pill testID="pill" label="Active" tone="success" dot />);
    expect(screen.getByTestId('pill-dot')).toBeTruthy();

    rerender(<Pill testID="pill" label="Active" tone="success" />);
    expect(screen.queryByTestId('pill-dot')).toBeNull();
  });
});
