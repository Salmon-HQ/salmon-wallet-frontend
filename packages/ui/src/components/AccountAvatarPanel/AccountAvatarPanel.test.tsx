/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderInMode } from '../../test/renderInMode';
import { AccountAvatarPanel } from './AccountAvatarPanel';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// The NFT list comes from a hook that isn't wired up in this render.
// The picker hook reaches the NFT query through shared's own module path, so
// the barrel mock below does not intercept it — this one does.
vi.mock('@salmon/shared/src/hooks/useAvatarNfts', () => ({
  useAvatarNfts: () => ({ nfts: [], loading: false }),
}));

vi.mock('@salmon/shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@salmon/shared')>()),
  PRESET_AVATAR_URLS: ['https://example.test/a.png', 'https://example.test/b.png'],
  useAvatarNfts: () => ({ nfts: [], loading: false }),
}));

const ACCOUNT = { id: 'account-1', name: 'Main', avatar: 'https://example.test/a.png' };

function renderPanel(onSave = vi.fn()) {
  renderInMode(
    'dark',
    <AccountAvatarPanel
      currentAvatarUrl={ACCOUNT.avatar}
      account={ACCOUNT as unknown as import('@salmon/shared').Account}
      onSave={onSave}
      onBack={vi.fn()}
    />
  );
  return onSave;
}

describe('AccountAvatarPanel selection state', () => {
  afterEach(cleanup);

  it('exposes the strip as tabs and says which one is chosen', () => {
    renderPanel();

    const presets = screen.getByTestId('avatar-tab-presets');
    const nfts = screen.getByTestId('avatar-tab-nfts');

    expect(presets.getAttribute('role')).toBe('tab');
    expect(nfts.getAttribute('role')).toBe('tab');
    expect(presets.getAttribute('aria-selected')).toBe('true');
    expect(nfts.getAttribute('aria-selected')).toBe('false');

    fireEvent.click(nfts);

    expect(presets.getAttribute('aria-selected')).toBe('false');
    expect(nfts.getAttribute('aria-selected')).toBe('true');
  });

  it('says which avatar is chosen, not only which one is ringed', () => {
    renderPanel();

    expect(screen.getByTestId('avatar-preset-0').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('avatar-preset-1').getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(screen.getByTestId('avatar-preset-1'));

    expect(screen.getByTestId('avatar-preset-0').getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByTestId('avatar-preset-1').getAttribute('aria-pressed')).toBe('true');
  });

  it('keeps the save action disabled until the choice actually changes, then hands the pick to the caller', () => {
    const onSave = renderPanel();

    const save = screen.getByTestId('avatar-save-button');
    expect(save.hasAttribute('disabled')).toBe(true);

    fireEvent.click(screen.getByTestId('avatar-preset-1'));
    expect(screen.getByTestId('avatar-save-button').hasAttribute('disabled')).toBe(false);

    fireEvent.click(screen.getByTestId('avatar-save-button'));
    expect(onSave).toHaveBeenCalledWith('https://example.test/b.png');
  });
});
