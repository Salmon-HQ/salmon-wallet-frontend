/**
 * usePaymentsScreenLogic — the Payments Powerup's screen state, shared by both
 * twins: the two actions over the list, the ask sheet's form, the open
 * request and what the network says about it. The twins render rows they did
 * not build.
 *
 * The Powerup owns no storage and no signer: the list lives behind
 * `usePowerupState`, the reference is a fresh public key, and the settlement
 * check is a read of the network at `finalized`.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import i18n from 'i18next';
import { generateKeyPair, getAddressFromPublicKey } from '@solana/kit';

import { USDC_DECIMALS, USDC_MINT_BY_NETWORK } from '../../blockchain/solana/known-mints';
import { solanaRpcFor } from '../../blockchain/solana/networks';
import { getShortAddress } from '../../utils/address';
import { findTransferRequestSettlement } from '../../blockchain/solana/transfer-request-settlement';
import { useAccountsContext } from '../../contexts/AccountsContext';
import { useCopyFeedback } from '../../hooks/useCopyFeedback';
import { useFiatLine } from '../../hooks/useFiatLine';
import { useBalance } from '../../hooks/useBalance';
import { usePowerupState } from '../../hooks/usePowerupState';
import type { NetworkId, SolanaNetworkId } from '../../types/blockchain';
import type {
  FactsCardRow,
  IconBubbleSize,
  PaymentRequestSheetPropsBase,
  PaymentRequestStatusView,
  PaymentsFormView,
} from '../../types/ui/index';
import { isSignableAccount } from '../../utils/account';
import { componentSizes } from '../../theme/spacing';
import { copyToClipboard } from '../../utils/clipboard';
import {
  DEFAULT_EXPIRY,
  EXPIRY_OPTIONS,
  PAYMENTS_COUNTDOWN_TICK_MS,
  PAYMENTS_ID,
  PAYMENTS_NOTE_MAX_LENGTH,
  PAYMENTS_STATUS_POLL_MS,
} from './constants';
import {
  formatAtomic,
  listKey,
  remaining,
  requestIdFor,
  settlementQueryFor,
  stateOf,
  uriFor,
  validateAmount,
} from './requests';
import type { ExpiryKey, PaymentRequest, PaymentsState } from './types';

const EMPTY_STATE: PaymentsState = { requests: {} };
const NO_REQUESTS: readonly PaymentRequest[] = [];
const ACTION_BUBBLE = {
  size: componentSizes.iconBubbleSm,
  iconWeight: 'bold',
  iconSize: componentSizes.iconSizeXSmall,
} as const;

export type PaymentsErrorKey =
  | 'payments.errors.usdcUnavailable'
  | 'payments.errors.amountInvalid'
  | 'payments.errors.amountTooManyDecimals'
  | 'payments.errors.createFailed';

/** One list row, derived once for both twins. */
export interface PaymentRequestRow {
  id: string;
  state: 'pending' | 'paid' | 'expired';
  /** What both twins hand `ListRow`: amount with its symbol, the note, the press. */
  listRow: {
    title: string;
    subtitle: string;
    padding: 'lg';
    accessibilityRole: 'button';
    onPress: () => void;
  };
  /** The trailing state, for a `KeyValueRow` with no label. */
  trailing: { label: ''; value: string; valueTone: 'primary' | 'success' | 'secondary' };
  /** The leading mark, minus the platform's glyph module. */
  bubble: { size: 40; shape: 'rounded'; tone: 'accent-tint'; iconWeight: 'bold' };
}

export interface UsePaymentsScreenLogicParams {
  publicKey: string;
  networkId: string | null;
  onNavigateHome?: () => void;
  onPay?: () => void;
  /** Test seams. */
  findSettlement?: typeof findTransferRequestSettlement;
  newReference?: () => Promise<string>;
  now?: () => number;
}

/** The ask sheet: its form and its open/close, composed here so neither twin restates the form. */
export interface PaymentsAskBindings {
  visible: boolean;
  onClose: () => void;
  title: string;
  form: PaymentsFormView;
}

