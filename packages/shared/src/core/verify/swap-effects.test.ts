import { describe, expect, it, vi } from 'vitest';
import {
  address,
  appendTransactionMessageInstruction,
  compileTransactionMessage,
  createTransactionMessage,
  getCompiledTransactionMessageEncoder,
  getTransactionEncoder,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  type Address,
  type Blockhash,
} from '@solana/kit';
import { previewTransactionEffects } from '../../blockchain/solana/simulation';
import type { AccountState, TransactionEffects } from '../../blockchain/solana/simulation';
import { assertSwapEffects, assertSwapPaysWallet, ATA_RENT_ALLOWANCE } from './swap-effects';
import {
  ASSOCIATED_TOKEN_PROGRAM,
  SYSTEM_PROGRAM,
  TOKEN_PROGRAM,
  ZEROEX_SETTLEMENT_OWNER,
} from './solana-programs';

vi.mock('../../blockchain/solana/simulation', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  previewTransactionEffects: vi.fn(),
}));
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
    expect(() => assertSwapEffects(paid, solToUsdc, 2_039_280n)).not.toThrow();
  });

  it('accepts a swap into native SOL that pays at least the minimum, net of the fee', () => {
    const paid = effects(8_441_000n - FEE, [token(USDC, -1_000_000n)]);
    expect(() => assertSwapEffects(paid, usdcToSol, 0n)).not.toThrow();
  });

  it('refuses a swap whose output never reaches the wallet', () => {
    const stolen = effects(-10_000_000n - FEE, []);
    expect(() => assertSwapEffects(stolen, solToUsdc, 0n)).toThrow(/less than the minimum/);
    const stolenSol = effects(-FEE, [token(USDC, -1_000_000n)]);
    expect(() => assertSwapEffects(stolenSol, usdcToSol, 0n)).toThrow(/less than the minimum/);
  });

  it('refuses a swap that pays short of the minimum on screen', () => {
    const short = effects(-10_000_000n - FEE, [token(USDC, 1_000_000n)]);
    expect(() => assertSwapEffects(short, solToUsdc, 0n)).toThrow(/less than the minimum/);
  });

  it('refuses a swap that takes more than the amount on screen, in the token or in SOL', () => {
    const tokenOver = effects(8_441_000n - FEE, [token(USDC, -2_000_000n)]);
    expect(() => assertSwapEffects(tokenOver, usdcToSol, 0n)).toThrow(/more than the amount/);
    const solOver = effects(-20_000_000n - FEE, [token(USDC, 1_168_000n)]);
    expect(() => assertSwapEffects(solOver, solToUsdc, 0n)).toThrow(/more than the amount/);
  });

  it('refuses a swap that also takes another token, or SOL when SOL is not the input', () => {
    const drained = effects(-10_000_000n - FEE, [token(USDC, 1_168_000n), token(BONK, -1n)]);
    expect(() => assertSwapEffects(drained, solToUsdc, 0n)).toThrow(new RegExp(`takes ${BONK}`));
    const usdcToBonk = { ...usdcToSol, outputMint: BONK, minOutAmount: '1' };
    const solTaken = effects(-1_000_000n - FEE, [token(USDC, -1_000_000n), token(BONK, 5n)]);
    expect(() => assertSwapEffects(solTaken, usdcToBonk, 0n)).toThrow(/takes SOL/);
  });

  it('allows only the rent of the accounts the message creates', () => {
    const rent = -10_000_000n - FEE - ATA_RENT_ALLOWANCE;
    expect(() =>
      assertSwapEffects(effects(rent, [token(USDC, 1_168_000n)]), solToUsdc, ATA_RENT_ALLOWANCE)
    ).not.toThrow();
    expect(() =>
      assertSwapEffects(effects(rent, [token(USDC, 1_168_000n)]), solToUsdc, 0n)
    ).toThrow(/more than the amount/);
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
    expect(() => assertSwapEffects(delegated, solToUsdc, 0n)).toThrow(/delegate/);
    expect(() =>
      assertSwapEffects(
        {
          kind: 'transaction-would-fail',
          account: WALLET,
          error: 'AccountNotFound' as never,
          logs: [],
        },
        solToUsdc,
        0n
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
        0n
      )
    ).toThrow(/could not be checked/);
    expect(() =>
      assertSwapEffects({ kind: 'no-effect', account: WALLET }, solToUsdc, 0n)
    ).toThrow();
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
    expect(() => assertSwapEffects(drained, usdcToSol, 0n)).toThrow(/less than the minimum/);
  });
});

