/**
 * The send flow's state — mobile's `SendFlowContext`, as a hook.
 *
 * Mobile mounts the state in a provider above four routes; the DOM mounts
 * one component stepping through the same four, so the same state sits in a
 * hook that component owns. What it holds is byte-for-byte the provider's:
 * the default token (the chain's own asset), the live balance re-read from
 * the reactive list, the fee estimated once per (token, recipient) pair, and
 * `submit`, which is the sheet's `submitSend` moved up a level.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  SOL_CONSTANTS,
  useSendTransaction,
  type BlockchainAccount,
  type BlockchainType,
  type SendRecipient,
  type SendToken,
} from '@salmon/shared';

/** Reads a token balance the way every send surface has always read it. */
function toNumber(value: number | string | undefined): number | undefined {
  if (value === undefined) return undefined;
  return typeof value === 'string' ? parseFloat(value) : value;
}

export interface UseSendFlowStateParams {
  account: BlockchainAccount;
  blockchain: BlockchainType;
  tokens: SendToken[];
}

export function useSendFlowState({ account, blockchain, tokens }: UseSendFlowStateParams) {
  const [token, setToken] = useState<SendToken | null>(null);
  const [recipient, setRecipient] = useState<SendRecipient | null>(null);
  const [amount, setAmount] = useState('');
  const [txId, setTxId] = useState<string | null>(null);

  const sendHook = useSendTransaction({ account, blockchain });

  // The flow opens on the chain's own asset, which is what the Send control on
  // Home means; the picker is how the user says otherwise.
  useEffect(() => {
    if (token || tokens.length === 0) return;
    const native = tokens.find((tok) => tok.address === SOL_CONSTANTS.ADDRESS);
    setToken(native ?? tokens[0]);
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

  // The fee, held against the pair it was measured on: Solana charges per
  // signature, so the estimate does not move with the amount being typed.
  const [fee, setFee] = useState<{ key: string; value: string } | null>(null);
  const feeRequestedFor = useRef<string | null>(null);
  const feeKey = token && recipient ? `${token.address}:${recipient.address}` : null;
  const estimatedFee = fee && fee.key === feeKey ? fee.value : null;

  const amountRef = useRef(amount);
  useEffect(() => {
    amountRef.current = amount;
  }, [amount]);

  const estimateFee = useCallback(() => {
    if (!token || !recipient || !feeKey) return;
    // No estimate without an amount: the adapters build the transfer to price
    // it, and `parseFloat('')` is NaN.
    if (!(parseFloat(amountRef.current) > 0)) return;
    if (feeRequestedFor.current === feeKey) return;
    feeRequestedFor.current = feeKey;
    void (async () => {
      const result = await sendHook.estimateFee({
        token: { address: token.address, decimals: token.decimals ?? 9, symbol: token.symbol },
        recipientAddress: recipient.address,
        resolvedRecipientAddress: recipient.resolvedAddress,
        amount: parseFloat(amountRef.current),
      });
      if (result) setFee({ key: feeKey, value: result.fee });
      else if (feeRequestedFor.current === feeKey) feeRequestedFor.current = null;
    })();
  }, [feeKey, token, recipient, sendHook]);

  const reset = useCallback(() => {
    setFee(null);
    feeRequestedFor.current = null;
    setToken(null);
    setRecipient(null);
    setAmount('');
    setTxId(null);
    sendHook.reset();
  }, [sendHook]);

  /** Commit the transfer. The hook's `failed` status is the report. */
  const submit = useCallback(async () => {
    if (!token || !recipient) return;
    try {
      const result = await sendHook.sendTransaction({
        token: { address: token.address, decimals: token.decimals ?? 9, symbol: token.symbol },
        recipientAddress: recipient.address,
        resolvedRecipientAddress: recipient.resolvedAddress,
        amount: parseFloat(amount),
      });
      setTxId(result.txId);
    } catch {
      // The hook's `failed` status is the report; the failure surface renders it.
    }
  }, [sendHook, token, recipient, amount]);

  return {
    token,
    setToken,
    liveBalance,
    nativeBalance,
    recipient,
    setRecipient,
    amount,
    setAmount,
    sendHook,
    estimatedFee,
    estimateFee,
    txId,
    submit,
    reset,
  };
}

export type SendFlowState = ReturnType<typeof useSendFlowState>;