/** One `IconBubble` over the list, minus the platform's glyph; Pay is null when this account cannot sign. */
export interface PaymentsActionBinding {
  onPress: () => void;
  accessibilityLabel: string;
  testID: string;
  size: IconBubbleSize;
  tone: 'accent' | 'outline';
  iconWeight: 'bold';
  iconSize: number;
}

export interface PaymentsActionsBindings {
  title: string;
  ask: PaymentsActionBinding;
  pay: PaymentsActionBinding | null;
}

/** The request sheet's contract minus what the platform adds: its share handler and its style. */
export type PaymentRequestSheetBindings = Omit<
  PaymentRequestSheetPropsBase<never>,
  'onShare' | 'style' | 'testID'
> & {
  /** Opened from the ask sheet: the twin renders it inside that sheet, as its child. */
  nested: boolean;
};

export interface PaymentsListBindings {
  title: string;
  empty: { title: string; body: string };
  rows: readonly PaymentRequestRow[];
}

export interface UsePaymentsScreenLogicResult {
  actions: PaymentsActionsBindings;
  ask: PaymentsAskBindings;
  list: PaymentsListBindings;
  /** Everything the request sheet takes but the platform's share handler. */
  sheet: PaymentRequestSheetBindings;
  /** The whole surface is unavailable (no USDC on this network), already translated. */
  unavailable: string | null;
  /** The list, and the open request, for tests and for the platform share. */
  requests: readonly PaymentRequestRow[];
  open: PaymentRequest | null;
  openRequest: (id: string) => void;
  closeRequest: () => void;
  remove: (id: string) => void;
  create: () => Promise<void>;
  openUri: string;
  openStatus: PaymentRequestStatusView | null;
}

async function freshReference(): Promise<string> {
  // A reference is only ever looked up; the private half is dropped on the floor.
  const pair = await generateKeyPair();
  return getAddressFromPublicKey(pair.publicKey);
}

// The key itself stands in until the resources are loaded, so nothing renders blank.
const t = (key: string, options?: Record<string, unknown>): string => {
  const value: unknown = i18n.t(key, options);
  return typeof value === 'string' ? value : key;
};

function durationLabel(expiresAt: number, now: number): string {
  const { days, hours, minutes } = remaining(expiresAt, now);
  if (days > 0) return t('payments.duration.days', { days, hours });
  if (hours > 0) return t('payments.duration.hours', { hours, minutes });
  return t('payments.duration.minutes', { minutes });
}

/** The sheet's facts, built once for both twins. */
export function statusViewFor(request: PaymentRequest, now: number): PaymentRequestStatusView {
  const state = stateOf(request, now);
  const rows: FactsCardRow[] = [];
  if (request.note) rows.push({ key: 'for', label: t('payments.sheet.for'), value: request.note });
  if (state === 'pending') {
    rows.push({
      key: 'expiresIn',
      label: t('payments.sheet.expiresIn'),
      value: durationLabel(request.expiresAt, now),
    });
  }
  rows.push({
    key: 'status',
    label: t('payments.sheet.status'),
    value: t(`payments.status.${state}`),
    valueTone: state === 'paid' ? 'success' : state === 'expired' ? 'secondary' : 'primary',
  });
  const settlement = request.settlement;
  if (state === 'paid' && settlement) {
    rows.push({
      key: 'paidBy',
      label: t('payments.sheet.paidBy'),
      value: getShortAddress(settlement.payer) ?? settlement.payer,
      valueFont: 'mono',
    });
    if (settlement.blockTime !== null) {
      rows.push({
        key: 'paidAt',
        label: t('payments.sheet.paidAt'),
        value: new Date(settlement.blockTime * 1000).toLocaleString(),
      });
    }
  }
  return {
    state,
    rows,
    signature: settlement?.signature,
    explorer: settlement
      ? { txHash: settlement.signature, blockchain: 'SOLANA', environment: request.networkId }
      : undefined,
    checkFailed: !!request.lastCheckError,
  };
}

