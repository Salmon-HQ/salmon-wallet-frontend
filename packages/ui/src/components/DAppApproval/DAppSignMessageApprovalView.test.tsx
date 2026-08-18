/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));

vi.mock('@salmon/shared', () => ({
  // The approval header draws the mark from the vector rather than Logo.png.
  markPaths: ['M0 0H1V1H0Z'],
  markViewBoxAttr: '0 0 253 236',
  markAspectRatio: 253 / 236,
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
  borderRadius: { full: 999, md: 8, lg: 12, xl: 16 },
  colors: {
    background: { primary: '#000', secondary: '#111', card: '#050505' },
    border: { subtle: '#222', default: '#333' },
    text: { primary: '#fff', secondary: '#ccc' },
    interactive: { surface: '#444' },
    status: { error: '#f00', errorBackground: '#500' },
    button: {
      primaryBackground: '#fff',
      primaryText: '#000',
      secondaryBackground: '#222',
      secondaryText: '#fff',
      disabledOpacity: 0.5,
    },
  },
  componentSizes: { buttonMinWidth: 64, buttonHeight: 48, buttonRadius: 12 },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  fontFamily: { sans: 'sans-serif', mono: 'monospace' },
  fontSize: { xs: 10, sm: 12, base: 14, md: 16, title: 20 },
  fontWeight: { medium: 500, semibold: 600, bold: 700 },
  letterSpacing: { widest: '1px' },
  shadowsCSS: { none: 'none' },
  opacity: { soft: 0.8 },
  duration: { normal: '200ms', fastest: '80ms' },
  easing: { ease: 'ease' },
  copyToClipboard: vi.fn().mockResolvedValue(undefined),
  formatDateTime: (ts: number) => String(ts),
  formatOrigin: (origin: string) => origin,
  getShortAddress: (address: string) => address,
  isTransactionLookalike: vi.fn(),
  parseOffchainMessageForApproval: vi.fn(),
}));

import { isTransactionLookalike, parseOffchainMessageForApproval } from '@salmon/shared';
import { DAppSignMessageApprovalView } from './DAppSignMessageApprovalView';

const mockedIsTransactionLookalike = vi.mocked(isTransactionLookalike);
const mockedParseOffchainMessageForApproval = vi.mocked(parseOffchainMessageForApproval);

const baseProps = {
  origin: 'https://example.com',
  messageText: 'raw fallback text',
  onApprove: vi.fn(),
  onReject: vi.fn(),
};

describe('DAppSignMessageApprovalView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedIsTransactionLookalike.mockReturnValue(false);
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the parsed OCMS content and required signers when requiredSigners is set', () => {
    // Arrange
    mockedParseOffchainMessageForApproval.mockReturnValue({
      version: 1,
      content: 'Please confirm your login',
      requiredSignatories: [{ address: 'Fg6PaFpoAXY1WYzMFyBQ2GfKcVxVfpJTUAFEEeUMKzXf' }],
    } as never);

    // Act
    render(
      <DAppSignMessageApprovalView
        {...baseProps}
        data={[1, 2, 3]}
        requiredSigners={['Fg6PaFpoAXY1WYzMFyBQ2GfKcVxVfpJTUAFEEeUMKzXf']}
      />
    );

    // Assert
    expect(screen.getByText('Off-chain message (OCMS)')).toBeInTheDocument();
    expect(screen.getByText('Please confirm your login')).toBeInTheDocument();
    expect(screen.getByText('Required signer')).toBeInTheDocument();
    expect(screen.getByText('Fg6PaFpoAXY1WYzMFyBQ2GfKcVxVfpJTUAFEEeUMKzXf')).toBeInTheDocument();
    expect(mockedParseOffchainMessageForApproval).toHaveBeenCalledWith(
      [1, 2, 3],
      ['Fg6PaFpoAXY1WYzMFyBQ2GfKcVxVfpJTUAFEEeUMKzXf']
    );
  });

  it('falls back to the raw message text and disables Sign when the OCMS buffer fails to parse', () => {
    // Arrange
    mockedParseOffchainMessageForApproval.mockImplementation(() => {
      throw new Error('malformed OCMS buffer');
    });

    // Act
    render(
      <DAppSignMessageApprovalView
        {...baseProps}
        messageText="raw fallback text"
        data={[1, 2, 3]}
        requiredSigners={['Fg6PaFpoAXY1WYzMFyBQ2GfKcVxVfpJTUAFEEeUMKzXf']}
      />
    );

    // Assert
    expect(screen.getByText('Off-chain message (OCMS)')).toBeInTheDocument();
    expect(screen.getByText('raw fallback text')).toBeInTheDocument();
    // The exact signing bytes could not be built/rendered, so signing must not be offered.
    expect(screen.getByRole('button', { name: 'SIGN' })).toBeDisabled();
  });

  it('shows a blocking warning and disables Sign when the message bytes are a transaction lookalike', () => {
    // Arrange
    mockedIsTransactionLookalike.mockReturnValue(true);

    // Act
    render(<DAppSignMessageApprovalView {...baseProps} data={[9, 9, 9]} />);

    // Assert
    expect(screen.getByText('Signing blocked')).toBeInTheDocument();
    expect(screen.getByText(/refused to sign it to protect your funds/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'SIGN' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'REJECT' })).not.toBeDisabled();
    expect(mockedIsTransactionLookalike).toHaveBeenCalledWith(Uint8Array.from([9, 9, 9]));
  });

  it('does not run the tx-lookalike guard and leaves Sign enabled when no data bytes are provided', () => {
    // Arrange & Act
    render(<DAppSignMessageApprovalView {...baseProps} />);

    // Assert
    expect(screen.queryByText('Signing blocked')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'SIGN' })).not.toBeDisabled();
    expect(mockedIsTransactionLookalike).not.toHaveBeenCalled();
  });
});
