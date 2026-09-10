/**
 * @vitest-environment jsdom
 *
 * The catalogue's contract with Home, on the DOM — the mobile twin's suite is
 * `apps/mobile/src/components/PowerupsCatalog/PowerupsCatalog.test.tsx`: two
 * sections and nothing else, an entry opens its own detail inside the same
 * sheet, and the one control there adds the Powerup to Home or takes it away.
 */
import React from 'react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, screen, fireEvent } from '@testing-library/react';

import { renderInMode } from '../../test/renderInMode';
import { PowerupsCatalog } from './PowerupsCatalog';

const entries = [
  {
    id: 'swap',
    nameKey: 'swap.catalog.name',
    descriptionKey: 'swap.catalog.description',
    tier: 'core' as const,
    installed: false,
  },
  {
    id: 'auto-compound',
    nameKey: 'powerups.catalog.auto_compound.name',
    descriptionKey: 'powerups.catalog.auto_compound.description',
    tier: 'community' as const,
    installed: false,
  },
];

function setup(overrides: Partial<React.ComponentProps<typeof PowerupsCatalog>> = {}) {
  const onInstall = vi.fn();
  const onUninstall = vi.fn();
  renderInMode(
    'dark',
    <PowerupsCatalog
      visible
      onClose={vi.fn()}
      entries={entries}
      onInstall={onInstall}
      onUninstall={onUninstall}
      maxHeight={420}
      {...overrides}
    />
  );
  return { onInstall, onUninstall };
}

afterEach(cleanup);

describe('PowerupsCatalog', () => {
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