export function usePaymentsScreenLogic({
  publicKey,
  networkId,
  onPay,
  findSettlement = findTransferRequestSettlement,
  newReference = freshReference,
  now = Date.now,
}: UsePaymentsScreenLogicParams): UsePaymentsScreenLogicResult {
  // The seams are read through refs so a caller passing fresh closures never
  // re-arms the poll on every render.
  const seams = useRef({ findSettlement, newReference, now });
  seams.current = { findSettlement, newReference, now };
  const [{ accountId, activeAccount, activeBlockchainAccount }] = useAccountsContext();
  const [state, setState] = usePowerupState<PaymentsState>(PAYMENTS_ID, EMPTY_STATE);

  const solanaNetworkId = (networkId ?? null) as SolanaNetworkId | null;
  const mint = solanaNetworkId ? USDC_MINT_BY_NETWORK[solanaNetworkId] : undefined;
  const token = useMemo(() => (mint ? { symbol: 'USDC', decimals: USDC_DECIMALS } : null), [mint]);

  // The fiat line reads the holding's price when there is one. USDC is the
  // dollar by construction, so a wallet holding none still gets a line.
  const { tokens } = useBalance({
    account: activeBlockchainAccount ?? undefined,
    networkId: (networkId ?? undefined) as NetworkId | undefined,
    skip: !activeBlockchainAccount,
  });
  const usdcPrice = tokens.find((held) => held.address === mint)?.price ?? 1;

  const [amount, setAmount] = useState('');
  const [note, setNoteRaw] = useState('');
  const [expiry, setExpiry] = useState<ExpiryKey>(DEFAULT_EXPIRY);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<PaymentsErrorKey | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  // A request born in the ask sheet opens as that sheet's child — the ask
  // slides down first, then the request rises, on the same backdrop (see
  // `SheetParentContext`). One opened from the list has no parent.
  const [nested, setNested] = useState(false);
  const [clock, setClock] = useState(() => seams.current.now());

  const setNote = useCallback(
    (value: string) => setNoteRaw(value.slice(0, PAYMENTS_NOTE_MAX_LENGTH)),
    []
  );

  const key = accountId && solanaNetworkId ? listKey(accountId, solanaNetworkId) : null;
  const list = key ? (state.requests[key] ?? NO_REQUESTS) : NO_REQUESTS;

  const validation = useMemo(
    () => (token ? validateAmount(amount, token.decimals) : null),
    [amount, token]
  );
  const amountError: PaymentsErrorKey | null =
    amount.trim() === '' || !validation || validation.ok
      ? null
      : validation.reason === 'tooManyDecimals'
        ? 'payments.errors.amountTooManyDecimals'
        : 'payments.errors.amountInvalid';

  const fiatLine = useFiatLine(validation?.ok ? validation.display : '', usdcPrice);

  const update = useCallback(
    (id: string, patch: Partial<PaymentRequest>) => {
      if (!key) return;
      setState((previous) => ({
        requests: {
          ...previous.requests,
          [key]: (previous.requests[key] ?? NO_REQUESTS).map((request) =>
            request.id === id ? { ...request, ...patch } : request
          ),
        },
      }));
    },
    [key, setState]
  );

  const create = useCallback(async () => {
    if (!key || !token || !mint || !solanaNetworkId || !accountId || !validation?.ok) return;
    setIsCreating(true);
    setError(null);
    try {
      const reference = await seams.current.newReference();
      const createdAt = seams.current.now();
      const option =
        EXPIRY_OPTIONS.find((candidate) => candidate.key === expiry) ?? EXPIRY_OPTIONS[1];
      const request: PaymentRequest = {
        id: requestIdFor(reference),
        accountId,
        networkId: solanaNetworkId,
        recipient: publicKey,
        mint,
        decimals: token.decimals,
        symbol: token.symbol,
        amountAtomic: validation.atomic,
        note: note.trim(),
        reference,
        createdAt,
        expiresAt: createdAt + option.ms,
        status: 'pending',
      };
      setState((previous) => ({
        requests: {
          ...previous.requests,
          [key]: [request, ...(previous.requests[key] ?? NO_REQUESTS)],
        },
      }));
      setAmount('');
      setNoteRaw('');
      setExpiry(DEFAULT_EXPIRY);
      setNested(true);
      setOpenId(request.id);
      setIsAsking(false);
    } catch (caught) {
      console.error('[payments] Failed to create the request:', caught);
      setError('payments.errors.createFailed');
    } finally {
      setIsCreating(false);
    }
  }, [key, token, mint, solanaNetworkId, accountId, validation, expiry, publicKey, note, setState]);

  const remove = useCallback(
    (id: string) => {
      if (!key) return;
      setOpenId((current) => (current === id ? null : current));
      setState((previous) => ({
        requests: {
          ...previous.requests,
          [key]: (previous.requests[key] ?? NO_REQUESTS).filter((request) => request.id !== id),
        },
      }));
    },
    [key, setState]
  );

  const open = useMemo(() => list.find((request) => request.id === openId) ?? null, [list, openId]);

  // One check of a pending request; a failure keeps the last known state.
  const check = useCallback(
    async (request: PaymentRequest) => {
      if (!solanaNetworkId) return;
      try {
        const settlement = await seams.current.findSettlement(
          solanaRpcFor(solanaNetworkId),
          settlementQueryFor(request)
        );
        const lastCheckedAt = seams.current.now();
        update(
          request.id,
          settlement
            ? { status: 'paid', settlement, lastCheckedAt, lastCheckError: false }
            : { lastCheckedAt, lastCheckError: false }
        );
      } catch {
        update(request.id, { lastCheckError: true });
      }
    },
    [solanaNetworkId, update]
  );

  // The open, pending request polls on its own clock; nothing else does. The
  // check is read through a ref: the poll is armed by which request is open,
  // never by a re-created callback.
  const checkRef = useRef(check);
  checkRef.current = check;
  const openRef = useRef(open);
  openRef.current = open;
  const openIsPending = !!open && stateOf(open, clock) === 'pending';
  const pollId = openIsPending ? open.id : null;
  useEffect(() => {
    if (!pollId) return undefined;
    const tick = () => {
      const current = openRef.current;
      if (current?.id === pollId) void checkRef.current(current);
    };
    tick();
    const timer = setInterval(tick, PAYMENTS_STATUS_POLL_MS);
    return () => clearInterval(timer);
  }, [pollId]);

  // The countdown row recomputes on its own interval while a request is open.
  const openId2 = open?.id ?? null;
  useEffect(() => {
    if (!openId2) return undefined;
    setClock(seams.current.now());
    const timer = setInterval(() => setClock(seams.current.now()), PAYMENTS_COUNTDOWN_TICK_MS);
    return () => clearInterval(timer);
  }, [openId2]);

  // The list refreshes its pending rows once when it mounts, so a payment
  // that landed while the app was away is reflected without opening each one.
  const listRef = useRef(list);
  listRef.current = list;
  useEffect(() => {
    if (!key) return;
    const at = seams.current.now();
    for (const request of listRef.current) {
      if (stateOf(request, at) === 'pending') void checkRef.current(request);
    }
  }, [key]);

  const requests = useMemo<readonly PaymentRequestRow[]>(() => {
    const at = seams.current.now();
    return list.map((request) => {
      const state = stateOf(request, at);
      return {
        id: request.id,
        state,
        listRow: {
          title: `${formatAtomic(request.amountAtomic, request.decimals)} ${request.symbol}`,
          subtitle: request.note || t('payments.list.noNote'),
          padding: 'lg',
          accessibilityRole: 'button',
          onPress: () => {
            setNested(false);
            setOpenId(request.id);
          },
        },
        trailing: {
          label: '',
          value: t(`payments.status.${state}`),
          valueTone: state === 'paid' ? 'success' : state === 'expired' ? 'secondary' : 'primary',
        },
        bubble: { size: 40, shape: 'rounded', tone: 'accent-tint', iconWeight: 'bold' },
      };
    });
    // `clock` re-judges expiry while a sheet is open; opening or closing one
    // re-judges the list, so a request that expired meanwhile reads as such.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, clock, openId]);

  const accountLabel = activeAccount?.name ?? '';
  const openUri = open ? uriFor(open, accountLabel) : '';
  const openStatus = useMemo(() => (open ? statusViewFor(open, clock) : null), [open, clock]);

  const { copied, trigger: showCopied, reset: resetCopied } = useCopyFeedback();
  useEffect(() => {
    if (!open) resetCopied();
  }, [open, resetCopied]);
  const copyOpen = useCallback(async () => {
    if (!openUri) return;
    try {
      if (await copyToClipboard(openUri)) showCopied();
    } catch {
      // Copy failed — the label stays honest.
    }
  }, [openUri, showCopied]);

  const canCreate = !!token && !!key && !!validation?.ok && !isCreating;
  const canPay = !!onPay && !!activeBlockchainAccount && isSignableAccount(activeBlockchainAccount);
  // Dismissing the ask sheet is a cancel: the next one starts blank.
  const closeAsk = () => {
    setIsAsking(false);
    setAmount('');
    setNoteRaw('');
    setExpiry(DEFAULT_EXPIRY);
    setError(null);
  };
  const openAmountLabel = open
    ? `${formatAtomic(open.amountAtomic, open.decimals)} ${open.symbol}`
    : '';

  return {
    actions: {
      title: t('payments.list.title'),
      ask: {
        onPress: () => setIsAsking(true),
        accessibilityLabel: t('payments.actions.ask'),
        testID: 'payments-ask-button',
        tone: 'accent',
        ...ACTION_BUBBLE,
      },
      pay: canPay
        ? {
            onPress: onPay,
            accessibilityLabel: t('payments.actions.pay'),
            testID: 'payments-pay-button',
            tone: 'outline',
            ...ACTION_BUBBLE,
          }
        : null,
    },
    ask: {
      visible: isAsking,
      onClose: closeAsk,
      title: t('payments.ask.title'),
      form: {
        amountLabel: t('payments.form.amount'),
        amountCard: {
          value: amount,
          onChangeValue: setAmount,
          placeholder: t('payments.form.amountPlaceholder'),
          subtext: fiatLine,
        },
        noteLabel: t('payments.form.note'),
        noteField: {
          value: note,
          onChangeText: setNote,
          placeholder: t('payments.form.notePlaceholder'),
          maxLength: PAYMENTS_NOTE_MAX_LENGTH,
          error: amountError ? t(amountError) : undefined,
        },
        expiryLabel: t('payments.form.expiry'),
        expiryChips: {
          options: EXPIRY_OPTIONS.map((option) => ({ key: option.key, label: t(option.labelKey) })),
          value: expiry,
          onChange: (next) => setExpiry(next as ExpiryKey),
          size: 'md',
          fill: true,
          variant: 'outline',
        },
        createButton: {
          onPress: () => void create(),
          disabled: !canCreate,
          loading: isCreating,
          label: t('payments.form.create'),
        },
        errorRow: error ? { label: '', value: t(error), valueTone: 'danger' } : undefined,
      },
    },
    list: {
      title: t('payments.list.title'),
      empty: { title: t('payments.list.empty.title'), body: t('payments.list.empty.body') },
      rows: requests,
    },
    sheet: {
      nested,
      visible: open !== null,
      onClose: () => setOpenId(null),
      title: t('payments.sheet.title'),
      uri: openUri,
      showCode: openStatus?.state === 'pending',
      amountLabel: openAmountLabel,
      status: openStatus,
      checkFailedNotice: openStatus?.checkFailed ? t('payments.status.checkFailed') : undefined,
      copyButton: {
        onPress: () => void copyOpen(),
        label: t(copied ? 'payments.sheet.copied' : 'payments.sheet.copy'),
      },
      shareLabel: t('payments.sheet.share'),
      removeButton: {
        onPress: () => {
          if (open) remove(open.id);
        },
        label: t('payments.sheet.remove'),
      },
    },
    unavailable: token ? null : t('payments.errors.usdcUnavailable'),
    requests,
    open,
    openRequest: setOpenId,
    closeRequest: () => setOpenId(null),
    remove,
    create,
    openUri,
    openStatus,
  };
}
