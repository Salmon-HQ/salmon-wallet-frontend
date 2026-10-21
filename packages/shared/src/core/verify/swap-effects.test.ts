import { describe, expect, it } from 'vitest';
import type { Address } from '@solana/kit';
import type { TransactionEffects } from '../../blockchain/solana/simulation';
import { assertSwapEffects, ATA_RENT_ALLOWANCE } from './swap-effects';
import type { SwapRouteExpectation } from './solana-transaction';

const WALLET = '86xCnPeV69n6t3DnyGvkKobf9FdN2H9oiVDdaMpo2MMY' as Address;
const SOL = 'So11111111111111111111111111111111111111112';
const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const BONK = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263';
const FEE = 5_000n;

const usdcToSol: SwapRouteExpectation = {
  sources: [],
  destinations: [],
  inputMint: USDC,
  outputMint: SOL,
  inAmount: '1000000',
  quotedOutAmount: '8482839',
  minOutAmount: '8440425',
  slippageBps: 50,
  platformFeeBps: 0,
};
const solToUsdc: SwapRouteExpectation = {
  ...usdcToSol,
  inputMint: SOL,
  outputMint: USDC,
  inAmount: '10000000',
  quotedOutAmount: '1173138',
  minOutAmount: '1167273',
};

const token = (mint: string, amount: bigint) => ({
  tokenAccount: 'HXkHFMCRQP6pw66QEGBqVsduqUQdSyrrrq82S7Rffsms' as Address,
  mint: mint as Address,
  amount,
  decimals: 6,
  symbol: null,
});

function effects(lamports: bigint, tokens: ReturnType<typeof token>[]): TransactionEffects {
  return {
    kind: 'effects',
    account: WALLET,
    sol: { lamports, feeLamports: FEE },
    tokens,
    approvals: [],
  };
}

describe('assertSwapEffects — a simulated 0x swap must pay the wallet', () => {
  it('accepts a token swap that pays at least the minimum, after creating the output account', () => {
    const paid = effects(-10_000_000n - FEE - 2_039_280n, [token(USDC, 1_168_000n)]);
    expect(() => assertSwapEffects(paid, solToUsdc, 1)).not.toThrow();
  });

  it('accepts a swap into native SOL that pays at least the minimum, net of the fee', () => {
    const paid = effects(8_441_000n - FEE, [token(USDC, -1_000_000n)]);
    expect(() => assertSwapEffects(paid, usdcToSol, 0)).not.toThrow();
  });

  it('refuses a swap whose output never reaches the wallet', () => {
    const stolen = effects(-10_000_000n - FEE, []);
    expect(() => assertSwapEffects(stolen, solToUsdc, 0)).toThrow(/less than the minimum/);
    const stolenSol = effects(-FEE, [token(USDC, -1_000_000n)]);
    expect(() => assertSwapEffects(stolenSol, usdcToSol, 0)).toThrow(/less than the minimum/);
  });

  it('refuses a swap that pays short of the minimum on screen', () => {
    const short = effects(-10_000_000n - FEE, [token(USDC, 1_000_000n)]);
    expect(() => assertSwapEffects(short, solToUsdc, 0)).toThrow(/less than the minimum/);
  });

  it('refuses a swap that takes more than the amount on screen, in the token or in SOL', () => {
    const tokenOver = effects(8_441_000n - FEE, [token(USDC, -2_000_000n)]);
    expect(() => assertSwapEffects(tokenOver, usdcToSol, 0)).toThrow(/more than the amount/);
    const solOver = effects(-20_000_000n - FEE, [token(USDC, 1_168_000n)]);
    expect(() => assertSwapEffects(solOver, solToUsdc, 0)).toThrow(/more than the amount/);
  });

  it('refuses a swap that also takes another token, or SOL when SOL is not the input', () => {
    const drained = effects(-10_000_000n - FEE, [token(USDC, 1_168_000n), token(BONK, -1n)]);
    expect(() => assertSwapEffects(drained, solToUsdc, 0)).toThrow(new RegExp(`takes ${BONK}`));
    const usdcToBonk = { ...usdcToSol, outputMint: BONK, minOutAmount: '1' };
    const solTaken = effects(-1_000_000n - FEE, [token(USDC, -1_000_000n), token(BONK, 5n)]);
    expect(() => assertSwapEffects(solTaken, usdcToBonk, 0)).toThrow(/takes SOL/);
  });

  it('allows only the rent of the accounts the message creates', () => {
    const rent = -10_000_000n - FEE - ATA_RENT_ALLOWANCE;
    expect(() =>
      assertSwapEffects(effects(rent, [token(USDC, 1_168_000n)]), solToUsdc, 1)
    ).not.toThrow();
    expect(() => assertSwapEffects(effects(rent, [token(USDC, 1_168_000n)]), solToUsdc, 0)).toThrow(
      /more than the amount/
    );
  });

  it('refuses a swap that grants a delegate, fails, or cannot be read', () => {
    const delegated: TransactionEffects = {
      ...(effects(-10_000_000n - FEE, [token(USDC, 1_168_000n)]) as Extract<
        TransactionEffects,
        { kind: 'effects' }
      >),
      approvals: [
        {
          tokenAccount: WALLET,
          mint: USDC as Address,
          spender: WALLET,
          amount: 1n,
          decimals: 6,
          symbol: null,
          scope: 'bounded',
        },
      ],
    };
    expect(() => assertSwapEffects(delegated, solToUsdc, 0)).toThrow(/delegate/);
    expect(() =>
      assertSwapEffects(
        {
          kind: 'transaction-would-fail',
          account: WALLET,
          error: 'AccountNotFound' as never,
          logs: [],
        },
        solToUsdc,
        0
      )
    ).toThrow(/would fail/);
    expect(() =>
      assertSwapEffects(
        {
          kind: 'undetermined',
          account: WALLET,
          reason: 'simulation-unavailable',
          detail: 'offline',
        },
        solToUsdc,
        0
      )
    ).toThrow(/could not be checked/);
    expect(() => assertSwapEffects({ kind: 'no-effect', account: WALLET }, solToUsdc, 0)).toThrow();
  });
});

describe('assertSwapEffects — the fee it allows for', () => {
  // A fee the node reports is not an allowance in itself: a v1 message can
  // set any priority fee in its header, and the fee is the wallet's loss.
  it('allows no more than the base fee plus the priority-fee cap', () => {
    const fee = 5_000_000_000n;
    const drained: TransactionEffects = {
      kind: 'effects',
      account: WALLET,
      sol: { lamports: 8_441_000n - fee, feeLamports: fee },
      tokens: [token(USDC, -1_000_000n)],
      approvals: [],
    };
    expect(() => assertSwapEffects(drained, usdcToSol, 0)).toThrow(/less than the minimum/);
  });
});
