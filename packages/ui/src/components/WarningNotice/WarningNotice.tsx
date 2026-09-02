/**
 * WarningNotice – icon-led alert banner for security/failure states, on the
 * DOM.
 *
 * The mobile twin is `apps/mobile/src/components/WarningNotice/WarningNotice.tsx`;
 * the anatomy is the same, read from the same `WarningNoticePropsBase`
 * contract (`packages/shared/src/types/ui/warning-notice.ts`).
 */
import React from 'react';
import {
  borderRadius,
  fontFamily,
  fontSize,
  fontWeight,
  spacing,
  type Semantic,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { WarningIcon, iconSize } from '../../icons';
import type { WarningNoticeProps } from './types';

export function WarningNotice({
  tone = 'error',
  title,
  children,
  action,
  style,
  className,
  testID,
}: WarningNoticeProps): React.ReactElement {
  const t = useSemantic();
  const accent =
    tone === 'warning' ? t.status.warning : tone === 'info' ? t.text.secondary : t.status.danger;
  const background =
    tone === 'warning'
      ? t.status.warningTint
      : tone === 'info'
        ? t.surface.shelf
        : t.status.dangerTint;

  return (
    <div
      data-testid={testID}
      role={tone === 'info' ? 'status' : 'alert'}
      className={className}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        boxSizing: 'border-box',
        width: '100%',
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: accent,
        backgroundColor: background,
        gap: spacing.sm,
        ...style,
      }}
    >
      <WarningIcon size={iconSize.md} color={accent} style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={titleStyle(accent)}>{title}</span>
        {children != null && <div style={bodyStyle(t)}>{children}</div>}
        {action != null && <div style={{ marginTop: 6, alignSelf: 'flex-start' }}>{action}</div>}
      </div>
    </div>
  );
}

const titleStyle = (accent: string): React.CSSProperties => ({
  display: 'block',
  fontFamily: fontFamily.sans,
  fontWeight: fontWeight.semibold,
  fontSize: fontSize.caption,
  color: accent,
  marginBottom: spacing.xxs,
});

const bodyStyle = (t: Semantic): React.CSSProperties => ({
  fontFamily: fontFamily.sans,
  fontWeight: fontWeight.regular,
  fontSize: fontSize.caption,
  lineHeight: `${fontSize.caption * 1.45}px`,
  color: t.text.primary,
  overflowWrap: 'anywhere',
});
