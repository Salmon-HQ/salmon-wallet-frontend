/**
 * PanelHost — the stacked-panel surface, independent of who mounts it.
 *
 * This used to live inside `SettingsSheet`, which meant a panel could only be
 * reached by opening settings. The account flows are the case that broke:
 * "add account" and "edit account" belong to the wallet switcher, and reaching
 * them threw the user into settings for a flow that had nothing to do with it.
 *
 * The host owns the stack, the push/pop choreography, and the header the
 * mounting surface should draw. What it does NOT own is the base screen — that
 * is the caller's `children`, the settings list in one case and the account
 * list in the other.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import {
  motionMs,
  resolveMotionMs,
  useSettingsPanelStack,
  type SettingsPanelEntry,
  type SettingsScreen,
} from '@salmon/shared';

import { SettingsPanelStack } from '../SettingsPanelStack';
import { SettingsHeaderContext, type SettingsHeaderState } from '../SettingsHeaderContext';
import type { MobilePanelRegistry } from '../SettingsPanelStack/types';

/** Navigation into the host's stack, for whatever the base screen renders. */
export interface PanelNavigation {
  push: (screen: SettingsScreen, props?: Record<string, unknown>) => void;
  pop: () => void;
  canGoBack: boolean;
}

const PanelNavigationContext = React.createContext<PanelNavigation | null>(null);

/**
 * Push a panel from inside a base screen — an "Add account" row, say.
 *
 * Returns null outside a host, so a base screen can be rendered on its own
 * (in a test, or a surface with no panels) without blowing up.
 */
export function usePanelNavigation(): PanelNavigation | null {
  return React.useContext(PanelNavigationContext);
}

export interface PanelHostProps {
  /** Whether the mounting surface is open. Closing resets the stack. */
  visible: boolean;
  /** The panels this surface can reach. */
  registry?: MobilePanelRegistry;
  /** Panels to open on, seeded before the first paint. */
  initialPanels?: SettingsPanelEntry[];
  /**
   * The title and back action the mounting surface should draw as chrome.
   * `onBack` is undefined at the base, where there is nothing to go back to.
   */
  onHeaderChange?: (title: string, onBack: (() => void) | undefined) => void;
  /** Title to report while the base screen is showing. */
  baseTitle: string;
  /** Fallback title for a panel that reports none of its own. */
  resolvePanelTitle: (screen: SettingsScreen) => string;
  /** Screens that report their own header and may override the fallback. */
  dynamicHeaderScreens?: ReadonlySet<SettingsScreen>;
  /**
   * The base screen, given the stack's navigation.
   *
   * A render prop rather than a node: the surface that mounts the host is
   * usually the one that needs to push panels from it, and a component cannot
   * consume a context it provides itself.
   */
  children: (navigation: PanelNavigation) => React.ReactNode;
}

