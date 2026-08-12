/**
 * Salmon wallet registration for the web wallet popup flow.
 */

import bs58 from 'bs58';
import { useEffect } from 'react';
import {
  serializeSignedTransactionFromApproval,
  serializeSignedTransactionsFromApproval,
  type DAppConnectApprovalPayload,
  type DAppSignAllTransactionsApprovalPayload,
  type DAppSignAndSendTransactionApprovalPayload,
  type DAppSignInApprovalPayload,
  type DAppSignMessageApprovalPayload,
  type DAppSignOffchainMessageApprovalPayload,
  type DAppSignTransactionApprovalPayload,
  type SolanaSignInInputFields,
} from '@salmon/shared';
import { sendRequestAndWait, type BridgeRequest } from '../utils/walletBridge';

let registered = false;

function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function openApprovalPopup(path: string, requestId: string, origin: string, name: string): void {
  const popupUrl = `${path}?requestId=${requestId}&origin=${encodeURIComponent(origin)}`;
  window.open(popupUrl, name, 'width=420,height=600,popup=yes');
}

function createSalmonWallet() {
  return {
    // Public integration contract: dApps match on this exact string via the Wallet
    // Standard `name` property. Do NOT rename to "Salmon Wallet" or anything else —
    // it would silently break every dApp that already recognizes "Salmon". See
    // spec 004-brand-naming-consistency FR-006 / SC-004.
    name: 'Salmon' as const,
    icon: '/images/Logo.png' as const,
    version: '1.0.0' as const,

    async connect(origin: string): Promise<{ publicKey: string } | null> {
      const requestId = generateRequestId();
      const request: BridgeRequest = {
        requestId,
        origin,
        request: {
          id: requestId,
          method: 'connect',
          params: {},
        },
      };

      openApprovalPopup('/dapp/connect', requestId, origin, 'salmon-connect');
      const response = await sendRequestAndWait(request);

      if (!response.approved) return null;
      return response.payload as DAppConnectApprovalPayload;
    },

    async signMessage(origin: string, message: Uint8Array): Promise<Uint8Array | null> {
      const requestId = generateRequestId();
      const request: BridgeRequest = {
        requestId,
        origin,
        request: {
          id: requestId,
          method: 'sign',
          params: { data: Array.from(message) },
        },
      };

      openApprovalPopup('/dapp/sign-message', requestId, origin, 'salmon-sign');
      const response = await sendRequestAndWait(request);

      if (!response.approved) return null;
      const payload = response.payload as DAppSignMessageApprovalPayload;
      return new Uint8Array(bs58.decode(payload.signature));
    },

    /**
     * OCMS v1 `solana:signOffchainMessage` (Wallet Standard PR#92). Input mirrors the
     * PR#92 feature (UTF-8 `message` string + required signer public keys); output is
     * the PR#92 shape with the bridge's bs58 strings decoded back to `Uint8Array`.
     */
    supportedOffchainMessageVersions: [1] as const,

    async signOffchainMessage(
      origin: string,
      input: { messageVersion: number; message: string; requiredSigners: Uint8Array[] }
    ): Promise<{
      signedOffchainMessage: Uint8Array;
      signature: Uint8Array;
      signatureType: 'ed25519';
    } | null> {
      if (input.messageVersion !== 1) {
        throw new Error('Unsupported off-chain message version');
      }

      const requestId = generateRequestId();
      const request: BridgeRequest = {
        requestId,
        origin,
        request: {
          id: requestId,
          method: 'signOffchain',
          params: {
            data: Array.from(new TextEncoder().encode(input.message)),
            requiredSigners: input.requiredSigners.map((publicKey) => bs58.encode(publicKey)),
          },
        },
      };

      openApprovalPopup('/dapp/sign-message', requestId, origin, 'salmon-sign-offchain');
      const response = await sendRequestAndWait(request);

      if (!response.approved) return null;
      const payload = response.payload as DAppSignOffchainMessageApprovalPayload;
      return {
        signedOffchainMessage: new Uint8Array(bs58.decode(payload.signedOffchainMessage)),
        signature: new Uint8Array(bs58.decode(payload.signature)),
        signatureType: payload.signatureType,
      };
    },

    /**
     * Native `solana:signIn` (SIWS). Only the dApp's `SolanaSignInInput` crosses
     * the bridge — the wallet builds the message from the real origin. Output is
     * the Wallet Standard shape with the bridge's bs58 strings decoded back to
     * `Uint8Array` (incl. PR#93's `signedMessageFormat` on the OCMS path).
     */
    async signIn(
      origin: string,
      input: SolanaSignInInputFields = {}
    ): Promise<{
      account: { address: string; publicKey: Uint8Array };
      signedMessage: Uint8Array;
      signature: Uint8Array;
      signatureType: 'ed25519';
      signedMessageFormat?: { kind: 'offchainMessage'; messageVersion: 1 };
    } | null> {
      const requestId = generateRequestId();
      const request: BridgeRequest = {
        requestId,
        origin,
        request: {
          id: requestId,
          method: 'signIn',
          params: { input },
        },
      };

      openApprovalPopup('/dapp/sign-in', requestId, origin, 'salmon-sign-in');
      const response = await sendRequestAndWait(request);

      if (!response.approved) return null;
      const payload = response.payload as DAppSignInApprovalPayload;
      return {
        account: {
          address: payload.address,
          publicKey: new Uint8Array(bs58.decode(payload.address)),
        },
        signedMessage: new Uint8Array(bs58.decode(payload.signedMessage)),
        signature: new Uint8Array(bs58.decode(payload.signature)),
        signatureType: payload.signatureType,
        ...(payload.signedMessageFormat
          ? { signedMessageFormat: payload.signedMessageFormat }
          : {}),
      };
    },

    async signTransaction(origin: string, transaction: Uint8Array): Promise<Uint8Array | null> {
      const requestId = generateRequestId();
      const encodedMessage = bs58.encode(transaction);
      const request: BridgeRequest = {
        requestId,
        origin,
        request: {
          id: requestId,
          method: 'signTransaction',
          params: { message: encodedMessage },
        },
      };

      openApprovalPopup('/dapp/sign-transaction', requestId, origin, 'salmon-sign-tx');
      const response = await sendRequestAndWait(request);

      if (!response.approved) return null;
      const payload = response.payload as DAppSignTransactionApprovalPayload;
      return serializeSignedTransactionFromApproval(
        encodedMessage,
        payload.publicKey,
        payload.signature
      );
    },

    async signAllTransactions(
      origin: string,
      transactions: Uint8Array[]
    ): Promise<Uint8Array[] | null> {
      const requestId = generateRequestId();
      const encodedMessages = transactions.map((transaction) => bs58.encode(transaction));
      const request: BridgeRequest = {
        requestId,
        origin,
        request: {
          id: requestId,
          method: 'signAllTransactions',
          params: { messages: encodedMessages },
        },
      };

      openApprovalPopup('/dapp/sign-transaction', requestId, origin, 'salmon-sign-all-tx');
      const response = await sendRequestAndWait(request);

      if (!response.approved) return null;
      const payload = response.payload as DAppSignAllTransactionsApprovalPayload;
      return serializeSignedTransactionsFromApproval(
        encodedMessages,
        payload.publicKey,
        payload.signatures
      );
    },

    async signAndSendTransaction(
      origin: string,
      transaction: Uint8Array,
      options?: Record<string, unknown>
    ): Promise<string | null> {
      const requestId = generateRequestId();
      const request: BridgeRequest = {
        requestId,
        origin,
        request: {
          id: requestId,
          method: 'signAndSendTransaction',
          params: {
            message: bs58.encode(transaction),
            options,
          },
        },
      };

      openApprovalPopup('/dapp/sign-transaction', requestId, origin, 'salmon-sign-send-tx');
      const response = await sendRequestAndWait(request);

      if (!response.approved) return null;
      const payload = response.payload as DAppSignAndSendTransactionApprovalPayload;
      return payload.signature;
    },
  };
}

function registerSalmonWallet(): () => void {
  if (registered) return () => {};
  registered = true;

  const wallet = createSalmonWallet();
  const callback = ({ register }: { register: (wallet: unknown) => void }) => register(wallet);

  window.dispatchEvent(
    new CustomEvent('wallet-standard:register-wallet', {
      detail: callback,
      bubbles: false,
      cancelable: false,
    })
  );

  const appReadyHandler = (event: Event) => {
    callback((event as CustomEvent).detail);
  };
  window.addEventListener('wallet-standard:app-ready', appReadyHandler);
  (window as unknown as Record<string, unknown>).__salmonWallet = wallet;

  return () => {
    window.removeEventListener('wallet-standard:app-ready', appReadyHandler);
  };
}

export function SalmonWalletRegistrar(): null {
  useEffect(() => {
    const cleanup = registerSalmonWallet();
    return cleanup;
  }, []);

  return null;
}
