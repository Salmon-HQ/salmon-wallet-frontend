/**
 * @vitest-environment jsdom
 *
 * The Solana Pay transaction-request flow (spec 043, data-model.md
 * §MerchantPaymentState): link → merchant → transaction → checks → preview →
 * core's review. The merchant's server, the RPC preview and core's received
 * entry are stand-ins; the transaction and its checks are real.
 */
import { StrictMode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { classifyScanPayload } from '../utils/scan-payload';
import { generateKeyPairSigner, type Address, type KeyPairSigner } from '@solana/kit';
import bs58 from 'bs58';
import {
  useSolanaPayRequest,
  useSolanaPayTransactionRequest,
} from './useSolanaPayTransactionRequest';
import { SignatureRequestCancelledError } from '../core/confirmation/types';
import { SolanaOutcomeUnknownError } from '../blockchain/solana/confirm';
import { TransactionRequestError } from '../blockchain/solana/transaction-request';
import type { ReceivedTransactionProposal } from '../core/confirmation/types';
import type { TransactionEffects } from '../blockchain/solana/simulation-types';
import { sponsoredMerchantTransaction } from '../test-utils/solana-pay-merchant';

const mocks = vi.hoisted(() => ({
  fetchMerchantDetails: vi.fn(),
  fetchMerchantTransaction: vi.fn(),
  loadDetails: vi.fn(),
  preview: vi.fn(),
  requestReceived: vi.fn(),
}));

vi.mock('../blockchain/solana/transaction-request', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../blockchain/solana/transaction-request')>()),
  fetchMerchantDetails: mocks.fetchMerchantDetails,
  fetchMerchantTransaction: mocks.fetchMerchantTransaction,
}));
vi.mock('../utils/dapp-approval', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../utils/dapp-approval')>()),
  loadSolanaTransactionApprovalDetails: mocks.loadDetails,
  previewSolanaApprovalEffects: mocks.preview,
}));
vi.mock('../core/confirmation/received', () => ({
  useRequestReceivedSignature: () => mocks.requestReceived,
}));
vi.mock('../contexts/AccountsContext', () => ({
  useAccountsContext: () => [{ activeAccount: { name: 'Main' } }, {}],
}));
vi.mock('./useTokenCatalog', () => ({
  useTokenCatalog: () => ({ tokens: [] }),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) =>
      values ? `${key} ${JSON.stringify(values)}` : key,
  }),
}));

const LINK = { url: 'https://merchant.example/pay?order=42', host: 'merchant.example' };
const DETAILS = {
  label: 'Corner Café',
  icon: 'https://merchant.example/logo.svg',
  iconToRender: 'https://merchant.example/logo.svg',
  domain: 'merchant.example',
};

let sponsor: KeyPairSigner;
let user: KeyPairSigner;
let merchant: KeyPairSigner;
let wire: string;

beforeAll(async () => {
  [sponsor, user, merchant] = await Promise.all([
    generateKeyPairSigner(),
    generateKeyPairSigner(),
    generateKeyPairSigner(),
  ]);
  wire = await sponsoredMerchantTransaction({
    version: 0,
    sponsor,
    user: user.address,
    merchant: merchant.address,
  });
});

function effects(): TransactionEffects {
  return {
    kind: 'effects',
    account: user.address as Address,
    sol: { lamports: -1_000_000n, feeLamports: 0n },
    tokens: [],
    approvals: [],
  };
}

const LATEST_BLOCKHASH = 'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N';

/** The paying account; its RPC answers for the blockhash and the SOL it holds. */
function account({
  lamports = 10_000_000_000n,
  blockhashValid = () => true,
}: { lamports?: bigint; blockhashValid?: () => boolean } = {}) {
  const rpc = {
    isBlockhashValid: vi.fn(() => ({ send: async () => ({ value: blockhashValid() }) })),
    getLatestBlockhash: vi.fn(() => ({
      send: async () => ({ value: { blockhash: LATEST_BLOCKHASH, lastValidBlockHeight: 900n } }),
    })),
    getBalance: vi.fn(() => ({ send: async () => ({ value: lamports }) })),
  };
  return {
    canSign: true,
    network: { id: 'solana-devnet' },
    getReceiveAddress: () => user.address,
    getRpc: () => rpc,
  } as never;
}

