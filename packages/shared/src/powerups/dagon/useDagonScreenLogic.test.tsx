/**
 * @vitest-environment jsdom
 *
 * The Dagon tab's logic against a fake build route and a fake core: what it
 * asks the backend for, what it hands core, what it records, and how it
 * answers every failure. Nothing here touches the network or a key.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { useCallback, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../api/client';
import { SolanaOutcomeUnknownError } from '../../blockchain/solana/confirm';
import {
  SignatureRequestCancelledError,
  type FreshSignatureRequest,
  type SignedResult,
  type TransactionProposal,
} from '../../core/confirmation/types';

const core = vi.hoisted(() => ({ request: vi.fn() }));
// One persisted slice for the file, like the real seam: a second mount reads
// what the first wrote.
const stored = vi.hoisted(() => ({ value: undefined as unknown }));
vi.mock('../../core/confirmation/SignatureRequestContext', () => ({
  useRequestFreshSignature: () => core.request,
}));
vi.mock('../../hooks/usePowerupState', () => ({
  usePowerupState: <T,>(_id: string, initial: T) => {
    const [state, setState] = useState<T>((stored.value as T | undefined) ?? initial);
    const set = useCallback(
      (update: T | ((previous: T) => T)) =>
        setState((previous) => {
          const next = typeof update === 'function' ? (update as (p: T) => T)(previous) : update;
          stored.value = next;
          return next;
        }),
      []
    );
    return [state, set];
  },
}));
vi.mock('../../blockchain/solana/networks', () => ({ solanaRpcFor: () => ({}) }));

import devnet from './fixtures/devnet.json';
import { parseDagonConfig } from './config';
import type { Positions } from './chain';
import { POLL_MS, SOL_FLOOR_LAMPORTS } from './constants';
import { useDagonScreenLogic, type UseDagonScreenLogicParams } from './useDagonScreenLogic';

const OWNER = 'EWTW7CHSVCNqnEikcxXJzFtGGZSRUevdfPfzavYc1bfX';
const RECIPIENT = 'mvines9iiHiQTysrwkJjGf2gb9Ex9jXJX8ns3qwf2kN';
const CT_USDC = 'CJbH1QaZ6YvJL4eh52EEKjtYpAQdqcVfMbYwQYHcN5t9';
const CT_DOGE = '877tcqUynNYNkwQZeWHWcyKWhAJHgehmG9ukLqs9A1Mi';
const FRESH = 'GQw1vJmsPJm5gTtSKEUJQhP3kQDQ8NPyaPHUqPMo2Zgd';
const VIEWER = '28JTAfYTdr52mVzGuhkR2ViCowDudTADz7zYkJpQFh9C';
const CONFIG = parseDagonConfig(devnet)!;

const ENVELOPE = {
  provider: 'dagon',
  providerDisplayName: 'Dagon (devnet preview)',
  attribution: null,
  transaction: 'AQ==',
  expiresAt: '2099-01-01T00:00:00Z',
  salmonFee: null,
  routeFee: null,
  contributor: null,
  priorityFeeMicroLamports: 1000,
  computeUnitLimit: 200000,
};

const AUTH = {
  message: new Uint8Array(43).fill(1),
  signature: new Uint8Array(64).fill(2),
  signer: new Uint8Array(32).fill(3),
};

function positions(
  patch: { activated?: boolean; sol?: bigint; zeroUsdc?: boolean } = {}
): Positions {
  const activated = patch.activated ?? true;
  return {
    activated,
    sol: patch.sol ?? 1_000_000_000n,
    sides: {
      USDC: {
        activated,
        balanceCt: activated ? CT_USDC : null,
        digest: '01'.repeat(32),
        zeroDigest: patch.zeroUsdc ?? false,
        publicBalance: 100_000n,
      },
      DOGE: {
        activated,
        balanceCt: activated ? CT_DOGE : null,
        digest: '01'.repeat(32),
        zeroDigest: false,
        publicBalance: 100_000n,
      },
    },
  };
}

/** A settled ciphertext, digest 0x02… */
function settled(): Uint8Array {
  const data = new Uint8Array(100);
  data.fill(2, 2, 34);
  data[99] = 1;
  return data;
}

