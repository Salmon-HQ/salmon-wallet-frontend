import type { SettingsScreen, SettingsPanelEntry } from '@salmon/shared';

/**
 * Props that every panel content component receives.
 */
export interface MobilePanelContentProps {
  onBack: () => void;
  onNavigate: (screen: SettingsScreen, props?: Record<string, unknown>) => void;
  [key: string]: unknown;
}

/**
 * A function that renders panel content given the standard props.
 */
export type MobilePanelRenderer = (props: MobilePanelContentProps) => React.ReactElement | null;

/**
 * Map from SettingsScreen to a renderer function.
 */
export type MobilePanelRegistry = Partial<Record<SettingsScreen, MobilePanelRenderer>>;

/**
 * Props for the SettingsPanelStack component.
 */
export interface MobileSettingsPanelStackProps {
  panelRegistry: MobilePanelRegistry;
  stack: SettingsPanelEntry[];
  onNavigate: (screen: SettingsScreen, props?: Record<string, unknown>) => void;
  onBack: () => void;
  animating: boolean;
  slideDirection: 'in' | 'out' | 'idle';
}
