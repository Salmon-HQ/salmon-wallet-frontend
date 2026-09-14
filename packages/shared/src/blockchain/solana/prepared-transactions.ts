import { address } from '@solana/kit';
import type { Address, Commitment } from '@solana/kit';
import { fetchMaybeAddressLookupTable } from '@solana-program/address-lookup-table';
import { signAndSendSolanaTransaction } from '../../core/broadcast/solana';
import { LOOKUP_TABLE_STEP_PROGRAMS, NFT_TRANSACTION_PROGRAMS } from '../../core/verify';
import type { SolanaTransactionExpectation } from '../../core/verify';
import type { PreparedNftTransaction, PreparedNftTransactionResponse } from '../../types/nft';
import type { SolanaAccount } from './SolanaAccount';
import type { SolanaRpc } from './networks';

export interface SignAndSendPreparedSolanaTransactionsOptions {
  commitment?: Commitment;
  /**
   * Accounts the flow's own transaction must name — the mint it acts on, the
   * destination the user typed. The lookup-table steps never name them, so the
   * requirement is applied to the work step alone.
   */
  mustName?: readonly string[];
}

/** A step that only builds the table the work step will read. */
function isLookupTableStep(step: PreparedNftTransaction['step']): boolean {
  return step === 'lookup_table_create' || step === 'lookup_table_extend';
}

/**
 * What each step of a prepared flow may do.
 *
 * The table steps touch the lookup-table program and nothing else; the work
 * step is an NFT transfer or burn, and it is the one that has to name the mint
 * and the destination.
 */
function expectationForStep(
  preparedTransaction: PreparedNftTransaction,
  feePayer: string,
  mustName: readonly string[]
): SolanaTransactionExpectation {
  if (isLookupTableStep(preparedTransaction.step)) {
    return { feePayer, allowedPrograms: LOOKUP_TABLE_STEP_PROGRAMS };
  }

  return { feePayer, allowedPrograms: NFT_TRANSACTION_PROGRAMS, requiredAccounts: mustName };
}

const LOOKUP_TABLE_POLL_INTERVAL_MS = 400;
const LOOKUP_TABLE_TIMEOUT_MS = 20_000;

interface LookupTableReadiness {
  ready: boolean;
  waitingForWarmup: boolean;
  lastExtendedSlot: number | null;
}

async function getLookupTableReadiness(
  rpc: SolanaRpc,
  tableAddress: Address,
  expectedAddressCount: number | undefined,
  commitment: Commitment,
  currentSlotOverride?: number
): Promise<LookupTableReadiness> {
  // fetchMaybe, not fetch: the non-Maybe variant throws when the table does not
  // exist yet, and "not created yet" has to stay a poll-again result.
  const table = await fetchMaybeAddressLookupTable(rpc, tableAddress, { commitment });

  if (!table.exists) {
    return {
      ready: false,
      waitingForWarmup: false,
      lastExtendedSlot: null,
    };
  }

  const currentAddressCount = table.data.addresses.length;
  const lastExtendedSlot = Number(table.data.lastExtendedSlot);

  if (expectedAddressCount !== undefined && currentAddressCount < expectedAddressCount) {
    return {
      ready: false,
      waitingForWarmup: false,
      lastExtendedSlot,
    };
  }

  if (expectedAddressCount === undefined || expectedAddressCount === 0) {
    return {
      ready: true,
      waitingForWarmup: false,
      lastExtendedSlot,
    };
  }

  const currentSlot = currentSlotOverride ?? Number(await rpc.getSlot({ commitment }).send());
  const waitingForWarmup = currentSlot <= lastExtendedSlot;

  return {
    ready: !waitingForWarmup,
    waitingForWarmup,
    lastExtendedSlot,
  };
}

async function waitForLookupTableStateByPolling(
  rpc: SolanaRpc,
  tableAddress: Address,
  expectedAddressCount: number | undefined,
  commitment: Commitment
): Promise<void> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < LOOKUP_TABLE_TIMEOUT_MS) {
    const readiness = await getLookupTableReadiness(
      rpc,
      tableAddress,
      expectedAddressCount,
      commitment
    );

    if (readiness.ready) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, LOOKUP_TABLE_POLL_INTERVAL_MS));
  }

  throw new Error(
    `Lookup table ${tableAddress} was not ready with ${expectedAddressCount ?? 0} addresses in time`
  );
}

async function waitForLookupTableState(
  account: SolanaAccount,
  lookupTableAddress: string,
  expectedAddressCount: number | undefined,
  commitment: Commitment
): Promise<void> {
  await waitForLookupTableStateByPolling(
    account.getRpc(),
    address(lookupTableAddress),
    expectedAddressCount,
    commitment
  );
}

export function getPreparedSolanaTransactions(
  response: PreparedNftTransactionResponse
): PreparedNftTransaction[] {
  if (response.transactions && response.transactions.length > 0) {
    return response.transactions;
  }

  if (response.transaction) {
    return [{ transaction: response.transaction, step: 'transaction' }];
  }

  return [];
}

export async function signAndSendPreparedSolanaTransactions(
  account: SolanaAccount,
  response: PreparedNftTransactionResponse,
  options: SignAndSendPreparedSolanaTransactionsOptions = {}
): Promise<string[]> {
  const preparedTransactions = getPreparedSolanaTransactions(response);

  if (preparedTransactions.length === 0) {
    throw new Error('Transaction flow was not returned by the API');
  }

  const commitment = options.commitment ?? 'confirmed';
  // The key that is about to sign: a transaction paying from anything else is
  // not this wallet's to sign, whichever account the screen was showing.
  const feePayer = String(account.signer.address);
  const mustName = options.mustName ?? [];
  const signatures: string[] = [];

  for (const preparedTransaction of preparedTransactions) {
    try {
      // Blockhash refresh, signing, send and confirmation are core/broadcast's
      // — the same path the swap Powerup's proposals take.
      const signature = await signAndSendSolanaTransaction(
        account,
        preparedTransaction.transaction,
        expectationForStep(preparedTransaction, feePayer, mustName),
        { commitment }
      );
      signatures.push(signature);

      if (
        preparedTransaction.lookupTableAddress &&
        (preparedTransaction.step === 'lookup_table_create' ||
          preparedTransaction.step === 'lookup_table_extend')
      ) {
        await waitForLookupTableState(
          account,
          preparedTransaction.lookupTableAddress,
          preparedTransaction.expectedLookupTableAddressCount,
          commitment
        );
      }
    } catch (error) {
      const step = preparedTransaction.step ?? 'transaction';
      const message = error instanceof Error ? error.message : 'Unknown Solana transaction error';
      // The original error carries the stack that says which call failed;
      // dropping it leaves only the step name to debug from. Attached with
      // Object.assign because this package targets the ES2020 lib, which
      // predates the ErrorOptions constructor overload.
      throw Object.assign(new Error(`Failed during ${step}: ${message}`), { cause: error });
    }
  }

  return signatures;
}
