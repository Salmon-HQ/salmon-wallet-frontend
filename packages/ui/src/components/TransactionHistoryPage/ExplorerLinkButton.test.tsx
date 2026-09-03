/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) =>
      params?.name ? `View on ${params.name}` : key,
  }),
}));

// The real barrel, with the explorer catalogue pinned so the picker has two
// choices whatever the config says.
vi.mock('@salmon/shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@salmon/shared')>()),
  getTransactionUrl: (_b: string, _e: string, explorer: string, txHash: string) =>
    `https://explorer/${explorer}/${txHash}`,
  getAvailableExplorers: () => [
    { key: 'solscan', name: 'Solscan' },
    { key: 'explorer', name: 'Explorer' },
  ],
  getDefaultExplorer: () => 'solscan',
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

  it('opens the default explorer in a new tab when there is no menu', () => {
    const onPress = vi.fn();
    render(<ExplorerLinkButton txHash="tx-123" onPress={onPress} />);

    fireEvent.click(screen.getByTestId('tx-detail-explorer-link'));

    expect(window.open).toHaveBeenCalledWith(
      'https://explorer/solscan/tx-123',
      '_blank',
      'noopener,noreferrer'
    );
    expect(onPress).toHaveBeenCalledWith('https://explorer/solscan/tx-123', 'Solscan');
  });

  it('opens a sheet of explorers to pick from, and the pick opens that one', () => {
    render(<ExplorerLinkButton txHash="tx-123" showMenu />);

    fireEvent.click(screen.getByTestId('tx-detail-explorer-link'));
    expect(screen.getByTestId('tx-detail-explorer-menu').getAttribute('open')).not.toBeNull();

    fireEvent.click(screen.getByTestId('tx-detail-explorer-explorer'));
    expect(window.open).toHaveBeenCalledWith(
      'https://explorer/explorer/tx-123',
      '_blank',
      'noopener,noreferrer'
    );
  });
});
