import { beforeAll, describe, expect, it } from 'vitest';
import {
  address,
  appendTransactionMessageInstruction,
  compileTransactionMessage,
  compressTransactionMessageUsingAddressLookupTables,
  createTransactionMessage,
  getCompiledTransactionMessageEncoder,
  getTransactionEncoder,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  type Address,
  type Blockhash,
} from '@solana/kit';
import { buildSwapProposal, outputDestinations } from './useSwapScreenLogic';
import {
  assertSolanaTransactionMatches,
  JUPITER_AGGREGATOR_PROGRAM,
  SYSTEM_PROGRAM,
  TOKEN_PROGRAM,
} from '../../core/verify';
import type { SwapBuildEnvelope } from './api';

/** The wallet, mints and accounts of the real `jupiter-build-sol-usdc-fee` build on the backend. */
const WALLET = '86xCnPeV69n6t3DnyGvkKobf9FdN2H9oiVDdaMpo2MMY';
const WALLET_WSOL = 'HXkHFMCRQP6pw66QEGBqVsduqUQdSyrrrq82S7Rffsms';
const WALLET_USDC = '9SHQTA66Ekh7ZgMnKWsjxXk6DwXku8przs45E8bcEe38';
const EVENT_AUTHORITY = 'D8cy77BBepLMngZx6ZukaTff5hCt1HrWyKk3Hnd9oitf';
const ATTACKER_USDC = 'DjqW361S9LFPpgwTbjuVa993ZGsk2U7AeXpiptNDpcBq';
const SOL = 'So11111111111111111111111111111111111111112';
const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const ROUTE_V2 = [0xbb, 0x64, 0xfa, 0xcc, 0x31, 0xc4, 0xaf, 0x14];

type Ix = {
  programAddress: Address;
  accounts: { address: Address; role: number }[];
  data: Uint8Array;
};

function transaction(instructions: Ix[], lookupTable?: Address[]): string {
  let msg = setTransactionMessageLifetimeUsingBlockhash(
    {
      blockhash: 'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N' as Blockhash,
      lastValidBlockHeight: 1000n,
    },
    setTransactionMessageFeePayer(address(WALLET), createTransactionMessage({ version: 0 }))
  );
  for (const ix of instructions)
    msg = appendTransactionMessageInstruction(ix as never, msg) as never;
  if (lookupTable) {
    msg = compressTransactionMessageUsingAddressLookupTables(msg, {
      [address('j2VUW8UGtzuLq8b3vjZTDbk1Fs6FSV19UrsLZqc1Vyi')]: lookupTable,
    }) as never;
  }
  const compiled = compileTransactionMessage(msg);
  const messageBytes = getCompiledTransactionMessageEncoder().encode(compiled);
  return Buffer.from(
    getTransactionEncoder().encode({
      messageBytes: messageBytes as never,
      signatures: { [WALLET]: null } as never,
    })
  ).toString('base64');
}

interface RouteArgs {
  destination?: string;
  override?: string;
  inAmount?: bigint;
  quotedOut?: bigint;
  slippageBps?: number;
  feeBps?: number;
  discriminator?: number[];
}

/** A Jupiter `route_v2` call shaped like the real build: 10 named accounts, then the route. */
function route({
  destination = WALLET_USDC,
  override = JUPITER_AGGREGATOR_PROGRAM,
  inAmount = 10_000_000n,
  quotedOut = 1_173_138n,
  slippageBps = 50,
  feeBps = 50,
  discriminator = ROUTE_V2,
}: RouteArgs = {}): Ix {
  const data = new Uint8Array(8 + 28 + 10);
  data.set(discriminator);
  const view = new DataView(data.buffer);
  view.setBigUint64(8, inAmount, true);
  view.setBigUint64(16, quotedOut, true);
  view.setUint16(24, slippageBps, true);
  view.setUint16(26, feeBps, true);
  const at = (a: string, role: number) => ({ address: address(a), role });
  return {
    programAddress: address(JUPITER_AGGREGATOR_PROGRAM),
    accounts: [
      at(WALLET, 2),
      at(WALLET_WSOL, 1),
      at(destination, 1),
      at(SOL, 0),
      at(USDC, 0),
      at(TOKEN_PROGRAM, 0),
      at(TOKEN_PROGRAM, 0),
      at(override, override === JUPITER_AGGREGATOR_PROGRAM ? 0 : 1),
      at(EVENT_AUTHORITY, 0),
      at(JUPITER_AGGREGATOR_PROGRAM, 0),
    ],
    data,
  };
}

