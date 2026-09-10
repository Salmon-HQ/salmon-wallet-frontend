/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) =>
      params?.name ? `View on ${params.name}` : key,
  }),
}));

import { ExplorerLinkButton } from './ExplorerLinkButton';

function stubMatchMedia() {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
  );
}

describe('ExplorerLinkButton', () => {
  beforeEach(() => {
    stubMatchMedia();
    vi.stubGlobal('open', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    cleanup();
  });

  it('opens the default explorer in a new tab when there is no menu', async () => {
    const onPress = vi.fn();
    render(<ExplorerLinkButton txHash="tx-123" onPress={onPress} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('tx-detail-explorer-link'));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(window.open).toHaveBeenCalledWith(
      'https://solscan.io/tx/tx-123',
      '_blank',
      'noopener,noreferrer'
    );
    expect(onPress).toHaveBeenCalledWith('https://solscan.io/tx/tx-123', 'Solscan');
  });

  it('opens a sheet of explorers to pick from, and the pick opens that one', async () => {
    render(<ExplorerLinkButton txHash="tx-123" showMenu />);

    fireEvent.click(screen.getByTestId('tx-detail-explorer-link'));
    expect(screen.getByTestId('tx-detail-explorer-menu').getAttribute('open')).not.toBeNull();

    await act(async () => {
      fireEvent.click(screen.getByTestId('tx-detail-explorer-SOLANA_FM'));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(window.open).toHaveBeenCalledWith(
      'https://solana.fm/tx/tx-123',
      '_blank',
      'noopener,noreferrer'
    );
  });
});
