/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PowerupEntry } from '@salmon/shared/powerups';

import { renderInMode } from '../../test/renderInMode';
import { PowerupsPage } from './PowerupsPage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('../DepthBackground', () => ({ DepthBackground: () => null }));
vi.mock('../ScalesBackground', () => ({ ScalesBackground: () => null }));

afterEach(cleanup);

const SWAP: PowerupEntry = {
  id: 'swap',
  nameKey: 'swap.catalog.name',
  descriptionKey: 'swap.catalog.description',
  tier: 'official',
  networks: ['solana-mainnet'],
  route: 'swap',
};

describe('PowerupsPage', () => {
  it('lists the registry entries it is given and opens one on press', () => {
    const onOpen = vi.fn();
    renderInMode('dark', <PowerupsPage powerups={[SWAP]} onOpen={onOpen} onBack={vi.fn()} />);
    expect(screen.getByText('swap.catalog.name')).toBeTruthy();
    fireEvent.click(screen.getByTestId('powerups-row-swap'));
    expect(onOpen).toHaveBeenCalledWith(SWAP);
  });

  it('says so when nothing is offered on this network', () => {
    renderInMode('dark', <PowerupsPage powerups={[]} onOpen={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByTestId('powerups-empty-installed')).toBeTruthy();
  });
});