/** A promise the test settles by hand, to read the states in between. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset());
  mocks.fetchMerchantDetails.mockResolvedValue(DETAILS);
  mocks.fetchMerchantTransaction.mockResolvedValue({ transaction: wire, message: 'Order #42' });
  mocks.loadDetails.mockResolvedValue({ feeLamports: 5000, feePayer: null });
  mocks.preview.mockResolvedValue(effects());
  mocks.requestReceived.mockResolvedValue({ signature: 'sig-1' });
});

describe('useSolanaPayTransactionRequest — sponsored payment', () => {
  it('shows the domain at once, then the label and icon, then prepares', async () => {
    const details = deferred<typeof DETAILS>();
    const transaction = deferred<{ transaction: string }>();
    mocks.fetchMerchantDetails.mockReturnValue(details.promise);
    mocks.fetchMerchantTransaction.mockReturnValue(transaction.promise);
    const preview = deferred<TransactionEffects>();
    mocks.preview.mockReturnValue(preview.promise);
    const { result } = renderHook(() => useSolanaPayTransactionRequest({ account: account() }));

    act(() => result.current.start(LINK));
    expect(result.current.state).toEqual({
      phase: 'loadingDetails',
      merchant: { domain: 'merchant.example' },
    });
    expect(result.current.sheet).toMatchObject({
      visible: true,
      phase: 'contacting',
      merchant: { domain: 'merchant.example' },
    });

    await act(async () => details.resolve(DETAILS));
    expect(result.current.state).toEqual({
      phase: 'loadingTransaction',
      merchant: {
        domain: 'merchant.example',
        label: 'Corner Café',
        icon: 'https://merchant.example/logo.svg',
      },
    });
    expect(mocks.fetchMerchantTransaction).toHaveBeenCalledWith(
      LINK,
      user.address,
      expect.anything()
    );

    await act(async () => transaction.resolve({ transaction: wire }));
    await waitFor(() => expect(result.current.state.phase).toBe('preparing'));
    expect(result.current.sheet).toMatchObject({ visible: true, phase: 'preparing' });
    // The review never opens before the preview has answered.
    expect(mocks.requestReceived).not.toHaveBeenCalled();

    await act(async () => preview.resolve(effects()));
    await waitFor(() => expect(mocks.requestReceived).toHaveBeenCalledTimes(1));
  });

  it('hands core the exact merchant bytes, the address it posted and the dApp review', async () => {
    // Core holds the review open until the user decides.
    mocks.requestReceived.mockReturnValue(new Promise(() => undefined));
    const { result } = renderHook(() =>
      useSolanaPayTransactionRequest({ account: account(), accountName: 'Main' })
    );

    act(() => result.current.start(LINK));
    await waitFor(() => expect(mocks.requestReceived).toHaveBeenCalledTimes(1));

    const proposal: ReceivedTransactionProposal = mocks.requestReceived.mock.calls[0][0];
    expect(proposal).toMatchObject({
      source: 'received',
      transaction: wire,
      signer: user.address,
      networkId: 'solana-devnet',
    });
    expect(proposal.display).toMatchObject({
      title: 'solanaPay.reviewTitle',
      pendingTitle: 'solanaPay.paying {"label":"Corner Café"}',
      receipt: { title: 'solanaPay.receiptTitle' },
      requester: {
        name: 'Corner Café',
        icon: 'https://merchant.example/logo.svg',
        domain: 'merchant.example',
      },
      requiresHold: false,
    });
    expect(proposal.display.rows).toContainEqual({
      label: 'solanaPay.message',
      value: 'Order #42',
    });
    expect(proposal.display.rows).toContainEqual({
      label: 'dapp.effects_out',
      value: '−0.001 SOL',
    });
    expect(proposal.display.rows).toContainEqual({
      label: 'dapp.transaction_fee',
      value: expect.stringContaining('solanaPay.feePaidBy'),
    });

    // The preview reads the same bytes core will sign.
    const request = mocks.preview.mock.calls[0][1];
    expect(request).toMatchObject({ method: 'signAndSendTransaction' });
    expect(bs58.decode(request.params.transaction)).toEqual(
      new Uint8Array(Buffer.from(wire, 'base64'))
    );
    expect(result.current.state.phase).toBe('reviewing');
    expect(result.current.sheet.visible).toBe(false);
  });

  it('asks for a hold when the preview cannot vouch for the transaction', async () => {
    mocks.preview.mockResolvedValue({
      kind: 'transaction-would-fail',
      account: user.address,
      error: 'InsufficientFundsForFee',
      logs: [],
    });
    const { result } = renderHook(() => useSolanaPayTransactionRequest({ account: account() }));

    act(() => result.current.start(LINK));
    await waitFor(() => expect(mocks.requestReceived).toHaveBeenCalledTimes(1));

    expect(mocks.requestReceived.mock.calls[0][0].display.requiresHold).toBe(true);
  });

  it('goes back to idle when the user backs out of the review', async () => {
    mocks.requestReceived.mockRejectedValue(new SignatureRequestCancelledError());
    const { result } = renderHook(() => useSolanaPayTransactionRequest({ account: account() }));

    act(() => result.current.start(LINK));

    await waitFor(() => expect(result.current.state).toEqual({ phase: 'idle' }));
    expect(result.current.sheet.visible).toBe(false);
  });

  it('ends quietly when the review leaves an unknown outcome behind', async () => {
    mocks.requestReceived.mockRejectedValue(new SolanaOutcomeUnknownError('sig-1' as never));
    const { result } = renderHook(() => useSolanaPayTransactionRequest({ account: account() }));

    act(() => result.current.start(LINK));

    await waitFor(() => expect(result.current.state).toEqual({ phase: 'idle' }));
  });

  // Core refusing to open the review is not the user backing out.
  it.each(['transaction.errors.confirmationBusy', 'transaction.errors.proposalKind'])(
    'shows why when core does not open the review (%s)',
    async (key) => {
      mocks.requestReceived.mockRejectedValue(new Error(key));
      const { result } = renderHook(() => useSolanaPayTransactionRequest({ account: account() }));

      act(() => result.current.start(LINK));

      await waitFor(() => expect(result.current.state.phase).toBe('failed'));
      expect(result.current.sheet).toMatchObject({
        visible: true,
        phase: 'failed',
        error: { key },
      });
      expect(result.current.sheet.onRetry).toBeUndefined();
    }
  );

  it('is done once the receipt is dismissed', async () => {
    const { result } = renderHook(() => useSolanaPayTransactionRequest({ account: account() }));

    act(() => result.current.start(LINK));

    await waitFor(() => expect(result.current.state).toEqual({ phase: 'done' }));
  });

  it('shows a refusal on the sheet for an account that cannot sign, asking nothing', () => {
    const watchOnly = { canSign: false, getRpc: () => ({}) } as never;
    const { result } = renderHook(() => useSolanaPayTransactionRequest({ account: watchOnly }));

    act(() => result.current.start(LINK));

    expect(mocks.fetchMerchantDetails).not.toHaveBeenCalled();
    expect(result.current.sheet).toMatchObject({
      visible: true,
      phase: 'failed',
      merchant: { domain: 'merchant.example' },
      error: { key: 'solanaPay.errors.watchOnly' },
    });
  });
});

describe('useSolanaPayTransactionRequest — refusals and retry', () => {
  /** A stranger's transaction: it never asks for the user's signature. */
  async function strangersWire() {
    const stranger = await generateKeyPairSigner();
    return sponsoredMerchantTransaction({
      version: 0,
      sponsor,
      user: stranger.address,
      merchant: merchant.address,
    });
  }

  /** The same sponsored transaction with one byte of the sponsor's signature changed. */
  function tamperedWire() {
    const bytes = Buffer.from(wire, 'base64');
    bytes[1] ^= 0xff;
    return bytes.toString('base64');
  }

  it('a GET refusal keeps only the domain and offers no retry for a malformed icon', async () => {
    mocks.fetchMerchantDetails.mockRejectedValue(new TransactionRequestError('malformedIcon'));
    const { result } = renderHook(() => useSolanaPayTransactionRequest({ account: account() }));

    act(() => result.current.start(LINK));

    await waitFor(() => expect(result.current.state.phase).toBe('failed'));
    expect(result.current.state).toEqual({
      phase: 'failed',
      reason: 'malformedIcon',
      merchant: { domain: 'merchant.example' },
    });
    expect(result.current.sheet).toMatchObject({
      visible: true,
      phase: 'failed',
      error: { key: 'solanaPay.errors.malformedIcon' },
    });
    expect(result.current.sheet.onRetry).toBeUndefined();
    expect(mocks.fetchMerchantTransaction).not.toHaveBeenCalled();
    expect(mocks.requestReceived).not.toHaveBeenCalled();
  });

  it('a POST refusal keeps the merchant and its own words', async () => {
    mocks.fetchMerchantTransaction.mockRejectedValue(
      new TransactionRequestError('merchantError', 'Out of stock')
    );
    const { result } = renderHook(() => useSolanaPayTransactionRequest({ account: account() }));

    act(() => result.current.start(LINK));

    await waitFor(() => expect(result.current.state.phase).toBe('failed'));
    expect(result.current.state).toMatchObject({
      reason: 'merchantError',
      merchantMessage: 'Out of stock',
      merchant: { domain: 'merchant.example', label: 'Corner Café' },
    });
    expect(result.current.sheet.error).toEqual({
      key: 'solanaPay.errors.merchantError',
      merchantMessage: 'Out of stock',
    });
    expect(mocks.requestReceived).not.toHaveBeenCalled();
  });

  it.each([
    ['invalidSignature', tamperedWire],
    ['notForThisAccount', strangersWire],
    ['malformedTransaction', async () => Buffer.from([1, 2, 3]).toString('base64')],
  ] as const)(
    'an unsafe transaction (%s) stops before the review, with no retry',
    async (reason, makeWire) => {
      mocks.fetchMerchantTransaction.mockResolvedValue({ transaction: await makeWire() });
      const { result } = renderHook(() => useSolanaPayTransactionRequest({ account: account() }));

      act(() => result.current.start(LINK));

      await waitFor(() => expect(result.current.state.phase).toBe('failed'));
      expect(result.current.state).toMatchObject({ reason });
      expect(result.current.sheet.onRetry).toBeUndefined();
      expect(mocks.preview).not.toHaveBeenCalled();
      expect(mocks.requestReceived).not.toHaveBeenCalled();
    }
  );

  it.each(['unreachable', 'merchantError', 'unreadable'] as const)(
    'retry after a %s GET asks for the details again, then goes on',
    async (reason) => {
      mocks.fetchMerchantDetails.mockRejectedValueOnce(new TransactionRequestError(reason));
      const { result } = renderHook(() => useSolanaPayTransactionRequest({ account: account() }));

      act(() => result.current.start(LINK));
      await waitFor(() => expect(result.current.sheet.onRetry).toBeDefined());
      act(() => result.current.sheet.onRetry?.());

      await waitFor(() => expect(result.current.state.phase).toBe('done'));
      expect(mocks.fetchMerchantDetails).toHaveBeenCalledTimes(2);
      expect(mocks.fetchMerchantTransaction).toHaveBeenCalledTimes(1);
    }
  );

  // The wallet's own network failing is not the merchant's fault.
  it.each([
    ['the blockhash check', () => ({ isBlockhashValid: true })],
    ['the fee and approval details', () => ({ loadDetails: true })],
  ])('a failure of %s blames the network, with a retry', async (_, which) => {
    const failing = which();
    if ('loadDetails' in failing) mocks.loadDetails.mockRejectedValueOnce(new Error('HTTP 503'));
    const paying = account({
      blockhashValid: () => {
        if ('isBlockhashValid' in failing) throw new Error('HTTP 429');
        return true;
      },
    });
    const { result } = renderHook(() => useSolanaPayTransactionRequest({ account: paying }));

    act(() => result.current.start(LINK));

    await waitFor(() => expect(result.current.state.phase).toBe('failed'));
    expect(result.current.state).toMatchObject({ reason: 'networkUnavailable' });
    expect(result.current.sheet.error?.key).toBe('solanaPay.errors.networkUnavailable');
    expect(result.current.sheet.onRetry).toBeDefined();
  });

  it('retry after a failed POST repeats only the POST', async () => {
    mocks.fetchMerchantTransaction.mockRejectedValueOnce(
      new TransactionRequestError('unreachable')
    );
    const { result } = renderHook(() => useSolanaPayTransactionRequest({ account: account() }));

    act(() => result.current.start(LINK));
    await waitFor(() => expect(result.current.sheet.onRetry).toBeDefined());
    act(() => result.current.sheet.onRetry?.());

    await waitFor(() => expect(result.current.state.phase).toBe('done'));
    expect(mocks.fetchMerchantDetails).toHaveBeenCalledTimes(1);
    expect(mocks.fetchMerchantTransaction).toHaveBeenCalledTimes(2);
  });

  it('a preview that cannot say what happens still opens the review, held, with the warning', async () => {
    mocks.preview.mockResolvedValue({
      kind: 'undetermined',
      account: user.address,
      reason: 'simulation-unavailable',
      detail: 'node down',
    });
    const { result } = renderHook(() => useSolanaPayTransactionRequest({ account: account() }));

    act(() => result.current.start(LINK));
    await waitFor(() => expect(mocks.requestReceived).toHaveBeenCalledTimes(1));

    const { display } = mocks.requestReceived.mock.calls[0][0];
    expect(display.requiresHold).toBe(true);
    expect(display.warning).toBeDefined();
  });
});

