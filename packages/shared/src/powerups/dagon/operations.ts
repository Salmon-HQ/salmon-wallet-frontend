/**
 * The Dagon Powerup's persisted state and the pure steps that change it:
 * the operations in progress, the last revealed balances, the withdraw's
 * public addresses between steps, and what core's confirmation shows. Shape
 * in specs/043-dagon-powerup/data-model.md. No field here ever holds key
 * material (FR-029): fresh keys live and die inside core.
 */
import i18n from 'i18next';
import { getBase64Decoder, getBase64Encoder } from '@solana/kit';
import type { ProposalDisplay, ReadAuthorization } from '../../core/confirmation';
import type { PowerupBuildEnvelope } from '../backend/types';
import { fromBaseUnits, toBaseUnits } from '../../utils/decimals';
import { isSettled } from './chain';
import {
  DAGON_DECIMALS,
  DECRYPT_CAP_MS,
  FRESH_SIGNERS as FRESH_COUNT,
  LAMPORTS_PER_SIGNATURE,
  MAX_OPERATIONS,
  SETTLE_CAP_MS,
  SWAP_MIN_OUT_RATIO_BPS,
  type DagonAction,
  type Side,
} from './constants';

export type OperationState = 'processing' | 'done' | 'unknown';

/** A ciphertext whose settlement means Encrypt finished; `snapshot` = its digest before sending. */
export interface WatchedCiphertext {
  address: string;
  snapshot: string | null;
}

/** `ReadAuthorization` as base64 strings, so it survives storage; public data (R5). */
export interface StoredReadAuthorization {
  message: string;
  signature: string;
  signer: string;
}

export interface DagonOperation {
  id: string;
  action: DagonAction;
  sides: Side[];
  /** Base units as requested; never an outcome. */
  amount?: string;
  submittedAt: number;
  watch: WatchedCiphertext[];
  state: OperationState;
  /** Reveal only: what the executor read is signed with. */
  readAuthorization?: StoredReadAuthorization;
  /** Reveal only: the last executor read failed; a tap on Reveal retries it. */
  readFailed?: boolean;
}

export interface WithdrawProgress {
  side: Side;
  amount: string;
  /** The next step to run. */
  step: 1 | 2 | 3;
  burnedCt?: string;
  requestAcct?: string;
  decryptRequestedAt?: number;
}

export interface DagonAccountState {
  revealed: Partial<Record<Side, { amount: string; readAt: number }>>;
  operations: DagonOperation[];
  withdraw?: WithdrawProgress;
}

export type DagonState = Readonly<Record<string, DagonAccountState>>;

export const EMPTY_ACCOUNT: DagonAccountState = { revealed: {}, operations: [] };
export const EMPTY_STATE: DagonState = {};

export const accountKey = (publicKey: string, networkId: string): string =>
  `${publicKey}:${networkId}`;

export const capFor = (action: DagonAction): number =>
  action === 'unwrapDecrypt' ? DECRYPT_CAP_MS : SETTLE_CAP_MS;

/** Base units of a typed amount, or null when it is not positive or has more than 2 decimals. */
export function parseDagonAmount(text: string): bigint | null {
  if (!/^\d+(\.\d{0,2})?$/.test(text.trim())) return null;
  const units = toBaseUnits(text.trim(), DAGON_DECIMALS);
  return units > 0n ? units : null;
}

export function formatDagonAmount(units: string | bigint): string {
  const value = BigInt(units);
  const cents = (value % 100n).toString().padStart(2, '0');
  return `${value / 100n}.${cents}`;
}

export const swapMinimum = (amountIn: bigint): bigint =>
  (amountIn * SWAP_MIN_OUT_RATIO_BPS) / 10_000n;

export function recordOperation(
  account: DagonAccountState,
  operation: DagonOperation
): DagonAccountState {
  return { ...account, operations: [operation, ...account.operations].slice(0, MAX_OPERATIONS) };
}

export function patchOperation(
  account: DagonAccountState,
  id: string,
  patch: Partial<DagonOperation>
): DagonAccountState {
  return {
    ...account,
    operations: account.operations.map((each) => (each.id === id ? { ...each, ...patch } : each)),
  };
}

const withinCap = (operation: DagonOperation, now: number) =>
  now - operation.submittedAt <= capFor(operation.action);

/** Every ciphertext a poll must read, once each. */
export function watchedAddresses(account: DagonAccountState, now: number): string[] {
  const addresses = account.operations
    .filter((each) => each.state === 'processing' && withinCap(each, now))
    .flatMap((each) => each.watch.map((watched) => watched.address));
  return [...new Set(addresses)];
}

function nextState(
  operation: DagonOperation,
  now: number,
  read: (address: string) => Uint8Array | null | undefined
): OperationState {
  if (operation.state !== 'processing') return operation.state;
  if (!withinCap(operation, now)) return 'unknown';
  // The decryption request has no account this code can decode (O8): it
  // stays processing until step 3 confirms or its cap passes.
  if (operation.action === 'unwrapDecrypt') return 'processing';
  const settled = operation.watch.every(({ address, snapshot }) =>
    isSettled(snapshot, read(address) ?? null)
  );
  return settled ? 'done' : 'processing';
}

/** Processing → done on settlement of every watched ciphertext, → unknown past the cap. */
export function advanceOperations(
  account: DagonAccountState,
  now: number,
  read: (address: string) => Uint8Array | null | undefined
): DagonAccountState {
  let changed = false;
  const operations = account.operations.map((each) => {
    const state = nextState(each, now, read);
    if (state === each.state) return each;
    changed = true;
    return { ...each, state };
  });
  return changed ? { ...account, operations } : account;
}

