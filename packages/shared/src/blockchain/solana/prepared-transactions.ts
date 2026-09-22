import { address } from '@solana/kit';
import type { Address, Commitment } from '@solana/kit';
import { fetchMaybeAddressLookupTable } from '@solana-program/address-lookup-table';
import { signAndSendSolanaTransaction } from '../../core/broadcast/solana';
import {
  LOOKUP_TABLE_STEP_INSTRUCTIONS,
  LOOKUP_TABLE_STEP_PROGRAMS,
  NFT_TRANSACTION_INSTRUCTIONS,
  NFT_TRANSACTION_PROGRAMS,
} from '../../core/verify';
import type { NftActionExpectation, SolanaTransactionExpectation } from '../../core/verify';
import type { PreparedNftTransaction, PreparedNftTransactionResponse } from '../../types/nft';
import type { SolanaAccount } from './SolanaAccount';
import type { SolanaRpc } from './networks';

export interface SignAndSendPreparedSolanaTransactionsOptions {
  commitment?: Commitment;
  /**
   * The NFT the flow acts on and, for a transfer, the destination the user
   * typed. Every asset-touching instruction of the work step is held to them;
   * the lookup-table steps touch no asset, so it applies to the work step alone.
   */
  nftAction: NftActionExpectation;
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
 *
 * The position decides, not the label. `step` is a free-form string the
 * response chooses, so reading the policy off it let the response pick its own
 * verification: calling a SOL-draining transaction `lookup_table_create`
 * dropped the requirement to name the mint. The shape a prepared flow actually
 * has is "zero or more table steps, then exactly one work step, last", which
 * the array already says.
 */
function expectationForStep(
  preparedTransaction: PreparedNftTransaction,
  index: number,
  count: number,
  feePayer: string,
  nftAction: NftActionExpectation
): SolanaTransactionExpectation {
  const isWorkStep = index === count - 1;
  if (!isWorkStep && isLookupTableStep(preparedTransaction.step)) {
    return {
      feePayer,
      allowedPrograms: LOOKUP_TABLE_STEP_PROGRAMS,
      allowedInstructions: LOOKUP_TABLE_STEP_INSTRUCTIONS,
    };
  }

  return {
    feePayer,
    allowedPrograms: NFT_TRANSACTION_PROGRAMS,
    allowedInstructions: NFT_TRANSACTION_INSTRUCTIONS,
    nftAction,
  };
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
  options: SignAndSendPreparedSolanaTransactionsOptions
): Promise<string[]> {
  const preparedTransactions = getPreparedSolanaTransactions(response);

  if (preparedTransactions.length === 0) {
    throw new Error('Transaction flow was not returned by the API');
  }

  const commitment = options.commitment ?? 'confirmed';
  // The key that is about to sign: a transaction paying from anything else is
  // not this wallet's to sign, whichever account the screen was showing.
  const feePayer = String(account.signer.address);
  const signatures: string[] = [];

  for (const [index, preparedTransaction] of preparedTransactions.entries()) {
    try {
      // Blockhash refresh, signing, send and confirmation are core/broadcast's
      // — the same path a Powerup's proposals take.
      const signature = await signAndSendSolanaTransaction(
        account,
        preparedTransaction.transaction,
        expectationForStep(
          preparedTransaction,
          index,
          preparedTransactions.length,
          feePayer,
          options.nftAction
        ),
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
