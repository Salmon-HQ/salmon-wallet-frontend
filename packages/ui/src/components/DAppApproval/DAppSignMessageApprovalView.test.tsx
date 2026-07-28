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
  parseSiwsMessage: vi.fn().mockReturnValue(null),
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
      />,
    );

    // Assert
    expect(screen.getByText('Off-chain message (OCMS)')).toBeInTheDocument();
    expect(screen.getByText('Please confirm your login')).toBeInTheDocument();
    expect(screen.getByText('Required signer')).toBeInTheDocument();
    expect(screen.getByText('Fg6PaFpoAXY1WYzMFyBQ2GfKcVxVfpJTUAFEEeUMKzXf')).toBeInTheDocument();
    expect(mockedParseOffchainMessageForApproval).toHaveBeenCalledWith(
      [1, 2, 3],
      ['Fg6PaFpoAXY1WYzMFyBQ2GfKcVxVfpJTUAFEEeUMKzXf'],
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
      />,
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
