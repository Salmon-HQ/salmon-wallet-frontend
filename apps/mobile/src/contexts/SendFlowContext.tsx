/**
 * SendFlowContext — the four send screens' shared state.
 *
 * Send used to be one mounted sheet holding its own step, token, recipient and
 * amount in local state. As four stack screens each of those screens mounts
 * and unmounts on its own, so the state that survives a back gesture has to
 * live above them: the provider is mounted once at `app/(app)/send/_layout`,
 * which stays mounted for the whole flow.
 *
 * The transaction hook lives here for the same reason it lived on the sheet
 * rather than on the confirmation step: the screen that fires the transfer is
 * covered by the wait the instant it commits, and a hook owned there would
 * take the in-flight transaction's only observer with it. Nothing about the
 * transfer itself changed — the same `useSendTransaction`, the same
 * parameters, the same call.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  SOL_CONSTANTS,
  getBlockchainFromNetworkId,
  useAccountsContext,
  useBalance,
  useSendTransaction,
  type BlockchainAccount,
  type BlockchainType,
  type NetworkId,
  type SendToken,
} from '@salmon/shared';

import { useDeveloperMode } from './DeveloperModeContext';

/** Who the transfer pays, and what the screens call them. */
export interface SendRecipient {
  /** Exactly what the user typed or tapped — a raw address or a domain. */
  address: string;
  /** The address the transfer will actually pay, when a domain resolved. */
  resolvedAddress?: string;
  /** The address book's or the wallet list's name for it, when there is one. */
  name?: string;
}

export interface SendFlowValue {
  /** The chain the flow runs on — Home's active chain, read once per render. */
  blockchain: BlockchainType;
  /** The active network, for the queries a screen runs of its own. */
  networkId: NetworkId | null;
  account: BlockchainAccount | undefined;
  tokens: SendToken[];
  tokensLoading: boolean;
  showUnverifiedTokens: boolean;

  token: SendToken | null;
  setToken: (token: SendToken) => void;
  /** The selected token's balance, re-read from the live list every render. */
  liveBalance: number | undefined;
  /** The chain's native balance, which pays the fee for every transfer on it. */
  nativeBalance: number | undefined;

  recipient: SendRecipient | null;
  setRecipient: (recipient: SendRecipient) => void;

  amount: string;
  setAmount: (amount: string) => void;

  /** The transfer itself. Never re-implemented per screen. */
  sendHook: ReturnType<typeof useSendTransaction>;
  /** Set once the transfer comes back; the receipt screen reads it. */
  txId: string | null;
  /** Commit the transfer. Review fires it; the failure surface retries it. */
  submit: () => Promise<void>;
  /** Drop the flow's state — used when the flow is left. */
  reset: () => void;
}

const SendFlowContext = createContext<SendFlowValue | null>(null);

/** Reads a token balance the way every send surface has always read it. */
function toNumber(value: number | string | undefined): number | undefined {
  if (value === undefined) return undefined;
  return typeof value === 'string' ? parseFloat(value) : value;
}

export function SendFlowProvider({ children }: { children: React.ReactNode }) {
  const [accountState] = useAccountsContext();
  const { ready, activeBlockchainAccount, networkId } = accountState;
  const showUnverifiedTokens = useDeveloperMode();

  const blockchain = getBlockchainFromNetworkId(networkId ?? 'solana-mainnet');

  // The same query Home already populated: `useBalance` is React Query backed
  // and keyed on account + network, so this reads the cache rather than firing
  // a second request for the list the user was just looking at.
  const { tokens, loading: tokensLoading } = useBalance({
    account: activeBlockchainAccount,
    networkId: (networkId ?? undefined) as NetworkId | undefined,
    skip: !ready || !activeBlockchainAccount,
    includeSpam: showUnverifiedTokens,
  });

  const [token, setToken] = useState<SendToken | null>(null);
  const [recipient, setRecipient] = useState<SendRecipient | null>(null);
  const [amount, setAmount] = useState('');
  const [txId, setTxId] = useState<string | null>(null);

  const sendHook = useSendTransaction({
    account: activeBlockchainAccount as BlockchainAccount,
    blockchain,
  });

  // The flow opens on the chain's own asset, which is what the Send control on
  // Home means: the token picker on the amount screen is how the user says
  // otherwise. Bitcoin has only ever had one token, and this is the same
  // default the sheet applied to it.
  useEffect(() => {
    if (token || tokens.length === 0) return;
    const native = tokens.find((tok) => tok.address === SOL_CONSTANTS.ADDRESS);
    setToken((native ?? tokens[0]) as SendToken);
  }, [token, tokens]);

  const liveBalance = useMemo(() => {
    if (!token) return undefined;
    const live = tokens.find((tok) => tok.address === token.address);
    return toNumber(live?.uiAmount) ?? toNumber(token.uiAmount);
  }, [token, tokens]);

  const nativeBalance = useMemo(
    () => toNumber(tokens.find((tok) => tok.address === SOL_CONSTANTS.ADDRESS)?.uiAmount),
    [tokens]
  );

  const reset = useCallback(() => {
    setToken(null);
    setRecipient(null);
    setAmount('');
    setTxId(null);
    sendHook.reset();
  }, [sendHook]);

  /**
   * Commit the transfer.
   *
   * Byte-for-byte the sheet's `submitSend`: the same token triple, the same
   * recipient pair, the same `parseFloat(amount)`, and the same silence on
   * rejection — the hook's `failed` status is the report, and the failure
   * surface renders it.
   */
  const submit = useCallback(async () => {
    if (!token || !recipient) return;
    try {
      const result = await sendHook.sendTransaction({
        token: {
          address: token.address,
          decimals: token.decimals ?? 9,
          symbol: token.symbol,
        },
        recipientAddress: recipient.address,
        resolvedRecipientAddress: recipient.resolvedAddress,
        amount: parseFloat(amount),
      });
      setTxId(result.txId);
    } catch {
      // The hook's `failed` status is the report; the task surface renders it.
    }
  }, [sendHook, token, recipient, amount]);

  const value = useMemo<SendFlowValue>(
    () => ({
      blockchain,
      networkId: (networkId ?? null) as NetworkId | null,
      account: activeBlockchainAccount,
      tokens: tokens as SendToken[],
      tokensLoading,
      showUnverifiedTokens,
      token,
      setToken,
      liveBalance,
      nativeBalance,
      recipient,
      setRecipient,
      amount,
      setAmount,
      sendHook,
      txId,
      submit,
      reset,
    }),
    [
      blockchain,
      networkId,
      activeBlockchainAccount,
      tokens,
      tokensLoading,
      showUnverifiedTokens,
      token,
      liveBalance,
      nativeBalance,
      recipient,
      amount,
      sendHook,
      txId,
      submit,
      reset,
    ]
  );

  return <SendFlowContext.Provider value={value}>{children}</SendFlowContext.Provider>;
}

/**
 * The flow's state, from any of the four screens.
 *
 * Throws outside the provider rather than handing back a null-ish default: a
 * send screen with no flow behind it has nothing to send.
 */
export function useSendFlow(): SendFlowValue {
  const value = useContext(SendFlowContext);
  if (!value) throw new Error('useSendFlow must be used inside SendFlowProvider');
  return value;
}

export default SendFlowContext;
