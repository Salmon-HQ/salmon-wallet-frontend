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
import { buildSwapProposal, walletTokenAccounts } from './useSwapScreenLogic';
import {
  ASSOCIATED_TOKEN_PROGRAM,
  assertSolanaTransactionMatches,
  COMPUTE_BUDGET_PROGRAM,
  swapAccountCreates,
  ZEROEX_SETTLEMENT_OWNER,
  JUPITER_AGGREGATOR_PROGRAM,
  SYSTEM_PROGRAM,
  TOKEN_PROGRAM,
} from '../../core/verify';
import type { SwapBuildEnvelope } from './api';
import jupiterBuilds from './fixtures/jupiter-builds.json';

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
let sources: string[];
beforeAll(async () => {
  destinations = await walletTokenAccounts(WALLET, USDC);
  sources = await walletTokenAccounts(WALLET, SOL);
});

/** The picked tokens; their decimals only scale the screen, so one value serves every pair here. */
const decimalsOf = (mint: string) => (mint === SOL ? 9 : 6);
const pickedTokens = (inputMint: string, outputMint: string) => ({
  pay: {
    address: inputMint,
    name: 'in',
    symbol: 'IN',
    decimals: decimalsOf(inputMint),
    uiAmount: 1,
  },
  receive: {
    address: outputMint,
    name: 'out',
    symbol: 'OUT',
    decimals: decimalsOf(outputMint),
    uiAmount: 0,
  },
});

