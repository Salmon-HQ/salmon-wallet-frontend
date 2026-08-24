import { describe, it, expect } from 'vitest';

import {
  getRequiredSol,
  getSolShortfall,
  SOLANA_BASE_FEE_LAMPORTS,
  SOLANA_TOKEN_ACCOUNT_RENT_LAMPORTS,
} from './sol-fees';
import { LAMPORTS_PER_SOL } from './balance';

describe('getRequiredSol', () => {
  it('asks only for the signature fee to send native SOL', () => {
    expect(getRequiredSol({ isTokenTransfer: false })).toBe(
      SOLANA_BASE_FEE_LAMPORTS / LAMPORTS_PER_SOL
    );
  });

  it('adds token-account rent for a token transfer', () => {
    // The recipient may never have held this token, and the sender funds the
    // account that gets created for them.
    expect(getRequiredSol({ isTokenTransfer: true })).toBe(
      (SOLANA_BASE_FEE_LAMPORTS + SOLANA_TOKEN_ACCOUNT_RENT_LAMPORTS) / LAMPORTS_PER_SOL
    );
  });
});

describe('getSolShortfall', () => {
  it('reports no shortfall when the balance covers the floor', () => {
    expect(getSolShortfall({ nativeBalanceSol: 0.1, isTokenTransfer: true })).toBeNull();
  });

  it('reports the missing amount, not just a failure', () => {
    // The amount is the actionable half of the message: "add this much".
    const shortfall = getSolShortfall({ nativeBalanceSol: 0, isTokenTransfer: false });

    expect(shortfall).toBeCloseTo(SOLANA_BASE_FEE_LAMPORTS / LAMPORTS_PER_SOL, 12);
  });

  it('catches the account that holds tokens but no SOL', () => {
    // The case this module exists for: the token balance says the transfer is
    // fine, and the network refuses it.
    expect(getSolShortfall({ nativeBalanceSol: 0, isTokenTransfer: true })).toBeGreaterThan(0);
  });

  it('treats a balance that covers the fee but not the rent as short', () => {
    const feeOnly = SOLANA_BASE_FEE_LAMPORTS / LAMPORTS_PER_SOL;

    expect(getSolShortfall({ nativeBalanceSol: feeOnly, isTokenTransfer: false })).toBeNull();
    expect(getSolShortfall({ nativeBalanceSol: feeOnly, isTokenTransfer: true })).toBeCloseTo(
      SOLANA_TOKEN_ACCOUNT_RENT_LAMPORTS / LAMPORTS_PER_SOL,
      12
    );
  });
});
