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

// The real barrel, with `useExplorerLink` faked so the picker has two
// choices whatever the config says — the component's whole contract with
// the explorer catalogue is that hook, so faking it (rather than the lookup
// functions it calls internally) is what actually intercepts it.
vi.mock('@salmon/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@salmon/shared')>();
  const explorers = [
    { key: 'solscan', name: 'Solscan' },
    { key: 'explorer', name: 'Explorer' },
  ];
  return {
    ...actual,
    useExplorerLink: ({
      showMenu,
      t,
    }: {
      showMenu?: boolean;
      t: (key: string, params?: Record<string, unknown>) => string;
    }) => {
      const [menuVisible, setMenuVisible] = React.useState(false);
      const selectedExplorer = explorers[0];
      const hasMenu = !!showMenu && explorers.length > 1;
      const openMenu = () => setMenuVisible(true);
      return {
        menuVisible,
        openMenu,
        closeMenu: () => setMenuVisible(false),
        availableExplorers: explorers,
        selectedExplorer,
        hasMenu,
        getExplorerUrl: (explorer: { key: string }) => `https://explorer/${explorer.key}/tx-123`,
        buttonText: hasMenu
          ? t('transactions.detail.viewOnExplorer')
          : t('transactions.detail.viewOn', { name: selectedExplorer.name }),
        resolvePress: (openExplorer: (explorer: { key: string; name: string }) => void) => {
          if (hasMenu) openMenu();
          else openExplorer(selectedExplorer);
        },
      };
    },
  };
});

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
