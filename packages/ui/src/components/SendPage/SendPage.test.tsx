/**
 * @vitest-environment jsdom
 *
 * The send flow's four steps, the verb between them, and the passage.
 *
 * The contract, mobile's: recipient → amount → review → receipt for a token;
 * recipient → review → receipt for a collectible; a step change sinks what
 * leaves and floats what arrives, the first step and the receipt excepted;
 * the wait holds the receipt back until its last wave has left; a failure
 * stays on the surface, and a broadcast whose outcome could not be
 * established is reported as unconfirmed, never as failed.
 *
 * The steps' own pixels are pinned by their suites; here they are recorders.
 */
import React from 'react';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ThemeProvider, createSemantic } from '@salmon/shared';

import { asRenderedColor, renderInMode } from '../../test/renderInMode';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

/** What the send hook reports this render. Mutable so a test can move it. */
const sendState = {
  status: 'idle' as string,
  settling: false,
  error: null as string | null,
  feeEstimateFailed: false,
};
const sendTransaction = vi.fn(async () => ({ txId: 'tx-1' }));
const sendNft = vi.fn(async () => ({ txId: 'nft-tx-1' }));

// The flow's state is the shared `useSendFlowState`, which reaches the
// transfer hook by its own module path — so the fake has to sit on that
// module, not only on the barrel the page imports from.
vi.mock('@salmon/shared/src/hooks/useSendTransaction', () => ({
  useSendTransaction: () => ({
    ...sendState,
    reset: vi.fn(),
    estimateFee: vi.fn(async () => null),
    sendTransaction,
  }),
}));

vi.mock('@salmon/shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@salmon/shared')>()),
  useNftTransfer: () => ({ sendNft, settling: false, reset: vi.fn() }),
  getTransactionUrl: () => 'https://explorer.example/tx',
  getDefaultExplorer: () => 'explorer',
  classifyTransactionError: () => 'transaction.errors.generic',
}));

/** Every `transitionKey` / `floatMs` the page has handed the verb, in order. */
const verbProps: Array<{ transitionKey: string; floatMs?: number }> = [];

vi.mock('../SinkFloat', () => ({
  SinkFloat: ({
    transitionKey,
    floatMs,
    children,
  }: {
    transitionKey: string;
    floatMs?: number;
    children: React.ReactNode;
  }) => {
    verbProps.push({ transitionKey, floatMs });
    return <div data-testid="send-step-frame">{children}</div>;
  },
}));

vi.mock('./StepRecipient', () => ({
  StepRecipient: ({
    onContinue,
    nft,
  }: {
    onContinue: (r: { address: string }) => void;
    nft?: unknown;
  }) => (
    <button
      data-testid={nft ? 'step-recipient-nft' : 'step-recipient'}
      onClick={() => onContinue({ address: 'recipient' })}
    />
  ),
}));

vi.mock('./StepAmount', () => ({
  StepAmount: ({
    onReview,
    setAmount,
  }: {
    onReview: () => void;
    setAmount: (a: string) => void;
  }) => (
    <button
      data-testid="step-amount"
      onClick={() => {
        setAmount('1');
        onReview();
      }}
    />
  ),
}));

vi.mock('./StepReview', () => ({
  StepReview: ({ onConfirm, nftError }: { onConfirm: () => void; nftError?: string | null }) => (
    <button data-testid="step-review" data-nft-error={nftError ?? ''} onClick={onConfirm} />
  ),
}));

vi.mock('./StepSuccess', () => ({
  StepSuccess: ({ txId, nft }: { txId: string; nft?: unknown }) => (
    <div data-testid="step-success" data-tx={txId} data-nft={nft ? 'yes' : 'no'} />
  ),
}));

vi.mock('../LoadingScreen', () => ({
  // Stand-in that keeps the exit contract without a frame clock: it reports
  // `onExited` only when the test says the last wave has left.
  LoadingScreen: ({ visible, onExited }: { visible?: boolean; onExited?: () => void }) => (
    <div data-testid="send-wave-screen" data-visible={String(visible)}>
      <button data-testid="wave-last-front-gone" onClick={() => onExited?.()} />
    </div>
  ),
}));

vi.mock('../DepthBackground', () => ({ DepthBackground: () => null }));
vi.mock('../ScalesBackground', () => ({ ScalesBackground: () => null }));

const solToken = { address: 'sol', name: 'Solana', symbol: 'SOL', decimals: 9, uiAmount: 1 };
const account = { getReceiveAddress: () => 'sender', getNetworkId: () => 'solana-mainnet' };

const { SendPage } = await import('./SendPage');

/** What the verb was last told, which is what is on screen now. */
const lastVerb = () => verbProps[verbProps.length - 1];

const pageProps = () => ({
  tokens: [solToken] as never,
  blockchain: 'solana' as never,
  networkId: 'solana-mainnet' as never,
  account: account as never,
  onBack: vi.fn(),
});

const renderPage = (props: Record<string, unknown> = {}, mode: 'dark' | 'light' = 'dark') =>
  renderInMode(mode, <SendPage {...pageProps()} {...props} />);