/**
 * Rent is allowed for what the swap actually parks in a token account it
 * creates for the route's own tokens (or 0x's settlement account): the
 * lamports that account gains, up to one account's rent, when it ends owned by
 * a token program. An idempotent create of an existing account gains nothing,
 * an account opened and closed again ends empty, and an account for a token
 * the route does not trade earns nothing, so none of them can cover SOL leaving
 * the wallet for something else. Rent the route reclaims by closing one of the
 * wallet's own token accounts is not swap proceeds either.
 */
describe('assertSwapPaysWallet — the rent it allows for', () => {
  const WALLET_BONK = 'qCZEE1btHeVPFFa3kSWk8Gz9u6aTWSGwUwj4PhnEmuR';
  const WALLET_WSOL = 'HXkHFMCRQP6pw66QEGBqVsduqUQdSyrrrq82S7Rffsms';
  const WALLET_JUNK = '9Ad9sA9ReVJ6JZuNFQnVNFt3QZ4kD2tU81jpqVihQFmL';
  const JUNK_MINT = 'pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn';
  const RENT = 2_039_280n;
  const usdcToBonk: SwapRouteExpectation = {
    ...usdcToSol,
    outputMint: BONK,
    quotedOutAmount: '31564956924',
    minOutAmount: '31407132140',
    // The wallet's own BONK account: the output side of the route.
    destinations: [WALLET_BONK],
  };

  const createAta = (ata: string, mint: string, owner: string = WALLET) => ({
    programAddress: address(ASSOCIATED_TOKEN_PROGRAM),
    accounts: [
      { address: WALLET, role: 3 },
      { address: address(ata), role: 1 },
      { address: address(owner), role: 0 },
      { address: address(mint), role: 0 },
      { address: address(SYSTEM_PROGRAM), role: 0 },
      { address: address(TOKEN_PROGRAM), role: 0 },
    ],
    data: new Uint8Array([1]),
  });
  /** SPL Token CloseAccount (9): the account, its rent's destination (the wallet), its owner. */
  const closeToWallet = (ata: string) => ({
    programAddress: address(TOKEN_PROGRAM),
    accounts: [
      { address: address(ata), role: 1 },
      { address: WALLET, role: 1 },
      { address: WALLET, role: 2 },
    ],
    data: new Uint8Array([9]),
  });

  function swapOf(instructions: object[]): string {
    let message = setTransactionMessageLifetimeUsingBlockhash(
      {
        blockhash: 'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N' as Blockhash,
        lastValidBlockHeight: 1n,
      },
      setTransactionMessageFeePayer(WALLET, createTransactionMessage({ version: 0 }))
    );
    for (const instruction of instructions) {
      message = appendTransactionMessageInstruction(instruction as never, message) as never;
    }
    const messageBytes = getCompiledTransactionMessageEncoder().encode(
      compileTransactionMessage(message)
    );
    return Buffer.from(
      getTransactionEncoder().encode({
        messageBytes: messageBytes as never,
        signatures: { [WALLET]: null } as never,
      })
    ).toString('base64');
  }

  /** Only the simulation is read: what each account holds comes from its `accounts`. */
  const rpc = {} as never;

  const tokenAccount = (
    lamports: bigint,
    mint: string,
    amount = 0n,
    owner: string = WALLET
  ): AccountState => ({
    lamports,
    owner: TOKEN_PROGRAM as Address,
    token: {
      mint: mint as Address,
      owner: owner as Address,
      amount,
      delegate: null,
      delegatedAmount: 0n,
      isNative: mint === SOL,
    },
  });
  const plain = (lamports: bigint): AccountState => ({
    lamports,
    owner: SYSTEM_PROGRAM as Address,
    token: null,
  });
  const change = (account: string, before: AccountState | null, after: AccountState | null) => ({
    address: address(account),
    before,
    after,
  });

  /** A token-to-token swap that costs the wallet `lamports` besides the fee. */
  const losing = (lamports: bigint, accounts: ReturnType<typeof change>[]): TransactionEffects => ({
    ...(effects(-FEE - lamports, [
      token(USDC, -1_000_000n),
      token(BONK, 31_500_000_000n),
    ]) as Extract<TransactionEffects, { kind: 'effects' }>),
    accounts,
  });

  it('allows the rent of a token account the swap opens for its output and leaves open', async () => {
    vi.mocked(previewTransactionEffects).mockResolvedValueOnce(
      losing(RENT, [change(WALLET_BONK, null, tokenAccount(RENT, BONK))])
    );
    await expect(
      assertSwapPaysWallet(rpc, swapOf([createAta(WALLET_BONK, BONK)]), WALLET, usdcToBonk)
    ).resolves.toBeUndefined();
  });

  it('refuses SOL leaving the wallet when the account it creates already existed', async () => {
    const existing = tokenAccount(RENT, BONK, 5n);
    vi.mocked(previewTransactionEffects).mockResolvedValueOnce(
      losing(RENT, [change(WALLET_BONK, existing, existing)])
    );
    await expect(
      assertSwapPaysWallet(rpc, swapOf([createAta(WALLET_BONK, BONK)]), WALLET, usdcToBonk)
    ).rejects.toThrow(/takes SOL from the wallet/);
  });

  it('refuses SOL leaving the wallet behind an account the swap opens and closes again', async () => {
    vi.mocked(previewTransactionEffects).mockResolvedValueOnce(
      losing(2_000_000n, [change(WALLET_WSOL, null, plain(0n))])
    );
    const createAndClose = swapOf([createAta(WALLET_WSOL, SOL), closeToWallet(WALLET_WSOL)]);
    await expect(assertSwapPaysWallet(rpc, createAndClose, WALLET, usdcToBonk)).rejects.toThrow(
      /takes SOL from the wallet/
    );
  });

  // Jupiter can leave the wallet's account of an intermediate token open (a
  // SOL to USDC route through USD1, seen live): its rent stays the wallet's,
  // recoverable by closing it, so it is allowed like the output's.
  it('allows the rent an account of an intermediate token keeps for the wallet', async () => {
    vi.mocked(previewTransactionEffects).mockResolvedValueOnce(
      losing(1_488_440n, [change(WALLET_JUNK, null, tokenAccount(1_488_440n, JUNK_MINT))])
    );
    const intermediate = swapOf([createAta(WALLET_JUNK, JUNK_MINT)]);
    await expect(
      assertSwapPaysWallet(rpc, intermediate, WALLET, usdcToBonk)
    ).resolves.toBeUndefined();
  });

  // Anyone can send lamports to an address before the account exists there:
  // the wallet then pays only the rest of the rent, and that rest is allowed.
  it('allows exactly what the wallet adds to an address someone funded first', async () => {
    const prefunded = [change(WALLET_BONK, plain(1_000_000n), tokenAccount(RENT, BONK))];
    vi.mocked(previewTransactionEffects).mockResolvedValueOnce(
      losing(RENT - 1_000_000n, prefunded)
    );
    const create = swapOf([createAta(WALLET_BONK, BONK)]);
    await expect(assertSwapPaysWallet(rpc, create, WALLET, usdcToBonk)).resolves.toBeUndefined();

    vi.mocked(previewTransactionEffects).mockResolvedValueOnce(losing(RENT, prefunded));
    await expect(assertSwapPaysWallet(rpc, create, WALLET, usdcToBonk)).rejects.toThrow(
      /takes SOL from the wallet/
    );
  });

  // A classic token account's owner can be moved: a build could create the
  // wallet's account and hand it to someone else in the same transaction.
  it('allows no rent for a created account that ends owned by someone else', async () => {
    const ATTACKER = '8pM1YsWLwCoU4nNGUzgjQZ8iBfTFtfkDfsfnayrHRJrQ';
    vi.mocked(previewTransactionEffects).mockResolvedValueOnce(
      losing(RENT, [change(WALLET_BONK, null, tokenAccount(RENT, BONK, 0n, ATTACKER))])
    );
    await expect(
      assertSwapPaysWallet(rpc, swapOf([createAta(WALLET_BONK, BONK)]), WALLET, usdcToBonk)
    ).rejects.toThrow(/takes SOL from the wallet/);
  });

  // An idempotent create of a token account that already exists opens
  // nothing: SOL pushed into it is not rent.
  it('allows no rent for SOL pushed into a token account that already existed', async () => {
    const SETTLEMENT_ATA = '8ShFWr3iHxibdJuE7vEw6jk6gALRHmGvaAFrQuahP49a';
    const settlementAccount = (lamports: bigint) =>
      tokenAccount(lamports, USDC, 0n, ZEROEX_SETTLEMENT_OWNER);
    vi.mocked(previewTransactionEffects).mockResolvedValueOnce(
      losing(2_000_000n, [
        change(SETTLEMENT_ATA, settlementAccount(RENT), settlementAccount(RENT + 2_000_000n)),
      ])
    );
    const pushed = swapOf([createAta(SETTLEMENT_ATA, USDC, ZEROEX_SETTLEMENT_OWNER)]);
    await expect(assertSwapPaysWallet(rpc, pushed, WALLET, usdcToBonk)).rejects.toThrow(
      /takes SOL from the wallet/
    );
  });

  // A created wrapped-SOL account that stays open holds its rent and a
  // balance; only the rent is an allowance (the balance is a token row).
  it('allows only the rent of a created wrapped-SOL account, not its balance', async () => {
    const wrapped = 50_000n;
    const wsolAccount = tokenAccount(RENT + wrapped, SOL, wrapped);
    vi.mocked(previewTransactionEffects).mockResolvedValueOnce(
      losing(RENT + wrapped, [change(WALLET_WSOL, null, wsolAccount)])
    );
    const create = swapOf([createAta(WALLET_WSOL, SOL)]);
    await expect(assertSwapPaysWallet(rpc, create, WALLET, usdcToBonk)).rejects.toThrow(
      /takes SOL from the wallet/
    );
  });

  it('allows no rent for a created address that does not end as a token account', async () => {
    vi.mocked(previewTransactionEffects).mockResolvedValueOnce(
      losing(RENT, [change(WALLET_BONK, null, plain(RENT))])
    );
    await expect(
      assertSwapPaysWallet(rpc, swapOf([createAta(WALLET_BONK, BONK)]), WALLET, usdcToBonk)
    ).rejects.toThrow(/takes SOL from the wallet/);
  });

  // The route can close one of the wallet's own empty token accounts inside
  // its own calls: the rent that comes back is the wallet's, not swap
  // proceeds, and cannot cover SOL leaving for something else.
  it('does not count the rent of a closed wallet token account as SOL in', async () => {
    vi.mocked(previewTransactionEffects).mockResolvedValueOnce(
      losing(2_000_000n - RENT, [change(WALLET_JUNK, tokenAccount(RENT, JUNK_MINT), null)])
    );
    await expect(assertSwapPaysWallet(rpc, swapOf([]), WALLET, usdcToBonk)).rejects.toThrow(
      /takes SOL from the wallet/
    );
  });

  // A wrapped-SOL account's lamports above its rent are its balance, already
  // counted in the token row: only the rent is held back.
  // SOL to USDC paying 13,000,000: 3,000,000 already wrapped, 10,000,000
  // wrapped now; closing the wrapped-SOL account returns only its rent.
  it('holds back only the rent of a closed wrapped-SOL account, not its balance', async () => {
    const wrapped = 3_000_000n;
    const solToUsdcWithWsol: SwapRouteExpectation = { ...solToUsdc, inAmount: '13000000' };
    vi.mocked(previewTransactionEffects).mockResolvedValueOnce({
      ...(effects(-10_000_000n - FEE + RENT, [
        token(SOL, -wrapped),
        token(USDC, 1_168_000n),
      ]) as Extract<TransactionEffects, { kind: 'effects' }>),
      accounts: [change(WALLET_WSOL, tokenAccount(RENT + wrapped, SOL, wrapped), null)],
    });
    await expect(
      assertSwapPaysWallet(rpc, swapOf([]), WALLET, solToUsdcWithWsol)
    ).resolves.toBeUndefined();
  });
});

