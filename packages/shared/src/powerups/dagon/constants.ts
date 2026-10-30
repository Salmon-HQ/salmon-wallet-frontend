/**
 * Dagon's pinned facts and the knobs of this devnet preview (spec 043).
 * The program ids and the executor host are pinned here, not read from
 * `devnet.json`: a changed remote file must not redirect what the device
 * trusts or where it sends a read authorization (research R8).
 */
export const DAGON_ID = 'dagon';

export const ENCRYPT_PROGRAM = '4ebfzWdKnrnGseuQpezXdG8yCdHqwQ1SSBHD3bWArND8';
export const PC_TOKEN_PROGRAM = '3kjJEx6G1XdrtixFg9f8eGRAyzW5QmhsJQq6qCUZYhXZ';
export const PC_SWAP_PROGRAM = 'BqJMtWQYiis1264KqBN3wssNqTofK5RuP67hkZYvb4SD';

export const CONFIG_URL =
  'https://raw.githubusercontent.com/inkwell-finance/pc-wallet-kit/main/devnet.json';
export const EXECUTOR_HOST = 'pre-alpha-dev-1.encrypt.ika-network.net';
/**
 * The only `encryptGrpcUrl` values accepted, as exact strings: a URL parser
 * is not trusted to agree on the host (React Native's polyfill reads
 * `https://evil.example/@<host>` as `<host>`).
 */
export const EXECUTOR_URLS: readonly string[] = [
  `https://${EXECUTOR_HOST}`,
  `https://${EXECUTOR_HOST}:443`,
];
/**
 * The one faucet a remote `devnet.json` may point "Get test tokens" at. None
 * is published (Dagon funds wallets on request), so the action stays hidden
 * until a host is pinned here.
 */
export const FAUCET_URL: string | null = null;

/** The mock tokens, in the order the tab shows them. */
export const SIDES = ['USDC', 'DOGE'] as const;
export type Side = (typeof SIDES)[number];

/** Mock tokens carry 2 decimals (FR-012). */
export const DAGON_DECIMALS = 2;

export type DagonAction =
  'setup' | 'wrap' | 'reveal' | 'send' | 'swap' | 'unwrapBurn' | 'unwrapDecrypt' | 'unwrapComplete';

/** How many co-signers core generates per action; the backend's own map (FR-051). */
export const FRESH_SIGNERS: Readonly<Record<DagonAction, number>> = {
  setup: 1,
  wrap: 1,
  reveal: 1,
  send: 0,
  swap: 1,
  unwrapBurn: 1,
  unwrapDecrypt: 1,
  unwrapComplete: 0,
};

/** "Outcome unknown" after this long without settlement (FR-027). */
export const SETTLE_CAP_MS = 90_000;
/** The withdraw decryption waits on Encrypt for longer (FR-027). */
export const DECRYPT_CAP_MS = 180_000;
/** One batched chain read per tick while the tab is mounted (O1). */
export const POLL_MS = 1_500;

/** Build-time switches (Q4): Send waits on Dagon verifying transfer, Withdraw can strand funds. */
export const SEND_ENABLED = false;
export const WITHDRAW_ENABLED = false;

/** Minimum out = amount in × this, at the toy pool's 1:1 indicative price (O5). */
export const SWAP_MIN_OUT_RATIO_BPS = 9_900n;
/** Below this much devnet SOL an action is refused before the build (O6). */
export const SOL_FLOOR_LAMPORTS = 10_000_000n;
/** Finished items kept per account and network (O13). */
export const MAX_OPERATIONS = 10;

/** Solana's base fee per signature, for the confirmation's fee row (R10). */
export const LAMPORTS_PER_SIGNATURE = 5_000n;
