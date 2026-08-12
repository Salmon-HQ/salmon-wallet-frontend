/**
 * Inactivity timeout hook for auto-locking the wallet.
 *
 * This hook detects user inactivity and triggers a callback when the
 * timeout is reached. It integrates with the stash module for
 * persistent activity tracking across app restarts.
 *
 * Platform-specific behavior:
 * - **Web/Extension**: Monitors mouse, keyboard, touch, and scroll events
 * - **Mobile**: Uses timer-based approach with last activity timestamp
 *
 * @module hooks/useInactivityTimeout
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { updateLastActivity, getLastActivity, isSessionTimedOut } from '../storage/stash';
import { isWebEnvironment } from '../utils/platform';

// ============================================================================
// Constants
// ============================================================================

/**
 * Default inactivity timeout in milliseconds (5 minutes).
 */
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Interval for checking session timeout (30 seconds).
 */
const CHECK_INTERVAL_MS = 30 * 1000;

/**
 * Debounce delay for activity events (1 second).
 * Prevents excessive storage writes on rapid user actions.
 */
const ACTIVITY_DEBOUNCE_MS = 1000;

/**
 * Events to monitor for user activity on web platforms.
 */
const WEB_ACTIVITY_EVENTS = [
  'mousedown',
  'mousemove',
  'keydown',
  'keypress',
  'touchstart',
  'touchmove',
  'scroll',
  'wheel',
  'click',
] as const;

// ============================================================================
// Types
// ============================================================================

/**
 * Options for configuring the inactivity timeout hook.
 */
export interface UseInactivityTimeoutParams {
  /**
   * Timeout duration in milliseconds.
   * @default 300000 (5 minutes)
   */
  timeoutMs?: number;

  /**
   * Callback function invoked when inactivity timeout is reached.
   * Typically used to lock the wallet or redirect to login.
   */
  onTimeout?: () => void;

  /**
   * Whether the inactivity monitoring is enabled.
   * Set to false to temporarily disable monitoring.
   * @default true
   */
  enabled?: boolean;
}

/**
 * Return type for the useInactivityTimeout hook.
 */
export interface UseInactivityTimeoutResult {
  /**
   * Whether the user is currently considered active.
   * False when the timeout has been reached.
   */
  isActive: boolean;

  /**
   * Manually resets the inactivity timer.
   * Call this when user performs an action that should reset the timer.
   */
  resetTimer: () => Promise<void>;

  /**
   * Timestamp of the last recorded activity.
   * Undefined if no activity has been recorded yet.
   */
  lastActivity: number | undefined;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for detecting user inactivity and triggering timeout callbacks.
 *
 * This hook monitors user activity and calls the `onTimeout` callback
 * when the user has been inactive for the specified duration. It
 * integrates with the stash storage for persistent activity tracking.
 *
 * **Web/Extension behavior:**
 * - Listens to mouse, keyboard, touch, and scroll events
 * - Debounces activity updates to prevent excessive storage writes
 * - Periodically checks for session timeout
 *
 * **Mobile (React Native) behavior:**
 * - Uses timer-based approach without DOM events
 * - Relies on manual `resetTimer()` calls from the app
 * - Checks session timeout on mount and periodically
 *
 * @param options - Configuration options for the timeout behavior
 * @returns Object containing activity state and control functions
 *
 * @example
 * ```typescript
 * import { useInactivityTimeout } from '@salmon/shared/hooks';
 * import { useNavigation } from '@react-navigation/native';
 *
 * function AppRoot() {
 *   const navigation = useNavigation();
 *
 *   const { isActive, resetTimer, lastActivity } = useInactivityTimeout({
 *     timeoutMs: 5 * 60 * 1000, // 5 minutes
 *     onTimeout: () => {
 *       // Lock the wallet and navigate to unlock screen
 *       navigation.navigate('Unlock');
 *     },
 *     enabled: true,
 *   });
 *
 *   // For mobile: call resetTimer on user interactions
 *   const handleUserAction = async () => {
 *     await resetTimer();
 *     // ... handle action
 *   };
 *
 *   return (
 *     <View onTouchStart={resetTimer}>
 *       <Text>Last activity: {lastActivity}</Text>
 *       <Button onPress={handleUserAction} title="Action" />
 *     </View>
 *   );
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Web usage - automatic event detection
 * function WebApp() {
 *   const { isActive } = useInactivityTimeout({
 *     timeoutMs: 10 * 60 * 1000, // 10 minutes
 *     onTimeout: () => {
 *       // lock the wallet and show lock screen
 *       showLockScreen();
 *     },
 *   });
 *
 *   // Events are automatically monitored on web
 *   return <div>{isActive ? 'Active' : 'Timed out'}</div>;
 * }
 * ```
 */
export function useInactivityTimeout(
  options: UseInactivityTimeoutParams = {}
): UseInactivityTimeoutResult {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, onTimeout, enabled = true } = options;

