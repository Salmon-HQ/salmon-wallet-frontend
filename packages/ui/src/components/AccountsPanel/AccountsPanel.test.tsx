/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AccountsPanel } from './AccountsPanel';

const ACTIVE_ID = 'account-active';
const OTHER_ID = 'account-other';

// Mirrors the shipped `accessibility.active_account` string ("{{name}}, active")
// so the assertions belowtest the real announced name rather than a key.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      key === 'accessibility.active_account' ? `${String(opts?.name)}, active` : key,
  }),
}));

// The panel needs a deterministic accounts context; that context isn't
// wired up in this render, so it's stubbed with fixed accounts here.
vi.mock('@salmon/shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@salmon/shared')>()),
  // The real implementation assumes `account.secret` is always present;
  // these fixtures don't carry one.
  isWatchOnlyAccount: (account: { secret?: { kind?: string } }) =>
    account?.secret?.kind === 'watchOnly',
  useAccountsContext: () => [
    {
      accountId: ACTIVE_ID,
      accounts: [
        { id: ACTIVE_ID, name: 'Main' },
        { id: OTHER_ID, name: 'Savings' },
      ],
    },
    { changeAccount: vi.fn(), removeAccount: vi.fn() },
  ],
}));

// Deep import that reaches the whole blockchain layer in production.
vi.mock('@salmon/shared/utils/account', () => ({
  getAccountAddress: () => 'FakeAddress1111',
}));

vi.mock('../../utils/styled', async () => {
  const emotion = await import('@emotion/styled');
  return { styled: emotion.default };
});

describe('AccountsPanel active account', () => {
  afterEach(cleanup);

  function renderPanel() {
    render(<AccountsPanel onBack={vi.fn()} onEditAccount={vi.fn()} onAddAccount={vi.fn()} />);
  }

  it('announces which account is active instead of relying on the fill alone', () => {
    renderPanel();

    const active = screen.getByTestId(`account-item-${ACTIVE_ID}`);
    expect(active.getAttribute('aria-current')).toBe('true');
    expect(active.getAttribute('aria-label')).toBe('Main, active');
  });

  it('leaves the inactive account unselected and named plainly', () => {
    renderPanel();

    const other = screen.getByTestId(`account-item-${OTHER_ID}`);
    expect(other.getAttribute('aria-current')).toBe('false');
    expect(other.getAttribute('aria-label')).toBe('Savings');
  });

  it('names the icon-only row actions', () => {
    renderPanel();

    expect(screen.getByTestId(`account-edit-${ACTIVE_ID}`).getAttribute('aria-label')).toBe(
      'accessibility.edit_account'
    );
    expect(screen.getByTestId(`account-remove-${ACTIVE_ID}`).getAttribute('aria-label')).toBe(
      'accessibility.delete_account'
    );
  });
});
