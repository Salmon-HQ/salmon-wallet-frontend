/**
 * The Solana programs a backend-built transaction may invoke, by flow.
 *
 * Each list is what the backend's own builders can produce for that flow, read
 * from `salmon-wallet-backend` rather than assumed: the NFT services build with
 * Metaplex Umi (`mplTokenMetadata`, `mplBubblegum`) and close token accounts
 * through the SPL Token program. Every address below was confirmed executable
 * on mainnet.
 *
 * These constrain the transaction's OWN instructions. A program reached by
 * cross-program invocation — Token Metadata calling the auth-rules program for
 * a programmable NFT, Bubblegum calling account compression — never appears as
 * an instruction's program, so it is neither listed nor checked. That is the
 * right boundary: what the wallet can see before signing is what the
 * transaction says it will call, and a program's own internal calls are that
 * program's business.
 */

/** Metaplex Token Metadata — `transferV1`, `burnV1`. */
export const TOKEN_METADATA_PROGRAM = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s';

/** Metaplex Bubblegum — compressed NFTs. */
export const BUBBLEGUM_PROGRAM = 'BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY';

/** SPL Token — closing the emptied token account after a burn. */
export const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

/** SPL Token-2022, for mints that use it. */
export const TOKEN_2022_PROGRAM = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';

/** Associated Token Account — creating the wallet's token accounts in a swap. */
export const ASSOCIATED_TOKEN_PROGRAM = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';

/** System program — wrapping SOL in a swap; no NFT flow invokes it. */
export const SYSTEM_PROGRAM = '11111111111111111111111111111111';

/** The wrapped-SOL mint: SOL as an SPL token, the mint a swap wraps SOL into. */
export const WRAPPED_SOL_MINT = 'So11111111111111111111111111111111111111112';

/** Compute Budget — a unit limit or price the builder attaches. */
export const COMPUTE_BUDGET_PROGRAM = 'ComputeBudget111111111111111111111111111111';

/** Address Lookup Table — the create and extend steps of a multi-step flow. */
export const ADDRESS_LOOKUP_TABLE_PROGRAM = 'AddressLookupTab1e1111111111111111111111111';

/** SPL Memo — a note carried on chain, and nothing else. */
export const MEMO_PROGRAM = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';

/** Jupiter's aggregator (Swap API v2 Router path): the one program a Jupiter-routed swap invokes at top level. */
export const JUPITER_AGGREGATOR_PROGRAM = 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4';

/** 0x's Solana settler: the one program a 0x-routed swap invokes at top level (probed 2026-09-30). */
export const ZEROEX_SETTLER_PROGRAM = 'Sett1erwx2eqT5A8uvu8GBxDFT2W5TNnhirL7hLmb8m';

/**
 * The Compute Budget instructions any backend-built flow may carry:
 * `SetComputeUnitLimit` (2) and `SetComputeUnitPrice` (3), u8 codes. The
 * backend's builder attaches exactly these two; a heap frame or a loaded-data
 * limit is no build's business. What the pair may cost together is capped by
 * the verifier (`MAX_PRIORITY_FEE_LAMPORTS`).
 */
export const COMPUTE_BUDGET_INSTRUCTIONS = { width: 1, codes: [2, 3] } as const;

/**
 * What an NFT transfer or burn may invoke.
 *
 * Wider than any single asset would use, because one list covers every variant
 * the wallet can hold: a regular NFT burns through Token Metadata and closes
 * its account through SPL Token, and a compressed one goes through Bubblegum.
 *
 * The System program is left out: none of the backend's NFT builders emits a
 * top-level System instruction, and those instructions are the ones the wallet
 * can sign alone to move its SOL or change who controls an account —
 * `CreateAccountWithSeed` with the wallet as base funds an account another
 * program controls, `Assign` hands the wallet itself to another program.
 * Accounts a Metaplex program needs — the destination's token account in a
 * transfer among them — are created inside that program, by cross-program
 * call, so the Associated Token program is left out for the same reason.
 */
export const NFT_TRANSACTION_PROGRAMS = [
  TOKEN_METADATA_PROGRAM,
  BUBBLEGUM_PROGRAM,
  TOKEN_PROGRAM,
  TOKEN_2022_PROGRAM,
  COMPUTE_BUDGET_PROGRAM,
] as const;