/**
 * A route that runs with the wallet's signature (0x Settler, through its own
 * calls) can set the close authority of one of the wallet's funded token
 * accounts to someone else: no balance moves, so the swap reads clean, and
 * later that someone closes the account and takes what it holds.
 */
describe("assertSwapPaysWallet — who may close the wallet's accounts", () => {
  const WALLET_WSOL = 'HXkHFMCRQP6pw66QEGBqVsduqUQdSyrrrq82S7Rffsms';
  const ATTACKER = '8pM1YsWLwCoU4nNGUzgjQZ8iBfTFtfkDfsfnayrHRJrQ' as Address;
  const funded = (closeAuthority: Address | null): AccountState => ({
    lamports: 5_002_039_280n,
    owner: TOKEN_PROGRAM as Address,
    token: {
      mint: SOL as Address,
      owner: WALLET,
      amount: 5_000_000_000n,
      delegate: null,
      delegatedAmount: 0n,
      closeAuthority,
      isNative: true,
    },
  });
  const paidSwap = (closeAuthorityAfter: Address | null): TransactionEffects => ({
    ...(effects(-FEE, [token(USDC, -1_000_000n), token(BONK, 31_500_000_000n)]) as Extract<
      TransactionEffects,
      { kind: 'effects' }
    >),
    accounts: [
      {
        address: address(WALLET_WSOL),
        before: funded(null),
        after: funded(closeAuthorityAfter),
      },
    ],
  });
  const usdcToBonk: SwapRouteExpectation = {
    ...usdcToSol,
    outputMint: BONK,
    quotedOutAmount: '31564956924',
    minOutAmount: '31407132140',
  };
  const anySwap = () => {
    const message = setTransactionMessageLifetimeUsingBlockhash(
      {
        blockhash: 'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N' as Blockhash,
        lastValidBlockHeight: 1n,
      },
      setTransactionMessageFeePayer(WALLET, createTransactionMessage({ version: 0 }))
    );
    const messageBytes = getCompiledTransactionMessageEncoder().encode(
      compileTransactionMessage(message as never)
    );
    return Buffer.from(
      getTransactionEncoder().encode({
        messageBytes: messageBytes as never,
        signatures: { [WALLET]: null } as never,
      })
    ).toString('base64');
  };

  it('refuses a swap that hands another the close authority of a funded wallet account', async () => {
    vi.mocked(previewTransactionEffects).mockResolvedValueOnce(paidSwap(ATTACKER));
    await expect(assertSwapPaysWallet({} as never, anySwap(), WALLET, usdcToBonk)).rejects.toThrow(
      /close/
    );
  });

  it('accepts the same swap when the close authority stays as it was, or is the wallet', async () => {
    vi.mocked(previewTransactionEffects).mockResolvedValueOnce(paidSwap(null));
    await expect(
      assertSwapPaysWallet({} as never, anySwap(), WALLET, usdcToBonk)
    ).resolves.toBeUndefined();
    vi.mocked(previewTransactionEffects).mockResolvedValueOnce(paidSwap(WALLET));
    await expect(
      assertSwapPaysWallet({} as never, anySwap(), WALLET, usdcToBonk)
    ).resolves.toBeUndefined();
  });
});
