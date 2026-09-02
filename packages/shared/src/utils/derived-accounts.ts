/**
 * Shared derived-account scanning utilities.
 *
 * Encapsulates constants, types, and BIP-44 gap scanning logic used by both
 * the mobile app and the browser extension when importing additional accounts
 * from a seed phrase. UI rendering and navigation remain platform-specific.
 *
 * @module utils/derived-accounts
 */

import { deriveBlockchainAccount } from '../factories/account-factory';
import type { BlockchainAccount } from '../types/blockchain';
import { SolanaAccount } from '../blockchain/solana';
import { BitcoinAccount } from '../blockchain/bitcoin';
import { EthereumAccount } from '../blockchain/ethereum';
import { LAMPORTS_PER_SOL } from './balance';
import { SATOSHIS_PER_BTC, WEI_PER_ETH_BIGINT } from './decimals';
import { getEnabledNetworkIds } from '../api/services/network';
import { MIRROR_NETWORK_IDS, getMainnetSibling } from './network';
import { getAccountMnemonic } from './account-secret';
import { NETWORK_DISPLAY } from './networkDisplay';
import type { Account } from '../types/account';
import { fetchAndMergeNetworkConfigs } from '../hooks/useAvailableNetworks';

// ============================================================================
// Constants
// ============================================================================

/**
 * BIP-44 standard gap limit for address discovery.
 * Stop scanning a network after finding this many consecutive empty accounts.
 * See: https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki#address-gap-limit
 */
export const GAP_LIMIT = 20;

/**
 * Mainnet networks to scan and create accounts for.
 * Backend catalog decides which of these candidates are actually enabled.
 */
const SCAN_NETWORK_CANDIDATES: readonly string[] = [
  'solana-mainnet',
  'bitcoin-mainnet',
  'ethereum-mainnet',
] as const;

export { NETWORK_DISPLAY } from './networkDisplay';
export type { NetworkDisplayInfo } from './networkDisplay';

// ============================================================================
// Types
// ============================================================================

/**
 * All data the UI needs to render and track a single derived account row.
 */
