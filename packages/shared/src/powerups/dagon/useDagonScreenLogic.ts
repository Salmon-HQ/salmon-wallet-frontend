/**
 * useDagonScreenLogic — the Dagon Powerup's tab, shared logic (spec 043).
 *
 * Every transaction is built by the Salmon backend and handed to core through
 * `requestFreshSignature`: core generates the co-signers Dagon's programs
 * need, shows the confirmation, signs and discards them. This hook only ever
 * sees their public keys. It reads devnet itself to know when Encrypt
 * finished an operation, and the Encrypt executor to reveal a balance, and
 * never reveals without the user's tap (SC-003).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import i18n from 'i18next';
import { isAddress } from '@solana/kit';
import { ApiError } from '../../api/client';
import { SolanaOutcomeUnknownError } from '../../blockchain/solana/confirm';
import { solanaRpcFor } from '../../blockchain/solana/networks';
import { useRequestFreshSignature } from '../../core/confirmation/SignatureRequestContext';
import {
  NoSigningAccountError,
  SignatureRequestCancelledError,
  type FreshSignerKeys,
  type SignedResult,
} from '../../core/confirmation/types';
import { useAmountShortcuts } from '../../hooks/useAmountShortcuts';
import { usePowerupState } from '../../hooks/usePowerupState';
import type { ChipOption } from '../../types/ui/chip';
import type { FactsCardRow } from '../../types/ui/facts-card';
import type { PillTone } from '../../types/ui/pill';
import type { SendToken } from '../../types/ui/send-sheet';
import { fromBaseUnits } from '../../utils/decimals';
import { buildPowerup, type BuildPowerupFn } from '../backend/api';
import { describePowerupBuildError } from '../backend/errors';
import { toPowerupProposal } from '../backend/proposal';
import type { PowerupBuildEnvelope } from '../backend/types';
import {
  digestOf,
  isSettled,
  readAccounts as readAccountsOnChain,
  readPositions as readPositionsOnChain,
  type Positions,
} from './chain';
import { DagonConfigError, fetchDagonConfig, type DagonConfig } from './config';
import {
  DAGON_DECIMALS,
  DAGON_ID,
  FRESH_SIGNERS,
  POLL_MS,
  SEND_ENABLED,
  SETTLE_CAP_MS,
  SIDES,
  SOL_FLOOR_LAMPORTS,
  WITHDRAW_ENABLED,
  type DagonAction,
  type Side,
} from './constants';
import { readHiddenBalance } from './executor';
import { dagonExpectation } from './expectation';
import {
  EMPTY_ACCOUNT,
  EMPTY_STATE,
  accountKey,
  advanceOperations,
  formatDagonAmount,
  fromStoredAuthorization,
  isOutOfDate,
  parseDagonAmount,
  patchOperation,
  recordOperation,
  reviewDisplay,
  swapMinimum,
  toStoredAuthorization,
  tokenName,
  watchedAddresses,
  withdrawAfter,
  type DagonAccountState,
  type DagonOperation,
  type DagonState,
  type WatchedCiphertext,
} from './operations';

const NETWORK = 'solana-devnet';

/** Dagon's own build codes over the shared table (contracts/dagon-build.md). */
const DAGON_CODES: Record<string, string> = {
  setup_required: 'dagon.errors.setupRequired',
  balance_settling: 'dagon.errors.balanceSettling',
  receipt_not_found: 'dagon.errors.receiptNotFound',
  executor_pending: 'dagon.errors.busy',
  executor_unavailable: 'dagon.errors.busy',
  pool_unavailable: 'dagon.errors.busy',
  dagon_config_unavailable: 'dagon.errors.busy',
  executor_bad_response: 'dagon.errors.buildFailed',
  invalid_fresh_signers: 'dagon.errors.buildFailed',
};

const UNAVAILABLE_KEYS = {
  region: 'powerups.unavailable.region',
  wallet: 'powerups.unavailable.wallet',
} as const;

export type DagonSheetMode = 'hide' | 'send' | 'swap' | 'withdraw';

export interface DagonSwitches {
  send: boolean;
  withdraw: boolean;
}

