import {
  address,
  getBase64EncodedWireTransaction,
  getCompiledTransactionMessageDecoder,
  getCompiledTransactionMessageEncoder,
  getTransactionDecoder,
  partiallySignTransaction,
} from '@solana/kit';
import type { Address, Commitment, TransactionMessageBytes } from '@solana/kit';
import { fetchMaybeAddressLookupTable } from '@solana-program/address-lookup-table';
import { createRecentSignatureConfirmationPromiseFactory } from '@solana/transaction-confirmation';
import type { PreparedNftTransaction, PreparedNftTransactionResponse } from '../../types/nft';
import type { SolanaAccount } from './SolanaAccount';
import type { SolanaRpc } from './networks';

export interface SignAndSendPreparedSolanaTransactionsOptions {
  commitment?: Commitment;
}

const LOOKUP_TABLE_POLL_INTERVAL_MS = 400;
const LOOKUP_TABLE_TIMEOUT_MS = 20_000;
const SIGNATURE_CONFIRMATION_TIMEOUT_MS = 30_000;

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

  const rpc = account.getRpc();
  const commitment = options.commitment ?? 'confirmed';
  const confirmRecentSignature = createRecentSignatureConfirmationPromiseFactory({
    rpc,
    rpcSubscriptions: account.getRpcSubscriptions(),
  });
  const signatures: string[] = [];

  for (const preparedTransaction of preparedTransactions) {
    try {
      const decoded = getTransactionDecoder().decode(
        new Uint8Array(Buffer.from(preparedTransaction.transaction, 'base64'))
      );
      const { value } = await rpc.getLatestBlockhash({ commitment }).send();

      // The compiled message is patched and re-encoded rather than decompiled
      // and rebuilt: decompiling re-derives account ordering and lookup-table
      // indices, which does not reproduce the input bytes. Swapping the one
      // field is the only transformation that round-trips exactly.
      const compiled = getCompiledTransactionMessageDecoder().decode(decoded.messageBytes);
      const messageBytes = getCompiledTransactionMessageEncoder().encode({
        ...compiled,
        lifetimeToken: value.blockhash,
      }) as TransactionMessageBytes;

      // partiallySignTransaction preserves signatures already in the map, so a
      // co-signer's signature on a prepared transaction survives.
      const signed = await partiallySignTransaction([account.signer.keyPair], {
        messageBytes,
        signatures: decoded.signatures,
      });

      const signature = await rpc
        .sendTransaction(getBase64EncodedWireTransaction(signed), {
          encoding: 'base64',
          preflightCommitment: commitment,
        })
        .send();
      signatures.push(signature);

      // No polling fallback: a broken WebSocket endpoint should fail loudly
      // rather than degrade into a silent slow path.
      await confirmRecentSignature({
        abortSignal: AbortSignal.timeout(SIGNATURE_CONFIRMATION_TIMEOUT_MS),
        commitment,
        signature,
      });

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
