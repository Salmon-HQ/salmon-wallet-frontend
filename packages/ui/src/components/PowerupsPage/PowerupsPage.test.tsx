/**
 * @vitest-environment jsdom
 *
 * The catalogue's contract with Home, on the DOM — the mobile twin's suite is
 * `apps/mobile/src/components/PowerupsPage/PowerupsPage.test.tsx`: two
 * sections and nothing else, an entry opens its own detail inside the same
 * sheet, and the one control there adds the Powerup to Home or takes it away.
 */
import React from 'react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, screen, fireEvent } from '@testing-library/react';

// The stack holds the leaving screen a beat; the suite reads the screen, not the beat.
vi.mock('../../motion', async () => {
  const actual = await vi.importActual<typeof import('../../motion')>('../../motion');
  return {
    ...actual,
    SlideStack: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

import { renderInMode } from '../../test/renderInMode';
import { PowerupsPage } from './PowerupsPage';

const entries = [
  {
    id: 'swap',
    nameKey: 'swap.catalog.name',
    descriptionKey: 'swap.catalog.description',
    tier: 'core' as const,
    installed: false,
    details: {
      aboutKey: 'swap.catalog.about',
      actionKeys: ['swap.catalog.actions.quote'],
      disclosure: [{ key: 'powerups.disclosure.address_to', params: { host: 'Salmon' } }],
      authorKey: 'powerups.author.salmon',
      networks: ['solana-mainnet'],
    },
  },
  {
    id: 'auto-compound',
    nameKey: 'powerups.catalog.auto_compound.name',
    descriptionKey: 'powerups.catalog.auto_compound.description',
    tier: 'community' as const,
    installed: false,
    details: {
      aboutKey: 'powerups.catalog.mock.about',
      actionKeys: [],
      disclosure: [{ key: 'powerups.disclosure.sends_nothing' }],
      authorKey: 'powerups.author.community',
      networks: ['solana-mainnet'],
    },
  },
];

function setup(overrides: Partial<React.ComponentProps<typeof PowerupsPage>> = {}) {
  const onInstall = vi.fn();
  const onUninstall = vi.fn();
  renderInMode(
    'dark',
    <PowerupsPage
      onBack={vi.fn()}
      entries={entries}
      onInstall={onInstall}
      onUninstall={onUninstall}
      {...overrides}
    />
  );
  return { onInstall, onUninstall };
}

afterEach(cleanup);

describe('PowerupsPage', () => {
  it('draws Core and Community, and nothing else', () => {
    setup();

    // No filters, no search, no "installed" section: the sections ARE the
    // catalogue, and an installed Powerup stays in its own tier.
    expect(screen.queryByTestId('powerups-filters')).toBeNull();
    expect(screen.queryByTestId('powerups-search-input')).toBeNull();
    expect(screen.getByTestId('powerups-row-swap')).toBeTruthy();
    expect(screen.getByTestId('powerups-row-auto-compound')).toBeTruthy();
  });

  it('opens an entry’s detail in the same sheet and installs from it', () => {
    const { onInstall } = setup();

    fireEvent.click(screen.getByTestId('powerups-row-swap'));

    expect(screen.getByTestId('powerups-detail-swap')).toBeTruthy();
    // The list is gone: the detail took the sheet, it did not stack on it.
    expect(screen.queryByTestId('powerups-row-auto-compound')).toBeNull();
    // The facts under the row: who made it, where it acts, what it uses.
    expect(screen.getByTestId('powerups-detail-author')).toBeTruthy();
    expect(screen.getByTestId('powerups-facts-swap')).toBeTruthy();

    fireEvent.click(screen.getByTestId('powerups-toggle-swap'));
    expect(onInstall).toHaveBeenCalledWith('swap');
  });

  it('offers to take an installed Powerup away instead', () => {
    const { onInstall, onUninstall } = setup({
      entries: [{ ...entries[0], installed: true }, entries[1]],
    });

    fireEvent.click(screen.getByTestId('powerups-row-swap'));
    fireEvent.click(screen.getByTestId('powerups-toggle-swap'));

    expect(onUninstall).toHaveBeenCalledWith('swap');
    expect(onInstall).not.toHaveBeenCalled();
  });
});