/** What core does with a fresh request: build, confirm (onOutcome), resolve. */
function confirmingCore(result: Partial<SignedResult> = {}) {
  const proposals: TransactionProposal[] = [];
  core.request.mockImplementation(async (request: FreshSignatureRequest) => {
    const proposal = await request.build({
      freshSigners: request.count === 1 ? [FRESH] : [],
      ...(request.viewer ? { viewer: VIEWER } : {}),
    });
    proposals.push(proposal);
    proposal.onOutcome?.(true);
    return { signature: 'sig', ...result };
  });
  return proposals;
}

let build: ReturnType<typeof vi.fn>;
let readBalance: ReturnType<typeof vi.fn>;
let readAccounts: ReturnType<typeof vi.fn>;
let readPositions: ReturnType<typeof vi.fn>;
let fetchConfig: ReturnType<typeof vi.fn>;

beforeEach(() => {
  stored.value = undefined;
  core.request.mockReset();
  build = vi.fn(async () => ENVELOPE);
  readBalance = vi.fn(async () => 4_200n);
  readAccounts = vi.fn(async (addresses: string[]) => addresses.map(() => settled()));
  readPositions = vi.fn(async () => positions());
  fetchConfig = vi.fn(async () => CONFIG);
});

afterEach(() => {
  vi.useRealTimers();
});

function setup(params: Partial<UseDagonScreenLogicParams> = {}) {
  return renderHook(() =>
    useDagonScreenLogic({
      publicKey: OWNER,
      networkId: 'solana-devnet',
      buildPowerup: build as never,
      fetchConfig: fetchConfig as never,
      readPositions: readPositions as never,
      readAccounts: readAccounts as never,
      readBalance: readBalance as never,
      ...params,
    })
  );
}

async function ready(view: ReturnType<typeof setup>) {
  await waitFor(() => expect(view.result.current.status).toBe('ready'));
}

describe('useDagonScreenLogic — the tab', () => {
  it('shows the devnet notice and only Activate on a first visit (US1)', async () => {
    readPositions.mockResolvedValue(positions({ activated: false }));
    const view = setup();
    expect(view.result.current.status).toBe('loading');
    expect(view.result.current.notice.title).toBe('dagon.notice.title');
    await ready(view);
    expect(view.result.current.activate).not.toBeNull();
    expect(view.result.current.cards).toEqual([]);
    expect(view.result.current.actions).toEqual([]);
  });

  it('shows the unavailable state with a retry when devnet.json is refused (FR-011)', async () => {
    fetchConfig.mockRejectedValueOnce(new Error('refused'));
    const view = setup();
    await waitFor(() => expect(view.result.current.status).toBe('unavailable'));
    expect(build).not.toHaveBeenCalled();
    act(() => view.result.current.unavailable.onRetry());
    await ready(view);
    expect(fetchConfig).toHaveBeenCalledTimes(2);
  });

  it('offers Get test tokens only with a faucet URL', async () => {
    const view = setup();
    await ready(view);
    expect(view.result.current.faucet).toBeNull();
    fetchConfig.mockResolvedValue({ ...CONFIG, faucetUrl: 'https://faucet.example.com' });
    const withFaucet = setup();
    await ready(withFaucet);
    expect(withFaucet.result.current.faucet?.url).toBe('https://faucet.example.com');
  });

  it('lists Hide and Swap, and hides Send and Withdraw while their switches are off', async () => {
    const view = setup();
    await ready(view);
    expect(view.result.current.actions.map((action) => action.key)).toEqual(['hide', 'swap']);
    const on = setup({ switches: { send: true, withdraw: true } });
    await ready(on);
    expect(on.result.current.actions.map((action) => action.key)).toEqual([
      'hide',
      'send',
      'swap',
      'withdraw',
    ]);
  });

  it('activates each side as its own request, skipping one already set up', async () => {
    readPositions.mockResolvedValue(positions({ activated: false }));
    confirmingCore();
    build.mockRejectedValueOnce(new ApiError('x', 409, 'already_initialized'));
    const view = setup();
    await ready(view);
    await act(async () => view.result.current.activate!.onPress());
    expect(core.request).toHaveBeenCalledTimes(2);
    expect(build.mock.calls.map((call) => call[2])).toEqual([
      { publicKey: OWNER, action: 'setup', side: 'USDC', freshSigners: FRESH },
      { publicKey: OWNER, action: 'setup', side: 'DOGE', freshSigners: FRESH },
    ]);
    expect(view.result.current.error).toBeNull();
  });
});

