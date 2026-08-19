/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key}:${Object.values(options).join(',')}` : key,
  }),
}));

vi.mock('../../utils/styled', () => ({
  styled: (Component: React.ElementType) => () => Component,
}));

vi.mock('../../icons', () => ({
  CheckIcon: () => null,
  iconSize: { sm: 16, md: 20, lg: 24 },
}));

vi.mock('../Icon', () => ({
  CopyIcon: () => null,
  RefreshIcon: () => null,
  SettingsIcon: () => null,
}));

vi.mock('@salmon/shared', async () => ({
  ...(await vi.importActual('../../../../shared/src/hooks/useCopyFeedback')),
  colors: {
    background: { primary: '#000' },
    text: { primary: '#fff', muted: '#999' },
    card: { border: '#222' },
    interactive: { hoverMedium: '#333' },
  },
  spacing: { xxs: 2, sm: 8, md: 12, lg: 16, xl: 20 },
  borderRadius: { '2xl': 24, tokenIcon: 20 },
  fontFamily: { sans: 'System' },
  fontWeight: { semibold: 600, bold: 700 },
  fontSize: { sm: 14, bodyLg: 16 },
  getAvatarColor: () => '#123456',
  getShortAddress: (value: string, size = 4) => `${value.slice(0, size)}...${value.slice(-size)}`,
  getInitials: (name: string) => name.slice(0, 2).toUpperCase(),
  opacity: { medium: 0.5 },
  componentSizes: { headerButtonSize: 40 },
  durationMs: { spin: 800 },
  semantic: { text: { accent: '#f54' }, status: { success: '#0f0' } },
}));

import { WalletHeader } from './WalletHeader';

describe('WalletHeader copy address', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('announces the copy confirmation and reverts to the copy label', () => {
    const onCopyAddress = vi.fn();

    render(
      <WalletHeader
        accountName="Account 1"
        address="7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
        onCopyAddress={onCopyAddress}
      />
    );

    fireEvent.click(screen.getByTestId('wallet-header-copy-address'));

    expect(onCopyAddress).toHaveBeenCalled();
    expect(screen.getByLabelText('actions.copied')).toBeTruthy();

    // The revert is a state update from a timer callback, so it only reaches the
    // DOM if the timers run inside act.
    act(() => {
      vi.runAllTimers();
    });

    expect(screen.queryByLabelText('actions.copied')).toBeNull();
    // WalletHeader truncates to 6 leading/trailing chars, unlike the mobile header.
    expect(screen.getByLabelText('accessibility.copy_address:7xKXtg...osgAsU')).toBeTruthy();
  });
});
