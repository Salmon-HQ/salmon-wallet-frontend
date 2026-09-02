import type { CSSProperties } from 'react';
import type { SettingsScreenLayoutPropsBase } from '@salmon/shared';

/**
 * The DOM half of mobile's `SettingsScreenLayoutProps`: the chrome every
 * settings screen composes — its own water, the kit header with a title and
 * a subtitle, the scrolling body at the screen gutter, an optional footer.
 */
export interface SettingsPanelContentProps extends SettingsScreenLayoutPropsBase {
  className?: string;
  style?: CSSProperties;
}
