/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AccountAvatarPanel } from './AccountAvatarPanel';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// The panel needs a deterministic active account and NFT list; both come
// from context/hooks that aren't wired up in this render.
vi.mock('@salmon/shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@salmon/shared')>()),
  PRESET_AVATAR_URLS: ['https://example.test/a.png', 'https://example.test/b.png'],
  useAccountsContext: () => [
    { activeAccount: { id: 'account-1', name: 'Main', avatar: 'https://example.test/a.png' } },
    { editAccount: vi.fn() },
  ],
  useAvatarNfts: () => ({ nfts: [], loading: false }),
}));

vi.mock('../../utils/styled', async () => {
  const emotion = await import('@emotion/styled');
  return { styled: emotion.default };
});

describe('AccountAvatarPanel selection state', () => {
  afterEach(cleanup);

  it('exposes the strip as tabs and says which one is chosen', () => {
    render(<AccountAvatarPanel onBack={vi.fn()} />);

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
    render(<AccountAvatarPanel onBack={vi.fn()} />);

    expect(screen.getByTestId('avatar-preset-0').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('avatar-preset-1').getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(screen.getByTestId('avatar-preset-1'));

    expect(screen.getByTestId('avatar-preset-0').getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByTestId('avatar-preset-1').getAttribute('aria-pressed')).toBe('true');
  });

  it('keeps the save action disabled until the choice actually changes', () => {
    render(<AccountAvatarPanel onBack={vi.fn()} />);

    const save = screen.getByTestId('avatar-save-button');
    expect(save.hasAttribute('disabled')).toBe(true);

    fireEvent.click(screen.getByTestId('avatar-preset-1'));

    expect(screen.getByTestId('avatar-save-button').hasAttribute('disabled')).toBe(false);
  });
});
