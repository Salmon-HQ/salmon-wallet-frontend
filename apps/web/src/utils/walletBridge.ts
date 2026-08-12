/**
 * BroadcastChannel bridge for popup-based dApp approvals in the web wallet.
 */

import type { DAppApprovalRequest, InvalidationKind, NetworkId } from '@salmon/shared';

const CHANNEL_NAME = 'salmon_wallet_bridge';

export interface BridgeRequest {
  requestId: string;
  origin: string;
  request: DAppApprovalRequest;
}

export interface BridgeResponse {
  requestId: string;
  approved: boolean;
  payload?: unknown;
  error?: string;
}

export interface BridgeSettlementRequest {
  type: 'settle-after-tx';
  accountId: string;
  networkId?: NetworkId;
  kinds: InvalidationKind[];
}

let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel {
  if (!channel) {
    channel = new BroadcastChannel(CHANNEL_NAME);
  }
  return channel;
}

export function sendResponse(response: BridgeResponse): void {
  getChannel().postMessage(response);
}

export function sendSettlementRequest(request: BridgeSettlementRequest): void {
  getChannel().postMessage(request);
}

/**
 * Posts a request and resolves with its matching response, re-broadcasting the
 * request on an interval until a response arrives or the timeout elapses.
 *
 * A single `sendRequest` is lost if the approval popup has not yet mounted its
 * `onRequest` listener when the message is posted (BroadcastChannel does not
 * buffer). The popup can take seconds to appear — longer still when it first
 * shows an unlock screen — so we keep re-sending the idempotent request until
 * the popup answers. `setRequest` on the popup side is idempotent, so repeats
 * are harmless.
 */
export function sendRequestAndWait(
  request: BridgeRequest,
  timeoutMs = 120_000,
  resendIntervalMs = 300
): Promise<BridgeResponse> {
  return new Promise((resolve, reject) => {
    const channelRef = getChannel();

    const cleanup = () => {
      clearInterval(resend);
      clearTimeout(timer);
      channelRef.removeEventListener('message', handler);
    };

    function handler(event: MessageEvent<BridgeResponse>) {
      if (
        event.data?.requestId === request.requestId &&
        typeof event.data?.approved === 'boolean'
      ) {
        cleanup();
        resolve(event.data);
      }
    }

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Wallet bridge response timeout'));
    }, timeoutMs);

    channelRef.addEventListener('message', handler);
    channelRef.postMessage(request);
    const resend = setInterval(() => channelRef.postMessage(request), resendIntervalMs);
  });
}

export function onRequest(callback: (request: BridgeRequest) => void): () => void {
  const channelRef = getChannel();

  function handler(event: MessageEvent<BridgeRequest>) {
    if (event.data?.requestId && event.data?.request?.method) {
      callback(event.data);
    }
  }

  channelRef.addEventListener('message', handler);
  return () => channelRef.removeEventListener('message', handler);
}

export function onSettlementRequest(
  callback: (request: BridgeSettlementRequest) => void
): () => void {
  const channelRef = getChannel();

  function handler(event: MessageEvent<BridgeSettlementRequest>) {
    if (
      event.data?.type === 'settle-after-tx' &&
      event.data.accountId &&
      Array.isArray(event.data.kinds)
    ) {
      callback(event.data);
    }
  }

  channelRef.addEventListener('message', handler);
  return () => channelRef.removeEventListener('message', handler);
}

export function closeBridge(): void {
  channel?.close();
  channel = null;
}