export interface DerivedAccountInfo {
  /** Live blockchain account instance, retained so it can be passed to editAccount. */
  account: BlockchainAccount;
  /** Full on-chain receive address. */
  address: string;
  /** BIP-44 derivation path string. */
  path: string;
  /** Derivation index (1-based). */
  index: number;
  /** Network this account belongs to, e.g. "solana-mainnet". */
  networkId: string;
  /** Human-readable network label from NETWORK_DISPLAY. */
  networkName: string;
  /** Native balance in human-readable units (SOL / BTC / ETH). */
  balance: number;
  /** Pre-formatted balance string including symbol, e.g. "0.0500 SOL". */
  balanceFormatted: string;
  /** Ticker symbol for the native token. */
  currencySymbol: string;
  /** Whether the checkbox for this account is checked in the UI. */
  selected: boolean;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Fetches the native balance for a blockchain account.
 *
 * Returns a human-readable number in SOL / BTC / ETH.
 * Returns 0 on any RPC failure so scanning is never interrupted by transient errors.
 *
 * @param account  - Live blockchain account instance.
 * @param networkId - Network ID used to look up blockchain family.
 */
export async function getAccountBalance(
  account: BlockchainAccount,
  networkId: string
): Promise<number> {
  const info = NETWORK_DISPLAY[networkId];
  if (!info) return 0;

  try {
    if (info.blockchain === 'solana') {
      const lamports = await (account as SolanaAccount).getCredit();
      return lamports / LAMPORTS_PER_SOL;
    }
    if (info.blockchain === 'bitcoin') {
      const satoshis = await (account as BitcoinAccount).getCredit();
      return satoshis / SATOSHIS_PER_BTC;
    }
    if (info.blockchain === 'ethereum') {
      const wei = await (account as EthereumAccount).getCredit();
      return Number(wei) / Number(WEI_PER_ETH_BIGINT);
    }
  } catch {
    // RPC error — return 0 so scanning continues
  }

  return 0;
}

/**
 * Formats a native balance number for display in the derived-accounts UI.
 *
 * - Zero balances display as "0 <SYMBOL>".
 * - Amounts below 0.0001 display as "<0.0001 <SYMBOL>".
 * - Everything else is shown to 4 decimal places.
 *
 * NOTE: This is intentionally a distinct function from the general-purpose
 * `formatBalance` in utils/formatting, which accepts decimals rather than a
 * symbol string.
 *
 * @param balance - Human-readable balance amount.
 * @param symbol  - Ticker symbol to append.
 */
export function formatDerivedAccountBalance(balance: number, symbol: string): string {
  if (balance === 0) return `0 ${symbol}`;
  if (balance < 0.0001) return `<0.0001 ${symbol}`;
  return `${balance.toFixed(4)} ${symbol}`;
}

/**
 * Returns the mirror network ID for a given network, or undefined if none exists.
 *
 * Mirror networks share keypairs with their mainnet counterpart (e.g. solana-devnet
 * mirrors solana-mainnet). When importing a mainnet account the mirror is auto-created.
 *
 * @param networkId - Source network ID.
 */
export async function getScanNetworks(): Promise<string[]> {
  await fetchAndMergeNetworkConfigs();
  const enabledNetworkIds = new Set(await getEnabledNetworkIds());

  return SCAN_NETWORK_CANDIDATES.filter((networkId) => enabledNetworkIds.has(networkId));
}

export async function getMirrorNetworks(): Promise<Record<string, string>> {
  await fetchAndMergeNetworkConfigs();
  const enabledNetworkIds = new Set(await getEnabledNetworkIds());

  return Object.fromEntries(
    Object.entries(MIRROR_NETWORK_IDS).filter(
      ([source, target]) => enabledNetworkIds.has(source) && enabledNetworkIds.has(target)
    )
  );
}

export async function getMirrorNetworkId(networkId: string): Promise<string | undefined> {
  const mirrors = await getMirrorNetworks();
  return mirrors[networkId];
}

/**
 * Every network a freshly created wallet should hold: the mainnets the scan
 * covers plus each of their mirrors.
 *
 * Onboarding has always derived both halves so a later flip of the developer
 * flag finds the addresses already there; this is that same list, named once
 * so the add-account panel and the derived-account import cannot drift from
 * it.
 */
export async function getScanNetworksWithMirrors(): Promise<string[]> {
  const [scanNetworks, mirrors] = await Promise.all([getScanNetworks(), getMirrorNetworks()]);
  return [...scanNetworks, ...scanNetworks.map((id) => mirrors[id]).filter(Boolean)];
}

/**
 * Derives the mirror accounts an existing wallet is missing.
 *
 * Wallets created before mirrors were derived at creation hold only the
 * mainnet half, so the first time a mirror network is offered to them the
 * addresses have to be produced from the seed already in memory. Each mirror
 * lands at the same position as the mainnet sibling it copies — position is
 * the derivation index everywhere in this codebase, so a wallet derived at
 * index 3 keeps index 3 on its devnet page, holes and all.
 *
 * The mnemonic is read from the unlocked account and never logged, persisted
 * or sent anywhere; the caller persists the returned accounts through
 * `editAccount({ newDerivedAccounts })`.
 *
 * @param account    - The wallet to complete; must be unlocked.
 * @param networkIds - Mirror networks to ensure. Ids that are not mirrors, or
 *                     whose mainnet sibling the wallet does not hold, are skipped.
 * @returns The newly derived accounts, empty when there is nothing to do.
 */
export async function ensureMirrorNetworks(
  account: Account,
  networkIds: string[]
): Promise<BlockchainAccount[]> {
  const mnemonic = getAccountMnemonic(account);
  // A watch-only or private-key wallet has no derivation tree to complete.
  if (!mnemonic) return [];

  const derived: BlockchainAccount[] = [];

  for (const networkId of networkIds) {
    const existing = account.networksAccounts[networkId];
    if (existing?.some(Boolean)) continue;

    const mainnetId = getMainnetSibling(networkId);
    if (!mainnetId) continue;

    const siblings = account.networksAccounts[mainnetId];
    if (!siblings) continue;

    for (let index = 0; index < siblings.length; index++) {
      if (!siblings[index]) continue;
      derived.push(await deriveBlockchainAccount(mnemonic, networkId, index));
    }
  }

  return derived;
}

// ============================================================================
// Core scanning
// ============================================================================

/**
 * Result of a {@link scanDerivedAccounts} run.
 *
 * `failedNetworks` distinguishes "no accounts found" from "the scan could not
 * look" — a total RPC outage must not silently present as an empty wallet.
 */
export interface ScanDerivedAccountsResult {
  /** Discovered accounts, sorted by network then index. */
  accounts: DerivedAccountInfo[];
  /** Network IDs where at least one derivation/balance lookup threw. */
  failedNetworks: string[];
}

/**
 * BIP-44 gap scanning across a list of networks.
 *
 * For each network the scan:
 *  1. Derives account at index 1, always includes it.
 *  2. Derives subsequent indexes; stops after GAP_LIMIT consecutive empty accounts.
 *  3. Includes any funded account regardless of index.
 *
 * The balance lookup is provided as a callback so platform code can inject
 * different service implementations (e.g. the extension's fetchAndMergeNetworkConfigs
 * pre-warm before calling this). The default `getAccountBalance` works for both
 * platforms and is used unless callers supply their own.
 *
 * Network scanning runs in parallel; index scanning within each network is
 * sequential (as required by BIP-44 gap semantics).
 *
 * @param mnemonic         - BIP-39 mnemonic phrase.
 * @param networkIds       - Networks to scan (already filtered to backend-enabled
 *                           networks via `getScanNetworks()`).
 * @param getBalance       - Callback: resolves to human-readable native balance.
 *                           Defaults to `getAccountBalance`.
 * @param isCancelled      - Optional callback checked before each index derivation.
 *                           Return true to abort early (e.g. on component unmount).
 * @returns Accounts sorted by network then index, plus the networks whose scan
 *          threw (see {@link ScanDerivedAccountsResult}).
 */
export async function scanDerivedAccounts(
  mnemonic: string,
  networkIds: string[],
  getBalance: (
    account: BlockchainAccount,
    networkId: string
  ) => Promise<number> = getAccountBalance,
  isCancelled?: () => boolean
): Promise<ScanDerivedAccountsResult> {
  const failedNetworkSet = new Set<string>();
  const allResults = await Promise.all(
    networkIds.map(async (networkId) => {
      const networkAccounts: DerivedAccountInfo[] = [];
      const info = NETWORK_DISPLAY[networkId] ?? {
        symbol: '?',
        name: networkId,
        blockchain: 'unknown' as const,
      };
      let consecutiveEmpty = 0;
      let index = 1;

      while (consecutiveEmpty < GAP_LIMIT) {
        if (isCancelled?.()) return networkAccounts;

        // Yield to the UI thread so the loading state is rendered while scanning
        await new Promise<void>((resolve) => setTimeout(resolve, 1));

        try {
          const account = await deriveBlockchainAccount(mnemonic, networkId, index);
          const address = account.getReceiveAddress();
          const balance = await getBalance(account, networkId);

          const isFirstIndex = index === 1;
          const hasFunds = balance > 0;

          if (hasFunds) {
            consecutiveEmpty = 0;
          } else {
            consecutiveEmpty++;
          }

          // Always include index 1; only include higher indexes when funded
          if (isFirstIndex || hasFunds) {
            networkAccounts.push({
              account,
              address,
              path: account.path,
              index,
              networkId,
              networkName: info.name,
              balance,
              balanceFormatted: formatDerivedAccountBalance(balance, info.symbol),
              currencySymbol: info.symbol,
              selected: hasFunds || isFirstIndex,
            });
          }
        } catch (error) {
          console.warn(`Error deriving ${networkId} index ${index}:`, error);
          failedNetworkSet.add(networkId);
          consecutiveEmpty++;
        }

        index++;
      }

      return networkAccounts;
    })
  );

  return { accounts: allResults.flat(), failedNetworks: [...failedNetworkSet] };
}
