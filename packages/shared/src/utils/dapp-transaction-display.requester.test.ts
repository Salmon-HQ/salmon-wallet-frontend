/**
 * The Solana Pay inputs of `dappTransactionDisplay` (spec 043): who asks, the
 * merchant's message, and a fee payer that is not the user. Kept out of
 * `dapp-transaction-display.test.ts`, which stays byte-identical (owner's
 * before/after condition).
 */
import { describe, expect, it } from 'vitest';
import type { Address } from '@solana/kit';
import { dappTransactionDisplay } from './dapp-transaction-display';
import type { TransactionEffects } from '../blockchain/solana/simulation-types';

const t = (key: string, values?: Record<string, unknown>) =>
  values ? `${key} ${JSON.stringify(values)}` : key;

const USER = 'Fg6PaFpoAXY1WYzMFyBQ2GfKcVxVfpJTUAFEEeUMKzXf';
const SPONSOR = 'mvines9iiHiQTysrwkJjGf2gb9Ex9jXJX8ns3qwf2kN';
const MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' as Address;

const effects: TransactionEffects = {
  kind: 'effects',
  account: USER as Address,
  sol: { lamports: 0n, feeLamports: 0n },
  tokens: [
    {
      tokenAccount: USER as Address,
      mint: MINT,
      amount: -12_500_000n,
      decimals: 6,
      symbol: 'USDC',
    },
  ],
  approvals: [],
};

const base = {
  origin: 'merchant.example',
  signingAccount: { name: 'Main', address: USER },
  effects,
  effectsLoading: false,
  feeSol: '0.000005',
  transactionCount: 1,
  parsingError: null,
};

const requester = {
  name: 'Corner Café',
  icon: 'https://merchant.example/logo.svg',
  domain: 'merchant.example',
};

describe('dappTransactionDisplay — a merchant asks', () => {
  it('puts the merchant in the identity instead of the requesting-site row', () => {
    const display = dappTransactionDisplay({ ...base, requester }, t);

    expect(display.requester).toEqual(requester);
    expect(display.rows.map((row) => row.label)).not.toContain('dapp.requesting_site');
    expect(display.rows[0]).toEqual({ label: 'dapp.wallet_address', value: 'Main · Fg6P...KzXf' });
  });

  it("shows the merchant's message in full, as its own row before the fee", () => {
    const message = 'Order #42 — two flat whites and a croissant, pick up at the counter please';
    const display = dappTransactionDisplay({ ...base, requester, message }, t);

    const labels = display.rows.map((row) => row.label);
    expect(display.rows).toContainEqual({ label: 'solanaPay.message', value: message });
    expect(labels.indexOf('solanaPay.message')).toBeLessThan(
      labels.indexOf('dapp.transaction_fee')
    );
    expect(labels.indexOf('solanaPay.message')).toBeGreaterThan(labels.indexOf('dapp.effects_out'));
  });

  it('says who pays the fee when it is not the signing account', () => {
    const display = dappTransactionDisplay({ ...base, requester, feePayer: SPONSOR }, t);

    expect(display.rows).toContainEqual({
      label: 'dapp.transaction_fee',
      value: 'solanaPay.feePaidBy {"address":"mvin...f2kN"}',
    });
  });

  it('keeps the fee as a cost when the signing account pays it', () => {
    const display = dappTransactionDisplay({ ...base, requester, feePayer: USER }, t);

    expect(display.rows).toContainEqual({ label: 'dapp.transaction_fee', value: '0.000005 SOL' });
  });

  it('renders exactly as before without any of the three inputs', () => {
    const withUndefined = dappTransactionDisplay(
      { ...base, requester: undefined, message: undefined, feePayer: undefined },
      t
    );
    expect(withUndefined).toEqual(dappTransactionDisplay(base, t));
    expect(withUndefined).not.toHaveProperty('requester');
    expect(withUndefined.rows[0]).toEqual({
      label: 'dapp.requesting_site',
      value: 'merchant.example',
    });
  });
});