describe('useSolanaPayTransactionRequest — no sponsor, the user pays the fee', () => {
  let unsignedWire: string;

  beforeAll(async () => {
    unsignedWire = await sponsoredMerchantTransaction({
      version: 0,
      sponsor,
      user: user.address,
      merchant: merchant.address,
      feePayer: user.address,
      signWith: [],
    });
  });

  beforeEach(() => {
    mocks.fetchMerchantTransaction.mockResolvedValue({ transaction: unsignedWire });
    // 0.001 SOL to the merchant plus the 5000-lamport fee, as the simulation sees it.
    mocks.preview.mockResolvedValue({
      ...effects(),
      sol: { lamports: -1_005_000n, feeLamports: 5000n },
    });
  });

  it("shows the fee as the user's own cost", async () => {
    const { result } = renderHook(() => useSolanaPayTransactionRequest({ account: account() }));

    act(() => result.current.start(LINK));
    await waitFor(() => expect(mocks.requestReceived).toHaveBeenCalledTimes(1));

    const { display } = mocks.requestReceived.mock.calls[0][0];
    expect(display.rows).toContainEqual(
      expect.objectContaining({
        label: 'dapp.transaction_fee',
        value: expect.stringContaining('SOL'),
      })
    );
    expect(JSON.stringify(display.rows)).not.toContain('solanaPay.feePaidBy');
    expect(display.confirmDisabled).toBeFalsy();
  });

  it('cannot be confirmed when the SOL held does not cover the fee and what leaves', async () => {
    const { result } = renderHook(() =>
      useSolanaPayTransactionRequest({ account: account({ lamports: 1_004_999n }) })
    );

    act(() => result.current.start(LINK));
    await waitFor(() => expect(mocks.requestReceived).toHaveBeenCalledTimes(1));

    const { display } = mocks.requestReceived.mock.calls[0][0];
    expect(display.confirmDisabled).toBe(true);
    expect(display.warning).toEqual({ title: 'solanaPay.notEnoughSolForFee' });
  });

  it('can be confirmed with exactly enough SOL', async () => {
    const { result } = renderHook(() =>
      useSolanaPayTransactionRequest({ account: account({ lamports: 1_005_000n }) })
    );

    act(() => result.current.start(LINK));
    await waitFor(() => expect(mocks.requestReceived).toHaveBeenCalledTimes(1));

    expect(mocks.requestReceived.mock.calls[0][0].display.confirmDisabled).toBeFalsy();
  });
});

