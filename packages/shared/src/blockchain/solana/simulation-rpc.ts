/**
 * RPC reads for the transaction effect preview. Nothing here broadcasts: it
 * only calls `simulateTransaction`, `getMultipleAccounts`, and reads address
 * lookup tables.
 */

import {
  getBase64Encoder,
  getCompiledTransactionMessageDecoder,
  getTransactionDecoder,
} from '@solana/kit';
import type { Address, Base64EncodedWireTransaction } from '@solana/kit';
import { getAddressLookupTableDecoder } from '@solana-program/address-lookup-table';

import type { SolanaRpc } from './networks';
import { decodeMintState, toBytes } from './simulation-decode';
import type { AccountState, MintState, RawAccount, SimulationResponse } from './simulation-types';

/** `getMultipleAccounts` refuses more than 100 addresses per call. */
const MAX_ACCOUNTS_PER_REQUEST = 100;

/** Reads accounts in chunks, because the RPC caps a request at 100 addresses. */
export async function fetchAccounts(
  rpc: SolanaRpc,
  addresses: readonly Address[]
): Promise<Map<Address, RawAccount | null>> {
  const result = new Map<Address, RawAccount | null>();
  for (let i = 0; i < addresses.length; i += MAX_ACCOUNTS_PER_REQUEST) {
    const chunk = addresses.slice(i, i + MAX_ACCOUNTS_PER_REQUEST);
    const { value } = await rpc.getMultipleAccounts(chunk, { encoding: 'base64' }).send();
    chunk.forEach((address, index) => {
      result.set(address, (value[index] as RawAccount | null) ?? null);
    });
  }
  return result;
}

/**
 * Every account key the transaction will load.
 *
 * Static keys come straight out of the compiled message; the rest are resolved
 * by reading the address lookup tables the message points at. Read-only
 * accounts are deliberately NOT filtered out: the saving is not worth the risk
 * of a bad index calculation silently dropping the user's own token account and
 * turning a real balance change into a confident "nothing happens".
 *
 * @returns The account keys, or `null` when a lookup table could not be read.
 */
export async function resolveAccountKeys(
  rpc: SolanaRpc,
  wireTransaction: Base64EncodedWireTransaction
): Promise<readonly Address[] | null> {
  const bytes = new Uint8Array(getBase64Encoder().encode(wireTransaction));
  const { messageBytes } = getTransactionDecoder().decode(bytes);
  const message = getCompiledTransactionMessageDecoder().decode(messageBytes);

  const lookups = 'addressTableLookups' in message ? (message.addressTableLookups ?? []) : [];
  if (lookups.length === 0) {
    return message.staticAccounts;
  }

  const tables = await fetchAccounts(
    rpc,
    lookups.map((lookup) => lookup.lookupTableAddress)
  );

  const loaded: Address[] = [];
  for (const lookup of lookups) {
    const account = tables.get(lookup.lookupTableAddress);
    if (!account) {
      return null;
    }
    const table = getAddressLookupTableDecoder().decode(toBytes(account.data));
    for (const index of [...lookup.writableIndexes, ...lookup.readonlyIndexes]) {
      const address = table.addresses[index];
      if (!address) {
        return null;
      }
      loaded.push(address);
    }
  }
  return [...message.staticAccounts, ...loaded];
}

/**
 * Asks the node to run the transaction and hand back the post-execution state
 * of every account it loads.
 *
 * `sigVerify: false` with `replaceRecentBlockhash: true` is what allows an
 * unsigned transaction to be previewed; the two options are mutually exclusive
 * at the RPC, and signature verification is the one worth giving up, since a
 * preview happens before there is a signature to verify.
 */
export async function simulate(
  rpc: SolanaRpc,
  wireTransaction: Base64EncodedWireTransaction,
  addresses: readonly Address[]
): Promise<SimulationResponse> {
  const { value } = await rpc
    .simulateTransaction(wireTransaction, {
      accounts: { addresses, encoding: 'base64' },
      encoding: 'base64',
      replaceRecentBlockhash: true,
      sigVerify: false,
    })
    .send();
  return value as unknown as SimulationResponse;
}

/**
 * Reads the mints behind the previewed token accounts, for decimals and supply.
 *
 * A mint is only present in the transaction's own account list for the
 * `*Checked` instructions, so it is fetched separately when missing.
 */
export async function fetchMints(
  rpc: SolanaRpc,
  states: readonly ReadonlyMap<Address, AccountState | null>[],
  raw: readonly ReadonlyMap<Address, RawAccount | null>[]
): Promise<Map<Address, MintState>> {
  const wanted = new Set<Address>();
  for (const snapshot of states) {
    for (const state of snapshot.values()) {
      if (state?.token) {
        wanted.add(state.token.mint);
      }
    }
  }

  const mints = new Map<Address, MintState>();
  for (const snapshot of raw) {
    for (const [address, account] of snapshot) {
      if (!wanted.has(address)) continue;
      const mint = decodeMintState(account);
      if (mint) {
        mints.set(address, mint);
        wanted.delete(address);
      }
    }
  }

  if (wanted.size > 0) {
    const fetched = await fetchAccounts(rpc, [...wanted]);
    for (const [address, account] of fetched) {
      const mint = decodeMintState(account);
      if (mint) {
        mints.set(address, mint);
      }
    }
  }
  return mints;
}