describe('useDagonScreenLogic — building through core', () => {
  it('hides through the build route, with no pending banner and the manifest programs (FR-028, FR-050)', async () => {
    const proposals = confirmingCore();
    const view = setup();
    await ready(view);
    act(() => view.result.current.actions[0].onPress());
    act(() => view.result.current.sheet.onChangeAmount('10.5'));
    await act(async () => view.result.current.sheet.submit.onPress());
    expect(core.request).toHaveBeenCalledWith(
      expect.objectContaining({
        powerupId: 'dagon',
        networkId: 'solana-devnet',
        count: 1,
        viewer: false,
      })
    );
    expect(build).toHaveBeenCalledWith('dagon', 'solana-devnet', {
      publicKey: OWNER,
      action: 'wrap',
      side: 'USDC',
      amount: '1050',
      freshSigners: FRESH,
    });
    expect(proposals[0].pending).toBeUndefined();
    expect(proposals[0].expect.allowedPrograms).toContain(
      '3kjJEx6G1XdrtixFg9f8eGRAyzW5QmhsJQq6qCUZYhXZ'
    );
    expect(proposals[0].display.receipt?.title).toBe('dagon.receipt.submitted');
    // Recorded at confirmation (onOutcome), watching the balance ciphertext.
    expect(view.result.current.progress.items).toHaveLength(1);
    expect(view.result.current.progress.items[0].stateLabel).toBe('dagon.progress.processing');
    expect(view.result.current.sheet.visible).toBe(false);
  });

  it('swaps with sideIn, sideOut, amountIn and the 99% minimum', async () => {
    confirmingCore();
    const view = setup();
    await ready(view);
    act(() => view.result.current.actions.find((a) => a.key === 'swap')!.onPress());
    act(() => view.result.current.sheet.onChangeAmount('1'));
    await act(async () => view.result.current.sheet.submit.onPress());
    expect(build.mock.calls[0][2]).toEqual({
      publicKey: OWNER,
      action: 'swap',
      sideIn: 'USDC',
      sideOut: 'DOGE',
      amountIn: '100',
      minAmountOut: '99',
      freshSigners: FRESH,
    });
  });

  it('refuses a swap from a balance Encrypt never settled (FR-030)', async () => {
    readPositions.mockResolvedValue(positions({ zeroUsdc: true }));
    const view = setup();
    await ready(view);
    act(() => view.result.current.actions.find((a) => a.key === 'swap')!.onPress());
    act(() => view.result.current.sheet.onChangeAmount('1'));
    await act(async () => view.result.current.sheet.submit.onPress());
    expect(core.request).not.toHaveBeenCalled();
    expect(view.result.current.sheet.error).toBe('dagon.errors.balanceSettling');
  });

  it('refuses before the build when devnet SOL is below the floor (O6)', async () => {
    readPositions.mockResolvedValue(positions({ sol: SOL_FLOOR_LAMPORTS - 1n }));
    const view = setup();
    await ready(view);
    act(() => view.result.current.actions[0].onPress());
    act(() => view.result.current.sheet.onChangeAmount('1'));
    await act(async () => view.result.current.sheet.submit.onPress());
    expect(core.request).not.toHaveBeenCalled();
    expect(view.result.current.sheet.error).toBe('dagon.errors.solShortfall');
  });

  it('sets the output side up first on setup_required, then rebuilds the swap (FR-053)', async () => {
    confirmingCore();
    build.mockRejectedValueOnce(new ApiError('x', 409, 'setup_required'));
    const view = setup();
    await ready(view);
    act(() => view.result.current.actions.find((a) => a.key === 'swap')!.onPress());
    act(() => view.result.current.sheet.onChangeAmount('1'));
    await act(async () => view.result.current.sheet.submit.onPress());
    expect(build.mock.calls.map((call) => call[2].action)).toEqual(['swap', 'setup', 'swap']);
    expect(build.mock.calls[1][2]).toEqual({
      publicKey: OWNER,
      action: 'setup',
      side: 'DOGE',
      freshSigners: FRESH,
    });
    expect(core.request).toHaveBeenCalledTimes(3);
  });

  it('sets the recipient up on recipient_setup_required (owner = to), then rebuilds the send', async () => {
    confirmingCore();
    build.mockRejectedValueOnce(new ApiError('x', 409, 'recipient_setup_required'));
    const view = setup({ switches: { send: true, withdraw: false } });
    await ready(view);
    act(() => view.result.current.actions.find((a) => a.key === 'send')!.onPress());
    act(() => view.result.current.sheet.onChangeAmount('1'));
    act(() => view.result.current.sheet.recipient!.onChangeText(RECIPIENT));
    await act(async () => view.result.current.sheet.submit.onPress());
    expect(build.mock.calls.map((call) => call[2])).toEqual([
      {
        publicKey: OWNER,
        action: 'send',
        side: 'USDC',
        amount: '100',
        to: RECIPIENT,
        freshSigners: '',
      },
      { publicKey: OWNER, action: 'setup', side: 'USDC', owner: RECIPIENT, freshSigners: FRESH },
      {
        publicKey: OWNER,
        action: 'send',
        side: 'USDC',
        amount: '100',
        to: RECIPIENT,
        freshSigners: '',
      },
    ]);
    expect(core.request.mock.calls[0][0].count).toBe(0);
  });

  it('on an unknown outcome clears the form, marks the item unknown and never resubmits (FR-032)', async () => {
    core.request.mockRejectedValue(new SolanaOutcomeUnknownError('sig' as never));
    const view = setup();
    await ready(view);
    act(() => view.result.current.actions[0].onPress());
    act(() => view.result.current.sheet.onChangeAmount('5'));
    await act(async () => view.result.current.sheet.submit.onPress());
    expect(core.request).toHaveBeenCalledTimes(1);
    expect(view.result.current.sheet.visible).toBe(false);
    expect(view.result.current.sheet.amount).toBe('');
    expect(view.result.current.error).toBe('transaction.errors.broadcastUnknown');
    expect(view.result.current.progress.items[0].stateLabel).toBe('dagon.progress.unknown');
  });

  it('changes nothing when the user cancels on core', async () => {
    core.request.mockRejectedValue(new SignatureRequestCancelledError());
    const view = setup();
    await ready(view);
    act(() => view.result.current.actions[0].onPress());
    act(() => view.result.current.sheet.onChangeAmount('5'));
    await act(async () => view.result.current.sheet.submit.onPress());
    expect(view.result.current.sheet.visible).toBe(true);
    expect(view.result.current.sheet.amount).toBe('5');
    expect(view.result.current.sheet.error).toBeNull();
    expect(view.result.current.progress.items).toEqual([]);
  });

  it.each([
    ['balance_settling', 409, 'dagon.errors.balanceSettling'],
    ['executor_pending', 503, 'dagon.errors.busy'],
    ['executor_unavailable', 503, 'dagon.errors.busy'],
    ['executor_bad_response', 502, 'dagon.errors.buildFailed'],
    ['invalid_fresh_signers', 400, 'dagon.errors.buildFailed'],
    ['simulation_failed', 422, 'dagon.errors.wrapFailed'],
    ['no_route', 404, 'transaction.errors.noRoute'],
  ])('maps %s on a hide through describePowerupBuildError', async (code, status, key) => {
    confirmingCore();
    build.mockRejectedValueOnce(new ApiError('x', status, code));
    const view = setup();
    await ready(view);
    act(() => view.result.current.actions[0].onPress());
    act(() => view.result.current.sheet.onChangeAmount('5'));
    await act(async () => view.result.current.sheet.submit.onPress());
    expect(view.result.current.sheet.error).toBe(key);
  });
});

