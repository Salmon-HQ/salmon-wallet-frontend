/**
 * The facts block a position card and the Powerups detail are both made of:
 * the title is optional, and a row's own testID has to survive so a
 * single fact stays selectable from a flow.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('@salmon/shared', () => ({ ...jest.requireActual('../../../test-utils/themeTokens') }));

import { FactsCard } from './FactsCard';

const ROWS = [
  { key: 'author', testID: 'fact-author', label: 'Made by', value: 'Salmon' },
  { key: 'networks', label: 'Networks', value: 'Solana' },
];

describe('FactsCard', () => {
  it('draws the title over every fact', () => {
    render(<FactsCard testID="facts" title="Loan" rows={ROWS} />);

    expect(screen.getByText('Loan')).toBeTruthy();
    expect(screen.getByText('Made by')).toBeTruthy();
    expect(screen.getByText('Solana')).toBeTruthy();
  });

  it('is only the facts when it carries no title', () => {
    render(<FactsCard testID="facts" rows={ROWS} />);

    expect(screen.queryByText('Loan')).toBeNull();
    expect(screen.getByText('Networks')).toBeTruthy();
  });

  it('passes a row testID through, so a single fact can be selected', () => {
    render(<FactsCard testID="facts" rows={ROWS} />);

    expect(screen.getByTestId('fact-author')).toBeTruthy();
  });
});
