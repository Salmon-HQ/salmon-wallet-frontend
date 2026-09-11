/**
 * DataAttribution — the data provider's credit, on the DOM: one small link,
 * text and target verbatim from the backend's network entry, once per
 * screen that shows its prices or token list. The provider's terms fix the
 * floor at 10pt, and `fontSize.sm` sits above it. Nothing is drawn for a
 * network that owes no credit.
 *
 * The mobile twin is `apps/mobile/src/components/DataAttribution`.
 */
import React from 'react';
import {
  fontFamily,
  fontSize,
  fontWeight,
  opacity,
  spacing,
  useDataAttribution,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import type { DataAttributionProps } from './types';

export function DataAttribution({
  networkId,
  style,
  testID = 'data-attribution',
}: DataAttributionProps) {
  const attribution = useDataAttribution(networkId);
  const semantic = useSemantic();

  if (!attribution) return null;

  return (
    <a
      data-testid={testID}
      href={attribution.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        alignSelf: 'center',
        display: 'inline-block',
        padding: `${spacing.sm}px ${spacing.md}px`,
        fontFamily: fontFamily.sans,
        fontSize: fontSize.sm,
        fontWeight: fontWeight.medium,
        color: semantic.text.tertiary,
        opacity: opacity.soft,
        textAlign: 'center',
        textDecoration: 'underline',
        ...style,
      }}
    >
      {attribution.text}
    </a>
  );
}

export default DataAttribution;
