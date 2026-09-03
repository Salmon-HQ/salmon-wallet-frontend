/**
 * SettingsPanelContent — the layout every settings screen composes, on the
 * DOM.
 *
 * The mobile twin is `apps/mobile/src/components/SettingsScreenLayout`: the
 * screen paints its own water (ramp + scales), draws the kit's `ScreenHeader`
 * with the title and the subtitle, and hands every block the panel gives it
 * to a body that spaces them by the component gap (DESIGN.md §Layout, 20
 * between sibling blocks). A footer, when present, pins under the body.
 *
 * Painted per screen rather than once by the stack, so a panel sliding in
 * over the list never ghosts the list through it.
 */
import React from 'react';
import { spacing } from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { DepthBackground } from '../DepthBackground';
import { ScalesBackground } from '../ScalesBackground';
import { ScreenHeader } from '../ScreenHeader';
import type { SettingsPanelContentProps } from './types';

export function SettingsPanelContent({
  title,
  subtitle,
  onBack,
  backDisabled,
  children,
  scrollable = true,
  footer,
  className,
  style,
  testID,
}: SettingsPanelContentProps): React.ReactElement {
  const t = useSemantic();

  return (
    <div
      data-testid={testID}
      className={className}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
        backgroundColor: t.water.gradient[1],
        ...style,
      }}
    >
      <DepthBackground style={{ zIndex: 0 }} />
      <ScalesBackground variant="deepField" style={{ zIndex: 0 }} />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
        }}
      >
        <ScreenHeader
          onBack={onBack}
          backDisabled={backDisabled}
          title={title}
          subtitle={subtitle}
        />

        <div
          data-testid="settings-panel-body"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: scrollable ? 'auto' : 'hidden',
            display: 'flex',
            flexDirection: 'column',
            // The header block already ends 20 above the content.
            padding: `0 ${spacing.screenGutter}px ${spacing.screenGutter}px`,
            gap: spacing.screenGutter,
          }}
        >
          {children}
        </div>

        {footer && (
          <div
            style={{
              flexShrink: 0,
              padding: `${spacing.md}px ${spacing.screenGutter}px ${spacing.screenGutter}px`,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
