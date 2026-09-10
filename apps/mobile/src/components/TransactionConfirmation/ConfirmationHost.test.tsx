/**
 * The confirmation window: what core opens over a Powerup's screen when a
 * proposal is parked, and how it leaves once the signature is back.
 */
import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: { View },
    useReducedMotion: () => true,
  };
});

const mockHost: {
  request: null | { proposal: { display: Record<string, unknown> }; phase: string; error: null };
  refreshing: boolean;
  confirmLabel: string;
  confirmOrRefresh: jest.Mock;
  cancel: jest.Mock;
} = {
  request: null,
  refreshing: false,
  confirmLabel: 'Confirm (10)',
  confirmOrRefresh: jest.fn(),
  cancel: jest.fn(),
};

jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('@salmon/shared/src/hooks/useWaitExit'),
  spacing: { lg: 16 },
  useSignatureRequestHost: () => mockHost,
}));

jest.mock('../../theme/useThemedStyles', () => ({
  useThemedStyles: (make: (t: unknown) => unknown) => make({ depth: { column: '#000' } }),
}));
jest.mock('../../contexts/TaskChromeContext', () => ({
  useTaskChromeClaim: () => jest.fn(),
}));
jest.mock('../../utils/sinkAndFloat', () => ({
  FLOAT_DELAY_MS: 0,
  floatEntering: () => undefined,
  sinkExiting: () => undefined,
}));
jest.mock('../DepthBackground', () => ({ DepthBackground: () => null }));
jest.mock('../ScalesBackground', () => ({ ScalesBackground: () => null }));
jest.mock('../LoadingScreen', () => {
  const ReactActual = require('react');
  const { View } = require('react-native');
  return {
    LoadingScreen: ({ visible, onExited }: { visible?: boolean; onExited?: () => void }) => {
      ReactActual.useEffect(() => {
        if (!visible) onExited?.();
      }, [visible, onExited]);
      return <View testID="confirmation-wave" accessibilityLabel={String(visible)} />;
    },
  };
});
jest.mock('./TransactionConfirmation', () => {
  const { View } = require('react-native');
  return {
    TransactionConfirmation: ({
      onBack,
      onConfirm,
      confirmLabel,
    }: {
      onBack: () => void;
      onConfirm: () => void;
      confirmLabel: string;
    }) => (
      <View testID="transaction-confirmation" accessibilityLabel={confirmLabel}>
        <View testID="stub-back" onPress={onBack} />
        <View testID="stub-confirm" onPress={onConfirm} />
      </View>
    ),
  };
});

import { ConfirmationHost } from './ConfirmationHost';

const proposal = { display: { title: 'Swap Review', pendingTitle: 'Processing swap' } };

describe('ConfirmationHost', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHost.request = null;
  });

  it('opens nothing while no proposal is parked', () => {
    const { queryByTestId } = render(<ConfirmationHost />);
    // An RN Modal draws nothing at all while hidden.
    expect(queryByTestId('confirmation-window')).toBeNull();
    expect(queryByTestId('transaction-confirmation')).toBeNull();
  });

  it('opens its own window with the confirmation and wires the controls to core', () => {
    mockHost.request = { proposal, phase: 'review', error: null };
    const { getByTestId, rerender } = render(<ConfirmationHost />);
    rerender(<ConfirmationHost />);

    expect(getByTestId('confirmation-window').props.visible).toBe(true);
    expect(getByTestId('transaction-confirmation').props.accessibilityLabel).toBe('Confirm (10)');

    fireEvent.press(getByTestId('stub-confirm'));
    expect(mockHost.confirmOrRefresh).toHaveBeenCalledTimes(1);
    fireEvent.press(getByTestId('stub-back'));
    expect(mockHost.cancel).toHaveBeenCalledTimes(1);
  });

  it('replaces the confirmation with the wave wait while core signs, and refuses to back out of it', () => {
    mockHost.request = { proposal, phase: 'signing', error: null };
    const { getByTestId, queryByTestId } = render(<ConfirmationHost />);

    expect(queryByTestId('transaction-confirmation')).toBeNull();
    expect(getByTestId('confirmation-wave').props.accessibilityLabel).toBe('true');

    act(() => getByTestId('confirmation-window').props.onRequestClose());
    expect(mockHost.cancel).not.toHaveBeenCalled();
  });

  it('holds the window until the wave has left, then closes it', () => {
    mockHost.request = { proposal, phase: 'signing', error: null };
    const { getByTestId, queryByTestId, rerender } = render(<ConfirmationHost />);
    expect(getByTestId('confirmation-window').props.visible).toBe(true);

    // The signature is back: core clears the request, the wave exits on its
    // own last wave (the stub reports it at once), and only then does the
    // window go.
    mockHost.request = null;
    rerender(<ConfirmationHost />);
    expect(queryByTestId('confirmation-window')).toBeNull();
  });
});