export interface UseDagonScreenLogicParams {
  publicKey: string;
  networkId: string | null;
  /** Build-time switches; constants in production, overridden by tests. */
  switches?: DagonSwitches;
  /** Test seams. */
  buildPowerup?: BuildPowerupFn;
  fetchConfig?: () => Promise<DagonConfig>;
  readPositions?: (config: DagonConfig, owner: string) => Promise<Positions>;
  readAccounts?: (addresses: readonly string[]) => Promise<(Uint8Array | null)[]>;
  readBalance?: typeof readHiddenBalance;
  now?: () => number;
}

export interface DagonCardView {
  side: Side;
  title: string;
  rows: FactsCardRow[];
  reveal: { label: string; onPress: () => Promise<void>; disabled: boolean };
}

export interface DagonActionView {
  key: DagonSheetMode | 'continueWithdraw';
  label: string;
  onPress: () => void | Promise<void>;
}

export interface DagonProgressItem {
  id: string;
  title: string;
  stateLabel: string;
  tone: PillTone;
  hint?: string;
}

export interface DagonSheetView {
  visible: boolean;
  onClose: () => void;
  mode: DagonSheetMode | null;
  title: string;
  amountLabel: string;
  amount: string;
  onChangeAmount: (value: string) => void;
  shortcuts: { options: ChipOption[]; value: string; onChange: (key: string) => void };
  tokenLabel: string;
  token: { side: Side; name: string; hint: string; onPress: () => void };
  picker: {
    visible: boolean;
    tokens: SendToken[];
    onSelectToken: (token: SendToken) => void;
    onClose: () => void;
  };
  recipient: {
    label: string;
    value: string;
    onChangeText: (value: string) => void;
    placeholder: string;
    error?: string;
  } | null;
  facts: FactsCardRow[];
  warning: string | null;
  submit: { label: string; onPress: () => Promise<void>; disabled: boolean; loading: boolean };
  error: string | null;
}

export interface UseDagonScreenLogicResult {
  /** Always shown, in every state (FR-020). */
  notice: { title: string; body: string };
  status: 'loading' | 'unavailable' | 'ready';
  unavailable: { title: string; body: string; retryLabel: string; onRetry: () => void };
  /** First visit: the one action offered (FR-021); null once activated. */
  activate: { label: string; body: string; onPress: () => Promise<void>; loading: boolean } | null;
  cards: DagonCardView[];
  actions: DagonActionView[];
  faucet: { label: string; url: string } | null;
  progress: { title: string; empty: string; items: DagonProgressItem[] };
  /** A failure outside the sheet, translated. */
  error: string | null;
  sheet: DagonSheetView;
}

// The key itself stands in until the resources are loaded, so nothing renders blank.
const t = (key: string, options?: Record<string, unknown>): string => {
  const value: unknown = i18n.t(key, options);
  return typeof value === 'string' ? value : key;
};

const otherSide = (side: Side): Side => (side === 'USDC' ? 'DOGE' : 'USDC');

const PILL: Record<DagonOperation['state'], PillTone> = {
  processing: 'accent',
  done: 'success',
  unknown: 'neutral',
};

const isApiCode = (error: unknown, code: string): boolean =>
  error instanceof ApiError && error.code === code;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** A translation key and what it interpolates. */
interface ErrorMessage {
  key: string;
  params?: Record<string, string>;
}

const say = (message: ErrorMessage | null): string | null =>
  message ? t(message.key, message.params) : null;

interface RunOptions {
  sides: Side[];
  amount?: bigint;
  minimum?: bigint;
  recipient?: string;
  owner?: string;
  /** What settles when Encrypt finished, given the keys core generated. */
  watch: (keys: FreshSignerKeys) => WatchedCiphertext[];
  /** At confirmation, before the receipt (R13): state that must survive an app kill. */
  onConfirmed?: (keys: FreshSignerKeys) => void;
  /** Sent, outcome unknown: what a later attempt may need from these keys. */
  onUnknown?: (keys: FreshSignerKeys) => void;
}