describe('useDagonScreenLogic — reveal (SC-003, US3)', () => {
  it('never reveals on mount, focus or a timer', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const view = setup();
    await ready(view);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_MS * 20);
    });
    expect(core.request).not.toHaveBeenCalled();
    expect(build).not.toHaveBeenCalled();
    expect(readBalance).not.toHaveBeenCalled();
  });

  it('reveals only on a tap, then reads Encrypt with the authorization core returned', async () => {
    const proposals = confirmingCore({ readAuthorization: AUTH });
    const view = setup();
    await ready(view);
    expect(view.result.current.cards[0].rows.find((row) => row.key === 'hidden')?.value).toBe(
      'dagon.card.notRevealed'
    );
    await act(async () => view.result.current.cards[0].reveal.onPress());
    expect(core.request.mock.calls[0][0]).toMatchObject({ count: 1, viewer: true });
    expect(build.mock.calls[0][2]).toEqual({
      publicKey: OWNER,
      action: 'reveal',
      side: 'USDC',
      viewer: VIEWER,
      freshSigners: FRESH,
    });
    expect(proposals[0].display.rows).toContainEqual({
      label: 'dagon.review.cost',
      value: 'dagon.review.costValue',
    });
    // The poll sees viewCt settled, then the executor is read once.
    await waitFor(() => expect(readBalance).toHaveBeenCalledTimes(1), { timeout: POLL_MS * 3 });
    expect(readBalance).toHaveBeenCalledWith(CONFIG.encryptGrpcUrl, AUTH);
    await waitFor(() =>
      expect(view.result.current.cards[0].rows.find((row) => row.key === 'hidden')?.value).toBe(
        '42.00'
      )
    );
  });

  it('disables Reveal while one is in flight', async () => {
    let finish: (value: SignedResult) => void = () => undefined;
    core.request.mockImplementation(
      () => new Promise<SignedResult>((resolve) => (finish = resolve))
    );
    const view = setup();
    await ready(view);
    act(() => {
      void view.result.current.cards[0].reveal.onPress();
    });
    await waitFor(() => expect(view.result.current.cards[1].reveal.disabled).toBe(true));
    expect(view.result.current.cards[0].reveal.disabled).toBe(true);
    await act(async () => finish({ signature: 'sig' }));
  });

  it('retries a failed read with the same authorization, no new transaction (O4)', async () => {
    confirmingCore({ readAuthorization: AUTH });
    readBalance.mockRejectedValueOnce(new Error('executor down'));
    const view = setup();
    await ready(view);
    await act(async () => view.result.current.cards[0].reveal.onPress());
    await waitFor(() => expect(readBalance).toHaveBeenCalledTimes(1), { timeout: POLL_MS * 3 });
    await waitFor(() =>
      expect(view.result.current.cards[0].rows.some((row) => row.key === 'readFailed')).toBe(true)
    );
    await act(async () => view.result.current.cards[0].reveal.onPress());
    expect(core.request).toHaveBeenCalledTimes(1);
    expect(readBalance).toHaveBeenCalledTimes(2);
    expect(readBalance.mock.calls[1][1]).toEqual(AUTH);
  });
});

