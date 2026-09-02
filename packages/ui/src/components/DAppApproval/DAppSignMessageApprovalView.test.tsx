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

vi.mock('@salmon/shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@salmon/shared')>()),
  // The approval header draws the mark from the vector rather than Logo.png.
  markPaths: ['M0 0H1V1H0Z'],
  // Each test drives these directly to exercise the lookalike guard and the
  // OCMS-parse failure path without a real transaction/message buffer.
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
    expect(screen.getByText('Fg6P...KzXf')).toBeInTheDocument();
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
