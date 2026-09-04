/**
 * The active selection: which network, and which derivation slot on it, the
 * session reads the active wallet through.
 *
 * A wallet does not hold every network. A watch-only address holds exactly one
 * (`solana-mainnet`), an imported private key holds exactly one, and a Bitcoin-
 * only import holds no Solana at all. The network id and path index, however,
 * are session-wide and persisted: they survive the wallet that was active when
 * they were chosen. So the pair the session carries and the pair the active
 * wallet can answer for are two different things, and every place that assumed
 * they were the same has produced the same failure — an active wallet with no
 * blockchain account behind it, persisted, surviving relaunch.
 *
 * This module is the one answer to "what can this wallet actually be read on":
 * it takes the pair the session would like and returns the nearest pair the
 * wallet holds, or null when it holds nothing at all. Writers call it before
 * persisting a selection; the selection hook calls it on every render and
 * heals a stored pair that no longer fits.
 *
 * Nearest, in order: the requested network; failing that the same chain the
 * request named (mainnet first, so a devnet request lands on its own chain
 * rather than jumping to another); failing that any mainnet the wallet holds;
 * failing that whatever it holds. Staying on the requested chain matters
 * because the chain is what the user was looking at — the environment is a
 * detail below it.
 *
 * @module utils/active-selection
 */

import { getBlockchainFromNetworkId } from '../config/blockchains';
import type { Account } from '../types/account';
import { isMainnetNetworkId } from './network';

/** A network plus the derivation slot on it — everything a read needs. */
export interface ActiveSlot {
  networkId: string;
  pathIndex: number;
}

/** The pair a caller would like, each half optional. */
export interface PreferredSlot {
  networkId?: string | null;
  pathIndex?: number | null;
}

/**
 * The networks the wallet holds an account on.
 *
 * "Holds" means a filled slot, not a present key: a network whose slots are all
 * null is a leftover from a derivation that produced nothing, and landing on it
 * is the same dead end as landing on a network that was never there.
 */
export function getHeldNetworkIds(account: Account | null | undefined): string[] {
  if (!account) return [];

  return Object.entries(account.networksAccounts ?? {})
    .filter(([, slots]) => slots?.some(Boolean))
    .map(([networkId]) => networkId);
}

/**
 * The slot the wallet can be read at on one network — the preferred index when
 * it is filled, otherwise the first filled one — or null when the wallet holds
 * nothing there.
 *
 * The first-filled search is `findIndex`, whose miss is `-1` and not
 * `undefined`: callers that wrote `findIndex(Boolean) ?? 0` were handed `-1`
 * for an all-null network and indexed the session off the end of the array.
 */
export function getHeldPathIndex(
  account: Account | null | undefined,
  networkId: string,
  preferredIndex?: number | null
): number | null {
  const slots = account?.networksAccounts?.[networkId];
  if (!slots) return null;

  if (preferredIndex != null && preferredIndex >= 0 && slots[preferredIndex]) {
    return preferredIndex;
  }

  const firstHeld = slots.findIndex(Boolean);
  return firstHeld === -1 ? null : firstHeld;
}

/**
 * The nearest selection the wallet can answer for (see the module note), or
 * null when it holds no account on any network — a pre-unlock placeholder,
 * whose `networksAccounts` is empty until the vault is decrypted.
 */
export function resolveActiveSlot(
  account: Account | null | undefined,
  preferred: PreferredSlot = {}
): ActiveSlot | null {
  const held = getHeldNetworkIds(account);
  if (held.length === 0) return null;

  const wanted = preferred.networkId ?? null;
  const networkId = wanted && held.includes(wanted) ? wanted : nearestNetworkId(held, wanted);

  // The path index only carries over when the network did: index 3 on Solana
  // says nothing about Bitcoin.
  const pathIndex = getHeldPathIndex(
    account,
    networkId,
    networkId === wanted ? preferred.pathIndex : null
  );

  return pathIndex === null ? null : { networkId, pathIndex };
}

/**
 * True when the pair is exactly what the wallet holds — the check the healing
 * effect makes before writing anything.
 */
export function isSlotResolved(slot: ActiveSlot | null, preferred: PreferredSlot): boolean {
  return (
    slot !== null &&
    slot.networkId === preferred.networkId &&
    slot.pathIndex === preferred.pathIndex
  );
}

/** The fallback ladder, applied when the requested network is not held. */
function nearestNetworkId(held: string[], wanted: string | null): string {
  if (wanted) {
    const chain = getBlockchainFromNetworkId(wanted);
    const sameChain = held.filter((id) => getBlockchainFromNetworkId(id) === chain);
    const nearest = sameChain.find(isMainnetNetworkId) ?? sameChain[0];
    if (nearest) return nearest;
  }

  return held.find(isMainnetNetworkId) ?? held[0];
}
