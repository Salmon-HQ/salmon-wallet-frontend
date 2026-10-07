import {
  MWARequestFailReason,
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
  dappTransactionGate,
  decodeDAppMessage,
  encodeMwaAuthToken,
  getShortAddress,
  mwaAuthorizedAccount,
  mwaDisplayName,
  mwaIconUrl,
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
import React, { useEffect, useMemo, useRef, useState } from 'react';
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

const declined: MWAResponse = { failReason: MWARequestFailReason.UserDeclined };
const fail = (failReason: string): MWAResponse => ({ failReason }) as MWAResponse;
const invalid = (valid: boolean[]): MWAResponse => ({
  failReason: MWARequestFailReason.InvalidSignatures,
  valid,
});

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
    // The request is judged once, against the wallet as it was when it arrived.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [request]
  );

  // Refusals the user does not need to read go back to the dApp at once.
  const silent = !check.ok && !check.reason;
  useEffect(() => {
    if (silent) respond(fail(check.failReason));
  }, [silent, check, respond]);

  // Reconnect and disconnect carry a valid token by now and need no screen.
  const silentDone = useRef(false);
  useEffect(() => {
    if (!check.ok || silentDone.current) return;
    if (request.__type === MWARequestType.ReauthorizeDappRequest) {
      silentDone.current = true;
      respond({ authorizationScope: bytes(request.authorizationScope) });
    } else if (request.__type === MWARequestType.DeauthorizeDappRequest) {
      silentDone.current = true;
      actions
        .removeTrustedApp(check.origin)
        .catch((error: unknown) => console.warn('[mwa] could not forget the dApp', error))
        .finally(() => respond({}));
    }
  }, [actions, check, request, respond]);

  if (silent) return null;

  if (!check.ok) {
    const message =
      check.reason === 'network'
        ? t('dapp.mwa_network_unsupported', { requested: check.requested })
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

  // `check.ok` means an account that can sign was present when it was judged.
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

type Verification = 'checking' | 'verified' | 'unverified';

/**
 * Digital Asset Links: does the calling app really belong to the site it names?
 * Nothing is approvable while the answer is pending, and no answer is a no.
 */
function useIdentityVerification(identityUri: string | undefined): Verification {
  const [state, setState] = useState<Verification>(identityUri ? 'checking' : 'unverified');
  useEffect(() => {
    if (!identityUri) return undefined;
    let cancelled = false;
    verifyCallingPackage(identityUri)
      .then((ok: unknown) => {
        if (!cancelled) setState(ok ? 'verified' : 'unverified');
      })
      .catch(() => {
        if (!cancelled) setState('unverified');
      });
    return () => {
      cancelled = true;
    };
  }, [identityUri]);
  return state;
}

/** One approval at a time: a second tap while the first runs does nothing. */
function useOnce() {
  const busy = useRef(false);
  const [running, setRunning] = useState(false);
  const run = async (work: () => Promise<void>) => {
    if (busy.current) return;
    busy.current = true;
    setRunning(true);
    try {
      await work();
    } finally {
      busy.current = false;
      setRunning(false);
    }
  };
  return { run, running, busy };
}

interface ApprovalProps<R> {
  request: R;
  origin: string;
  account: SolanaAccount;
  respond: Respond;
}

function ConnectApproval({
  request,
  origin,
  account,
  respond,
}: ApprovalProps<AuthorizeDappRequest>) {
  const { t } = useTranslation();
  const [state, actions] = useAccountsContext();
  const verification = useIdentityVerification(request.appIdentity?.identityUri);
  const { run } = useOnce();
  const address = account.getReceiveAddress();
  const name = mwaDisplayName(request.appIdentity?.identityName, origin);
  const signIn = request.signInPayload;

  // The origin and the warning come first: the name is the dApp's own claim.
  const lines = [
    origin,
    ...(verification === 'unverified' ? [t('dapp.mwa_unverified', { origin })] : []),
    name,
    `${t('dapp.wallet_address')}: ${getShortAddress(address, 4) ?? address}`,
    signIn ? t('dapp.sign_in_subtitle') : t('dapp.connect_permissions_hint'),
  ];

  const approve = () =>
    run(async () => {
      try {
        const token = newMwaAuthToken();
        const signInResult = signIn
          ? await mwaSignIn(
              account,
              { ...signIn, resources: signIn.resources && [...signIn.resources] },
              origin
            )
          : undefined;
        await actions.addTrustedApp(
          origin,
          {
            name,
            icon: mwaIconUrl(origin, request.appIdentity?.iconRelativeUri),
            address,
            authToken: encodeMwaAuthToken(token),
          },
          state.networkId ?? undefined
        );
        respond({
          accounts: [mwaAuthorizedAccount(address, request.chain, state.activeAccount?.name)],
          authorizationScope: token,
          signInResult,
        });
      } catch (error) {
        console.warn('[mwa] connect failed', error);
        respond(declined);
      }
    });

  return (
    <ConfirmSheet
      visible
      title={signIn ? t('dapp.sign_in_title') : t('dapp.connect_title')}
      message={lines.join('\n\n')}
      confirmText={signIn ? t('dapp.sign_in_action') : t('dapp.approve')}
      cancelText={t('dapp.deny')}
      isDanger={verification !== 'verified'}
      confirmDisabled={verification === 'checking'}
      onClose={() => respond(declined)}
      onConfirm={approve}
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
  const { run } = useOnce();
  const payloads = useMemo(() => request.payloads.map(bytes), [request]);
  // The extension's reading of a message: text only when it is plain text,
  // hex otherwise, so control characters cannot hide part of what is signed.
  const shown = payloads
    .map((payload, i) => {
      const { text } = decodeDAppMessage(Array.from(payload));
      return payloads.length > 1 ? `${i + 1}/${payloads.length}\n${text}` : text;
    })
    .join('\n\n');

  const approve = () =>
    run(async () => {
      try {
        respond({ signedPayloads: await mwaSignMessages(account, payloads, origin) });
      } catch (error) {
        console.warn('[mwa] message refused', error);
        respond(invalid(payloads.map(() => false)));
      }
    });

  return (
    <ConfirmSheet
      visible
      title={t('dapp.sign_message_title')}
      message={`${origin}\n\n${shown}\n\n${t('dapp.sign_message_hint')}`}
      confirmText={t('dapp.sign')}
      cancelText={t('dapp.reject')}
      onClose={() => respond(declined)}
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
  const { run, running, busy } = useOnce();
  const [error, setError] = useState<string | null>(null);
  const answered = useRef(false);
  const payloads = useMemo(() => request.payloads.map(bytes), [request]);

  const answer = (response: MWAResponse) => {
    answered.current = true;
    respond(response);
  };

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
    if (!preview) respond(invalid(payloads.map(() => false)));
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
  const gate = dappTransactionGate({ effects, effectsLoading, parsingError });

  const approve = () =>
    run(async () => {
      setError(null);
      try {
        if (request.__type === MWARequestType.SignTransactionsRequest) {
          answer({ signedPayloads: await mwaSignTransactions(account, payloads) });
          return;
        }
        const result = await mwaSignAndSend(
          account,
          payloads,
          {
            minContextSlot: request.minContextSlot,
            commitment: request.commitment,
            skipPreflight: request.skipPreflight,
            maxRetries: request.maxRetries,
          },
          () => !answered.current
        );
        if (!answered.current) {
          answer(
            'signatures' in result
              ? { signedTransactions: result.signatures }
              : invalid(result.valid)
          );
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });

  return (
    <View style={[styles.surface, { paddingTop: insets.top }]}>
      <DepthBackground />
      <TransactionConfirmation
        display={display}
        // Backing out while signing would tell the dApp "no" while the wallet
        // keeps going; it waits until the work in hand is done.
        onBack={() => {
          if (!busy.current) answer(declined);
        }}
        onConfirm={() => void approve()}
        confirmLabel={gate.requiresHold ? t('dapp.hold_to_approve') : t('dapp.approve_and_sign')}
        isRefreshing={running}
        confirmDisabled={!gate.canApprove}
        requiresHold={gate.requiresHold}
        error={error}
        style={{ paddingBottom: insets.bottom + spacing.lg }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  surface: { ...StyleSheet.absoluteFill },
});
