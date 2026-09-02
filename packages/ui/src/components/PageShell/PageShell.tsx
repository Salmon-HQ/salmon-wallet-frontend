/**
 * PageShell — the header-and-scroll frame a stacked page stands in, on the DOM.
 *
 * One frame for TokenDetailPage, TransactionHistoryPage, NftDetailPage,
 * SendPage and SettingsPanelContent, so five pages do not each redraw the
 * same back button and title. Every ink is read off the live mode.
 *
 * Usage:
 *   <PageShell title="Token Information" onBack={onBack}>
 *     {/* page-specific content *\/}
 *   </PageShell>
 */
import { fontFamily, fontSize, fontWeight, spacing } from '@salmon/shared';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { ArrowLeftIcon, iconSize } from '../../icons';
import { useSemantic } from '../../theme/ThemeProvider';
import { WaterColumn, waterColumnHost } from '../WaterColumn';
import type { PageShellProps } from './types';

export function PageShell({
  title,
  onBack,
  backDisabled = false,
  children,
  fullHeight = true,
  headerRight,
  scrollContentStyle,
  scrollContentProps,
  scrollContentRef,
  maxWidth,
  className,
  style,
}: PageShellProps): React.ReactElement {
  const { t } = useTranslation();
  const { border, depth, text } = useSemantic();

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        ...(fullHeight ? { height: '100vh' } : { minHeight: '100vh' }),
        backgroundColor: depth.column,
        // A stacking context, so the water column's negative layer stays above
        // this background and below the header and the scrolling content.
        ...waterColumnHost,
        ...(maxWidth != null && { maxWidth, margin: '0 auto', width: '100%' }),
        ...style,
      }}
    >
      {/* A stacked page is still a screen in the same water. The ground is the
          app's, not the home screen's; what changes here is only what rests on
          top of it. Everything that carries a value — rows, cards, inputs — is
          opaque, so the motif is occluded exactly where it must not be read. */}
      <WaterColumn />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: `${spacing.md}px ${spacing.lg}px`,
          borderBottom: `1px solid ${border.default}`,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <button
          type="button"
          onClick={onBack}
          disabled={backDisabled}
          aria-label={t('general.back', 'Back')}
          data-testid="screen-header-back-button"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: spacing.xs,
            marginRight: spacing.sm,
            border: 'none',
            background: 'transparent',
            color: text.secondary,
            cursor: backDisabled ? 'default' : 'pointer',
          }}
        >
          <ArrowLeftIcon size={iconSize.md} color={text.secondary} />
        </button>
        <span
          style={{
            flex: 1,
            fontSize: fontSize.lg,
            fontWeight: fontWeight.semibold,
            color: text.primary,
            fontFamily: fontFamily.sans,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </span>
        {headerRight}
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          position: 'relative',
          zIndex: 1,
          ...scrollContentStyle,
        }}
        ref={
          scrollContentRef ? (node) => scrollContentRef(node as HTMLDivElement | null) : undefined
        }
        {...scrollContentProps}
      >
        {children}
      </div>
    </div>
  );
}
