import {
  MWARequestType,
  verifyCallingPackage,
  type AuthorizeDappRequest,
  type MWARequest,
  type MWAResponse,
  type SignAndSendTransactionsRequest,
  type SignMessagesRequest,
  type SignTransactionsRequest,
} from '@solana-mobile/mobile-wallet-adapter-walletlib';
import {
  dappTransactionDisplay,
  encodeMwaAuthToken,
  getShortAddress,
  mwaAuthorizedAccount,
  mwaPrecheck,
  mwaSignAndSend,
  mwaSignIn,
  mwaSignMessages,
  mwaSignTransactions,
  newMwaAuthToken,
  spacing,
  toSignAllTransactionsRequest,
  useAccountsContext,
  useSolanaTransactionApproval,
  type MwaPrecheck,
  type SolanaAccount,
} from '@salmon/shared';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfirmSheet } from '../components/ConfirmSheet';
import { DepthBackground } from '../components/DepthBackground';
import { TransactionConfirmation } from '../components/TransactionConfirmation';

type Respond = (response: MWAResponse) => void;

interface Props {
  request: MWARequest;
  respond: Respond;
  /** The active account when it can sign; null for a watch-only wallet. */
  account: SolanaAccount | null;
}

// The bridge hands bytes over as plain number arrays.
const bytes = (value: unknown) => Uint8Array.from(value as ArrayLike<number>);
const fail = (failReason: string) => ({ failReason }) as unknown as MWAResponse;

/** One dApp request: refused up front, answered silently, or shown for approval. */
export function MwaRequest({ request, respond, account }: Props) {
  const { t } = useTranslation();
  const [state, actions] = useAccountsContext();
  const address = account?.getReceiveAddress() ?? null;
  const isAuthorize = request.__type === MWARequestType.AuthorizeDappRequest;

  const check: MwaPrecheck = useMemo(
    () =>
      mwaPrecheck(
        {
          authorize: isAuthorize,
          chain: request.chain,
          identityUri: request.appIdentity?.identityUri,
          authorizationScope:
            'authorizationScope' in request ? bytes(request.authorizationScope) : undefined,
          payloadCount: 'payloads' in request ? request.payloads.length : undefined,
        },
        { address, networkId: state.networkId, trustedApps: state.activeTrustedApps }
      ),
    // The request is answered once; later trust changes must not re-judge it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [request]
  );

  // Refusals the user does not need to read go back to the dApp at once.
  const silent = !check.ok && !check.reason;
  useEffect(() => {
    if (silent) respond(fail(check.failReason));
  }, [silent, check, respond]);

  // Reconnect and disconnect carry a valid token by now and need no screen.
  useEffect(() => {
    if (!check.ok) return;
    if (request.__type === MWARequestType.ReauthorizeDappRequest) {
      respond({ authorizationScope: bytes(request.authorizationScope) } as MWAResponse);
    } else if (request.__type === MWARequestType.DeauthorizeDappRequest) {
      void actions.removeTrustedApp(check.origin).finally(() => respond({} as MWAResponse));
    }
  }, [actions, check, request, respond]);

  if (silent) return null;

  if (!check.ok) {
    const message =
      check.reason === 'network'
        ? t('dapp.network_mismatch', { requested: check.requested, active: state.networkId })
        : check.reason === 'watch-only'
          ? t('dapp.mwa_watch_only')
          : t('dapp.mwa_identity_missing');
    return (
      <ConfirmSheet
        visible
        acknowledgeOnly
        title={t('dapp.mwa_refused_title')}
        message={message}
        onClose={() => respond(fail(check.failReason))}
        onConfirm={() => respond(fail(check.failReason))}
      />
    );
  }

  if (!account) return null;
  const { origin } = check;

  switch (request.__type) {
    case MWARequestType.AuthorizeDappRequest:
      return (
        <ConnectApproval request={request} origin={origin} account={account} respond={respond} />
      );
    case MWARequestType.SignMessagesRequest:
      return (
        <SignMessagesApproval
          request={request}
          origin={origin}
          account={account}
          respond={respond}
        />
      );
    case MWARequestType.SignTransactionsRequest:
    case MWARequestType.SignAndSendTransactionsRequest:
      return (
        <TransactionApproval
          request={request}
          origin={origin}
          account={account}
          respond={respond}
        />
      );
    default:
      return null;
  }
}

/** Digital Asset Links: does the calling app really belong to the site it names? */
function useIdentityVerified(identityUri: string | undefined) {
  const [verified, setVerified] = useState(true);
  useEffect(() => {
    if (!identityUri) return;
    verifyCallingPackage(identityUri)
      .then((ok) => setVerified(!!ok))
      .catch(() => setVerified(false));
  }, [identityUri]);
  return verified;
}

interface ApprovalProps<R> {
  request: R;
  origin: string;
  account: SolanaAccount;
  respond: Respond;
}

