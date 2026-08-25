import type { SettingsSheetBaseProps, SettingsScreen, SettingsPanelEntry } from '@salmon/shared';

/**
 * Props for the SettingsPanelStack component.
 * Extends SettingsSheetBaseProps (visible, onClose, developer networks, remove wallet).
 */
export interface SettingsPanelStackProps extends SettingsSheetBaseProps {
  /**
   * Registry mapping SettingsScreen to a React component that renders
   * the content for that screen. Each component receives `onBack` and
   * optional extra `props` from the panel entry.
   */
  panelRegistry: PanelRegistry;

  /**
   * Optional list of panels to push immediately when the drawer opens.
   * Useful for deep-linking into a specific settings screen from outside.
   * e.g. WalletSwitcher → Account Edit
   */
  initialPanels?: SettingsPanelEntry[];
}

/**
 * A wait a panel asks the stack to stand over the whole app.
 *
 * It is raised by the panel and *hosted by the stack*, outside the drawer: the
 * flows that wait here finish by closing settings, and a wait rendered inside
 * the drawer is unmounted with it, cutting its closing wave. See
 * `SettingsPanelStack`.
 */
export interface PanelWait {
  title: string;
  subtitle?: string;
}

/**
 * Props that every panel content component receives.
 */
export interface PanelContentProps {
  onBack: () => void;
  onNavigate: (screen: SettingsScreen, props?: Record<string, unknown>) => void;
  /** Raise (`wait`) or lower (`null`) the app-wide wait the stack hosts. */
  onWait: (wait: PanelWait | null) => void;
  /** Close the settings surface entirely, not just this panel. */
  onClose: () => void;
  [key: string]: unknown;
}

/**
 * A function that renders panel content given the standard props.
 */
export type PanelRenderer = (props: PanelContentProps) => React.ReactElement | null;

/**
 * Map from SettingsScreen to a renderer function.
 */
export type PanelRegistry = Partial<Record<SettingsScreen, PanelRenderer>>;