/** The same tree the page was rendered in, so a rerender keeps its state. */
const wrapped = () => (
  <ThemeProvider systemScheme="dark">
    <SendPage {...pageProps()} />
  </ThemeProvider>
);

beforeEach(() => {
  verbProps.length = 0;
  sendState.status = 'idle';
  sendState.settling = false;
  sendState.error = null;
  sendTransaction.mockClear();
  sendNft.mockClear();
});

afterEach(() => {
  cleanup();
});

describe('SendPage — four steps, and the verb between them', () => {
  it('opens on the recipient with no entrance — the page is what arrives', () => {
    renderPage();
    expect(screen.getByTestId('step-recipient')).toBeTruthy();
    expect(lastVerb()).toEqual({ transitionKey: 'recipient', floatMs: 0 });
  });

  it('walks recipient → amount → review, floating each step that arrives', () => {
    renderPage();
    fireEvent.click(screen.getByTestId('step-recipient'));
    expect(screen.getByTestId('step-amount')).toBeTruthy();
    expect(lastVerb()).toEqual({ transitionKey: 'amount', floatMs: undefined });

    fireEvent.click(screen.getByTestId('step-amount'));
    expect(screen.getByTestId('step-review')).toBeTruthy();
    expect(lastVerb()).toEqual({ transitionKey: 'review', floatMs: undefined });
  });

  it('skips the amount for a collectible — recipient goes straight to review', () => {
    renderPage({ nft: { name: 'Fish #1', blockchain: 'solana', mint: 'm' } });
    fireEvent.click(screen.getByTestId('step-recipient-nft'));
    expect(screen.getByTestId('step-review')).toBeTruthy();
    expect(screen.queryByTestId('step-amount')).toBeNull();
  });

  it('sends the collectible through useNftTransfer and lands on the receipt', async () => {
    renderPage({ nft: { name: 'Fish #1', blockchain: 'solana', mint: 'm' } });
    fireEvent.click(screen.getByTestId('step-recipient-nft'));
    fireEvent.click(screen.getByTestId('step-review'));

    expect(sendNft).toHaveBeenCalledTimes(1);
    const receipt = await screen.findByTestId('step-success');
    expect(receipt.getAttribute('data-tx')).toBe('nft-tx-1');
    expect(receipt.getAttribute('data-nft')).toBe('yes');
    expect(sendTransaction).not.toHaveBeenCalled();
  });
});

describe('SendPage — the passage', () => {
  const reachReview = () => {
    const view = renderPage();
    fireEvent.click(screen.getByTestId('step-recipient'));
    fireEvent.click(screen.getByTestId('step-amount'));
    return view;
  };

  it('shows the wave wait while the transaction is in flight', () => {
    const { rerender } = reachReview();
    sendState.status = 'sending';
    rerender(wrapped());

    expect(screen.getByTestId('send-wave-screen').getAttribute('data-visible')).toBe('true');
    expect(screen.queryByTestId('step-success')).toBeNull();
  });

  it('holds the receipt back until the wait reports its last wave has left', async () => {
    const { rerender } = reachReview();
    sendState.status = 'sending';
    rerender(wrapped());

    // The transaction lands: the flow holds a txId, but the water is not calm.
    fireEvent.click(screen.getByTestId('step-review'));
    expect(sendTransaction).toHaveBeenCalledTimes(1);
    await Promise.resolve();
    expect(screen.queryByTestId('step-success')).toBeNull();

    sendState.status = 'idle';
    rerender(wrapped());
    expect(screen.getByTestId('send-wave-screen').getAttribute('data-visible')).toBe('false');
    expect(screen.queryByTestId('step-success')).toBeNull();

    // Last front off the screen: only now does the receipt arrive, whole.
    fireEvent.click(screen.getByTestId('wave-last-front-gone'));
    const receipt = await screen.findByTestId('step-success');
    expect(receipt.getAttribute('data-tx')).toBe('tx-1');
    expect(lastVerb()).toEqual({ transitionKey: 'success', floatMs: 0 });
  });

  it('reports a failure on the surface the wait stood on, with retry and the way out', () => {
    const { rerender } = reachReview();
    sendState.status = 'failed';
    sendState.error = 'transaction.errors.generic';
    rerender(wrapped());

    expect(screen.getByTestId('send-failure-surface')).toBeTruthy();
    expect(screen.getByTestId('send-failure-title').textContent).toBe('transaction.sendFailed');
    expect(screen.getByTestId('send-failure-retry')).toBeTruthy();
    expect(screen.getByTestId('send-failure-dismiss')).toBeTruthy();
  });

  it('says "unconfirmed", never "failed", when the broadcast outcome is unknown', () => {
    const { rerender } = reachReview();
    sendState.status = 'failed';
    sendState.error = 'transaction.errors.broadcastUnknown';
    rerender(wrapped());

    expect(screen.getByTestId('send-failure-title').textContent).toBe(
      'transaction.sendUnconfirmed'
    );
  });

  it('paints the failure surface off the live mode', () => {
    sendState.status = 'failed';
    sendState.error = 'transaction.errors.generic';
    renderPage({}, 'light');

    expect(screen.getByTestId('send-failure-title').style.color).toBe(
      asRenderedColor(createSemantic('light').text.primary)
    );
  });
});