/** A revealed value older than a later operation Encrypt finished on that side (FR-022). */
export function isOutOfDate(account: DagonAccountState, side: Side): boolean {
  const revealed = account.revealed[side];
  if (!revealed) return false;
  return account.operations.some(
    (each) =>
      each.state === 'done' &&
      each.action !== 'reveal' &&
      each.sides.includes(side) &&
      each.submittedAt > revealed.readAt
  );
}

/**
 * The withdraw's next step after one confirmed. Only public addresses are
 * kept: `burnedCt` after step 1, `requestAcct` after step 2 (Q3, FR-029).
 * `alreadyRequested` is the backend saying step 2 is on chain already.
 */
export function withdrawAfter(
  progress: WithdrawProgress | undefined,
  event: 'unwrapBurn' | 'unwrapDecrypt' | 'unwrapComplete' | 'alreadyRequested',
  input: { side?: Side; amount?: string; freshSigner?: string; now: number }
): WithdrawProgress | undefined {
  switch (event) {
    case 'unwrapBurn':
      return {
        side: input.side ?? 'USDC',
        amount: input.amount ?? '0',
        step: 2,
        burnedCt: input.freshSigner,
      };
    case 'unwrapDecrypt':
      return (
        progress && {
          ...progress,
          step: 3,
          requestAcct: input.freshSigner,
          decryptRequestedAt: input.now,
        }
      );
    case 'alreadyRequested':
      return progress?.requestAcct ? { ...progress, step: 3 } : progress;
    case 'unwrapComplete':
      return undefined;
  }
}

// `signer` in both shapes is the viewer's public key, never key material.
export function toStoredAuthorization({
  message,
  signature,
  signer,
}: ReadAuthorization): StoredReadAuthorization {
  const decoder = getBase64Decoder();
  return {
    message: decoder.decode(message),
    signature: decoder.decode(signature),
    signer: decoder.decode(signer),
  };
}

export function fromStoredAuthorization({
  message,
  signature,
  signer,
}: StoredReadAuthorization): ReadAuthorization {
  const encoder = getBase64Encoder();
  return {
    message: new Uint8Array(encoder.encode(message)),
    signature: new Uint8Array(encoder.encode(signature)),
    signer: new Uint8Array(encoder.encode(signer)),
  };
}

/** 5000 lamports per signature plus the priority fee; null when the envelope omits it (O9, R10). */
export function networkFeeLamports(
  envelope: Pick<PowerupBuildEnvelope, 'priorityFeeMicroLamports' | 'computeUnitLimit'>,
  freshSigners: number
): bigint | null {
  const { priorityFeeMicroLamports: price, computeUnitLimit: units } = envelope;
  if (price == null || units == null) return null;
  const priority = (BigInt(price) * BigInt(units) + 999_999n) / 1_000_000n;
  return LAMPORTS_PER_SIGNATURE * BigInt(1 + freshSigners) + priority;
}

const t = (key: string, options?: Record<string, unknown>): string => {
  const value: unknown = i18n.t(key, options);
  return typeof value === 'string' ? value : key;
};

export const tokenName = (side: Side): string => t(`dagon.tokens.${side}`);

export interface ReviewInput {
  envelope: Pick<PowerupBuildEnvelope, 'priorityFeeMicroLamports' | 'computeUnitLimit'>;
  /** The side, or for a swap [in, out]. */
  sides: readonly Side[];
  amount?: bigint;
  minimum?: bigint;
  recipient?: string;
  /** Setup for another wallet (a send's recipient). */
  owner?: string;
}

const WARNINGS: Partial<Record<DagonAction, string>> = {
  wrap: 'dagon.warnings.publicAmount',
  unwrapBurn: 'dagon.warnings.withdrawPublic',
  swap: 'dagon.warnings.minimumCaveat',
  reveal: 'dagon.warnings.revealCost',
  send: 'dagon.warnings.sendOutcome',
};

/** What core's confirmation shows for one Dagon transaction; the receipt never says done (FR-025). */
export function reviewDisplay(
  action: DagonAction,
  { envelope, sides, amount, minimum, recipient, owner }: ReviewInput
): Omit<ProposalDisplay, 'attribution' | 'contributor'> {
  const [side, sideOut = side] = sides;
  const rows: ProposalDisplay['rows'] = [];
  const amountLine = amount !== undefined ? `${formatDagonAmount(amount)} ${tokenName(side)}` : '';
  if (amount !== undefined) rows.push({ label: t('dagon.review.amount'), value: amountLine });
  if (minimum !== undefined) {
    rows.push({
      label: t('dagon.review.minimum'),
      value: `${formatDagonAmount(minimum)} ${tokenName(sideOut)}`,
    });
  }
  if (recipient) rows.push({ label: t('dagon.review.recipient'), value: recipient });
  if (owner) rows.push({ label: t('dagon.review.owner'), value: owner });
  if (action === 'reveal') {
    rows.push({ label: t('dagon.review.cost'), value: t('dagon.review.costValue') });
  }
  const fee = networkFeeLamports(envelope, FRESH_COUNT[action]);
  if (fee !== null) {
    rows.push({ label: t('dagon.review.networkFee'), value: `${fromBaseUnits(fee, 9)} SOL` });
  }
  const warning = WARNINGS[action];
  return {
    title: t(`dagon.review.${action}`, {
      token: tokenName(side),
      tokenIn: tokenName(side),
      tokenOut: tokenName(sideOut),
    }),
    rows,
    warning: warning ? { title: t(warning) } : undefined,
    receipt: { title: t('dagon.receipt.submitted') },
    pendingTitle: t('dagon.pending.title'),
    pendingSubtitle: amountLine || tokenName(side),
  };
}
