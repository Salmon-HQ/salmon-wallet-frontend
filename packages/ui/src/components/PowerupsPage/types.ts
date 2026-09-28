import type { CSSProperties } from 'react';
import type { PowerupsCatalogPropsBase } from '@salmon/shared';

/**
 * The DOM half of `PowerupsCatalogPropsBase`: the contract plus the page it
 * is drawn as — a screen of Home's stack with a back control, list and
 * detail stacked inside it (owner, 2026-09-11: a side panel's sheet neither
 * animates well nor fits the detail).
 */
export interface PowerupsPageProps extends PowerupsCatalogPropsBase {
  onBack: () => void;
  style?: CSSProperties;
  className?: string;
}
