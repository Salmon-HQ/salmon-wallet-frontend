/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSemantic, ThemeProvider } from '@salmon/shared';

import { asRenderedColor, renderInMode } from '../../test/renderInMode';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (
      key: string,
      fallbackOrOptions?: string | Record<string, string | number>,
      maybeOptions?: Record<string, string | number>
    ) => {
      const fallback = typeof fallbackOrOptions === 'string' ? fallbackOrOptions : undefined;
      const options =
        (typeof fallbackOrOptions === 'object' ? fallbackOrOptions : maybeOptions) ?? {};
      if (key === 'nft.burn.successSummary') return `"${options.name}" has been burned.`;
      return fallback ?? key;
    },
  }),
}));

vi.mock('../LoadingScreen', () => ({
  // Keeps the exit contract without a frame clock: `onExited` fires when the
  // test says the last wave has left.
  LoadingScreen: ({
    visible,
    title,
    onExited,
  }: {
    visible?: boolean;
    title?: string;
    onExited?: () => void;
  }) => (
    <div data-testid="burn-wave-screen" data-visible={String(visible)}>
      {title}
      <button data-testid="wave-last-front-gone" onClick={() => onExited?.()} />
    </div>
  ),
}));

const receipt = vi.fn(
  ({
    title,
    body,
    primary,
  }: {
    title: string;
    body?: string;
    primary: { onPress: () => void };
  }) => (
    <div>
      <div>{title}</div>
      <div>{body}</div>
      <button onClick={primary.onPress}>Continue</button>
    </div>
  )
);
vi.mock('../ReceiptScreen', () => ({
  ReceiptScreen: (props: Parameters<typeof receipt>[0]) => receipt(props),
}));

vi.mock('@salmon/shared', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@salmon/shared');
  return { ...actual, trackEvent: vi.fn() };
});

const { NftDetailPage } = await import('./NftDetailPage');

const BASE_NFT = {
  blockchain: 'solana',
  mint: 'Mint111111111111111111111111111111111',
  name: 'Genesis Salmon',
  image: 'https://example.com/nft.png',
  description: 'Legendary fish.',
  attributes: [{ trait_type: 'Mood', value: 'Calm' }],
  tokenStandard: 'ProgrammableNonFungible',
  compressed: false,
  collectionVerified: true,
  royaltyBps: 250,
} as never;

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(cleanup);

describe('NftDetailPage', () => {
  it('is mobile’s nft/[id]: description as the subtitle, attributes, details, the two actions', () => {
    const onBack = vi.fn();
    const onSendPress = vi.fn();
    const onBurnPress = vi.fn();

    renderInMode(
      'dark',
      <NftDetailPage
        nft={BASE_NFT}
        onBack={onBack}
        onSendPress={onSendPress}
        onBurnPress={onBurnPress}
      />
    );

    expect(screen.getByText('Genesis Salmon')).toBeTruthy();
    expect(screen.getByText('Legendary fish.')).toBeTruthy();
    expect(screen.getByText('Mood')).toBeTruthy();
    expect(screen.getByText('ProgrammableNonFungible')).toBeTruthy();

    fireEvent.click(screen.getByTestId('nft-detail-send-button'));
    fireEvent.click(screen.getByTestId('nft-detail-burn-button'));
    expect(onSendPress).toHaveBeenCalledTimes(1);
    expect(onBurnPress).toHaveBeenCalledTimes(1);
  });

  it('drops the actions — gone, not greyed — for a wallet that can never sign', () => {
    renderInMode('dark', <NftDetailPage nft={BASE_NFT} onBack={vi.fn()} actionsUnavailable />);
    expect(screen.queryByTestId('nft-detail-send-button')).toBeNull();
    expect(screen.queryByTestId('nft-detail-burn-button')).toBeNull();
  });

  it('reviews the burn with the lookup table cost and confirms only with a preview', () => {
    const onBurnBack = vi.fn();
    const onBurnConfirm = vi.fn();

    renderInMode(
      'dark',
      <NftDetailPage
        nft={BASE_NFT}
        onBack={vi.fn()}
        burnStep="review"
        burnPreview={
          {
            lookupTable: {
              estimatedRentLamports: '2000000',
              addressCount: 8,
              extendTransactionCount: 2,
            },
          } as never
        }
        onBurnBack={onBurnBack}
        onBurnConfirm={onBurnConfirm}
      />
    );

    expect(screen.getByTestId('nft-burn-irreversible-notice')).toBeTruthy();
    expect(screen.getByText('Temporary lookup table required')).toBeTruthy();
    expect(screen.getByText('0.002 SOL')).toBeTruthy();

    fireEvent.click(screen.getByTestId('nft-burn-confirm-button'));
    expect(onBurnConfirm).toHaveBeenCalledTimes(1);
  });

  it('ends on the receipt, and the one control leaves it', () => {
    const onBurnSuccessContinue = vi.fn();
    renderInMode(
      'dark',
      <NftDetailPage
        nft={BASE_NFT}
        onBack={vi.fn()}
        burnStep="success"
        onBurnSuccessContinue={onBurnSuccessContinue}
        burnSuccessExplorerUrl="https://explorer/tx"
      />
    );

    expect(receipt).toHaveBeenCalled();
    expect(screen.getByText('NFT burned')).toBeTruthy();
    expect(screen.getByText('"Genesis Salmon" has been burned.')).toBeTruthy();
    fireEvent.click(screen.getByText('Continue'));
    expect(onBurnSuccessContinue).toHaveBeenCalledTimes(1);
  });

  it('waits on the wave while the burn lands, and shows the receipt once it has left', () => {
    const props = { nft: BASE_NFT, onBack: vi.fn(), burnPreview: { transaction: 'tx' } };
    const { rerender } = renderInMode(
      'dark',
      <NftDetailPage {...props} burnStep="review" burning />
    );
    expect(screen.getByTestId('burn-wave-screen').getAttribute('data-visible')).toBe('true');
    expect(screen.getByText('nft.burn.pendingTitle')).toBeTruthy();

    rerender(
      <ThemeProvider systemScheme="dark">
        <NftDetailPage {...props} burnStep="success" burning={false} />
      </ThemeProvider>
    );
    expect(screen.getByTestId('burn-wave-screen').getAttribute('data-visible')).toBe('false');
    expect(receipt).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('wave-last-front-gone'));
    expect(receipt).toHaveBeenCalled();
    expect(screen.queryByTestId('burn-wave-screen')).toBeNull();
  });

  it.each(['dark', 'light'] as const)('paints its own water in the %s mode', (mode) => {
    renderInMode(mode, <NftDetailPage nft={BASE_NFT} onBack={vi.fn()} />);
    const screenNode = screen.getByTestId('nft-detail-screen') as HTMLElement;
    expect(screenNode.style.backgroundColor).toBe(
      asRenderedColor(createSemantic(mode).water.gradient[1])
    );
  });
});
