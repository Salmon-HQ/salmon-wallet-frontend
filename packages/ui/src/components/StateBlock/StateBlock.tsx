/**
 * StateBlock — the empty and failed answer for a list or section, one shape,
 * on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/StateBlock/StateBlock.tsx`:
 * a title/body/retry block composed on `Card` and the kit's button
 * primitive, so a caller only ever supplies copy and a retry.
 */
import React from 'react';
import {
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  spacing,
  type Semantic,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { Card } from '../Card';
import { SecondaryButton } from '../Button';
import type { StateBlockProps } from './types';

export function StateBlock({
  tone,
  title,
  body,
  onRetry,
  retryLabel,
  retryTestID,
  testID,
  style,
  className,
}: StateBlockProps) {
  const t = useSemantic();

  return (
    <div
      data-testid={testID}
      role={tone === 'error' ? 'alert' : undefined}
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: spacing.xl,
        paddingBottom: spacing.xl,
        ...style,
      }}
    >
      <Card
        tone="surface"
        padding="xl"
        gap={spacing.md}
        style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
      >
        <span style={titleStyle(t)}>{title}</span>
        {body && <span style={bodyStyle(t)}>{body}</span>}
        {onRetry && (
          <SecondaryButton onPress={onRetry} testID={retryTestID ?? testID}>
            {retryLabel ?? ''}
          </SecondaryButton>
        )}
      </Card>
    </div>
  );
}

const titleStyle = (t: Semantic): React.CSSProperties => ({
  fontFamily: fontFamily.sans,
  fontWeight: fontWeight.bold,
  fontSize: fontSize.heading,
  lineHeight: `${fontSize.heading * lineHeight.snug}px`,
  color: t.text.primary,
  textAlign: 'center',
});

const bodyStyle = (t: Semantic): React.CSSProperties => ({
  fontFamily: fontFamily.sans,
  fontWeight: fontWeight.medium,
  fontSize: fontSize.body,
  lineHeight: `${fontSize.body * lineHeight.snug}px`,
  color: t.text.secondary,
  textAlign: 'center',
});
