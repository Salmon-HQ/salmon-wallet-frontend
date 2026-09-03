import type { SettingsScreen } from '@salmon/shared';

/** Props every settings panel body receives from its route. */
export interface MobilePanelContentProps {
  onBack: () => void;
  onNavigate: (screen: SettingsScreen, props?: Record<string, string>) => void;
  [key: string]: unknown;
}

/** A function that renders one panel body given the standard props. */
export type MobilePanelRenderer = (props: MobilePanelContentProps) => React.ReactElement | null;

/** Map from a `SettingsScreen` key to the body its route renders. */
export type MobilePanelRegistry = Partial<Record<SettingsScreen, MobilePanelRenderer>>;
