/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key}:${Object.values(options).join(',')}` : key,
  }),
}));

// `@salmon/shared` pulls React Native through its barrel, which Vitest cannot
// parse. Same treatment as the other component suites here: mock the tokens
// this sheet reads, and keep the one real behaviour it depends on
// (`getChainDisplayName`).
vi.mock('@salmon/shared', async () => ({
  ...(await vi.importActual('../../../../shared/src/hooks/useCopyFeedback')),
  colors: {
    text: { primary: '#EDF1F7' },
    button: { primaryBackground: '#FF5C45', primaryText: '#070911' },
    background: { card: '#161C2D' },
    border: { default: '#58637B' },
  },
  palette: { neutral: { 0: '#FFFFFF', 1000: '#070911' } },
  spacing: { xs: 4, md: 12, xl: 16, '2xl': 24 },
  borderRadius: { lg: 16, xl: 20, full: 9999 },
  componentSizes: {
    qrCodeSize: 200,
    qrBorderWidth: 8,
    receiveContentGap: 16,
    copyButtonWidth: 160,
    buttonHeightCompact: 44,
  },
  copyToClipboard: vi.fn(async () => true),
  fontSize: { sm: 14, base: 16, md: 15 },
  fontWeight: { semibold: 600, extraBold: 800 },
  letterSpacing: { change: '0.02em', wide: '0.04em' },
  lineHeight: { condensed: 1.2 },
  opacity: { high: 0.85, medium: 0.6 },
  duration: { normal: '200ms' },
  durationMs: { feedbackLong: 2000 },
  easing: { ease: 'ease' },
  getChainDisplayName: (chain?: string) =>
    chain === 'bitcoin' ? 'Bitcoin' : chain === 'ethereum' ? 'Ethereum' : 'Solana',
}));

// The QR encoder walks a canvas, which jsdom does not provide; chain identity
// does not depend on it.
vi.mock('../QRCode', () => ({
  QRCode: () => <div data-testid="qr" />,
}));

vi.mock('../FleshBackground', () => ({
  FleshBackground: () => null,
}));

vi.mock('../BaseSheetDialog', () => {
  const BaseSheetDialog = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  const StandardHeader = ({ title }: { title: string }) => <h2>{title}</h2>;
  StandardHeader.displayName = 'StandardHeader';
  const Content = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  Content.displayName = 'Content';
  BaseSheetDialog.StandardHeader = StandardHeader;
  BaseSheetDialog.Content = Content;
  return { BaseSheetDialog };
});

vi.mock('../WarningNotice', () => ({
  WarningNotice: ({ title, children }: { title: string; children?: React.ReactNode }) => (
    <div role="alert">
      <span>{title}</span>
      <span>{children}</span>
    </div>
  ),
}));

import { ReceiveSheet } from './ReceiveSheet';

const ADDRESS = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';

afterEach(cleanup);

describe('ReceiveSheet chain identity', () => {
  it('names the chain in a labelled badge', () => {
    render(<ReceiveSheet visible onClose={() => {}} address={ADDRESS} blockchain="solana" />);

    expect(screen.getByTestId('receive-chain-badge').textContent).toBe(
      'token.send.blockchainAddress:Solana'
    );
  });

  it('warns that only assets on that chain may be sent to this address', () => {
    render(<ReceiveSheet visible onClose={() => {}} address={ADDRESS} blockchain="bitcoin" />);

    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('token.receive.networkOnlyTitle:Bitcoin');
    expect(alert.textContent).toContain('token.receive.networkOnlyBody:Bitcoin');
  });
});
