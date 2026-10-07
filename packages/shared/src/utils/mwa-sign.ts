/**
 * Mobile Wallet Adapter signing, composed from the extension's approval path
 * (spec 036). Nothing here touches a key directly: every signature comes from
 * an `approveSolana*` function, with its checks — what-you-see-is-what-you-sign,
 * transaction lookalikes, sign-in bound to the requesting origin.
 */
import bs58 from 'bs58';
import { getBase64Decoder } from '@solana/kit';
import type { SolanaAccount } from '../blockchain/solana/SolanaAccount';
import type { SolanaSignInInputFields } from '../blockchain/solana/sign-in';
import {
  approveSolanaSignIn,
  approveSolanaSignMessage,
  approveSolanaTransactionRequest,
} from './dapp-approval';
import {
  toSignAllTransactionsRequest,
  toSignAndSendRequest,
  withSignature,
  type MwaSendOptions,
} from './mwa';

const toBase64 = (bytes: Uint8Array) => getBase64Decoder().decode(bytes);

/** `sign_messages`: each payload comes back with Salmon's 64-byte signature appended. */
export async function mwaSignMessages(
  account: SolanaAccount,
  payloads: Uint8Array[],
  origin: string
): Promise<Uint8Array[]> {
  const signed: Uint8Array[] = [];
  for (const payload of payloads) {
    const { signature } = await approveSolanaSignMessage(account, Array.from(payload), origin);
    const out = new Uint8Array(payload.length + 64);
    out.set(payload);
    out.set(bs58.decode(signature), payload.length);
    signed.push(out);
  }
  return signed;
}

/** `sign_transactions`: full transactions, Salmon's slot filled, every other signature kept. */
export async function mwaSignTransactions(
  account: SolanaAccount,
  payloads: Uint8Array[]
): Promise<Uint8Array[]> {
  const result = await approveSolanaTransactionRequest(
    account,
    toSignAllTransactionsRequest('mwa', payloads)
  );
  if (!('signatures' in result)) throw new Error('Failed to sign the transactions');
  const signer = account.getReceiveAddress();
  return payloads.map((wire, i) => withSignature(wire, signer, result.signatures[i]));
}

/**
 * `sign_and_send_transactions`: sent in order through Salmon's own connection.
 * The first failure stops the rest, and `valid` tells the dApp which went out.
 * `stillWanted` is asked before each send: once the dApp has been told no
 * (the user backed out, the session ended), nothing further is broadcast.
 */
export async function mwaSignAndSend(
  account: SolanaAccount,
  payloads: Uint8Array[],
  options: MwaSendOptions,
  stillWanted: () => boolean = () => true
): Promise<{ signatures: Uint8Array[] } | { valid: boolean[] }> {
  const signatures: Uint8Array[] = [];
  for (const [i, wire] of payloads.entries()) {
    if (!stillWanted()) return { valid: payloads.map((_, j) => j < i) };
    try {
      const result = await approveSolanaTransactionRequest(
        account,
        toSignAndSendRequest(`mwa-${i}`, wire, options)
      );
      if (!('signature' in result)) throw new Error('Failed to send the transaction');
      signatures.push(bs58.decode(result.signature));
    } catch (error) {
      console.warn('[mwa] sign and send stopped', error);
      return { valid: payloads.map((_, j) => j < i) };
    }
  }
  return { signatures };
}

/** MWA's `sign_in_result`, base64 throughout. */
export interface MwaSignInResult {
  address: string;
  signed_message: string;
  signature: string;
  signature_type: string;
}

/** Sign-In With Solana inside `authorize`, bound to the dApp's declared origin. */
export async function mwaSignIn(
  account: SolanaAccount,
  payload: SolanaSignInInputFields,
  origin: string
): Promise<MwaSignInResult> {
  const result = await approveSolanaSignIn(account, payload, origin);
  return {
    address: toBase64(bs58.decode(result.address)),
    signed_message: toBase64(bs58.decode(result.signedMessage)),
    signature: toBase64(bs58.decode(result.signature)),
    signature_type: result.signatureType,
  };
}