export function useDagonScreenLogic({
  publicKey,
  networkId,
  switches = { send: SEND_ENABLED, withdraw: WITHDRAW_ENABLED },
  buildPowerup: build = buildPowerup,
  fetchConfig = fetchDagonConfig,
  readPositions,
  readAccounts,
  readBalance = readHiddenBalance,
  now = Date.now,
}: UseDagonScreenLogicParams): UseDagonScreenLogicResult {
  const requestFreshSignature = useRequestFreshSignature();
  // Seams through a ref, so fresh closures from a caller never re-arm effects.
  const seams = useRef({ build, fetchConfig, readPositions, readAccounts, readBalance, now });
  seams.current = { build, fetchConfig, readPositions, readAccounts, readBalance, now };

  const [state, setState] = usePowerupState<DagonState>(DAGON_ID, EMPTY_STATE);
  const key = networkId === NETWORK ? accountKey(publicKey, networkId) : null;
  const account = (key && state[key]) || EMPTY_ACCOUNT;
  const accountRef = useRef(account);
  accountRef.current = account;
  const update = useCallback(
    (change: (previous: DagonAccountState) => DagonAccountState) => {
      if (!key) return;
      setState((previous) => ({ ...previous, [key]: change(previous[key] ?? EMPTY_ACCOUNT) }));
    },
    [key, setState]
  );

  const [attempt, setAttempt] = useState(0);
  const [config, setConfig] = useState<DagonConfig | null>(null);
  const [configFailed, setConfigFailed] = useState(false);
  const [positions, setPositions] = useState<Positions | null>(null);
  const [positionsFailed, setPositionsFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [readingId, setReadingId] = useState<string | null>(null);
  const readingRef = useRef<string | null>(null);
  const [error, setError] = useState<ErrorMessage | null>(null);

  const [mode, setMode] = useState<DagonSheetMode | null>(null);
  const [side, setSide] = useState<Side>('USDC');
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  const chainReads = useCallback(
    () => ({
      positions: (cfg: DagonConfig, owner: string) =>
        seams.current.readPositions
          ? seams.current.readPositions(cfg, owner)
          : readPositionsOnChain(solanaRpcFor(NETWORK), cfg, owner),
      accounts: (addresses: readonly string[]) =>
        seams.current.readAccounts
          ? seams.current.readAccounts(addresses)
          : readAccountsOnChain(solanaRpcFor(NETWORK), addresses),
    }),
    []
  );

  // devnet.json on mount and on retry; a refusal leaves the tab unavailable.
  useEffect(() => {
    let live = true;
    setConfigFailed(false);
    setConfig(null);
    setPositions(null);
    seams.current
      .fetchConfig()
      .then((next) => live && setConfig(next))
      .catch(() => live && setConfigFailed(true));
    return () => {
      live = false;
    };
  }, [attempt, key]);

  const configRef = useRef(config);
  configRef.current = config;
  const positionsRef = useRef(positions);
  positionsRef.current = positions;

  const refreshPositions = useCallback(async () => {
    const current = configRef.current;
    if (!current) return;
    try {
      setPositions(await chainReads().positions(current, publicKey));
      setPositionsFailed(false);
    } catch {
      setPositionsFailed(true);
    }
  }, [chainReads, publicKey]);

  useEffect(() => {
    if (config) void refreshPositions();
  }, [config, refreshPositions]);

  const readReveal = useCallback(
    async (operation: DagonOperation) => {
      const current = configRef.current;
      const stored = operation.readAuthorization;
      if (!current || !stored) return;
      readingRef.current = operation.id;
      setReadingId(operation.id);
      try {
        const value = await seams.current.readBalance(
          current.encryptGrpcUrl,
          fromStoredAuthorization(stored)
        );
        const [revealedSide] = operation.sides;
        update((previous) => ({
          ...patchOperation(previous, operation.id, {
            readAuthorization: undefined,
            readFailed: false,
          }),
          revealed: {
            ...previous.revealed,
            [revealedSide]: { amount: value.toString(), readAt: seams.current.now() },
          },
        }));
      } catch {
        update((previous) => patchOperation(previous, operation.id, { readFailed: true }));
      } finally {
        readingRef.current = null;
        setReadingId(null);
      }
    },
    [update]
  );

  // The watcher: one batched read per tick while the tab is mounted (O1).
  const tick = useCallback(async () => {
    const before = accountRef.current;
    // A reveal settled and its read is owed: once, automatically; a failure
    // waits for the user's tap (O4).
    const owed = before.operations.find(
      (each) =>
        each.action === 'reveal' &&
        each.state === 'done' &&
        each.readAuthorization !== undefined &&
        !each.readFailed
    );
    if (owed && readingRef.current === null) void readReveal(owed);
    if (!before.operations.some((each) => each.state === 'processing')) return;
    const at = seams.current.now();
    const addresses = watchedAddresses(before, at);
    const data = new Map<string, Uint8Array | null>();
    if (addresses.length > 0) {
      try {
        const rows = await chainReads().accounts(addresses);
        addresses.forEach((address, index) => data.set(address, rows[index] ?? null));
      } catch {
        return;
      }
    }
    const read = (address: string) => data.get(address);
    const after = advanceOperations(before, at, read);
    if (after === before) return;
    update((previous) => advanceOperations(previous, at, read));
    const finished = after.operations.filter(
      (each) =>
        each.state === 'done' &&
        before.operations.find((old) => old.id === each.id)?.state === 'processing'
    );
    if (finished.length > 0) void refreshPositions();
  }, [chainReads, update, refreshPositions, readReveal]);

  const tickRef = useRef(tick);
  tickRef.current = tick;
  const ready = config !== null;
  useEffect(() => {
    if (!ready) return undefined;
    void tickRef.current();
    const timer = setInterval(() => void tickRef.current(), POLL_MS);
    return () => clearInterval(timer);
  }, [ready, key]);

  const messageFor = useCallback(
    (caught: unknown, codes: Record<string, string> = {}): ErrorMessage => {
      if (caught instanceof NoSigningAccountError) return { key: caught.message };
      const failure = describePowerupBuildError(caught, {
        codes: { ...DAGON_CODES, ...codes },
        fallback: 'dagon.errors.buildFailed',
      });
      if (failure.kind === 'unavailable') return { key: UNAVAILABLE_KEYS[failure.reason] };
      return typeof failure.message === 'string' ? { key: failure.message } : failure.message;
    },
    []
  );

  /** Current digests of `addresses`, read right before sending (FR-027). */
  const snapshot = useCallback(
    async (addresses: readonly string[]): Promise<WatchedCiphertext[]> => {
      const rows = await chainReads().accounts(addresses);
      return addresses.map((address, index) => {
        const data = rows[index];
        return { address, snapshot: data ? digestOf(data) : null };
      });
    },
    [chainReads]
  );

  /** One Dagon transaction through core; resolves when the user dismissed the receipt. */
  const run = useCallback(
    async (
      action: DagonAction,
      params: Record<string, string>,
      options: RunOptions,
      operationId = `${action}:${seams.current.now()}:${Math.random().toString(36).slice(2, 8)}`
    ): Promise<SignedResult> => {
      const record = (keys: FreshSignerKeys, state: DagonOperation['state']) =>
        update((previous) =>
          recordOperation(previous, {
            id: operationId,
            action,
            sides: options.sides,
            amount: options.amount?.toString(),
            submittedAt: seams.current.now(),
            watch: options.watch(keys),
            state,
          })
        );
      let lastKeys: FreshSignerKeys = { freshSigners: [] };
      try {
        return await requestFreshSignature({
          powerupId: DAGON_ID,
          networkId: NETWORK,
          count: FRESH_SIGNERS[action],
          viewer: action === 'reveal',
          build: async (keys) => {
            lastKeys = keys;
            const envelope = await seams.current.build<PowerupBuildEnvelope>(DAGON_ID, NETWORK, {
              publicKey,
              action,
              ...params,
              ...(keys.viewer ? { viewer: keys.viewer } : {}),
              freshSigners: keys.freshSigners.join(','),
            });
            const current = configRef.current;
            if (!current) throw new DagonConfigError();
            return toPowerupProposal(envelope, {
              networkId: NETWORK,
              expect: await dagonExpectation(action, {
                config: current,
                wallet: publicKey,
                sides: options.sides,
                counterparty: params.to ?? params.owner,
              }),
              display: reviewDisplay(action, { envelope, ...options }),
              // No `pending`: a confirmed signature says nothing moved (FR-028).
              onOutcome: (success) => {
                if (!success) return;
                record(keys, 'processing');
                options.onConfirmed?.(keys);
              },
            });
          },
        });
      } catch (caught) {
        // It may have landed: listed as unknown, never sent again (FR-032).
        if (caught instanceof SolanaOutcomeUnknownError) {
          record(lastKeys, 'unknown');
          options.onUnknown?.(lastKeys);
        }
        throw caught;
      }
    },
    [publicKey, requestFreshSignature, update]
  );

  const solShortfall = useCallback((): ErrorMessage | null => {
    if (!positions || positions.sol >= SOL_FLOOR_LAMPORTS) return null;
    return {
      key: 'dagon.errors.solShortfall',
      params: {
        needed: fromBaseUnits(SOL_FLOOR_LAMPORTS, 9),
        have: fromBaseUnits(positions.sol, 9) || '0',
      },
    };
  }, [positions]);

  const closeSheet = useCallback(() => {
    setMode(null);
    setAmount('');
    setRecipient('');
    setPickerOpen(false);
    setError(null);
  }, []);

  /**
   * Runs one user intent and answers its failures; true when it went through.
   * Errors land in `error`, shown in the sheet when one is open.
   */
  const attemptIntent = useCallback(
    async (intent: () => Promise<void>, codes?: Record<string, string>): Promise<boolean> => {
      const shortfall = solShortfall();
      if (shortfall) {
        setError(shortfall);
        return false;
      }
      setBusy(true);
      setError(null);
      try {
        await intent();
        return true;
      } catch (caught) {
        if (caught instanceof SignatureRequestCancelledError) return false;
        if (caught instanceof SolanaOutcomeUnknownError) {
          closeSheet();
          setError({ key: caught.message });
          return false;
        }
        setError(messageFor(caught, codes));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [solShortfall, closeSheet, messageFor]
  );

  const setupSide = useCallback(
    async (setupSide: Side, owner?: string) => {
      let created = '';
      await run('setup', owner ? { side: setupSide, owner } : { side: setupSide }, {
        sides: [setupSide],
        owner,
        watch: (keys) => [{ address: keys.freshSigners[0], snapshot: null }],
        onConfirmed: (keys) => {
          created = keys.freshSigners[0];
        },
      });
      return created;
    },
    [run]
  );

  const activate = useCallback(async () => {
    await attemptIntent(async () => {
      for (const each of SIDES) {
        if (positions?.sides[each].activated) continue;
        try {
          await setupSide(each);
        } catch (caught) {
          if (!isApiCode(caught, 'already_initialized')) throw caught;
        }
      }
    });
    void refreshPositions();
  }, [attemptIntent, positions, setupSide, refreshPositions]);

  // Read through the ref: a setup inside the same intent refreshes it.
  const balanceCtOf = useCallback((of: Side): string => {
    const balanceCt = positionsRef.current?.sides[of].balanceCt;
    if (!balanceCt) throw new ApiError('setup', 409, 'setup_required');
    return balanceCt;
  }, []);

  // A reveal whose transaction confirmed but whose read is still owed.
  const owedRead = (of: Side) =>
    account.operations.find(
      (each) =>
        each.action === 'reveal' &&
        each.sides[0] === of &&
        each.state === 'done' &&
        each.readAuthorization !== undefined
    );

  const reveal = useCallback(
    async (of: Side) => {
      const owed = accountRef.current.operations.find(
        (each) =>
          each.action === 'reveal' &&
          each.sides[0] === of &&
          each.state === 'done' &&
          each.readAuthorization !== undefined
      );
      // The same signature again: no key, no transaction (O4).
      if (owed) return readReveal(owed);
      const operationId = `reveal:${seams.current.now()}:${of}`;
      await attemptIntent(async () => {
        const result = await run(
          'reveal',
          { side: of },
          { sides: [of], watch: (keys) => [{ address: keys.freshSigners[0], snapshot: null }] },
          operationId
        );
        if (result.readAuthorization) {
          // The watcher reads Encrypt once `viewCt` settled.
          const stored = toStoredAuthorization(result.readAuthorization);
          update((previous) =>
            patchOperation(previous, operationId, { readAuthorization: stored })
          );
        }
      });
    },
    [attemptIntent, run, update, readReveal]
  );

  const hide = useCallback(
    async (units: bigint) => {
      const watch = await snapshot([balanceCtOf(side)]);
      await run(
        'wrap',
        { side, amount: units.toString() },
        { sides: [side], amount: units, watch: () => watch }
      );
    },
    [side, snapshot, balanceCtOf, run]
  );

  const swap = useCallback(
    async (units: bigint) => {
      const sideOut = otherSide(side);
      if (positions?.sides[side].zeroDigest) {
        throw new ApiError('settling', 409, 'balance_settling');
      }
      const minimum = swapMinimum(units);
      const params = {
        sideIn: side,
        sideOut,
        amountIn: units.toString(),
        minAmountOut: minimum.toString(),
      };
      const once = async () => {
        const watch = await snapshot([balanceCtOf(side), balanceCtOf(sideOut)]);
        await run('swap', params, {
          sides: [side, sideOut],
          amount: units,
          minimum,
          watch: () => watch,
        });
      };
      try {
        await once();
      } catch (caught) {
        if (!isApiCode(caught, 'setup_required')) throw caught;
        // Its own confirmation first, then the swap again (FR-053).
        await setupSide(sideOut);
        await refreshPositions();
        await once();
      }
    },
    [side, positions, snapshot, balanceCtOf, run, setupSide, refreshPositions]
  );

  const waitSettled = useCallback(
    async (address: string) => {
      const deadline = seams.current.now() + SETTLE_CAP_MS;
      while (seams.current.now() < deadline) {
        const [data] = await chainReads().accounts([address]);
        if (isSettled(null, data ?? null)) return;
        await delay(POLL_MS);
      }
    },
    [chainReads]
  );

  const send = useCallback(
    async (units: bigint, to: string) => {
      const params = { side, amount: units.toString(), to };
      const once = async () => {
        const watch = await snapshot([balanceCtOf(side)]);
        await run('send', params, {
          sides: [side],
          amount: units,
          recipient: to,
          watch: () => watch,
        });
      };
      try {
        await once();
      } catch (caught) {
        if (!isApiCode(caught, 'recipient_setup_required')) throw caught;
        // The sender pays for the recipient's account, as its own transaction,
        // and the send waits for Encrypt to write it (contracts/dagon-build.md).
        const created = await setupSide(side, to);
        if (created) await waitSettled(created);
        await once();
      }
    },
    [side, snapshot, balanceCtOf, run, setupSide, waitSettled]
  );

  const withdrawStart = useCallback(
    async (units: bigint) => {
      const watch = await snapshot([balanceCtOf(side)]);
      await run(
        'unwrapBurn',
        { side, amount: units.toString() },
        {
          sides: [side],
          amount: units,
          watch: () => watch,
          onConfirmed: (keys) =>
            update((previous) => ({
              ...previous,
              withdraw: withdrawAfter(undefined, 'unwrapBurn', {
                side,
                amount: units.toString(),
                freshSigner: keys.freshSigners[0],
                now: seams.current.now(),
              }),
            })),
        }
      );
    },
    [side, snapshot, balanceCtOf, run, update]
  );

  const continueWithdraw = useCallback(async () => {
    const progress = accountRef.current.withdraw;
    if (!progress?.burnedCt) return;
    const { burnedCt } = progress;
    const step3 = async (requestAcct: string) => {
      await run(
        'unwrapComplete',
        { burnedCt, requestAcct },
        {
          sides: [progress.side],
          watch: () => [],
          onConfirmed: () =>
            update((previous) => ({
              ...previous,
              withdraw: undefined,
              operations: previous.operations.map((each) =>
                each.action === 'unwrapDecrypt' && each.state === 'processing'
                  ? { ...each, state: 'done' }
                  : each
              ),
            })),
        }
      );
      void refreshPositions();
    };
    await attemptIntent(
      async () => {
        if (progress.step === 3 && progress.requestAcct) return step3(progress.requestAcct);
        try {
          await run(
            'unwrapDecrypt',
            { burnedCt },
            {
              sides: [progress.side],
              watch: () => [],
              onConfirmed: (keys) =>
                update((previous) => ({
                  ...previous,
                  withdraw: withdrawAfter(previous.withdraw, 'unwrapDecrypt', {
                    freshSigner: keys.freshSigners[0],
                    now: seams.current.now(),
                  }),
                })),
              // It may have landed: keep its public address, so an
              // `already_requested` on the next try can go on to step 3.
              onUnknown: (keys) =>
                update((previous) => ({
                  ...previous,
                  withdraw: previous.withdraw && {
                    ...previous.withdraw,
                    requestAcct: keys.freshSigners[0],
                  },
                })),
            }
          );
        } catch (caught) {
          if (isApiCode(caught, 'receipt_not_found')) {
            update((previous) => ({ ...previous, withdraw: undefined }));
          } else if (isApiCode(caught, 'already_requested') && progress.requestAcct) {
            // Step 2 is on chain already: never requested twice.
            update((previous) => ({
              ...previous,
              withdraw: withdrawAfter(previous.withdraw, 'alreadyRequested', {
                now: seams.current.now(),
              }),
            }));
            return step3(progress.requestAcct);
          }
          throw caught;
        }
      },
      progress.step === 3
        ? { simulation_failed: 'dagon.errors.decryptionNotPosted' }
        : { already_requested: 'dagon.errors.receiptNotFound' }
    );
  }, [attemptIntent, run, update, refreshPositions]);

  // The sheet.
  const units = parseDagonAmount(amount);
  const recipientValid = isAddress(recipient) && recipient !== publicKey;
  const sheetBalance = useMemo(() => {
    if (mode === 'hide') return positions?.sides[side].publicBalance;
    const revealed = account.revealed[side];
    return revealed ? BigInt(revealed.amount) : undefined;
  }, [mode, positions, side, account.revealed]);
  const shortcuts = useAmountShortcuts({
    balance: sheetBalance === undefined ? undefined : Number(sheetBalance) / 100,
    decimals: DAGON_DECIMALS,
    setAmount: (value) => {
      setAmount(value);
      setError(null);
    },
    maxLabel: t('general.max'),
  });

  const submit = useCallback(async () => {
    if (!mode || units === null) return;
    if (mode === 'send' && !recipientValid) return;
    const intents: Record<DagonSheetMode, () => Promise<void>> = {
      hide: () => hide(units),
      send: () => send(units, recipient),
      swap: () => swap(units),
      withdraw: () => withdrawStart(units),
    };
    const codes: Record<string, string> =
      mode === 'hide' ? { simulation_failed: 'dagon.errors.wrapFailed' } : {};
    if (await attemptIntent(intents[mode], codes)) closeSheet();
  }, [
    mode,
    units,
    recipientValid,
    recipient,
    hide,
    send,
    swap,
    withdrawStart,
    attemptIntent,
    closeSheet,
  ]);

  const openSheet = (next: DagonSheetMode) => {
    setMode(next);
    setSide('USDC');
    setAmount('');
    setRecipient('');
    setError(null);
  };

  const activated = positions?.activated ?? false;
  const revealInFlight =
    busy ||
    readingId !== null ||
    account.operations.some((each) => each.action === 'reveal' && each.state === 'processing');

  const cards: DagonCardView[] = activated
    ? SIDES.map((each) => {
        const revealed = account.revealed[each];
        const owed = owedRead(each);
        const rows: FactsCardRow[] = [
          {
            key: 'public',
            label: t('dagon.card.public'),
            value: formatDagonAmount(positions?.sides[each].publicBalance ?? 0n),
          },
          {
            key: 'hidden',
            label: t('dagon.card.hidden'),
            value: revealed ? formatDagonAmount(revealed.amount) : t('dagon.card.notRevealed'),
            valueTone: revealed ? 'primary' : 'secondary',
          },
        ];
        if (revealed) {
          rows.push({
            key: 'readAt',
            label: t('dagon.card.revealedAt', {
              time: new Date(revealed.readAt).toLocaleTimeString(),
            }),
            value: isOutOfDate(account, each) ? t('dagon.card.outOfDate') : '',
            valueTone: 'secondary',
          });
        }
        if (owed?.readFailed) {
          rows.push({
            key: 'readFailed',
            label: '',
            value: t('dagon.card.readFailed'),
            valueTone: 'danger',
          });
        }
        return {
          side: each,
          title: tokenName(each),
          rows,
          reveal: {
            label: t('dagon.card.reveal'),
            onPress: () => reveal(each),
            disabled: revealInFlight,
          },
        };
      })
    : [];

  const actions: DagonActionView[] = [];
  if (activated) {
    actions.push({ key: 'hide', label: t('dagon.actions.hide'), onPress: () => openSheet('hide') });
    if (switches.send) {
      actions.push({
        key: 'send',
        label: t('dagon.actions.send'),
        onPress: () => openSheet('send'),
      });
    }
    actions.push({ key: 'swap', label: t('dagon.actions.swap'), onPress: () => openSheet('swap') });
    if (switches.withdraw && !account.withdraw) {
      actions.push({
        key: 'withdraw',
        label: t('dagon.actions.withdraw'),
        onPress: () => openSheet('withdraw'),
      });
    }
  }
  // A withdraw already started stays reachable whatever the switch says (US7).
  if (account.withdraw) {
    actions.push({
      key: 'continueWithdraw',
      label: t('dagon.actions.continueWithdraw'),
      onPress: continueWithdraw,
    });
  }

  const items: DagonProgressItem[] = account.operations.map((each) => {
    const [first, second = otherSide(first)] = each.sides;
    return {
      id: each.id,
      title: t(`dagon.progress.item.${each.action}`, {
        amount: each.amount ? formatDagonAmount(each.amount) : '',
        token: tokenName(first),
        tokenOut: tokenName(second),
      }),
      stateLabel: t(`dagon.progress.${each.state}`),
      tone: PILL[each.state],
      hint: each.state === 'unknown' ? t('dagon.progress.unknownHint') : undefined,
    };
  });

  const status: UseDagonScreenLogicResult['status'] =
    configFailed || positionsFailed ? 'unavailable' : config && positions ? 'ready' : 'loading';

  const sheetFacts: FactsCardRow[] = [];
  if (mode && sheetBalance !== undefined) {
    sheetFacts.push({
      key: 'available',
      label: mode === 'hide' ? t('dagon.sheet.available') : t('dagon.sheet.lastRevealed'),
      value: `${formatDagonAmount(sheetBalance)} ${tokenName(side)}`,
    });
  }
  if (mode === 'swap' && units !== null) {
    sheetFacts.push({
      key: 'minimum',
      label: t('dagon.review.minimum'),
      value: `${formatDagonAmount(swapMinimum(units))} ${tokenName(otherSide(side))}`,
    });
  }
  const sheetWarning: Record<DagonSheetMode, string> = {
    hide: 'dagon.warnings.publicAmount',
    send: 'dagon.warnings.sendOutcome',
    swap: 'dagon.warnings.minimumCaveat',
    withdraw: 'dagon.warnings.withdrawPublic',
  };
  const amountError = amount.trim() !== '' && units === null;

  return {
    notice: { title: t('dagon.notice.title'), body: t('dagon.notice.body') },
    status,
    unavailable: {
      title: t(positionsFailed ? 'dagon.errors.positionsFailed' : 'dagon.unavailable.title'),
      body: t('dagon.unavailable.body'),
      retryLabel: t('dagon.unavailable.retry'),
      onRetry: () => {
        setPositionsFailed(false);
        setAttempt((previous) => previous + 1);
      },
    },
    activate:
      status === 'ready' && !activated
        ? {
            label: t('dagon.activate.label'),
            body: t('dagon.activate.body'),
            onPress: activate,
            loading: busy,
          }
        : null,
    cards,
    actions,
    faucet: config?.faucetUrl ? { label: t('dagon.actions.faucet'), url: config.faucetUrl } : null,
    progress: { title: t('dagon.progress.title'), empty: t('dagon.progress.empty'), items },
    error: mode ? null : say(error),
    sheet: {
      // Out of the way while core's confirmation (its own RN Modal) is up;
      // back, as typed, when the user backs out of it.
      visible: mode !== null && !busy,
      onClose: closeSheet,
      mode,
      title: mode ? t(`dagon.sheet.${mode}`) : '',
      amountLabel: t('dagon.sheet.amount'),
      amount,
      onChangeAmount: (value) => {
        shortcuts.onAmountChange(value);
      },
      shortcuts: {
        options: shortcuts.options,
        value: shortcuts.selected,
        onChange: shortcuts.select,
      },
      tokenLabel: t('dagon.sheet.token'),
      token: {
        side,
        name: tokenName(side),
        hint: t('dagon.sheet.changeToken'),
        onPress: () => setPickerOpen(true),
      },
      picker: {
        visible: pickerOpen,
        tokens: SIDES.map((each) => ({
          address: each,
          name: tokenName(each),
          symbol: each,
          uiAmount: '',
          decimals: DAGON_DECIMALS,
        })),
        onSelectToken: (token) => {
          setSide(token.symbol as Side);
          setPickerOpen(false);
        },
        onClose: () => setPickerOpen(false),
      },
      recipient:
        mode === 'send'
          ? {
              label: t('dagon.sheet.recipient'),
              value: recipient,
              onChangeText: setRecipient,
              placeholder: t('dagon.sheet.recipientPlaceholder'),
              error:
                recipient !== '' && !recipientValid ? t('dagon.sheet.recipientInvalid') : undefined,
            }
          : null,
      facts: sheetFacts,
      warning: mode ? t(sheetWarning[mode]) : null,
      submit: {
        label: t('dagon.sheet.continue'),
        onPress: submit,
        disabled: busy || units === null || (mode === 'send' && !recipientValid),
        loading: busy,
      },
      error: mode && error ? say(error) : amountError ? t('dagon.sheet.amountInvalid') : null,
    },
  };
}
