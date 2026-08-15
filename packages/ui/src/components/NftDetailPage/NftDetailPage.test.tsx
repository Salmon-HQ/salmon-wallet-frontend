/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockWriteText = vi.fn();
const mockTransactionSuccessScreen = vi.fn(
  ({ title, summary, onContinue }: { title: string; summary: string; onContinue?: () => void }) => (
    <div>
      <div>{title}</div>
      <div>{summary}</div>
      <button onClick={onContinue}>Continue</button>
    </div>
  )
);

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

      if (key === 'nft.burn.successSummary') {
        return `"${options.name}" has been burned.`;
      }

      return fallback ?? key;
    },
  }),
}));

vi.mock('@salmon/shared', () => ({
  tabularNums: { css: { fontVariantNumeric: 'tabular-nums' } },
  semantic: {
    surface: { shelf: '#10131C', raised: '#161C2D', crest: '#1B2233', bedrock: '#0B0F19' },
    text: { primary: '#EDF1F7', secondary: '#A7B1C4', tertiary: '#8B96AD', disabled: '#6F7B95' },
    border: { default: '#58637B', raised: '#6F7B95', strong: '#8B96AD' },
    scales: {
      deepFieldStroke: 'rgba(199, 211, 232, 0.06)',
      deepFieldScale: 3.2,
      deepFieldHeight: 180,
      fishStroke: 'rgba(7, 9, 17, 0.10)',
      fishScale: 1,
    },
    flesh: { band: '#FFF1EE' },
  },
  fleshTile: { width: 380, height: 40 },
  fleshFades: [],
  fleshTiledStrokes: [],
  palette: {
    salmon: { 500: '#FF5C45', 600: '#E64A34' },
    neutral: { 0: '#FFFFFF', 1000: '#070911' },
  },
  blur: { md: 12, xs: 4 },
  borderRadius: { md: 12, sm: 8, button: 16, iconContainer: 18 },
  borderWidth: { thin: 1, actionButton: 1 },
  colors: {
    button: { primaryBackground: '#FF5C45', primaryText: '#070911', disabledOpacity: 0.5 },
    text: { primary: '#fff', secondary: '#999', balance: '#fff' },
    background: { tokenItem: '#111' },
    interactive: { surface: '#222' },
    accent: { border: '#0f0' },
    border: { default: '#333' },
    status: { error: '#f00', success: '#0f0' },
  },
  componentSizes: { nftImageMaxWidth: 240, buttonMinWidthLg: 160, iconSize4XL: 48 },
  duration: { normal: '200ms' },
  durationMs: { feedbackShort: 0 },
  easing: { ease: 'ease' },
  fontFamily: { sans: 'Inter, sans-serif' },
  fontSize: { xs: 12, sm: 14, md: 18 },
  fontWeight: { regular: 400, medium: 500, bold: 700, black: 900 },
  formatRawAmount: (amount: string | number, decimals: number) =>
    `${Number(amount) / 10 ** decimals}`,
  getSatRarityColor: () => '#ffd700',
  getShortAddress: (value: string, size = 6) => `${value.slice(0, size)}...${value.slice(-size)}`,
  gradients: { primaryButtonCSS: 'linear-gradient(#0f0, #0c0)' },
  isBitcoinNft: (nft: { blockchain?: string }) => nft.blockchain === 'bitcoin',
  isSolanaNft: (nft: { blockchain?: string }) => nft.blockchain === 'solana',
  letterSpacing: { wider: '0.08em' },
  lineHeight: { normal: 1.4 },
  opacity: { high: 0.9, medium: 0.6 },
  shadowsCSS: { header: 'none' },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, base: 10, headerPadding: 20 },
  trackEvent: vi.fn(),
}));

vi.mock('../../utils/styled', async () => {
  const emotion = await import('@emotion/styled');
  return { styled: emotion.default };
});

vi.mock('../BlurContainer', () => ({
  BlurContainer: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../PageShell', () => ({
  PageShell: ({
    title,
    onBack,
    children,
  }: {
    title: string;
    onBack?: () => void;
    children?: React.ReactNode;
  }) => (
    <div>
      <button onClick={onBack}>Go back</button>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

vi.mock('../TransactionSuccessScreen', () => ({
  TransactionSuccessScreen: (props: { title: string; summary: string; onContinue?: () => void }) =>
    mockTransactionSuccessScreen(props),
}));

Object.assign(globalThis, {
  navigator: {
    clipboard: {
      writeText: mockWriteText,
    },
  },
});

import { NftDetailPage } from './NftDetailPage';

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
} as any;

describe('NftDetailPage', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders NFT details and forwards primary actions', () => {
    const onBack = vi.fn();
    const onSendPress = vi.fn();
    const onBurnPress = vi.fn();

    render(
      <NftDetailPage
        nft={BASE_NFT}
        onBack={onBack}
        onSendPress={onSendPress}
        onBurnPress={onBurnPress}
      />
    );

    expect(screen.getByText('Description')).toBeTruthy();
    expect(screen.getByText('Legendary fish.')).toBeTruthy();
    expect(screen.getByText('Attributes')).toBeTruthy();
    expect(screen.getByText('ProgrammableNonFungible')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Go back' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send NFT' }));
    fireEvent.click(screen.getByRole('button', { name: 'Burn NFT' }));

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onSendPress).toHaveBeenCalledTimes(1);
    expect(onBurnPress).toHaveBeenCalledTimes(1);
  });

  it('renders burn review details and confirms when preview exists', () => {
    const onBurnBack = vi.fn();
    const onBurnConfirm = vi.fn();

    render(
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
          } as any
        }
        onBurnBack={onBurnBack}
        onBurnConfirm={onBurnConfirm}
      />
    );

    expect(screen.getByText('Temporary lookup table required')).toBeTruthy();
    expect(screen.getByText('0.002 SOL')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Back to NFT details' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm burn' }));

    expect(onBurnBack).toHaveBeenCalledTimes(1);
    expect(onBurnConfirm).toHaveBeenCalledTimes(1);
  });

  it('shows success state and continues through the success screen', () => {
    const onBurnSuccessContinue = vi.fn();

    render(
      <NftDetailPage
        nft={BASE_NFT}
        onBack={vi.fn()}
        burnStep="success"
        onBurnSuccessContinue={onBurnSuccessContinue}
        burnSuccessExplorerUrl="https://explorer/tx"
      />
    );

    expect(mockTransactionSuccessScreen).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText('NFT burned')).toHaveLength(2);
    expect(screen.getByText('"Genesis Salmon" has been burned.')).toBeTruthy();

    fireEvent.click(screen.getByText('Continue'));

    expect(onBurnSuccessContinue).toHaveBeenCalledTimes(1);
  });
});
