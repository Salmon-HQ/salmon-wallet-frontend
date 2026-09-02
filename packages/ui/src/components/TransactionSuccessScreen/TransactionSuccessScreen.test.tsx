/**
 * @vitest-environment jsdom
 *
 * TransactionSuccessScreen is an alias: it renders the exchange receipt with
 * the props it is handed, nothing more. The receipt's own pixels are pinned
 * by `ReceiptScreen`'s suite.
 */
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../ReceiptScreen', () => ({
  ReceiptScreen: (props: { tone: string; title: string }) => (
    <div data-testid="receipt" data-tone={props.tone} data-title={props.title} />
  ),
}));

import { TransactionSuccessScreen } from './TransactionSuccessScreen';

afterEach(cleanup);

describe('TransactionSuccessScreen', () => {
  it('is the exchange receipt under its old name', () => {
    render(
      <TransactionSuccessScreen
        title="Swap complete"
        summary="1 SOL → 100 USDC"
        explorerUrl={null}
        onContinue={() => {}}
      />
    );
    const receipt = screen.getByTestId('receipt');
    expect(receipt.getAttribute('data-tone')).toBe('exchange');
    expect(receipt.getAttribute('data-title')).toBe('Swap complete');
  });
});