describe('useDagonScreenLogic — withdraw (US7, O8)', () => {
  async function burn(view: ReturnType<typeof setup>) {
    act(() => view.result.current.actions.find((a) => a.key === 'withdraw')!.onPress());
    act(() => view.result.current.sheet.onChangeAmount('5'));
    await act(async () => view.result.current.sheet.submit.onPress());
  }

  it('runs the three steps from stored public addresses', async () => {
    confirmingCore();
    const view = setup({ switches: { send: false, withdraw: true } });
    await ready(view);
    await burn(view);
    expect(build.mock.calls[0][2]).toEqual({
      publicKey: OWNER,
      action: 'unwrapBurn',
      side: 'USDC',
      amount: '500',
      freshSigners: FRESH,
    });
    const next = () => view.result.current.actions.find((a) => a.key === 'continueWithdraw')!;
    await act(async () => next().onPress());
    expect(build.mock.calls[1][2]).toEqual({
      publicKey: OWNER,
      action: 'unwrapDecrypt',
      burnedCt: FRESH,
      freshSigners: FRESH,
    });
    await act(async () => next().onPress());
    expect(build.mock.calls[2][2]).toEqual({
      publicKey: OWNER,
      action: 'unwrapComplete',
      burnedCt: FRESH,
      requestAcct: FRESH,
      freshSigners: '',
    });
    expect(view.result.current.actions.some((a) => a.key === 'continueWithdraw')).toBe(false);
  });

  it('reads simulation_failed on step 3 as "not posted yet" and keeps the step', async () => {
    confirmingCore();
    const view = setup({ switches: { send: false, withdraw: true } });
    await ready(view);
    await burn(view);
    const next = () => view.result.current.actions.find((a) => a.key === 'continueWithdraw')!;
    await act(async () => next().onPress());
    build.mockRejectedValueOnce(new ApiError('x', 422, 'simulation_failed'));
    await act(async () => next().onPress());
    expect(view.result.current.error).toBe('dagon.errors.decryptionNotPosted');
    expect(next()).toBeDefined();
  });

  it('moves to step 3 on already_requested with the stored request account', async () => {
    confirmingCore();
    const view = setup({ switches: { send: false, withdraw: true } });
    await ready(view);
    await burn(view);
    const next = () => view.result.current.actions.find((a) => a.key === 'continueWithdraw')!;
    // Step 2 went out but the network never answered: it may be on chain.
    core.request.mockImplementationOnce(async (request: FreshSignatureRequest) => {
      await request.build({ freshSigners: [FRESH] });
      throw new SolanaOutcomeUnknownError('sig' as never);
    });
    await act(async () => next().onPress());
    expect(view.result.current.error).toBe('transaction.errors.broadcastUnknown');
    // The retry is answered already_requested: step 3 with the stored address.
    build.mockRejectedValueOnce(new ApiError('x', 409, 'already_requested'));
    await act(async () => next().onPress());
    expect(build.mock.calls.map((call) => call[2].action)).toEqual([
      'unwrapBurn',
      'unwrapDecrypt',
      'unwrapDecrypt',
      'unwrapComplete',
    ]);
    expect(build.mock.calls[3][2]).toMatchObject({ burnedCt: FRESH, requestAcct: FRESH });
  });

  it('keeps an in-progress withdraw listed with Continue when the switch is off', async () => {
    confirmingCore();
    const on = setup({ switches: { send: false, withdraw: true } });
    await ready(on);
    await burn(on);
    // The same persisted state, read by a build with the switch off.
    on.unmount();
    const off = setup({ switches: { send: false, withdraw: false } });
    await ready(off);
    const keys = off.result.current.actions.map((action) => action.key);
    expect(keys).not.toContain('withdraw');
    expect(keys).toContain('continueWithdraw');
  });
});
