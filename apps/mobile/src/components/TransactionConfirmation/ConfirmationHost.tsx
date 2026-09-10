/**
 * ConfirmationHost — where a Powerup's proposal becomes a signature.
 *
 * Mounted once above the whole `(app)` stack. While core holds a signature
 * request it opens its own window — an RN Modal, the same task window Send
 * and Swap always used — over whatever screen proposed, renders
 * `TransactionConfirmation` from the proposal, and on confirm shows the wave
 * wait while core signs, broadcasts and confirms. The wait leaves on its own
 * last wave; only then does the window go, so the Powerup's receipt behind it
 * arrives over calm water.
 *
 * Its own window on purpose: the confirmation must cover the tab bar, the
 * header row and the FAB, and no Powerup screen can decide otherwise.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, useSignatureRequestHost, useWaitExit, type Semantic } from '@salmon/shared';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useTaskChromeClaim } from '../../contexts/TaskChromeContext';
import { FLOAT_DELAY_MS, floatEntering, sinkExiting } from '../../utils/sinkAndFloat';
import { DepthBackground } from '../DepthBackground';
import { LoadingScreen } from '../LoadingScreen';
import { ScalesBackground } from '../ScalesBackground';
import { TransactionConfirmation } from './TransactionConfirmation';

export function ConfirmationHost() {
  const styles = useThemedStyles(stylesFor);
  const insets = useSafeAreaInsets();
  const isReduceMotionEnabled = useReducedMotion();
  const { request, refreshing, confirmLabel, confirmOrRefresh, cancel } =
    useSignatureRequestHost();

  const isOpen = request !== null;
  const isSigning = request?.phase === 'signing';

  // The wait between the decision and the receipt: held past its own exit so
  // the window only closes once the last wave has left (DESIGN.md §The wait).
  const { held: isWaveHeld, onExited: onWaveGone } = useWaitExit(isSigning);
  // What the wave says, kept from the request that started it: the request
  // is gone by the time the wave exits.
  const [waveCopy, setWaveCopy] = useState({ title: '', subtitle: '' });
  useEffect(() => {
    if (request?.phase === 'signing') {
      setWaveCopy({
        title: request.proposal.display.pendingTitle,
        subtitle: request.proposal.display.pendingSubtitle ?? '',
      });
    }
  }, [request]);

  // The window: appears a beat after the request (the proposing screen sinks
  // first), and stays through the wave's exit. Reduce motion flips it.
  const shouldShow = isOpen || isWaveHeld;
  const [isVisible, setIsVisible] = useState(shouldShow);
  useEffect(() => {
    if (shouldShow === isVisible) return undefined;
    if (isReduceMotionEnabled || !shouldShow) {
      setIsVisible(shouldShow);
      return undefined;
    }
    const timer = setTimeout(() => setIsVisible(true), FLOAT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [shouldShow, isVisible, isReduceMotionEnabled]);

  // The shell's chrome leaves while the window is up and returns as it goes.
  const engageTaskChrome = useTaskChromeClaim();
  useEffect(() => {
    engageTaskChrome(shouldShow || isVisible);
  }, [shouldShow, isVisible, engageTaskChrome]);

  const handleDismiss = useCallback(() => {
    // Backing out is only possible before the signature: nothing exits a
    // wait for a transaction that is already on its way.
    if (isSigning || isWaveHeld) return;
    cancel();
  }, [isSigning, isWaveHeld, cancel]);

  return (
    <Modal
      visible={isVisible}
      animationType="none"
      presentationStyle="fullScreen"
      onRequestClose={handleDismiss}
      testID="confirmation-window"
    >
      <View style={[styles.surface, { paddingTop: insets.top }]}>
        <DepthBackground />
        <ScalesBackground variant="deepField" />

        {request && !isSigning && (
          <Animated.View
            style={styles.step}
            entering={floatEntering(isReduceMotionEnabled)}
            exiting={sinkExiting(isReduceMotionEnabled)}
          >
            <TransactionConfirmation
              display={request.proposal.display}
              onBack={cancel}
              onConfirm={() => void confirmOrRefresh()}
              confirmLabel={confirmLabel}
              isRefreshing={refreshing}
              error={request.error}
              style={{ paddingBottom: insets.bottom + spacing.lg }}
            />
          </Animated.View>
        )}

        {isWaveHeld && (
          <Animated.View style={styles.step} entering={floatEntering(isReduceMotionEnabled)}>
            <LoadingScreen
              visible={!!isSigning}
              waves
              title={waveCopy.title}
              subtitle={waveCopy.subtitle}
              bottomOffset={insets.bottom}
              onExited={onWaveGone}
            />
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    surface: {
      flex: 1,
      backgroundColor: t.depth.column,
    },
    step: {
      flex: 1,
    },
  });
