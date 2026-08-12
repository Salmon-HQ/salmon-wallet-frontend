import { useCallback, useState } from 'react';
import type { SettingsPanelEntry, SettingsScreen } from '../types/settings';

export interface UseSettingsPanelStackResult {
  stack: SettingsPanelEntry[];
  push: (screen: SettingsScreen, props?: Record<string, unknown>) => void;
  pop: () => void;
  reset: () => void;
  current: SettingsPanelEntry | null;
  canGoBack: boolean;
}

export function useSettingsPanelStack(): UseSettingsPanelStackResult {
  const [stack, setStack] = useState<SettingsPanelEntry[]>([]);

  const push = useCallback((screen: SettingsScreen, props?: Record<string, unknown>) => {
    setStack((prev) => [...prev, { screen, props }]);
  }, []);

  const pop = useCallback(() => {
    setStack((prev) => (prev.length > 0 ? prev.slice(0, -1) : prev));
  }, []);

  const reset = useCallback(() => {
    setStack([]);
  }, []);

  const current = stack.length > 0 ? stack[stack.length - 1] : null;
  const canGoBack = stack.length > 0;

  return { stack, push, pop, reset, current, canGoBack };
}