  // State
  const [isActive, setIsActive] = useState<boolean>(true);
  const [lastActivity, setLastActivity] = useState<number | undefined>(undefined);

  // Refs for stable callbacks and debouncing
  const onTimeoutRef = useRef(onTimeout);
  const lastActivityUpdateRef = useRef<number>(0);
  const hasTriggeredTimeoutRef = useRef<boolean>(false);

  // Keep callback ref up to date
  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  // Reset timeout trigger when re-enabled
  useEffect(() => {
    if (enabled) {
      hasTriggeredTimeoutRef.current = false;
    }
  }, [enabled]);

  /**
   * Records user activity and updates the last activity timestamp.
   * Debounced to prevent excessive storage writes.
   */
  const recordActivity = useCallback(async (): Promise<void> => {
    const now = Date.now();

    // Debounce activity updates
    if (now - lastActivityUpdateRef.current < ACTIVITY_DEBOUNCE_MS) {
      return;
    }

    lastActivityUpdateRef.current = now;

    try {
      await updateLastActivity();
      setLastActivity(now);
      setIsActive(true);
      hasTriggeredTimeoutRef.current = false;
    } catch (error) {
      console.error('Failed to update last activity:', error);
    }
  }, []);

  /**
   * Manually resets the inactivity timer.
   * Exposed to consumers for programmatic activity recording.
   */
  const resetTimer = useCallback(async (): Promise<void> => {
    // Force update by resetting debounce timestamp
    lastActivityUpdateRef.current = 0;
    await recordActivity();
  }, [recordActivity]);

  /**
   * Checks if the session has timed out and triggers the callback if so.
   */
  const checkTimeout = useCallback(async (): Promise<void> => {
    if (!enabled || hasTriggeredTimeoutRef.current) {
      return;
    }

    try {
      const timedOut = await isSessionTimedOut(timeoutMs);

      if (timedOut) {
        setIsActive(false);
        hasTriggeredTimeoutRef.current = true;
        onTimeoutRef.current?.();
      } else {
        setIsActive(true);
      }

      // Update last activity state
      const activity = await getLastActivity();
      setLastActivity(activity);
    } catch (error) {
      console.error('Failed to check session timeout:', error);
    }
  }, [enabled, timeoutMs]);

  // Initialize and load last activity on mount
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const initialize = async () => {
      try {
        // Load existing last activity
        const activity = await getLastActivity();
        setLastActivity(activity);

        // Check if already timed out
        const timedOut = await isSessionTimedOut(timeoutMs);
        if (timedOut) {
          setIsActive(false);
          hasTriggeredTimeoutRef.current = true;
          onTimeoutRef.current?.();
        } else {
          setIsActive(true);
          // Record initial activity if session is valid
          await updateLastActivity();
          setLastActivity(Date.now());
        }
      } catch (error) {
        console.error('Failed to initialize inactivity timeout:', error);
        // Assume active on error
        setIsActive(true);
      }
    };

    initialize();
  }, [enabled, timeoutMs]);

  // Set up periodic timeout check
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const intervalId = setInterval(checkTimeout, CHECK_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [enabled, checkTimeout]);

  // Web-specific: Set up DOM event listeners
  useEffect(() => {
    if (!enabled || !isWebEnvironment()) {
      return;
    }

    // Event handler that records activity
    const handleActivity = (): void => {
      void recordActivity();
    };

    // Add listeners for all activity events
    for (const event of WEB_ACTIVITY_EVENTS) {
      document.addEventListener(event, handleActivity, { passive: true });
    }

    // Also listen on window for better coverage
    window.addEventListener('focus', handleActivity, { passive: true });
    window.addEventListener('blur', handleActivity, { passive: true });

    return () => {
      for (const event of WEB_ACTIVITY_EVENTS) {
        document.removeEventListener(event, handleActivity);
      }
      window.removeEventListener('focus', handleActivity);
      window.removeEventListener('blur', handleActivity);
    };
  }, [enabled, recordActivity]);

  return {
    isActive,
    resetTimer,
    lastActivity,
  };
}
