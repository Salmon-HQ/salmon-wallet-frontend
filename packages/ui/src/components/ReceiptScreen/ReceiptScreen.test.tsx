/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { createSemantic } from '@salmon/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { asRenderedColor, renderInMode } from '../../test/renderInMode';
import { ReceiptScreen } from './ReceiptScreen';

afterEach(cleanup);

describe('ReceiptScreen — transfer tone', () => {
  it('renders the CORE 07 composition: seal, title, body, receipt rows, and both actions', () => {
    const onPrimary = vi.fn();
    const onSecondary = vi.fn();

    renderInMode(
      'dark',
      <ReceiptScreen
        tone="transfer"
        title="Sent successfully"
        body="5 SOL is on its way to bob.sol."
        rows={[
          { label: 'Amount', value: '5 SOL' },
          { label: 'To', value: 'bob.sol' },
        ]}
        primary={{
          label: 'Back to wallet',
          onPress: onPrimary,
          testID: 'tx-success-continue-button',
        }}
        secondary={{ label: 'Share', onPress: onSecondary, testID: 'tx-success-share' }}
        testID="tx-success-screen"
      />
    );

    expect(screen.getByTestId('tx-success-screen')).toBeTruthy();
    expect(screen.getByTestId('tx-success-seal')).toBeTruthy();
    expect(screen.getByText('Sent successfully')).toBeTruthy();
    expect(screen.getByText('5 SOL is on its way to bob.sol.')).toBeTruthy();
    expect(screen.getByText('Amount')).toBeTruthy();
    expect(screen.getByText('To')).toBeTruthy();

    fireEvent.click(screen.getByTestId('tx-success-continue-button'));
    expect(onPrimary).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId('tx-success-share'));
    expect(onSecondary).toHaveBeenCalledTimes(1);
  });

  it('prefers the explorer link over a generic secondary, and disables the primary while settling', () => {
    renderInMode(
      'dark',
      <ReceiptScreen
        tone="transfer"
        title="NFT sent"
        rows={[]}
        primary={{
          label: 'Back to wallet',
          onPress: vi.fn(),
          testID: 'tx-success-continue-button',
        }}
        secondary={{ label: 'Share', onPress: vi.fn(), testID: 'tx-success-share' }}
        explorerUrl="https://solscan.io/tx/abc"
        settling
      />
    );

    expect(screen.getByTestId('tx-success-continue-button').hasAttribute('disabled')).toBe(true);
    expect(screen.queryByTestId('tx-success-share')).toBeNull();
    expect(screen.queryByTestId('tx-success-explorer-link')).toBeNull();
  });

  it('draws the seal ink from the active mode, in both modes', () => {
    renderInMode(
      'dark',
      <ReceiptScreen
        tone="transfer"
        title="Sent"
        rows={[]}
        primary={{ label: 'Back to wallet', onPress: vi.fn() }}
      />
    );
    expect(screen.getByTestId('tx-success-title').style.color).toBe(
      asRenderedColor(createSemantic('dark').text.primary)
    );
    cleanup();

    renderInMode(
      'light',
      <ReceiptScreen
        tone="transfer"
        title="Sent"
        rows={[]}
        primary={{ label: 'Back to wallet', onPress: vi.fn() }}
      />
    );
    expect(screen.getByTestId('tx-success-title').style.color).toBe(
      asRenderedColor(createSemantic('light').text.primary)
    );
  });
});

describe('ReceiptScreen — exchange tone', () => {
  it('renders the graphic receipt for a single-token summary and fires continue', () => {
    const onContinue = vi.fn();

    renderInMode(
      'dark',
      <ReceiptScreen
        tone="exchange"
        title="Swap Complete"
        summary="1 SOL → 200 USDC"
        explorerUrl="https://solscan.io/tx/abc"
        onContinue={onContinue}
      />
    );

    expect(screen.getByTestId('tx-success-screen')).toBeTruthy();
    expect(screen.getByText('Swap Complete')).toBeTruthy();
    expect(screen.getByText('1 SOL → 200 USDC')).toBeTruthy();
    expect(screen.getByTestId('tx-success-explorer-link')).toBeTruthy();

    fireEvent.click(screen.getByTestId('tx-success-continue-button'));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('renders the exchange graphic with both token marks and the received tick', () => {
    renderInMode(
      'dark',
      <ReceiptScreen
        tone="exchange"
        title="Swap Complete"
        summary="1 SOL → 200 USDC"
        explorerUrl={null}
        onContinue={vi.fn()}
        exchange={{
          send: { label: 'You Send', amount: '1 SOL', symbol: 'SOL' },
          receive: { label: 'You Receive', amount: '200 USDC', symbol: 'USDC' },
        }}
      />
    );

    expect(screen.getByTestId('tx-success-hero')).toBeTruthy();
    expect(screen.getByTestId('tx-success-sent')).toBeTruthy();
    expect(screen.getByTestId('tx-success-received')).toBeTruthy();
    expect(screen.getByTestId('tx-success-tick')).toBeTruthy();
    expect(screen.getByText('1 SOL')).toBeTruthy();
    expect(screen.getByText('200 USDC')).toBeTruthy();
  });

  it('shows the full-screen wait while settling, then the receipt once it clears', async () => {
    const { rerender } = renderInMode(
      'dark',
      <ReceiptScreen
        tone="exchange"
        title="Swap Complete"
        summary="1 SOL → 200 USDC"
        explorerUrl={null}
        onContinue={vi.fn()}
        settling
      />
    );

    await waitFor(() => expect(screen.getByTestId('loading-screen')).toBeTruthy());
    expect(screen.queryByTestId('tx-success-screen')).toBeNull();

    rerender(
      <ReceiptScreen
        tone="exchange"
        title="Swap Complete"
        summary="1 SOL → 200 USDC"
        explorerUrl={null}
        onContinue={vi.fn()}
        settling={false}
      />
    );

    await waitFor(() => expect(screen.getByTestId('tx-success-screen')).toBeTruthy(), {
      timeout: 3000,
    });
  });
});

describe('ReceiptScreen — reduced motion', () => {
  it('collapses the exchange reveal to a cut instead of animating', () => {
    const original = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })) as unknown as typeof window.matchMedia;

    renderInMode(
      'dark',
      <ReceiptScreen
        tone="exchange"
        title="Swap Complete"
        summary="1 SOL → 200 USDC"
        explorerUrl={null}
        onContinue={vi.fn()}
      />
    );

    const status = screen.getByTestId('tx-success-status');
    expect(status.style.animation).toBe('');

    window.matchMedia = original;
  });
});
