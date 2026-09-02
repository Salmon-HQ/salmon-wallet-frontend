import type {
  SettingsRowValues,
  SettingsScreen,
  SettingsPanelEntry,
  SettingsScreenLayoutPropsBase,
  SettingsSheetBaseProps,
} from '@salmon/shared';

/** What the four choosable rows currently read — `settingsRowValues` builds it. */
export type { SettingsRowValues };

/**
 * Props for the SettingsPanelStack component.
 * Extends SettingsSheetBaseProps (visible, onClose, the toggles, remove wallet).
 */
export interface SettingsPanelStackProps extends SettingsSheetBaseProps {
  /**
   * Registry mapping SettingsScreen to a React component that renders
   * the content for that screen. Each component receives `onBack` and
   * optional extra `props` from the panel entry.
   */
  panelRegistry: PanelRegistry;

  /**
   * Optional list of panels to push immediately when the surface opens.
   * Useful for deep-linking into a specific settings screen from outside.
   */
  initialPanels?: SettingsPanelEntry[];

  /** The current values the root list states beside its choosable rows. */
  rowValues?: SettingsRowValues;
}

/**
 * The root screen's own chrome — the same layout contract every settings
 * screen composes (`SettingsScreenLayoutPropsBase`), minus the body.
 */
export type SettingsRootProps = Pick<
  SettingsScreenLayoutPropsBase,
  'title' | 'subtitle' | 'onBack'
>;

/**
 * A wait a panel asks the stack to stand over the whole app.
 *
 * It is raised by the panel and *hosted by the stack*, outside the panels:
 * the flows that wait here finish by closing settings, and a wait rendered
 * inside a panel is unmounted with it, cutting its closing wave.
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
