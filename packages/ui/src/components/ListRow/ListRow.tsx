/**
 * ListRow — a `Card` laid out as leading mark / title stack / trailing slot,
 * on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/ListRow/ListRow.tsx`; the
 * anatomy is the same, read from the same `ListRowPropsBase` contract, and
 * the row composes the DOM `Card` exactly as mobile composes the RN one.
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
import type { ListRowProps } from './types';

export function ListRow({
  leading,
  title,
  titleAccessory,
  subtitle,
  trailing,
  onPress,
  accessibilityRole,
  tone,
  padding = 'md',
  emphasis = 'default',
  accessibilityLabel,
  style,
  className,
  testID,
}: ListRowProps) {
  const t = useSemantic();
  const spokenName =
    accessibilityLabel ?? (typeof subtitle === 'string' ? `${title}, ${subtitle}` : title);

  const row: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    ...style,
  };

  return (
    <Card
      testID={testID}
      onPress={onPress}
      accessibilityRole={accessibilityRole}
      tone={tone}
      accessibilityLabel={spokenName}
      padding={padding}
      radius="xl"
      className={className}
      style={row}
    >
      {leading}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            minWidth: 0,
            flexWrap: 'wrap',
            columnGap: spacing.sm,
            rowGap: spacing.xxs,
          }}
        >
          <span style={titleStyle(t, emphasis)}>{title}</span>
          {titleAccessory}
        </div>
        {typeof subtitle === 'string' ? <span style={subtitleStyle(t)}>{subtitle}</span> : subtitle}
      </div>
      {trailing}
    </Card>
  );
}

const titleStyle = (t: Semantic, emphasis: ListRowProps['emphasis']): React.CSSProperties => {
  const size = emphasis === 'strong' ? fontSize.heading : fontSize.bodyLg;
  return {
    fontFamily: fontFamily.sans,
    fontWeight: fontWeight.bold,
    fontSize: size,
    lineHeight: `${size * lineHeight.snug}px`,
    color: t.text.primary,
    minWidth: 0,
    flexShrink: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };
};

const subtitleStyle = (t: Semantic): React.CSSProperties => ({
  fontFamily: fontFamily.sans,
  fontWeight: fontWeight.medium,
  fontSize: fontSize.body,
  lineHeight: `${fontSize.body * lineHeight.snug}px`,
  color: t.text.secondary,
  display: 'block',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});
