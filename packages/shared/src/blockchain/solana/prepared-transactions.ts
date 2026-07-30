import {
  getBase64EncodedWireTransaction,
  getCompiledTransactionMessageDecoder,
  getCompiledTransactionMessageEncoder,
  getTransactionDecoder,
  partiallySignTransaction,
} from '@solana/kit';
import type { Commitment, TransactionMessageBytes } from '@solana/kit';
import { createRecentSignatureConfirmationPromiseFactory } from '@solana/transaction-confirmation';
import type {
  PreparedNftTransaction,
  PreparedNftTransactionResponse,
} from '../../types/nft';
import { SolanaAccount } from './SolanaAccount';

export interface SignAndSendPreparedSolanaTransactionsOptions {
  commitment?: Commitment;
}

const LOOKUP_TABLE_POLL_INTERVAL_MS = 400;
const LOOKUP_TABLE_TIMEOUT_MS = 20_000;
const SIGNATURE_CONFIRMATION_TIMEOUT_MS = 30_000;

/**
 * ponytail: the lookup-table warm-up path stays on the legacy web3.js
 * Connection. @solana/kit has no address-lookup-table decoder — that lives in
 * @solana-program/address-lookup-table — and this path only reads state, never
 * signs. Upgrade path: add that package and swap getAddressLookupTable for
 * fetchAddressLookupTable plus rpcSubscriptions.accountNotifications.
 */
type Connection = Awaited<ReturnType<SolanaAccount['getConnection']>>;
type PublicKey = ReturnType<typeof SolanaAccount.toPublicKey>;

interface LookupTableReadiness {
  ready: boolean;
  waitingForWarmup: boolean;
  lastExtendedSlot: number | null;
}

async function getLookupTableReadiness(
  connection: Connection,
  tablePublicKey: PublicKey,
  expectedAddressCount: number | undefined,
  commitment: Commitment,
  currentSlotOverride?: number
): Promise<LookupTableReadiness> {
  const response = await connection.getAddressLookupTable(tablePublicKey, {
    commitment,
  });
  const lookupTable = response.value;

  if (!lookupTable) {
    return {
      ready: false,
      waitingForWarmup: false,
      lastExtendedSlot: null,
    };
  }

  const currentAddressCount = lookupTable.state.addresses.length;
  if (expectedAddressCount !== undefined && currentAddressCount < expectedAddressCount) {
    return {
      ready: false,
      waitingForWarmup: false,
      lastExtendedSlot: Number(lookupTable.state.lastExtendedSlot),
    };
  }

  if (expectedAddressCount === undefined || expectedAddressCount === 0) {
    return {
      ready: true,
      waitingForWarmup: false,
      lastExtendedSlot: Number(lookupTable.state.lastExtendedSlot),
    };
  }

  const currentSlot = currentSlotOverride ?? await connection.getSlot(commitment);
  const lastExtendedSlot = Number(lookupTable.state.lastExtendedSlot);
  const waitingForWarmup = currentSlot <= lastExtendedSlot;

  return {
    ready: !waitingForWarmup,
    waitingForWarmup,
    lastExtendedSlot,
  };
}

async function waitForLookupTableStateByPolling(
  connection: Connection,
  tablePublicKey: PublicKey,
  expectedAddressCount: number | undefined,
  commitment: Commitment
): Promise<void> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < LOOKUP_TABLE_TIMEOUT_MS) {
    const readiness = await getLookupTableReadiness(
      connection,
      tablePublicKey,
      expectedAddressCount,
      commitment
    );

    if (readiness.ready) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, LOOKUP_TABLE_POLL_INTERVAL_MS));
  }

  throw new Error(
    `Lookup table ${tablePublicKey.toBase58()} was not ready with ${expectedAddressCount ?? 0} addresses in time`
  );
}

async function waitForLookupTableStateBySubscription(
  connection: Connection,
  tablePublicKey: PublicKey,
  expectedAddressCount: number | undefined,
  commitment: Commitment
): Promise<void> {
  if (
    typeof connection.onAccountChange !== 'function' ||
    typeof connection.onSlotChange !== 'function' ||
    typeof connection.removeAccountChangeListener !== 'function' ||
    typeof connection.removeSlotChangeListener !== 'function'
  ) {
    throw new Error('Lookup table subscriptions are not available on this connection');
  }

  let accountSubscriptionId: number | null = null;
  let slotSubscriptionId: number | null = null;
  let timedOut = false;
  let settled = false;
  let warmupTargetSlot: number | null = null;

  const cleanup = async () => {
    const removals: Promise<unknown>[] = [];
    if (accountSubscriptionId !== null) {
      removals.push(connection.removeAccountChangeListener(accountSubscriptionId));
    }
    if (slotSubscriptionId !== null) {
      removals.push(connection.removeSlotChangeListener(slotSubscriptionId));
    }
    await Promise.allSettled(removals);
  };

  const initialReadiness = await getLookupTableReadiness(
    connection,
    tablePublicKey,
    expectedAddressCount,
    commitment
  );
  if (initialReadiness.ready) {
    return;
  }
  warmupTargetSlot = initialReadiness.waitingForWarmup ? initialReadiness.lastExtendedSlot : null;

  await new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      timedOut = true;
      void cleanup().finally(() => {
        reject(
          new Error(
            `Lookup table ${tablePublicKey.toBase58()} was not ready with ${expectedAddressCount ?? 0} addresses in time`
          )
        );
      });
    }, LOOKUP_TABLE_TIMEOUT_MS);

    const finish = (callback: () => void) => {
      if (settled || timedOut) return;
      settled = true;
      clearTimeout(timeoutId);
      void cleanup().finally(callback);
    };

    const refreshReadiness = async () => {
      if (settled || timedOut) return;
      try {
        const readiness = await getLookupTableReadiness(
          connection,
          tablePublicKey,
          expectedAddressCount,
          commitment
        );
        warmupTargetSlot = readiness.waitingForWarmup ? readiness.lastExtendedSlot : null;
        if (readiness.ready) {
          finish(resolve);
        }
      } catch (error) {
        finish(() => {
          reject(error instanceof Error ? error : new Error('Unknown lookup table subscription error'));
        });
      }
    };

    try {
      accountSubscriptionId = connection.onAccountChange(
        tablePublicKey,
        () => {
          void refreshReadiness();
        },
        commitment
      );
    } catch (error) {
      finish(() => {
        reject(error instanceof Error ? error : new Error('Failed to subscribe to lookup table account'));
      });
    }

    try {
      slotSubscriptionId = connection.onSlotChange((slotInfo: { slot: number }) => {
        if (settled || timedOut) return;
        if (warmupTargetSlot !== null && slotInfo.slot > warmupTargetSlot) {
          finish(resolve);
        }
      });
    } catch (error) {
      finish(() => {
        reject(error instanceof Error ? error : new Error('Failed to subscribe to slot updates'));
      });
    }
  });
}

async function waitForLookupTableState(
  account: SolanaAccount,
  lookupTableAddress: string,
  expectedAddressCount: number | undefined,
  commitment: Commitment
): Promise<void> {
  const connection = await account.getConnection();
  const tablePublicKey = SolanaAccount.toPublicKey(lookupTableAddress);
  try {
    await waitForLookupTableStateBySubscription(
      connection,
      tablePublicKey,
      expectedAddressCount,
      commitment
    );
    return;
  } catch {
    await waitForLookupTableStateByPolling(
      connection,
      tablePublicKey,
      expectedAddressCount,
      commitment
    );
    return;
  }
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
      throw new Error(`Failed during ${step}: ${message}`);
    }
  }

  return signatures;
}