describe('useSolanaPayTransactionRequest — the merchant transaction goes stale', () => {
  async function reviewedProposal(paying = account()) {
    mocks.requestReceived.mockReturnValue(new Promise(() => undefined));
    const { result } = renderHook(() => useSolanaPayTransactionRequest({ account: paying }));
    act(() => result.current.start(LINK));
    await waitFor(() => expect(mocks.requestReceived).toHaveBeenCalledTimes(1));
    return mocks.requestReceived.mock.calls[0][0] as ReceivedTransactionProposal;
  }

  it("asks the active network whether the merchant's blockhash still holds", async () => {
    let valid = true;
    const proposal = await reviewedProposal(account({ blockhashValid: () => valid }));

    expect(await proposal.isStale?.()).toBe(false);
    valid = false;
    expect(await proposal.isStale?.()).toBe(true);
  });

  it('rebuilds by asking the merchant again (POST only) and checking the new bytes', async () => {
    const proposal = await reviewedProposal();
    const fresh = await sponsoredMerchantTransaction({
      version: 0,
      sponsor,
      user: user.address,
      merchant: merchant.address,
      blockhash: 'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N' as never,
    });
    mocks.fetchMerchantTransaction.mockResolvedValue({ transaction: fresh, message: 'Order #42' });

    const next = await proposal.refresh!();

    expect(mocks.fetchMerchantDetails).toHaveBeenCalledTimes(1);
    expect(mocks.fetchMerchantTransaction).toHaveBeenCalledTimes(2);
    expect(mocks.fetchMerchantTransaction).toHaveBeenLastCalledWith(
      LINK,
      user.address,
      expect.anything()
    );
    expect(mocks.preview).toHaveBeenCalledTimes(2);
    expect(next).toMatchObject({ source: 'received', transaction: fresh, signer: user.address });
    expect(next.id).not.toBe(proposal.id);
    expect(next.display).toEqual(proposal.display);
    expect(typeof next.refresh).toBe('function');
  });

  // A rebuild that fails says why, so the user is not told "expired" when
  // the merchant is down or its new bytes are unsafe.
  it('says the merchant could not be reached when it cannot rebuild the payment', async () => {
    const proposal = await reviewedProposal();
    mocks.fetchMerchantTransaction.mockRejectedValue(new TransactionRequestError('unreachable'));

    await expect(proposal.refresh!()).rejects.toThrow('solanaPay.errors.unreachable');
  });

  it('names the check the rebuilt bytes fail', async () => {
    const proposal = await reviewedProposal();
    const bytes = Buffer.from(wire, 'base64');
    bytes[1] ^= 0xff;
    mocks.fetchMerchantTransaction.mockResolvedValue({ transaction: bytes.toString('base64') });

    await expect(proposal.refresh!()).rejects.toThrow('solanaPay.errors.invalidSignature');
  });

  it("says the wallet's network failed when the rebuild cannot ask it", async () => {
    const proposal = await reviewedProposal();
    mocks.loadDetails.mockRejectedValue(new Error('HTTP 503'));

    await expect(proposal.refresh!()).rejects.toThrow('solanaPay.errors.networkUnavailable');
  });

  it('says the payment expired when the flow was closed during the rebuild', async () => {
    mocks.requestReceived.mockReturnValue(new Promise(() => undefined));
    const { result } = renderHook(() => useSolanaPayTransactionRequest({ account: account() }));
    act(() => result.current.start(LINK));
    await waitFor(() => expect(mocks.requestReceived).toHaveBeenCalledTimes(1));
    const proposal = mocks.requestReceived.mock.calls[0][0] as ReceivedTransactionProposal;

    act(() => result.current.close());

    await expect(proposal.refresh!()).rejects.toThrow('solanaPay.errors.expired');
  });
});

