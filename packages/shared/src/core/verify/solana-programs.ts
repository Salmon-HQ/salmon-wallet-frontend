/**
 * The Solana programs a backend-built transaction may invoke, by flow.
 *
 * Each list is what the backend's own builders can produce for that flow, read
 * from `salmon-wallet-backend` rather than assumed: the NFT services build with
 * Metaplex Umi (`mplTokenMetadata`, `mplBubblegum`), close token accounts
 * through the SPL Token program, and create accounts through the System
 * program. Every address below was confirmed executable on mainnet.
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

/** Associated Token Account — creating the destination's account on transfer. */
export const ASSOCIATED_TOKEN_PROGRAM = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';

/** System program — account creation and rent. */
export const SYSTEM_PROGRAM = '11111111111111111111111111111111';

/** Compute Budget — a unit limit or price the builder attaches. */
export const COMPUTE_BUDGET_PROGRAM = 'ComputeBudget111111111111111111111111111111';

/** Address Lookup Table — the create and extend steps of a multi-step flow. */
export const ADDRESS_LOOKUP_TABLE_PROGRAM = 'AddressLookupTab1e1111111111111111111111111';

/** SPL Memo — a note carried on chain, and nothing else. */
export const MEMO_PROGRAM = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';

/**
 * What an NFT transfer or burn may invoke.
 *
 * Wider than any single asset would use, because one list covers every variant
 * the wallet can hold: a regular NFT burns through Token Metadata and closes
 * its account through SPL Token, a compressed one goes through Bubblegum, and a
 * transfer may have to create the destination's associated account first.
 */
export const NFT_TRANSACTION_PROGRAMS = [
  TOKEN_METADATA_PROGRAM,
  BUBBLEGUM_PROGRAM,
  TOKEN_PROGRAM,
  TOKEN_2022_PROGRAM,
  ASSOCIATED_TOKEN_PROGRAM,
  SYSTEM_PROGRAM,
  COMPUTE_BUDGET_PROGRAM,
] as const;

/**
 * Which instructions of the value-moving programs an NFT flow may carry.
 *
 * The program list is a vocabulary, not a sentence. On its own it admits an
 * SPL Token `Approve` that hands a delegate every token in the wallet, or a
 * System `Transfer` that empties the SOL balance — both programs are on the
 * list for closing and creating accounts. Neither would show on the
 * confirmation screen, which is drawn from the response's own fields.
 *
 * The codes below are what `salmon-wallet-backend` builds for these flows:
 * every move of the asset goes through Token Metadata's `transferV1` or
 * Bubblegum, never a top-level SPL Token transfer, and the only SPL Token
 * instruction any burn emits is the `CloseAccount` that reclaims the rent.
 * Nothing in those services emits a top-level System instruction at all; the
 * System codes here are the harmless half of the program, kept so a builder
 * that creates an account still works.
 *
 * Programs absent from this map — Token Metadata, Bubblegum, the Associated
 * Token program, Compute Budget — are bound by the program list alone.
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
  // System program, u32 codes. Allowed: CreateAccount(0), Assign(1),
  // CreateAccountWithSeed(3), Allocate(8), AllocateWithSeed(9),
  // AssignWithSeed(10). Refused: Transfer(2), WithdrawNonceAccount(5) and
  // TransferWithSeed(11) — the three that move lamports to an account the flow
  // never named.
  [SYSTEM_PROGRAM]: { width: 4, codes: [0, 1, 3, 8, 9, 10] },
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
  /** Token Metadata `burnV1` / `transferV1`: code, then the `V1` variant byte. */
  tokenMetadata: {
    burnCode: 41,
    transferCode: 49,
    variantV1: 0,
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
 * extend it, then do the work. The first two touch nothing but the table.
 */
export const LOOKUP_TABLE_STEP_PROGRAMS = [
  ADDRESS_LOOKUP_TABLE_PROGRAM,
  SYSTEM_PROGRAM,
  COMPUTE_BUDGET_PROGRAM,
] as const;

/** The same bound for the table steps, which build a table and nothing else. */
export const LOOKUP_TABLE_STEP_INSTRUCTIONS = {
  [SYSTEM_PROGRAM]: { width: 4, codes: [0, 1, 3, 8, 9, 10] },
} as const;
