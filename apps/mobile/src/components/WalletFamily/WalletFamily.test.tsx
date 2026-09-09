/**
 * The rail ties a derived card to its parent: one rail segment per derived
 * card, none for the parent, and nothing that folds the family away.
 */
import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';

jest.mock('@salmon/shared', () => ({ ...jest.requireActual('../../../test-utils/themeTokens') }));

import { WalletFamily } from './WalletFamily';

describe('WalletFamily', () => {
  it('draws the parent, then every derived card on the rail', () => {
    render(
      <WalletFamily
        testID="family-a"
        parent={<Text testID="card-a">a</Text>}
        derived={[
          { id: 'a1', card: <Text testID="card-a1">a1</Text> },
          { id: 'a2', card: <Text testID="card-a2">a2</Text> },
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
    render(<WalletFamily parent={<Text testID="card-b">b</Text>} derived={[]} />);
    expect(screen.getByTestId('card-b')).toBeTruthy();
    expect(screen.queryByTestId(/wallet-rail-/)).toBeNull();
  });
});
