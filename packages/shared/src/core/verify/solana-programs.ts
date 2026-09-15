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
