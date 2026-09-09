/**
 * @vitest-environment jsdom
 *
 * The rail ties a derived card to its parent: one rail segment per derived
 * card, none for the parent, and nothing that folds the family away.
 */
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { renderInMode } from '../../test/renderInMode';
import { WalletFamily } from './WalletFamily';

afterEach(cleanup);

describe('WalletFamily', () => {
  it('draws the parent, then every derived card on the rail', () => {
    renderInMode(
      'dark',
      <WalletFamily
        testID="family-a"
        parent={<div data-testid="card-a" />}
        derived={[
          { id: 'a1', card: <div data-testid="card-a1" /> },
          { id: 'a2', card: <div data-testid="card-a2" /> },
        ]}
      />
    );
    expect(screen.getByTestId('card-a')).toBeTruthy();
    expect(screen.getByTestId('card-a1')).toBeTruthy();
    expect(screen.getByTestId('card-a2')).toBeTruthy();
    expect(screen.getByTestId('wallet-rail-a1')).toBeTruthy();
    expect(screen.getByTestId('wallet-rail-a2')).toBeTruthy();
    expect(screen.queryByTestId('wallet-rail-a')).toBeNull();
  });

  it('is only the parent when nothing was derived from it', () => {
    renderInMode('dark', <WalletFamily parent={<div data-testid="card-b" />} derived={[]} />);
    expect(screen.getByTestId('card-b')).toBeTruthy();
    expect(screen.queryByTestId(/wallet-rail-/)).toBeNull();
  });
});
