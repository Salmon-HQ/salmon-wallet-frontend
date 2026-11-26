import { useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Reads a message aloud as it appears. iOS ignores `accessibilityLiveRegion`,
 * so an error line that mounts says itself through the screen reader on both
 * platforms this way.
 */
export function useAnnounce(message: string | undefined): void {
  useEffect(() => {
    if (message) AccessibilityInfo.announceForAccessibility(message);
  }, [message]);
}