function ConnectApproval({ request, origin, account, respond }: ApprovalProps<AuthorizeDappRequest>) {
  const { t } = useTranslation();
  const [state, actions] = useAccountsContext();
  const verified = useIdentityVerified(request.appIdentity?.identityUri);
  const address = account.getReceiveAddress();
  const name = request.appIdentity?.identityName ?? origin;
  const signIn = request.signInPayload;

  const lines = [
    `${name} — ${origin}`,
    `${t('dapp.wallet_address')}: ${getShortAddress(address, 4) ?? address}`,
    signIn ? t('dapp.sign_in_subtitle') : t('dapp.connect_permissions_hint'),
    ...(verified ? [] : [t('dapp.mwa_unverified', { origin })]),
  ];

  const approve = async () => {
    const token = newMwaAuthToken();
    const signInResult = signIn
      ? await mwaSignIn(account, { ...signIn, resources: signIn.resources && [...signIn.resources] }, origin)
      : undefined;
    const iconPath = request.appIdentity?.iconRelativeUri;
    await actions.addTrustedApp(
      origin,
      {
        name,
        icon: iconPath ? new URL(iconPath, origin).toString() : undefined,
        address,
        authToken: encodeMwaAuthToken(token),
      },
      state.networkId ?? undefined
    );
    respond({
      accounts: [mwaAuthorizedAccount(address, request.chain, state.activeAccount?.name)],
      authorizationScope: token,
      signInResult,
    } as MWAResponse);
  };

  return (
    <ConfirmSheet
      visible
      title={signIn ? t('dapp.sign_in_title') : t('dapp.connect_title')}
      message={lines.join('\n\n')}
      confirmText={signIn ? t('dapp.sign_in_action') : t('dapp.approve')}
      cancelText={t('dapp.deny')}
      isDanger={!verified}
      onClose={() => respond(fail('USER_DECLINED'))}
      onConfirm={() =>
        approve().catch((error: unknown) => {
          console.warn('[mwa] connect failed', error);
          respond(fail('USER_DECLINED'));
        })
      }
    />
  );
}

function SignMessagesApproval({
  request,
  origin,
  account,
  respond,
}: ApprovalProps<SignMessagesRequest>) {
  const { t } = useTranslation();
  const payloads = useMemo(() => request.payloads.map(bytes), [request]);
  const text = payloads
    .map((payload) => {
      try {
        return new TextDecoder('utf-8', { fatal: true }).decode(payload);
      } catch {
        return t('dapp.mwa_message_binary', { bytes: payload.length });
      }
    })
    .join('\n\n—\n\n');

  const approve = async () => {
    try {
      respond({ signedPayloads: await mwaSignMessages(account, payloads, origin) } as MWAResponse);
    } catch (error) {
      console.warn('[mwa] message refused', error);
      respond({ failReason: 'INVALID_SIGNATURES', valid: payloads.map(() => false) } as never);
    }
  };

  return (
    <ConfirmSheet
      visible
      title={t('dapp.sign_message_title')}
      message={`${origin}\n\n${text}\n\n${t('dapp.sign_message_hint')}`}
      confirmText={t('dapp.sign')}
      cancelText={t('dapp.reject')}
      onClose={() => respond(fail('USER_DECLINED'))}
      onConfirm={approve}
    />
  );
}

function TransactionApproval({
  request,
  origin,
  account,
  respond,
}: ApprovalProps<SignTransactionsRequest | SignAndSendTransactionsRequest>) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const payloads = useMemo(() => request.payloads.map(bytes), [request]);
  const sendAfterSigning = request.__type === MWARequestType.SignAndSendTransactionsRequest;

  // The preview is the extension's; a request that cannot even be read is
  // refused here, before anything is shown as signable.
  const preview = useMemo(() => {
    try {
      return toSignAllTransactionsRequest(request.requestId, payloads);
    } catch {
      return null;
    }
  }, [payloads, request.requestId]);
  useEffect(() => {
    if (!preview) respond({ failReason: 'INVALID_SIGNATURES', valid: payloads.map(() => false) } as never);
  }, [preview, payloads, respond]);

  const { feeSol, parsingError, effects, effectsLoading, details } = useSolanaTransactionApproval({
    account,
    request: preview,
  });

  if (!preview) return null;

  const display = dappTransactionDisplay(
    {
      origin,
      effects,
      effectsLoading,
      feeSol,
      transactionCount: details?.transactionCount ?? payloads.length,
      parsingError,
    },
    t
  );

  const approve = async () => {
    setBusy(true);
    setError(null);
    try {
      if (!sendAfterSigning) {
        respond({ signedPayloads: await mwaSignTransactions(account, payloads) } as MWAResponse);
        return;
      }
      const sendRequest = request as SignAndSendTransactionsRequest;
      const result = await mwaSignAndSend(account, payloads, {
        minContextSlot: sendRequest.minContextSlot,
        commitment: sendRequest.commitment,
        skipPreflight: sendRequest.skipPreflight,
        maxRetries: sendRequest.maxRetries,
      });
      respond(
        'signatures' in result
          ? ({ signedTransactions: result.signatures } as MWAResponse)
          : ({ failReason: 'INVALID_SIGNATURES', valid: result.valid } as never)
      );
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <View style={[styles.surface, { paddingTop: insets.top }]}>
      <DepthBackground />
      <TransactionConfirmation
        display={display}
        onBack={() => respond(fail('USER_DECLINED'))}
        onConfirm={() => void approve()}
        confirmLabel={t('dapp.approve_and_sign')}
        isRefreshing={busy}
        error={error}
        style={{ paddingBottom: insets.bottom + spacing.lg }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  surface: { ...StyleSheet.absoluteFill },
});
