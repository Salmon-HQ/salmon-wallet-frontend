/**
 * The send flow — four screens, one passage.
 *
 * Send used to be a bottom sheet with four steps inside it. Every one of those
 * steps changes what the surface is (a recipient, an amount, a signature, a
 * receipt), which is exactly the case DESIGN.md §Sheets sends to a screen. So
 * the steps are routes now, and this sub-stack is what holds them together.
 *
 * What lives here rather than on a screen:
 *
 * - **The flow's state**, in `SendFlowProvider`. Each screen mounts and
 *   unmounts on its own; the recipient, token and amount must survive a back
 *   gesture, so they sit above all four.
 * - **The wait and the failure.** Both take the whole screen and both outlive
 *   the screen that started them: the review screen is covered the instant it
 *   commits. Their choreography is unchanged from the sheet — one wait spanning
 *   signature through settle, held past its own exit so the receipt only
 *   arrives once the last wave has left (DESIGN.md §The wait).
 * - **The route guard.** A watch-only wallet cannot sign, so it never reaches
 *   the flow: Home already disables the Send control, and this is the second
 *   lock on the same door for a deep link or a restored route.
 *
 * The task-chrome claim is deliberately gone (spec 018 FR-007). The sheet held
 * it so the home would sink out from under a flow that was about to cover it
 * with an opaque window; a pushed screen already covers Home completely, and
 * there is nothing behind it to disassemble. Swap keeps its own claim — the
 * context counts claims per publisher, so dropping this one changes nothing
 * for it.
 */
import React, { useCallback, useEffect, useRef } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import ReAnimated, { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getShortAddress,
  isWatchOnlyAccount,
  useAccountsContext,
  useWaitExit,
  type Semantic,
} from '@salmon/shared';

import { DepthBackground, LoadingScreen, ScalesBackground, SendFailure } from '../../../src/components';
import { SendFlowProvider, useSendFlow } from '../../../src/contexts/SendFlowContext';
import { useThemedStyles } from '../../../src/theme/useThemedStyles';
import { floatEntering } from '../../../src/utils/sinkAndFloat';

/**
 * The passage: the wait between the decision and the receipt, and the report
 * when there is no receipt to give.
 *
 * Lifted out of the layout body only because it needs the flow's own context,
 * which the layout is the thing providing.
 */
function SendPassage() {
  const { t } = useTranslation();
  const router = useRouter();
  const styles = useThemedStyles(stylesFor);
  const insets = useSafeAreaInsets();
  const isReduceMotionEnabled = useReducedMotion();
  const { sendHook, token, amount, recipient, txId, submit, reset } = useSendFlow();

  const isSending = sendHook.status === 'creating' || sendHook.status === 'sending';
  const sendFailed = sendHook.status === 'failed';

  // One wait spans the whole commit, signature through settle, exactly as the
  // sheet spanned it: gated on `isSending` alone it ended at the signature and
  // the receipt raised a second wait of its own for the indexer.
  const isCommitted = isSending || sendHook.settling;
  const { held: isWaveHeld, onExited: onWaveGone } = useWaitExit(isCommitted);
  const showWait = isCommitted || (isWaveHeld && !!txId);

  const summary =
    token && recipient
      ? t('transaction.sendSummary', {
          amount,
          symbol: token.symbol,
          recipient: getShortAddress(recipient.address) ?? recipient.address,
        })
      : '';

  // The receipt waits for the wave's report, then takes the review screen's
  // place — `replace`, so the signed transfer is never behind a back gesture.
  const navigatedRef = useRef(false);
  useEffect(() => {
    if (!txId || isWaveHeld || navigatedRef.current) return;
    navigatedRef.current = true;
    router.replace('/send/success');
  }, [txId, isWaveHeld, router]);

  /** Leave the flow: drop its state and go back to the wallet. */
  const handleLeave = useCallback(() => {
    reset();
    router.replace('/');
  }, [reset, router]);

  return (
    <>
      {/* The wave wait, in its own window above every piece of chrome. It
          leaves on its own last wave, and the receipt waits for that report. */}
      {showWait && (
        <LoadingScreen
          fullScreen
          visible={isCommitted}
          waves
          title={t('transaction.pendingSend')}
          subtitle={summary}
          bottomOffset={insets.bottom}
          onExited={onWaveGone}
        />
      )}

      {/* The failure, on the very surface the wait was standing on. A failed
          transfer does not rewind the passage: retry fires the same transfer
          from here, and the only thing that unwinds it is leaving. */}
      <Modal
        visible={sendFailed}
        animationType="none"
        presentationStyle="fullScreen"
        onRequestClose={handleLeave}
        testID="send-failure-modal"
      >
        <View style={[styles.taskSurface, { paddingTop: insets.top }]}>
          <DepthBackground />
          <ScalesBackground variant="deepField" />
          <ReAnimated.View
            key="send-failure-surface"
            testID="send-failure-surface"
            style={styles.failureSurface}
            entering={floatEntering(isReduceMotionEnabled)}
          >
            <SendFailure
              title={t('transaction.sendFailed')}
              // The hook hands back a translation key, never a raw chain error.
              message={t(sendHook.error ?? 'transaction.errors.generic')}
              retryLabel={t('actions.retry')}
              dismissLabel={t('transaction.continue')}
              onRetry={submit}
              onDismiss={handleLeave}
              bottomInset={insets.bottom}
            />
          </ReAnimated.View>
        </View>
      </Modal>
    </>
  );
}

export default function SendLayout() {
  const router = useRouter();
  const [accountState] = useAccountsContext();
  const { activeAccount } = accountState;
  const isWatchOnly = !!activeAccount && isWatchOnlyAccount(activeAccount);

  // A watch-only wallet has no key to sign with, so the flow has nothing to
  // offer it. Home already hides the door; this is the lock on it.
  useEffect(() => {
    if (isWatchOnly) router.replace('/');
  }, [isWatchOnly, router]);

  if (isWatchOnly) return null;

  return (
    <SendFlowProvider>
      {/* Headers stay hidden: every screen draws the kit's own `ScreenHeader`.
          The right slide is inherited from the app stack — a send screen is a
          pushed screen like any other and must not arrive from a different
          edge (spec 017 FR-006). */}
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="amount" />
        <Stack.Screen name="review" />
        {/* There is nothing behind a signed transfer. The receipt's only way
            out is "Back to wallet", so the back gesture is taken off it. */}
        <Stack.Screen name="success" options={{ gestureEnabled: false }} />
      </Stack>
      <SendPassage />
    </SendFlowProvider>
  );
}

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    /** The failure's window: the same water column the task shell paints. */
    taskSurface: {
      flex: 1,
      backgroundColor: t.depth.column,
    },
    failureSurface: {
      flex: 1,
    },
  });