describe('useSolanaPayTransactionRequest — accounts that cannot sign', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('refuses a watch-only Solana account before any request leaves the device', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const watchOnly = {
      canSign: false,
      network: { id: 'solana-devnet' },
      getReceiveAddress: () => user.address,
      getRpc: () => ({}),
    } as never;
    const { result } = renderHook(() => useSolanaPayTransactionRequest({ account: watchOnly }));

    act(() => result.current.start(LINK));

    expect(result.current.state).toEqual({
      phase: 'refused',
      reason: 'watchOnly',
      merchant: { domain: 'merchant.example' },
    });
    expect(result.current.sheet.onRetry).toBeUndefined();
    expect(mocks.fetchMerchantDetails).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('never sees a link scanned on another chain: the classifier stops it first', () => {
    expect(classifyScanPayload('solana:https://merchant.example/pay', 'bitcoin')).toEqual({
      kind: 'wrongChain',
    });
  });
});

describe('useSolanaPayRequest — one payment, mounted while its link is open', () => {
  it('starts on mount with the active account name and reports done', async () => {
    const onDone = vi.fn();
    const onCancel = vi.fn();
    const { result } = renderHook(() =>
      useSolanaPayRequest({ link: LINK, account: account(), onDone, onCancel })
    );

    expect(result.current).toMatchObject({ visible: true, phase: 'contacting' });
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(onCancel).not.toHaveBeenCalled();
    expect(mocks.requestReceived.mock.calls[0][0].display.rows).toContainEqual(
      expect.objectContaining({
        label: 'dapp.wallet_address',
        value: expect.stringContaining('Main'),
      })
    );
  });

  it('reports a cancel when the review is backed out of', async () => {
    mocks.requestReceived.mockRejectedValue(new SignatureRequestCancelledError());
    const onDone = vi.fn();
    const onCancel = vi.fn();
    renderHook(() => useSolanaPayRequest({ link: LINK, account: account(), onDone, onCancel }));

    await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1));
    expect(onDone).not.toHaveBeenCalled();
  });

  it('reports a cancel when the sheet is closed', async () => {
    const details = deferred<typeof DETAILS>();
    mocks.fetchMerchantDetails.mockReturnValue(details.promise);
    const onCancel = vi.fn();
    const { result } = renderHook(() =>
      useSolanaPayRequest({ link: LINK, account: account(), onDone: vi.fn(), onCancel })
    );

    act(() => result.current.onClose());

    expect(onCancel).toHaveBeenCalledTimes(1);
    await act(async () => details.resolve(DETAILS));
    expect(mocks.fetchMerchantTransaction).not.toHaveBeenCalled();
  });

  // The extension mounts its tree in StrictMode, which runs every effect,
  // its cleanup, and the effect again: the second run must start again.
  it('reaches the review under StrictMode', async () => {
    const onDone = vi.fn();
    const { result } = renderHook(
      () => useSolanaPayRequest({ link: LINK, account: account(), onDone, onCancel: vi.fn() }),
      { wrapper: StrictMode }
    );

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(result.current.visible).toBe(false);
  });
});
