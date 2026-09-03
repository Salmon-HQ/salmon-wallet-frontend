/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { createSemantic } from '@salmon/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { asRenderedColor, renderInMode } from '../../test/renderInMode';
import { AccountsPanel } from './AccountsPanel';

const ACTIVE_ID = 'account-active';
const OTHER_ID = 'account-other';

// Mirrors the shipped `accessibility.active_account` string ("{{name}}, active")
// so the assertions below test the real announced name rather than a key.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallbackOrOpts?: unknown, opts?: Record<string, unknown>) => {
      const o = (typeof fallbackOrOpts === 'object' ? fallbackOrOpts : opts) as
        Record<string, unknown> | undefined;
      return key === 'accessibility.active_account' ? `${String(o?.name)}, active` : key;
    },
  }),
}));

// The fixtures carry no secret; the real check assumes one is present.
vi.mock('@salmon/shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@salmon/shared')>()),
  isWatchOnlyAccount: (account: { secret?: { kind?: string } }) =>
    account?.secret?.kind === 'watchOnly',
  getAccountAddress: () => 'FakeAddress1111',
}));

const ACCOUNTS = [
  { id: ACTIVE_ID, name: 'Main' },
  { id: OTHER_ID, name: 'Savings' },
] as unknown as import('@salmon/shared').Account[];

function renderPanel(
  mode: 'dark' | 'light' = 'dark',
  overrides: Partial<React.ComponentProps<typeof AccountsPanel>> = {}
) {
  const props = {
    accounts: ACCOUNTS,
    activeAccountId: ACTIVE_ID,
    onSelectAccount: vi.fn(),
    onEditAccount: vi.fn(),
    onDeleteAccount: vi.fn(),
    onAddAccount: vi.fn(),
    onBack: vi.fn(),
    ...overrides,
  };
  renderInMode(mode, <AccountsPanel {...props} />);
  return props;
}

describe('AccountsPanel active account', () => {
  afterEach(cleanup);

  it('announces which account is active instead of relying on the fill alone', () => {
    renderPanel();

    const active = screen.getByTestId(`account-item-${ACTIVE_ID}`);
    expect(active.getAttribute('aria-current')).toBe('true');
    expect(active.getAttribute('aria-label')).toBe('Main, active');
  });

  it('leaves the inactive account unselected and named plainly', () => {
    renderPanel();

    const other = screen.getByTestId(`account-item-${OTHER_ID}`);
    expect(other.getAttribute('aria-current')).toBeNull();
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

  it('selects the row on press, and only the row — the inline actions do not select', () => {
    const props = renderPanel();

    fireEvent.click(screen.getByTestId(`account-edit-${OTHER_ID}`));
    expect(props.onEditAccount).toHaveBeenCalledWith(OTHER_ID);
    expect(props.onSelectAccount).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId(`account-item-${OTHER_ID}`));
    expect(props.onSelectAccount).toHaveBeenCalledWith(OTHER_ID);
  });

  it('reads the light ink when the mode is light', () => {
    renderPanel('light');

    const light = createSemantic('light').text.primary;
    expect(light).not.toBe(createSemantic('dark').text.primary);
    expect(screen.getByText('Main').style.color).toBe(asRenderedColor(light));
  });
});