const envelope = {
  provider: 'jupiter',
  providerDisplayName: 'Metis',
  attribution: '',
  providerRequestId: null,
  expiresAt: '2026-10-01T00:00:00Z',
  input: { mint: SOL, amount: '10000000', decimals: 9, symbol: 'SOL', logo: null },
  output: {
    mint: USDC,
    amount: '1173138',
    minAmount: '1167273',
    decimals: 6,
    symbol: 'USDC',
    logo: null,
  },
  route: [],
  priceImpactPct: 0,
  slippageBps: 50,
  inUsdValue: null,
  outUsdValue: null,
  salmonFee: { amount: '5902', mint: USDC, side: 'output', bps: 50, decimals: 6, symbol: 'USDC' },
  routeFee: null,
} as unknown as SwapBuildEnvelope;

let destinations: string[];
beforeAll(async () => {
  destinations = await outputDestinations(WALLET, USDC);
});

/** What the wallet checks before signing: the proposal's own expectation, the signer as fee payer. */
function verify(tx: string): void {
  const proposal = buildSwapProposal(
    { ...envelope, transaction: tx },
    { networkId: 'solana-mainnet', formatValue: () => '', destinations }
  );
  assertSolanaTransactionMatches(proposal.transaction, { feePayer: WALLET, ...proposal.expect });
}

describe('swap bytes — where the router pays the output', () => {
  it('derives the wallet’s USDC account the real build pays', () => {
    expect(destinations).toContain(WALLET_USDC);
  });

  it('accepts a Jupiter route that pays the wallet with the amounts on screen', () => {
    expect(() => verify(transaction([route()]))).not.toThrow();
  });

  it('refuses a Jupiter route that pays the output to an account that is not the wallet’s', () => {
    expect(() => verify(transaction([route({ destination: ATTACKER_USDC })]))).toThrow(
      /not the wallet's own/
    );
    expect(() => verify(transaction([route({ override: ATTACKER_USDC })]))).toThrow(
      /redirects the swap output/
    );
  });

  it('refuses a Jupiter route whose amounts are not the ones on screen', () => {
    expect(() => verify(transaction([route({ inAmount: 20_000_000n })]))).toThrow(/amount other/);
    expect(() => verify(transaction([route({ quotedOut: 1n })]))).toThrow(/quotes an output/);
    expect(() => verify(transaction([route({ slippageBps: 10_000 })]))).toThrow(/more slippage/);
    expect(() => verify(transaction([route({ feeBps: 9_000 })]))).toThrow(/larger fee/);
  });

  it('refuses a Jupiter instruction other than route_v2', () => {
    const legacyRoute = [0xe5, 0x17, 0xcb, 0x97, 0x7a, 0xe3, 0xad, 0x2a];
    expect(() => verify(transaction([route({ discriminator: legacyRoute })]))).toThrow(
      /other than route_v2/
    );
  });

  it('refuses a destination it cannot read because a lookup table hides it', () => {
    expect(() =>
      verify(transaction([route({ destination: ATTACKER_USDC })], [address(ATTACKER_USDC)]))
    ).toThrow(/lookup table/);
  });

  it('control: a direct SOL transfer to the attacker is refused', () => {
    const transfer: Ix = {
      programAddress: address(SYSTEM_PROGRAM),
      accounts: [
        { address: address(WALLET), role: 3 },
        { address: address(ATTACKER_USDC), role: 1 },
      ],
      data: new Uint8Array([2, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0]),
    };
    expect(() => verify(transaction([route(), transfer]))).toThrow(/not the wallet's own/);
  });

  it('control: a Token Approve to the attacker is refused', () => {
    const approve: Ix = {
      programAddress: address(TOKEN_PROGRAM),
      accounts: [
        { address: address(WALLET_WSOL), role: 1 },
        { address: address(ATTACKER_USDC), role: 0 },
        { address: address(WALLET), role: 2 },
      ],
      data: new Uint8Array([4, 1, 0, 0, 0, 0, 0, 0, 0]),
    };
    expect(() => verify(transaction([route(), approve]))).toThrow(/instruction 4 on/);
  });
});