/** What the wallet checks before signing: the proposal's own expectation, the signer as fee payer. */
function verify(tx: string, overrides: Partial<SwapBuildEnvelope> = {}): void {
  const proposal = buildSwapProposal(
    { ...envelope, transaction: tx, ...overrides },
    {
      networkId: 'solana-mainnet',
      formatValue: () => '',
      destinations,
      sources,
      tokens: pickedTokens(SOL, USDC),
    }
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

  it('refuses a Jupiter instruction other than its two swap routes', () => {
    const legacyRoute = [0xe5, 0x17, 0xcb, 0x97, 0x7a, 0xe3, 0xad, 0x2a];
    expect(() => verify(transaction([route({ discriminator: legacyRoute })]))).toThrow(
      /Jupiter instruction other than/
    );
  });

  it('refuses a Jupiter route that spends from an account other than the wallet’s own of the input token', () => {
    const otherToken: Ix = route();
    otherToken.accounts[1] = { address: address(WALLET_USDC), role: 1 };
    expect(() => verify(transaction([otherToken]))).toThrow(/spends from/);
  });

  it('refuses a second Jupiter route in the same message', () => {
    expect(() => verify(transaction([route(), route()]))).toThrow(/more than one Jupiter/);
  });

  // Jupiter enforces quoted out × (1 − slippage), rounded up; the screen must
  // show that same minimum.
  it('refuses a build whose minimum is not the one Jupiter enforces', () => {
    expect(() =>
      verify(transaction([route()]), {
        output: { ...envelope.output, minAmount: '1167272' },
      })
    ).toThrow(/minimum/);
  });

  it('says a route names too few accounts rather than blaming a lookup table', () => {
    const short = route();
    short.accounts = short.accounts.slice(0, 2);
    expect(() => verify(transaction([short]))).toThrow(/too few accounts/);
    expect(() => verify(transaction([short]))).not.toThrow(/lookup table/);
  });

  it('refuses a destination it cannot read because a lookup table hides it', () => {
    expect(() =>
      verify(transaction([route({ destination: ATTACKER_USDC })], [address(ATTACKER_USDC)]))
    ).toThrow(/lookup table/);
  });

  describe('wrapping SOL', () => {
    const createAta = (ata: string, owner: string, mint: string): Ix => ({
      programAddress: address(ASSOCIATED_TOKEN_PROGRAM),
      accounts: [
        { address: address(WALLET), role: 3 },
        { address: address(ata), role: 1 },
        { address: address(owner), role: 0 },
        { address: address(mint), role: 0 },
        { address: address(SYSTEM_PROGRAM), role: 0 },
        { address: address(TOKEN_PROGRAM), role: 0 },
      ],
      data: new Uint8Array([1]),
    });
    const wrap = (to: string, lamports: bigint): Ix => {
      const data = new Uint8Array(12);
      const view = new DataView(data.buffer);
      view.setUint32(0, 2, true);
      view.setBigUint64(4, lamports, true);
      return {
        programAddress: address(SYSTEM_PROGRAM),
        accounts: [
          { address: address(WALLET), role: 3 },
          { address: address(to), role: 1 },
        ],
        data,
      };
    };

    it('accepts wrapping the amount on screen into the wallet’s wrapped-SOL account', () => {
      const tx = transaction([
        createAta(WALLET_WSOL, WALLET, SOL),
        wrap(WALLET_WSOL, 10_000_000n),
        route(),
      ]);
      expect(() => verify(tx)).not.toThrow();
    });

    it('refuses wrapping more SOL than the amount on screen', () => {
      const tx = transaction([
        createAta(WALLET_WSOL, WALLET, SOL),
        wrap(WALLET_WSOL, 10_000_001n),
        route(),
      ]);
      expect(() => verify(tx)).toThrow(/more SOL than/);
    });

    it('refuses wraps that together exceed the amount on screen', () => {
      const tx = transaction([
        createAta(WALLET_WSOL, WALLET, SOL),
        wrap(WALLET_WSOL, 6_000_000n),
        wrap(WALLET_WSOL, 6_000_000n),
        route(),
      ]);
      expect(() => verify(tx)).toThrow(/more SOL than/);
    });

    it('refuses SOL sent into a wallet account other than the wrapped-SOL one it spends', () => {
      const tx = transaction([
        createAta(WALLET_USDC, WALLET, USDC),
        wrap(WALLET_USDC, 1n),
        route(),
      ]);
      expect(() => verify(tx)).toThrow(/sends SOL to/);
    });

    it('creates accounts only idempotently, and only with the wallet paying', () => {
      const create = createAta(WALLET_USDC, WALLET, USDC);
      expect(() => verify(transaction([{ ...create, data: new Uint8Array() }, route()]))).toThrow(
        /too short to identify/
      );
      expect(() =>
        verify(transaction([{ ...create, data: new Uint8Array([0]) }, route()]))
      ).toThrow(/instruction 0 on/);
      const paidByOther = { ...create, accounts: [...create.accounts] };
      paidByOther.accounts[0] = { address: address(EVENT_AUTHORITY), role: 1 };
      expect(() => verify(transaction([paidByOther, route()]))).toThrow(/not the wallet's own/);
    });

    // 0x settles through its own account's token accounts and creates them
    // idempotently in the build (seen live). Up to two such creates are
    // allowed; an account created for anyone else is refused.
    it('lets the wallet create token accounts for itself and, twice at most, for 0x’s settlement account', async () => {
      const [settlementUsdc] = await walletTokenAccounts(ZEROEX_SETTLEMENT_OWNER, USDC);
      const [settlementSol] = await walletTokenAccounts(ZEROEX_SETTLEMENT_OWNER, SOL);
      const [settlementOther] = await walletTokenAccounts(ZEROEX_SETTLEMENT_OWNER, OTHER_MINT);
      const settlement = (ata: string, mint: string) =>
        createAta(ata, ZEROEX_SETTLEMENT_OWNER, mint);
      expect(() =>
        verify(
          transaction([
            settlement(settlementUsdc as string, USDC),
            settlement(settlementSol as string, SOL),
            route(),
          ])
        )
      ).not.toThrow();
      expect(() =>
        verify(
          transaction([
            settlement(settlementUsdc as string, USDC),
            settlement(settlementSol as string, SOL),
            settlement(settlementOther as string, OTHER_MINT),
            route(),
          ])
        )
      ).toThrow(/more than two/);
      expect(() =>
        verify(transaction([createAta(ATTACKER_USDC, EVENT_AUTHORITY, USDC), route()]))
      ).toThrow(/for an owner other than/);
    });

    it('lists the token accounts a swap creates for the wallet and 0x’s settlement account', async () => {
      const [settlementUsdc] = await walletTokenAccounts(ZEROEX_SETTLEMENT_OWNER, USDC);
      const tx = transaction([
        createAta(WALLET_WSOL, WALLET, SOL),
        createAta(WALLET_WSOL, WALLET, SOL),
        createAta(settlementUsdc as string, ZEROEX_SETTLEMENT_OWNER, USDC),
        route(),
      ]);
      expect(swapAccountCreates(tx).sort()).toEqual([WALLET_WSOL, settlementUsdc].sort());
    });
  });

  it('lets a swap set a compute unit limit and price, and no other Compute Budget instruction', () => {
    const budget = (code: number, value: number): Ix => ({
      programAddress: address(COMPUTE_BUDGET_PROGRAM),
      accounts: [],
      data: new Uint8Array([
        code,
        value & 0xff,
        (value >> 8) & 0xff,
        (value >> 16) & 0xff,
        0,
        0,
        0,
        0,
        0,
      ]),
    });
    expect(() =>
      verify(transaction([budget(2, 400_000), budget(3, 20_000), route()]))
    ).not.toThrow();
    expect(() => verify(transaction([budget(1, 262_144), route()]))).toThrow(/instruction 1 on/);
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

/** A Jupiter /build answer, as the backend's fixtures record it. */
interface JupiterInstruction {
  programId: string;
  accounts: { pubkey: string; isSigner: boolean; isWritable: boolean }[];
  data: string;
}
interface JupiterBuild {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  slippageBps: number;
  setupInstructions: JupiterInstruction[];
  swapInstruction: JupiterInstruction;
  cleanupInstruction: JupiterInstruction | null;
  otherInstructions: JupiterInstruction[];
}
const BUILDS: Record<string, JupiterBuild> = jupiterBuilds;
/** A mint the fixtures' wallet could hold besides the pair: where a tampered build would spend from. */
const OTHER_MINT = 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So';
/** An account no fixture names, so a tampered slot holding it stays in the static list. */
const OUTSIDER = '9mpJyg7iEse9rPMP1tdiSdSAYbLJX6nJyGbNkbT3SAd3';

const toIx = ({ programId, accounts, data }: JupiterInstruction): Ix => ({
  programAddress: address(programId),
  accounts: accounts.map(({ pubkey, isSigner, isWritable }) => ({
    address: address(pubkey),
    role: (isSigner ? 2 : 0) + (isWritable ? 1 : 0),
  })),
  data: new Uint8Array(Buffer.from(data, 'base64')),
});

interface Layout {
  override?: number;
  args: number;
  authority: number;
  source: number;
  destination: number;
  sourceMint: number;
  destinationMint: number;
}
/**
 * Where each Jupiter router call keeps what the check reads (Jupiter v6
 * on-chain IDL). Written out again rather than imported, so a wrong offset in
 * `JUPITER_ROUTES` (core/verify/solana-transaction.ts) fails here.
 */
const LAYOUTS: Record<string, Layout> = {
  // route_v2
  bb64facc31c4af14: {
    args: 8,
    authority: 0,
    source: 1,
    destination: 2,
    sourceMint: 3,
    destinationMint: 4,
    override: 7,
  },
  // shared_accounts_route_v2
  d19853937cfed8e9: {
    args: 9,
    authority: 1,
    source: 2,
    destination: 5,
    sourceMint: 6,
    destinationMint: 7,
  },
};

/**
 * A real Jupiter /build answer compiled the way the backend assembles it
 * (setup, router, cleanup, others), with an optional edit of the router call.
 *
 * The real builds resolve every shared account — mints, token programs, pools —
 * through Jupiter's lookup tables, so the same is done here: everything but the
 * signer, the invoked programs and the wallet's own token accounts goes in one
 * table. Whatever the check needs from a table is then hidden from it, as it is
 * in the bytes the wallet receives. The table is drawn before the edit, so an
 * account the edit brings in stays visible and the check has to judge it.
 * `withTable: false` compiles every account into the static list instead.
 */
async function realBuild(
  name: string,
  edit?: (swap: Ix, layout: Layout) => void,
  { withTable = true, twice = false } = {}
) {
  const build = BUILDS[name];
  if (!build) throw new Error(`no fixture named ${name}`);
  const own = [
    ...(await walletTokenAccounts(WALLET, build.inputMint)),
    ...(await walletTokenAccounts(WALLET, build.outputMint)),
  ];
  const swap = toIx(build.swapInstruction);
  const layout = LAYOUTS[Buffer.from(swap.data.slice(0, 8)).toString('hex')];
  if (!layout) throw new Error(`${name} is not a router call this test knows`);
  const instructions = [
    ...build.setupInstructions.map(toIx),
    swap,
    ...(twice ? [swap] : []),
    ...(build.cleanupInstruction ? [toIx(build.cleanupInstruction)] : []),
    ...build.otherInstructions.map(toIx),
  ];
  const invoked = new Set(instructions.map((ix) => String(ix.programAddress)));
  const keep = new Set([WALLET, ...own, ...invoked]);
  const table = [
    ...new Set(instructions.flatMap((ix) => ix.accounts.map((meta) => String(meta.address)))),
  ].filter((account) => !keep.has(account));
  edit?.(swap, layout);
  const tx = transaction(
    instructions,
    withTable ? table.map((account) => address(account)) : undefined
  );
  const proposal = buildSwapProposal(
    {
      ...envelope,
      transaction: tx,
      input: {
        mint: build.inputMint,
        amount: build.inAmount,
        decimals: decimalsOf(build.inputMint),
      },
      output: {
        mint: build.outputMint,
        amount: build.outAmount,
        minAmount: build.otherAmountThreshold,
        decimals: decimalsOf(build.outputMint),
      },
      slippageBps: build.slippageBps,
    },
    {
      networkId: 'solana-mainnet',
      formatValue: () => '',
      destinations: await walletTokenAccounts(WALLET, build.outputMint),
      sources: await walletTokenAccounts(WALLET, build.inputMint),
      tokens: pickedTokens(build.inputMint, build.outputMint),
    }
  );
  return () =>
    assertSolanaTransactionMatches(proposal.transaction, { feePayer: WALLET, ...proposal.expect });
}

const setU64 = (data: Uint8Array, offset: number, value: bigint) =>
  new DataView(data.buffer, data.byteOffset).setBigUint64(offset, value, true);
const setU16 = (data: Uint8Array, offset: number, value: number) =>
  new DataView(data.buffer, data.byteOffset).setUint16(offset, value, true);

/**
 * The real Jupiter builds on the backend's fixtures, by shape. Jupiter answers
 * with either router call, chosen per request: route_v2 single-hop with
 * Salmon's fee (SOL in, wrapped and unwrapped), paying out SOL, multi-hop, and
 * paying a Token-2022 mint; shared_accounts_route_v2 multi-hop, spending a
 * Token-2022 mint, and with SOL wrapped and unwrapped.
 */
const ROUTE_V2_BUILDS = ['sol-usdc-fee', 'usdc-sol', 'usdc-bonk-multihop', 'usdc-pyusd'];
const REAL_BUILDS = [...ROUTE_V2_BUILDS, 'usdc-bonk-shared', 'pyusd-usdc-shared', 'sol-jup-shared'];

describe('swap bytes — real Jupiter builds', () => {
  it.each(REAL_BUILDS)('accepts the real %s build', async (name) => {
    expect(await realBuild(name)).not.toThrow();
  });

  it.each(REAL_BUILDS)('accepts the real %s build with every account visible', async (name) => {
    expect(await realBuild(name, undefined, { withTable: false })).not.toThrow();
  });

  it.each(ROUTE_V2_BUILDS)(
    'refuses the real %s build with its override slot filled',
    async (name) => {
      const check = await realBuild(name, (swap, layout) => {
        swap.accounts[layout.override as number] = { address: address(OUTSIDER), role: 1 };
      });
      expect(check).toThrow(/redirects the swap output/);
    }
  );

  it.each(REAL_BUILDS)('refuses the real %s build with its router call twice', async (name) => {
    const check = await realBuild(name, (swap) => swap, { twice: true });
    expect(check).toThrow(/more than one Jupiter/);
  });

  describe.each(REAL_BUILDS)('refuses a tampered %s build', (name) => {
    it('spending another of the wallet’s tokens', async () => {
      const other = await walletTokenAccounts(WALLET, OTHER_MINT);
      const check = await realBuild(name, (swap, layout) => {
        swap.accounts[layout.source] = { address: address(other[0] as string), role: 1 };
      });
      expect(check).toThrow(/spends from/);
    });

    it('paying the output elsewhere', async () => {
      const check = await realBuild(name, (swap, layout) => {
        swap.accounts[layout.destination] = { address: address(OUTSIDER), role: 1 };
      });
      expect(check).toThrow(/not the wallet's own/);
    });

    it('naming another authority', async () => {
      const check = await realBuild(name, (swap, layout) => {
        swap.accounts[layout.authority] = { address: address(OUTSIDER), role: 0 };
      });
      expect(check).toThrow(/does not authorize/);
    });

    it('naming another mint on either side', async () => {
      for (const slot of ['sourceMint', 'destinationMint'] as const) {
        const check = await realBuild(name, (swap, layout) => {
          swap.accounts[layout[slot]] = { address: address(OUTSIDER), role: 0 };
        });
        expect(check).toThrow(/mint other than/);
      }
    });

    it('carrying other amounts, slippage, fee or positive slippage', async () => {
      const edits: [(data: Uint8Array, args: number) => void, RegExp][] = [
        [(data, args) => setU64(data, args, 20_000_000n), /amount other/],
        [(data, args) => setU64(data, args + 8, 1n), /quotes an output/],
        [(data, args) => setU16(data, args + 16, 10_000), /more slippage/],
        [(data, args) => setU16(data, args + 18, 9_000), /larger fee/],
        [(data, args) => setU16(data, args + 20, 100), /above the quote/],
      ];
      for (const [edit, why] of edits) {
        const check = await realBuild(name, (swap, layout) => edit(swap.data, layout.args));
        expect(check).toThrow(why);
      }
    });

    it('calling a Jupiter instruction the wallet does not know', async () => {
      const check = await realBuild(name, (swap) => {
        swap.data[0] ^= 0xff;
      });
      expect(check).toThrow(/Jupiter instruction other than/);
    });
  });
});
