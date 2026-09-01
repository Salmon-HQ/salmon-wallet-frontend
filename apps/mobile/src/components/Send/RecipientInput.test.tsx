/**
 * RecipientInput is reused by the send flow and the address-book panels, and
 * only its `testIDPrefix` differs between them — that is the one thing worth
 * pinning here.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('@salmon/shared', () => ({ ...jest.requireActual('../../../test-utils/themeTokens') }));

// No worklets runtime in Jest: same stand-ins IconBubble's own suite uses,
// since RecipientInput renders one for its scan affordance.
jest.mock('react-native-reanimated', () => {
  const ReactActual = require('react');
  const { View: RNView } = require('react-native');
  return {
    __esModule: true,
    default: {
      View: RNView,
      createAnimatedComponent: (Component: React.ComponentType<Record<string, unknown>>) =>
        ReactActual.forwardRef((props: Record<string, unknown>, ref: unknown) =>
          ReactActual.createElement(Component, { ...props, ref })
        ),
    },
    useSharedValue: (value: unknown) => ({ value }),
    useAnimatedStyle: (fn: () => unknown) => fn(),
    useReducedMotion: () => false,
    withTiming: (target: unknown) => target,
  };
});

jest.mock('../../../hooks/usePressMotion', () => ({
  usePressMotion: () => ({
    pressStyle: {},
    scale: { value: 1 },
    pressHandlers: { onPressIn: () => {}, onPressOut: () => {} },
    specular: { x: { value: 0 }, y: { value: 0 }, opacity: { value: 0 } },
  }),
}));

jest.mock('../FleshBackground', () => ({ FleshBackground: () => null }));
jest.mock('../PressSpecular', () => ({ PressSpecular: () => null }));

import { RecipientInput } from './RecipientInput';

const baseProps = {
  value: '',
  onChangeText: jest.fn(),
  onScanPress: jest.fn(),
  scanLabel: 'Scan QR',
  placeholder: '9xQe…',
  validationState: 'idle' as const,
  isValidating: false,
};

describe('RecipientInput', () => {
  it('defaults its field ids to the send flow prefix', () => {
    render(<RecipientInput {...baseProps} />);

    expect(screen.getByTestId('send-recipient-input')).toBeTruthy();
    expect(screen.getByTestId('send-scan-button')).toBeTruthy();
  });

  it('takes its ids from testIDPrefix for a non-send caller', () => {
    render(<RecipientInput {...baseProps} testIDPrefix="address-add" />);

    expect(screen.getByTestId('address-add-recipient-input')).toBeTruthy();
    expect(screen.getByTestId('address-add-scan-button')).toBeTruthy();
    expect(screen.queryByTestId('send-recipient-input')).toBeNull();
  });
});
