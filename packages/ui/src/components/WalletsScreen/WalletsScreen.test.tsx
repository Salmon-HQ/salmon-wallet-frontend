/**
 * @vitest-environment jsdom
 *
 * Wallets, the screen (spec 028 ruling 3, spec 025): a flat list where the
 * cards of one seed sit together, the derived card under its parent with a
 * descent line and "Derived from {name}", no index anywhere.
 */
import React from 'react';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { createSemantic } from '@salmon/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { asRenderedColor, renderInMode } from '../../test/renderInMode';
import { WalletsScreen } from './WalletsScreen';

const PARENT_ID = 'wallet-parent';
const CHILD_ID = 'wallet-child';
const OTHER_ID = 'wallet-other';

const changeAccount = vi.fn(() => Promise.resolve());
const setIncludedInTotal = vi.fn(() => Promise.resolve());

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallbackOrOpts?: unknown, maybeOpts?: Record<string, unknown>) => {
      const opts = (typeof fallbackOrOpts === 'object' ? fallbackOrOpts : maybeOpts) as
        Record<string, unknown> | undefined;
      if (key === 'settings.wallets.derived_from') return `Derived from ${String(opts?.name)}`;
      if (key === 'settings.wallets.included_count')
        return `${String(opts?.included)} of ${String(opts?.total)} wallets included`;
      return typeof fallbackOrOpts === 'string' ? fallbackOrOpts : key;
    },
  }),
}));

const ACCOUNTS = [
  {
    id: PARENT_ID,
    name: 'Main',
    secret: { kind: 'mnemonic', mnemonic: 'a b c' },
    networksAccounts: {},
  },
  {
    id: CHILD_ID,
    name: 'Main 2',
    derivedFrom: PARENT_ID,
    secret: { kind: 'mnemonic', mnemonic: 'a b c' },
    networksAccounts: {},
  },
  { id: OTHER_ID, name: 'Cold', secret: { kind: 'watchOnly' }, networksAccounts: {} },
];

vi.mock('@salmon/shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@salmon/shared')>()),
  getAccountAddress: (account: { id: string }) => `${account.id}-address-11111111`,
  getAccountMnemonic: (account: { secret?: { mnemonic?: string } }) => account?.secret?.mnemonic,
  isWatchOnlyAccount: (account: { secret?: { kind?: string } }) =>
    account?.secret?.kind === 'watchOnly',
  useAccountsContext: () => [
    {
      accounts: ACCOUNTS,
      accountId: PARENT_ID,
      activeBlockchainAccount: null,
      networkId: 'solana-mainnet',
      pathIndex: 0,
    },
    { changeAccount, changePathIndex: vi.fn() },
  ],
  useCurrencyContext: () => [{ currency: 'usd' }, { formatValue: (v?: number) => `$${v ?? 0}` }],
  useUserConfig: () => ({ excludedFromTotal: [OTHER_ID], setIncludedInTotal }),
  useBalance: () => ({ hiddenBalance: false, toggleHidden: vi.fn() }),
  useWalletTotals: () => ({ totals: { [PARENT_ID]: 10, [CHILD_ID]: 5, [OTHER_ID]: 100 } }),
}));

function renderScreen(mode: 'dark' | 'light' = 'dark') {
  const props = {
    onBack: vi.fn(),
    onRename: vi.fn(),
    onAddWallet: vi.fn(),
    onRescan: vi.fn(),
  };
  renderInMode(mode, <WalletsScreen {...props} />);
  return props;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('WalletsScreen', () => {
  it('sums only the included wallets and says how many that is', () => {
    renderScreen();
    expect(screen.getByTestId('wallets-total-value').textContent).toBe('$15');
    expect(screen.getByTestId('wallets-included-count').textContent).toBe(
      '2 of 3 wallets included'
    );
  });

  it('sits a derived wallet under its parent, with the descent and the subtitle, and no index', () => {
    renderScreen();

    const cards = screen
      .getAllByTestId(/^wallet-card-/)
      .map((el) => el.getAttribute('data-testid'));
    expect(cards).toEqual([
      `wallet-card-${PARENT_ID}`,
      `wallet-card-${CHILD_ID}`,
      `wallet-card-${OTHER_ID}`,
    ]);
    expect(screen.getByTestId(`wallet-descent-${CHILD_ID}`)).toBeTruthy();
    expect(screen.getByTestId(`wallet-derived-from-${CHILD_ID}`).textContent).toBe(
      'Derived from Main'
    );
    expect(screen.queryByTestId(`wallet-descent-${PARENT_ID}`)).toBeNull();
    expect(screen.queryByText(/#\d/)).toBeNull();
  });

  it('offers the rescan only on a seed wallet, and the rename on every wallet', () => {
    const props = renderScreen();

    expect(screen.getByTestId(`wallet-rescan-${PARENT_ID}`)).toBeTruthy();
    expect(screen.queryByTestId(`wallet-rescan-${OTHER_ID}`)).toBeNull();
    expect(screen.getByTestId(`wallet-watch-only-${OTHER_ID}`)).toBeTruthy();

    fireEvent.click(screen.getByTestId(`wallet-rescan-${PARENT_ID}`));
    expect(props.onRescan).toHaveBeenCalledWith(PARENT_ID);

    fireEvent.click(screen.getByTestId(`wallet-rename-${OTHER_ID}`));
    expect(props.onRename).toHaveBeenCalledWith(OTHER_ID);
    // An inline action never selects the row it sits on.
    expect(changeAccount).not.toHaveBeenCalled();
  });

  it('selects a wallet on press and leaves; includes and excludes through the trailing control', async () => {
    const props = renderScreen();

    fireEvent.click(screen.getByTestId(`wallet-include-${OTHER_ID}`));
    expect(setIncludedInTotal).toHaveBeenCalledWith(OTHER_ID, true);

    fireEvent.click(screen.getByTestId(`wallet-card-${OTHER_ID}`));
    expect(changeAccount).toHaveBeenCalledWith(OTHER_ID);
    await Promise.resolve();
    expect(props.onBack).toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('wallets-add-wallet'));
    expect(props.onAddWallet).toHaveBeenCalled();
  });

  it('reads the light ink when the mode is light', () => {
    renderScreen('light');
    const light = createSemantic('light').text.primary;
    expect(light).not.toBe(createSemantic('dark').text.primary);
    expect(screen.getByTestId('wallets-total-value').style.color).toBe(asRenderedColor(light));
  });
});
