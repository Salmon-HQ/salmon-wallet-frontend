/**
 * @vitest-environment jsdom
 *
 * The Send page's steps, and the verb they speak between them.
 *
 * The contract: a step change inside the open flow sinks what leaves and
 * floats what arrives; the flow's own arrival is not its content's event, so
 * the first step has no entrance — nor does the form a single-token chain
 * opens straight onto; back is the mirror; and the receipt is not floated in
 * as a block, because it owns its own arrival sequence.
 *
 * The verb's pixels and its reduce-motion mapping belong to `SinkFloat` and
 * are pinned by its own suite. Here the primitive is a recorder: what is
 * asserted is the decision this page makes about each arrival.
 */
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// `@salmon/shared` pulls React Native through its barrel; this page reads four
// functions from it, and none of them is what these assertions are about.
vi.mock('@salmon/shared', () => ({
  useSendTransaction: () => ({ status: 'idle', settling: false, reset: vi.fn() }),
  getTransactionUrl: () => 'https://explorer.example/tx',
  getDefaultExplorer: () => 'explorer',
  getShortAddress: (address: string) => address,
  SOL_CONSTANTS: { ADDRESS: 'So11111111111111111111111111111111111111112' },
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

vi.mock('../PageShell', () => ({
  PageShell: ({ children, onBack }: { children: React.ReactNode; onBack: () => void }) => (
    <div>
      <button data-testid="page-back" onClick={onBack} />
      {children}
    </div>
  ),
}));

vi.mock('./StepTokenSelect', () => ({
  StepTokenSelect: ({ onSelectToken }: { onSelectToken: (token: unknown) => void }) => (
    <button data-testid="step-token-select" onClick={() => onSelectToken(solToken)} />
  ),
}));

vi.mock('./StepAddressAmount', () => ({
  StepAddressAmount: ({ onReview }: { onReview: (address: string, amount: string) => void }) => (
    <button data-testid="step-address-amount" onClick={() => onReview('recipient', '1')} />
  ),
}));

vi.mock('./StepConfirmation', () => ({
  StepConfirmation: ({ onSuccess }: { onSuccess: (txId: string) => void }) => (
    <button data-testid="step-confirmation" onClick={() => onSuccess('tx-1')} />
  ),
}));

vi.mock('../TransactionSuccessScreen', () => ({
  TransactionSuccessScreen: () => <div data-testid="success-screen" />,
}));

const solToken = { address: 'sol', symbol: 'SOL', decimals: 9, uiAmount: 1 };
const btcToken = { address: 'btc', symbol: 'BTC', decimals: 8, uiAmount: 1 };
const solTokens = [solToken];
const btcTokens = [btcToken];
const account = { network: { networkId: 'mainnet-beta' } };

const { SendPage } = await import('./SendPage');

/** What the verb was last told, which is what is on screen now. */
const lastVerb = () => verbProps[verbProps.length - 1];

const renderPage = (props: Record<string, unknown> = {}) =>
  render(
    <SendPage
      tokens={solTokens as never}
      blockchain={'solana' as never}
      account={account as never}
      onBack={vi.fn()}
      {...props}
    />
  );

beforeEach(() => {
  verbProps.length = 0;
});

afterEach(() => {
  cleanup();
});

describe('SendPage — the steps speak the sink and the float', () => {
  it('gives the first step no entrance as the flow opens', () => {
    renderPage();
    // The page is the thing that arrives; the step it opens on is already there.
    expect(lastVerb()).toEqual({ transitionKey: 'token-select', floatMs: 0 });
  });

  it('gives the form no entrance when a single-token chain opens on it', () => {
    renderPage({ tokens: btcTokens, blockchain: 'bitcoin' });
    // Bitcoin's sequence starts at the form: nothing stepped, so nothing floats.
    expect(lastVerb()).toEqual({ transitionKey: 'address-amount', floatMs: 0 });
  });

  it('floats the step that arrives once a step has actually changed', () => {
    renderPage();
    fireEvent.click(screen.getByTestId('step-token-select'));

    expect(screen.getByTestId('step-address-amount')).toBeTruthy();
    // The verb's own clock: the page overrides nothing.
    expect(lastVerb()).toEqual({ transitionKey: 'address-amount', floatMs: undefined });
  });

  it('mirrors the step on the way back', () => {
    renderPage();
    fireEvent.click(screen.getByTestId('step-token-select'));
    fireEvent.click(screen.getByTestId('page-back'));

    expect(screen.getByTestId('step-token-select')).toBeTruthy();
    expect(lastVerb()).toEqual({ transitionKey: 'token-select', floatMs: undefined });
  });

  it('hands the receipt no entrance of its own — it owns its arrival', () => {
    renderPage();
    fireEvent.click(screen.getByTestId('step-token-select'));
    fireEvent.click(screen.getByTestId('step-address-amount'));
    fireEvent.click(screen.getByTestId('step-confirmation'));

    expect(screen.getByTestId('success-screen')).toBeTruthy();
    // Floating the step in as a block would make the receipt's own band
    // sequence arrive twice. The confirmation under it still sinks: the key
    // changed, so the outgoing half is spoken as it is on every other step.
    expect(lastVerb()).toEqual({ transitionKey: 'success', floatMs: 0 });
  });
});
