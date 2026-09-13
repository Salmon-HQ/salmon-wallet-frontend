/**
 * FactsCard — a card of facts under an optional bold title, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/FactsCard`. A Kamino
 * position, a review's data block and a receipt's fine print are the same
 * object: one heading line, then `KeyValueRow`s. Whoever composes facts
 * passes them; nobody draws the title line again.
 */
import React from 'react';
import { fontFamily, fontSize, fontWeight, lineHeight, spacing } from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { Card } from '../Card';
import { KeyValueRow } from '../KeyValueRow';
import type { FactsCardProps } from './types';

export function FactsCard({ title, rows, style, className, testID }: FactsCardProps) {
  const semantic = useSemantic();

  return (
    <Card padding="lg" gap={spacing.md} style={style} className={className} testID={testID}>
      {title ? (
        <span
          style={{
            fontFamily: fontFamily.sans,
            fontSize: fontSize.base,
            fontWeight: fontWeight.bold,
            color: semantic.text.primary,
            lineHeight: `${fontSize.base * lineHeight.condensed}px`,
          }}
        >
          {title}
        </span>
      ) : null}
      {rows.map(({ key, ...row }) => (
        <KeyValueRow key={key} {...row} />
      ))}
    </Card>
  );
}

export default FactsCard;
