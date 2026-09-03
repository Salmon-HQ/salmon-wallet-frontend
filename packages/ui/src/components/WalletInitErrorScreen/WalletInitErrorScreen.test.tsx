/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

import { createSemantic } from '@salmon/shared';
import { asRenderedColor, renderInMode } from '../../test/renderInMode';
import { WalletInitErrorScreen } from './WalletInitErrorScreen';

describe('WalletInitErrorScreen', () => {
  afterEach(cleanup);

  it('says the funds are safe and retries on the one action', async () => {
    const onRetry = vi.fn().mockResolvedValue(undefined);
    render(<WalletInitErrorScreen onRetry={onRetry} />);

    expect(screen.getByText("Couldn't load your wallet")).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByTestId('wallet-init-retry'));
    });
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('reads the live mode: in light the gate sits on the light abyss', () => {
    const light = createSemantic('light');
    renderInMode('light', <WalletInitErrorScreen onRetry={vi.fn()} />);

    expect(screen.getByTestId('wallet-init-error').style.backgroundColor).toBe(
      asRenderedColor(light.depth.abyss)
    );
    expect(screen.getByRole('heading', { level: 1 }).style.color).toBe(
      asRenderedColor(light.text.primary)
    );
  });
});