/**
 * Which instructions of the value-moving programs an NFT flow may carry.
 *
 * The program list is a vocabulary, not a sentence. On its own it admits an
 * SPL Token `Approve` that hands a delegate every token in the wallet — the
 * program is on the list for burning and closing accounts. It would not show on
 * the confirmation screen, which is drawn from the response's own fields.
 *
 * The codes below are what `salmon-wallet-backend` builds for these flows:
 * every move of the asset goes through Token Metadata's `transferV1` or
 * Bubblegum, never a top-level SPL Token transfer, and the only SPL Token
 * instructions any burn emits are the `Burn` and the `CloseAccount` that
 * reclaims the rent.
 *
 * Token Metadata and Bubblegum are absent from this map: `assertNftAction`
 * holds each of their instructions to the NFT on screen.
 */
export const NFT_TRANSACTION_INSTRUCTIONS = {
  // SPL Token, u8 codes. Allowed: InitializeAccount(1), Revoke(5), Burn(8),
  // CloseAccount(9), BurnChecked(15), InitializeAccount2(16), SyncNative(17),
  // InitializeAccount3(18). Refused, and the reason this list exists:
  // Transfer(3) and TransferChecked(12) move any balance the wallet holds,
  // Approve(4) and ApproveChecked(13) grant a delegate over it, SetAuthority(6)
  // hands the account away, MintTo(7) and FreezeAccount(10) are not this
  // wallet's to sign.
  [TOKEN_PROGRAM]: { width: 1, codes: [1, 5, 8, 9, 15, 16, 17, 18] },
  [TOKEN_2022_PROGRAM]: { width: 1, codes: [1, 5, 8, 9, 15, 16, 17, 18] },
  [COMPUTE_BUDGET_PROGRAM]: COMPUTE_BUDGET_INSTRUCTIONS,
} as const;

/**
 * Where an NFT flow's asset-touching instructions keep the asset and its new
 * owner, so the verifier can hold every one of them to the NFT on screen.
 *
 * The program list says which programs may run; this says which of their
 * instructions may, and which account in each is the asset. Without it a
 * transaction could name the NFT on screen and, in a second instruction, burn
 * or move a different one. Layouts are the Metaplex SDKs' (`mpl-bubblegum`,
 * `mpl-token-metadata`), the ones `salmon-wallet-backend` builds with.
 */
export const NFT_ACTION_LAYOUTS = {
  /** Bubblegum, by 8-byte Anchor discriminator (hex). The asset is derived. */
  bubblegum: {
    burn: ['746e1d386bdb2a5d', '73d222f0e88fb710'] as readonly string[], // burn, burnV2
    /** transfer, transferV2 → index of `newLeafOwner`. */
    transferNewOwnerIndex: { a334c8e78c0345ba: 3, '772806ebeaddf831': 5 } as Record<string, number>,
  },
  /** Token Metadata `burnV1` / `transferV1`: code, the `V1` variant byte, then the amount as u64. */
  tokenMetadata: {
    burnCode: 41,
    transferCode: 49,
    variantV1: 0,
    amountOffset: 2,
    mintIndex: 4,
    transferDestinationOwnerIndex: 3,
  },
  /** SPL Token `Burn` / `BurnChecked` name the mint second; `CloseAccount` its rent's destination. */
  splToken: { burnCodes: [8, 15], burnMintIndex: 1, closeCode: 9, closeDestinationIndex: 1 },
} as const;

/**
 * What the lookup-table steps of a multi-step flow may invoke.
 *
 * A compressed-NFT burn can arrive as three transactions: create a table,
 * extend it, then do the work. The first two touch nothing but the table, and
 * the table program pays the table's rent itself, by cross-program call — so
 * the System program is not on this list either.
 */
export const LOOKUP_TABLE_STEP_PROGRAMS = [
  ADDRESS_LOOKUP_TABLE_PROGRAM,
  COMPUTE_BUDGET_PROGRAM,
] as const;

/**
 * The table steps build a table and nothing else: `CreateLookupTable` (0) and
 * `ExtendLookupTable` (2), u32 codes. `CloseLookupTable` would send a table's
 * rent wherever the transaction says, and `Freeze` / `Deactivate` are not a
 * build step. Both hold the authority (1) and the payer (2) to the wallet: the
 * authority is who may later close the table and take its rent, and the payer
 * is whose SOL funds it.
 */
export const LOOKUP_TABLE_STEP_INSTRUCTIONS = {
  [ADDRESS_LOOKUP_TABLE_PROGRAM]: {
    width: 4,
    codes: [0, 2],
    binds: [
      { code: 0, index: 1, mustBe: 'feePayer' },
      { code: 0, index: 2, mustBe: 'feePayer' },
      { code: 2, index: 1, mustBe: 'feePayer' },
      { code: 2, index: 2, mustBe: 'feePayer' },
    ],
  },
  [COMPUTE_BUDGET_PROGRAM]: COMPUTE_BUDGET_INSTRUCTIONS,
} as const;
