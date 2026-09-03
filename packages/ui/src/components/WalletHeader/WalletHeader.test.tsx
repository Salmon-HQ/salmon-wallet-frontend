/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { ThemeProvider } from '@salmon/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderInMode } from '../../test/renderInMode';
import { WalletHeader } from './WalletHeader';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options && typeof options === 'object' ? `${key}:${Object.values(options).join(',')}` : key,
  }),
}));

const { motionMs } = await import('../../../../shared/src/theme/durations');
const { CHROME_SCALE, SINK_EXIT_SCALE, SINK_FLOAT_TRAVEL, SINK_FLOAT_STAGGER_MS } =
  await import('../../../../shared/src/motion/sinkFloat');

const FIRST_ADDRESS = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
const SECOND_ADDRESS = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';

/** `rerender` replaces the whole tree it was given, so the provider comes too. */
const withTheme = (node: React.ReactNode) => (
  <ThemeProvider systemScheme="dark">{node}</ThemeProvider>
);

describe('WalletHeader', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('announces the copy confirmation and reverts to the copy label', () => {
    const onCopyAddress = vi.fn();

    renderInMode(
      'dark',
      <WalletHeader accountName="Account 1" address={FIRST_ADDRESS} onCopyAddress={onCopyAddress} />
    );

    fireEvent.click(screen.getByTestId('wallet-header-copy-address'));

    expect(onCopyAddress).toHaveBeenCalled();
    expect(screen.getByLabelText('actions.copied')).toBeTruthy();

    // The revert is a state update from a timer callback, so it only reaches
    // the DOM if the timers run inside act.
    act(() => {
      vi.runAllTimers();
    });

    expect(screen.queryByLabelText('actions.copied')).toBeNull();
  });

  it('keeps the tick mounted while the account line speaks the verb', () => {
    const { rerender } = renderInMode(
      'dark',
      <WalletHeader accountName="Account 1" address={FIRST_ADDRESS} onCopyAddress={vi.fn()} />
    );

    fireEvent.click(screen.getByTestId('wallet-header-copy-address'));
    const tick = screen.getByTestId('copy-tick');

    // A chain switch mid-hold: the text sinks, the copy control does not.
    rerender(
      withTheme(
        <WalletHeader accountName="Account 1" address={SECOND_ADDRESS} onCopyAddress={vi.fn()} />
      )
    );

    expect(screen.getByTestId('copy-tick')).toBe(tick);
    expect(screen.getByLabelText('actions.copied')).toBeTruthy();
    // The outgoing address is held while it sinks — the swap waits out the beat.
    expect(screen.getByText('7xKX...gAsU')).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(motionMs.ebb + SINK_FLOAT_STAGGER_MS);
    });

    expect(screen.getByText('9WzD...AWWM')).toBeTruthy();
    // Still the same control, and still holding its confirmation.
    expect(screen.getByTestId('copy-tick')).toBe(tick);
  });

  it('speaks the verb at chrome depth, taking the number from shared', () => {
    renderInMode(
      'dark',
      <WalletHeader accountName="Account 1" address={FIRST_ADDRESS} onCopyAddress={vi.fn()} />
    );

    const line = screen.getByTestId('wallet-header-account-name').parentElement as HTMLElement;
    expect(line.style.getPropertyValue('--salmon-sink-float-scale')).toBe(String(CHROME_SCALE));
    // Half the depth of content, not a depth the header computed for itself —
    // and shallower than content, so the frame never out-speaks what it frames.
    expect(CHROME_SCALE).toBeGreaterThan(SINK_EXIT_SCALE);
    // Travel stays the accent, still at chrome's half.
    expect(line.style.getPropertyValue('--salmon-sink-float-travel')).toBe(
      `${SINK_FLOAT_TRAVEL / 2}px`
    );
  });

  it.each(['dark', 'light'] as const)(
    'names the environment off mainnet and stays silent on it, in %s',
    (mode) => {
      const { rerender } = renderInMode(
        mode,
        <WalletHeader accountName="Account 1" address={FIRST_ADDRESS} networkId="solana-mainnet" />
      );
      expect(screen.queryByTestId('wallet-header-network-chip')).toBeNull();

      rerender(
        <ThemeProvider systemScheme={mode}>
          <WalletHeader accountName="Account 1" address={FIRST_ADDRESS} networkId="solana-devnet" />
        </ThemeProvider>
      );
      expect(screen.getByTestId('wallet-header-network-chip')).toBeTruthy();
    }
  );

  it('paints the refresh control only when a host supplies one', () => {
    const { rerender } = renderInMode(
      'dark',
      <WalletHeader accountName="Account 1" address={FIRST_ADDRESS} />
    );
    expect(screen.queryByTestId('wallet-header-refresh-button')).toBeNull();

    rerender(
      withTheme(
        <WalletHeader accountName="Account 1" address={FIRST_ADDRESS} onRefreshPress={vi.fn()} />
      )
    );
    expect(screen.getByTestId('wallet-header-refresh-button')).toBeTruthy();
  });
});