export function PanelHost({
  visible,
  registry,
  initialPanels,
  onHeaderChange,
  baseTitle,
  resolvePanelTitle,
  dynamicHeaderScreens,
  children,
}: PanelHostProps): React.ReactElement {
  const { stack, push, pop, reset, canGoBack } = useSettingsPanelStack();
  const [headerOverride, setHeaderOverride] = useState<SettingsHeaderState | null>(null);
  const headerOverrideBackRef = useRef<(() => void) | null>(null);
  const headerOverrideOwnerRef = useRef<symbol | null>(null);
  const [animating, setAnimating] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'in' | 'out' | 'idle'>('idle');
  const animationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Bookkeeping timers, not animations: they clear the `animating` flag once
  // the stack has finished moving. They read the same two tokens the stack
  // animates on — `route` in, `ebb` out — so the gate cannot outlast (or
  // undercut) the motion it is gating.
  const isReduceMotionEnabled = useReducedMotion();
  const pushDurationMs = resolveMotionMs(motionMs.route, isReduceMotionEnabled);
  const popDurationMs = resolveMotionMs(motionMs.ebb, isReduceMotionEnabled);

  useEffect(() => {
    if (visible) return undefined;
    const timer = setTimeout(() => {
      if (animationTimerRef.current) {
        clearTimeout(animationTimerRef.current);
        animationTimerRef.current = null;
      }
      setAnimating(false);
      setSlideDirection('idle');
      reset();
    }, pushDurationMs);
    return () => clearTimeout(timer);
  }, [visible, reset, pushDurationMs]);

  useEffect(
    () => () => {
      if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
    },
    []
  );

  const finishAnimation = useCallback(() => {
    setAnimating(false);
    setSlideDirection('idle');
    animationTimerRef.current = null;
  }, []);

  const handlePush = useCallback(
    (screen: SettingsScreen, props?: Record<string, unknown>) => {
      if (animating) return;
      if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
      setSlideDirection('in');
      setAnimating(true);
      push(screen, props);
      animationTimerRef.current = setTimeout(finishAnimation, pushDurationMs);
    },
    [animating, finishAnimation, push, pushDurationMs]
  );

  const handlePop = useCallback(() => {
    if (animating || !canGoBack) return;
    if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
    setSlideDirection('out');
    setAnimating(true);
    animationTimerRef.current = setTimeout(() => {
      pop();
      finishAnimation();
    }, popDurationMs);
  }, [animating, canGoBack, finishAnimation, pop, popDurationMs]);

  /**
   * Seed the stack for a surface that opens straight onto a panel.
   *
   * Done at render time, not in an effect: an effect runs after the first
   * paint, so the base screen flashed past on the way to the panel the user
   * asked for. Setting state during render of the same commit means the first
   * frame is already the right screen.
   */
  const [openStateSeeded, setOpenStateSeeded] = useState(visible);
  if (visible !== openStateSeeded) {
    setOpenStateSeeded(visible);
    if (visible) reset(initialPanels ?? []);
  }

  const hasPanels = Boolean(registry) && stack.length > 0;
  const currentPanel = stack.length > 0 ? stack[stack.length - 1] : null;
  const fallbackTitle = currentPanel ? resolvePanelTitle(currentPanel.screen) : baseTitle;
  const currentTitle = headerOverride?.title || fallbackTitle;
  const currentBackAction = currentPanel ? headerOverride?.onBack || handlePop : undefined;

  const invokeHeaderOverrideBack = useCallback(() => {
    headerOverrideBackRef.current?.();
  }, []);

  const handleHeaderStateChange = useCallback(
    (ownerId: symbol, nextState: SettingsHeaderState | null) => {
      if (!nextState) {
        if (headerOverrideOwnerRef.current !== ownerId) return;
        headerOverrideOwnerRef.current = null;
        headerOverrideBackRef.current = null;
        setHeaderOverride((previous) => (previous === null ? previous : null));
        return;
      }

      headerOverrideOwnerRef.current = ownerId;
      headerOverrideBackRef.current = nextState.onBack;
      setHeaderOverride((previous) => {
        if (previous !== null && previous.title === nextState.title) return previous;
        return { title: nextState.title, onBack: invokeHeaderOverrideBack };
      });
    },
    [invokeHeaderOverrideBack]
  );

  const headerContextValue = useMemo(
    () => ({ setHeaderState: handleHeaderStateChange }),
    [handleHeaderStateChange]
  );

  const navigationValue = useMemo<PanelNavigation>(
    () => ({ push: handlePush, pop: handlePop, canGoBack }),
    [handlePush, handlePop, canGoBack]
  );

  useEffect(() => {
    onHeaderChange?.(currentTitle, currentBackAction ?? undefined);
  }, [currentTitle, currentBackAction, onHeaderChange]);

  useEffect(() => {
    if (!currentPanel || !dynamicHeaderScreens?.has(currentPanel.screen)) {
      headerOverrideOwnerRef.current = null;
      headerOverrideBackRef.current = null;
      setHeaderOverride(null);
    }
  }, [currentPanel, dynamicHeaderScreens]);

  return (
    <SettingsHeaderContext.Provider value={headerContextValue}>
      <PanelNavigationContext.Provider value={navigationValue}>
        {children(navigationValue)}

        {hasPanels && registry && (
          <View style={styles.panelOverlay}>
            <SettingsPanelStack
              panelRegistry={registry}
              stack={stack}
              onNavigate={handlePush}
              onBack={handlePop}
              animating={animating}
              slideDirection={slideDirection}
            />
          </View>
        )}
      </PanelNavigationContext.Provider>
    </SettingsHeaderContext.Provider>
  );
}

const styles = StyleSheet.create({
  panelOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
});
