/**
 * SendScreen — the chrome every send step composes, on the DOM.
 *
 * Each mobile send route mounts its own water, the kit's `ScreenHeader`, a
 * scroll body 20 between blocks at the screen gutter, and an action row
 * pinned under it (`paddingTop: md`, the gutter on the sides). This is that
 * shell; the steps put their blocks inside.
 */
import React from 'react';
import { spacing } from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { DepthBackground } from '../DepthBackground';
import { ScalesBackground } from '../ScalesBackground';
import { ScreenHeader } from '../ScreenHeader';

export interface SendScreenProps {
  title: string;
  subtitle?: string;
  onBack: () => void;
  backDisabled?: boolean;
  children: React.ReactNode;
  /** The action row, pinned under the body. */
  action?: React.ReactNode;
  testID?: string;
}

export function SendScreen({
  title,
  subtitle,
  onBack,
  backDisabled,
  children,
  action,
  testID,
}: SendScreenProps) {
  const t = useSemantic();

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
        backgroundColor: t.water.gradient[1],
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
          data-testid={testID}
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            padding: `0 ${spacing.screenGutter}px ${spacing.screenGutter}px`,
            gap: spacing.screenGutter,
          }}
        >
          {children}
        </div>

        {action && (
          <div
            style={{
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: spacing.md,
              padding: `${spacing.md}px ${spacing.screenGutter}px ${spacing.screenGutter}px`,
            }}
          >
            {action}
          </div>
        )}
      </div>
    </div>
  );
}
