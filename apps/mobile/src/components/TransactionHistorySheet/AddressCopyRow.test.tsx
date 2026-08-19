import React from 'react';
import { act, render, screen, fireEvent } from '@testing-library/react-native';

const mockSetStringAsync = jest.fn().mockResolvedValue(undefined);

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key}:${Object.values(options).join(',')}` : key,
  }),
}));

jest.mock('expo-clipboard', () => ({
  setStringAsync: (...args: unknown[]) => mockSetStringAsync(...args),
}));

jest.mock('../../utils/haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: 'light' },
}));

jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('@salmon/shared/src/hooks/useCopyFeedback'),
  // The mobile wrapper hook reads the real motion vocabulary.
  ...jest.requireActual('@salmon/shared/src/theme/durations'),
  borderRadius: { md: 12, xl: 20 },
  borderWidth: { thin: 1 },
  colors: {
    background: { card: '#111' },
    border: { default: '#222' },
    text: { secondary: '#999', primary: '#fff' },
  },
  fontFamilyNative: { medium: 'System', regular: 'System' },
  fontSize: { base: 16 },
  getShortAddress: (value: string, size = 4) => `${value.slice(0, size)}...${value.slice(-size)}`,
  motionMs: { feedbackHold: 1500 },
  ms: (value: number) => value,
  s: (value: number) => value,
  vs: (value: number) => value,
  semantic: { status: { success: '#0f0' }, text: { accent: '#f54' } },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16 },
}));

import { AddressCopyRow } from './AddressCopyRow';

describe('AddressCopyRow copy feedback', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('announces the copy confirmation and reverts to the copy label', async () => {
    render(<AddressCopyRow label="From" address="7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU" />);

    await act(async () => {
      fireEvent.press(screen.getByTestId('tx-detail-copy-address-From'));
    });

    expect(mockSetStringAsync).toHaveBeenCalled();
    expect(screen.getByLabelText('actions.copied')).toBeTruthy();

    act(() => {
      jest.runAllTimers();
    });
    // The hold has expired; the tick is now playing its exit (`ebb`) before
    // unmounting, so run the timer the exit effect scheduled.
    act(() => {
      jest.runAllTimers();
    });

    expect(screen.queryByLabelText('actions.copied')).toBeNull();
    expect(screen.getByLabelText('transactions.detail.copyAddressLabel:From')).toBeTruthy();
  });
});
