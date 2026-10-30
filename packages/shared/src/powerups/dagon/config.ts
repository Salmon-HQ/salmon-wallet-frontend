/**
 * Dagon's `devnet.json`, read on the device to find this epoch's mints and
 * the executor (contracts/encrypt-executor-and-config.md §1). A copy is used
 * only when it names the pinned programs, the exact executor URL and the
 * byte layout this code reads; anything else leaves the tab unavailable,
 * with no cached or default copy standing in (spec edge cases).
 */
import { isAddress } from '@solana/kit';
import {
  CONFIG_URL,
  DAGON_DECIMALS,
  ENCRYPT_PROGRAM,
  EXECUTOR_URLS,
  FAUCET_URL,
  PC_SWAP_PROGRAM,
  PC_TOKEN_PROGRAM,
  SIDES,
  type Side,
} from './constants';

export interface DagonSideConfig {
  decimals: number;
  splMint: string;
  pcMint: string;
  vault: string;
  vaultAta: string;
}

export interface DagonConfig {
  epoch: number;
  encryptGrpcUrl: string;
  /** Non-null shows "Get test tokens" (FR-011). */
  faucetUrl: string | null;
  sides: Record<Side, DagonSideConfig>;
}

export class DagonConfigError extends Error {
  constructor() {
    super('dagon.unavailable.title');
    this.name = 'DagonConfigError';
  }
}

const LAYOUT = {
  pcAccountBalanceCtOffset: [64, 96],
  ciphertextDigestOffset: [2, 34],
  ciphertextVerifiedFlagByte: 99,
} as const;

const SIDE_ADDRESSES = ['splMint', 'pcMint', 'vault', 'vaultAta'] as const;

type Doc = Record<string, unknown>;

const isObject = (value: unknown): value is Doc =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isHttps = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};

const isExecutor = (value: unknown): value is string =>
  typeof value === 'string' && EXECUTOR_URLS.includes(value);

function sideOf(value: unknown): DagonSideConfig | null {
  if (!isObject(value) || value.decimals !== DAGON_DECIMALS) return null;
  for (const key of SIDE_ADDRESSES) {
    const address = value[key];
    if (typeof address !== 'string' || !isAddress(address)) return null;
  }
  const { splMint, pcMint, vault, vaultAta } = value as unknown as DagonSideConfig;
  return { decimals: DAGON_DECIMALS, splMint, pcMint, vault, vaultAta };
}

const sameLayout = (layout: unknown): boolean =>
  isObject(layout) &&
  (Object.keys(LAYOUT) as (keyof typeof LAYOUT)[]).every(
    (key) => JSON.stringify(layout[key]) === JSON.stringify(LAYOUT[key])
  );

/** The accepted config, or null when the document cannot be trusted. */
export function parseDagonConfig(doc: unknown): DagonConfig | null {
  if (!isObject(doc) || doc.cluster !== 'devnet') return null;
  const programs = doc.programs;
  if (
    !isObject(programs) ||
    programs.encrypt !== ENCRYPT_PROGRAM ||
    programs.pcToken !== PC_TOKEN_PROGRAM ||
    programs.pcSwap !== PC_SWAP_PROGRAM
  ) {
    return null;
  }
  if (!isExecutor(doc.encryptGrpcUrl) || !sameLayout(doc.layout)) return null;
  const remoteFaucet = doc.faucetUrl ?? null;
  if (remoteFaucet !== null && !isHttps(remoteFaucet)) return null;
  // Only the pinned faucet opens behind a wallet button; any other is ignored.
  const faucetUrl = remoteFaucet !== null && remoteFaucet === FAUCET_URL ? FAUCET_URL : null;
  if (!isObject(doc.sides) || typeof doc.epoch !== 'number') return null;
  const sides = {} as Record<Side, DagonSideConfig>;
  for (const name of SIDES) {
    const side = sideOf((doc.sides as Doc)[name]);
    if (!side) return null;
    sides[name] = side;
  }
  return { epoch: doc.epoch, encryptGrpcUrl: doc.encryptGrpcUrl, faucetUrl, sides };
}

/** Fetches and checks `devnet.json`; rejects with `DagonConfigError` on anything else. */
export async function fetchDagonConfig(fetchFn: typeof fetch = fetch): Promise<DagonConfig> {
  let doc: unknown;
  try {
    const response = await fetchFn(CONFIG_URL);
    if (!response.ok) throw new DagonConfigError();
    doc = await response.json();
  } catch {
    throw new DagonConfigError();
  }
  const config = parseDagonConfig(doc);
  if (!config) throw new DagonConfigError();
  return config;
}
