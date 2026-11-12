/**
 * @vitest-environment jsdom
 *
 * The Solana Pay transaction-request flow (spec 043, data-model.md
 * §MerchantPaymentState): link → merchant → transaction → checks → preview →
 * core's review. The merchant's server, the RPC preview and core's received
 * entry are stand-ins; the transaction and its checks are real.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateKeyPairSigner, type Address, type KeyPairSigner } from '@solana/kit';
import bs58 from 'bs58';
import {
  useSolanaPayRequest,
  useSolanaPayTransactionRequest,
} from './useSolanaPayTransactionRequest';
import { SignatureRequestCancelledError } from '../core/confirmation/types';
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

function account() {
  return {
    canSign: true,
    network: { id: 'solana-devnet' },
    getReceiveAddress: () => user.address,
    getRpc: () => ({
      isBlockhashValid: () => ({ send: async () => ({ value: true }) }),
    }),
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
});
