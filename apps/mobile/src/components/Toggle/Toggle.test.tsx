/**
 * The kit's on/off control, on mobile: a thin wrapper over RN's own
 * `Switch`, reading its checked state and inks from `value`.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('@salmon/shared', () => ({ ...jest.requireActual('../../../test-utils/themeTokens') }));

import { Toggle } from './Toggle';

describe('Toggle', () => {
  it('reads its checked state from `value`', () => {
    render(<Toggle testID="t" value onValueChange={() => {}} accessibilityLabel="Analytics" />);

    expect(screen.getByTestId('t').props.value).toBe(true);
  });

  it('fires onValueChange with the flipped value', () => {
    const onValueChange = jest.fn();
    render(
      <Toggle testID="t" value={false} onValueChange={onValueChange} accessibilityLabel="Analytics" />
    );

    fireEvent(screen.getByTestId('t'), 'valueChange', true);

    expect(onValueChange).toHaveBeenCalledWith(true);
  });
});
