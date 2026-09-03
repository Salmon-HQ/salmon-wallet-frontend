import type { StyleProp, ViewStyle } from 'react-native';
import type { ThermoclinePropsBase } from '@salmon/shared';

export type { ThermoclineTier } from '@salmon/shared';

/** The mobile half of `ThermoclinePropsBase`: the cross-platform contract plus RN-only extras. */
export interface ThermoclineProps extends ThermoclinePropsBase {
  /**
   * @deprecated Unread since 2026-08-19: the refraction strip merged into
   * the membrane field — its brighter top 24px stacked over the field and
   * read as a band that broke the material. The field is now one continuous
   * dark ink; there is no separate strip to toggle.
   */
  refraction?: boolean;
  /**
   * Geometry (position, radius, border). The same object is handed to every
   * rung so the layout does not move by a pixel between them.
   */
  style?: StyleProp<ViewStyle>;
  /** Unread since the tint adoption (2026-08-19) — the blur rung wore them. */
  borderColor?: string;
  borderWidth?: number;
}
