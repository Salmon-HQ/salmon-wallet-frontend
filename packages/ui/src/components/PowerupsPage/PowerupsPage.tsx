/**
 * PowerupsPage — the catalogue on the DOM: what the wallet ships a screen
 * for, one row per registry entry on the active network (spec 027 §1). The
 * mobile twin is `apps/mobile/src/screens/PowerupsRoute.tsx`, which also
 * draws the developer-only mock catalogue; the DOM keeps to the real one.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { spacing } from '@salmon/shared';
import type { PowerupEntry } from '@salmon/shared/powerups';

import { useSemantic } from '../../theme/ThemeProvider';
import { ArrowsLeftRightIcon, CaretRightIcon } from '../../icons';
import { DepthBackground } from '../DepthBackground';
import { IconBubble } from '../IconBubble';
import { ListRow } from '../ListRow';
import { ScalesBackground } from '../ScalesBackground';
import { ScreenHeader } from '../ScreenHeader';
import { StateBlock } from '../StateBlock';
import type { PowerupsPageProps } from './types';

/** The registry's icon on this platform. */
const ICONS: Record<PowerupEntry['id'], React.ComponentType<{ size?: number; color?: string }>> = {
  swap: ArrowsLeftRightIcon,
};

/** The catalogue row's mark. */
const ROW_BUBBLE_SIZE = 44;

export function PowerupsPage({ powerups, onOpen, onBack, style }: PowerupsPageProps) {
  const { t } = useTranslation();
  const semantic = useSemantic();

  return (
    <div
      data-testid="powerups-page"
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
        backgroundColor: semantic.water.gradient[1],
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
          testID="powerups-header"
          title={t('powerups.browse_title')}
          subtitle={t('powerups.browse_subtitle')}
          onBack={onBack}
        />
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: spacing.md,
            padding: `0 ${spacing.screenGutter}px ${spacing.screenGutter}px`,
          }}
        >
          {powerups.length === 0 ? (
            <StateBlock
              testID="powerups-empty-installed"
              tone="empty"
              title={t('powerups.empty_section')}
            />
          ) : (
            powerups.map((entry) => (
              <ListRow
                key={entry.id}
                testID={`powerups-row-${entry.id}`}
                leading={
                  <IconBubble size={ROW_BUBBLE_SIZE} tone="ink" icon={ICONS[entry.id]} />
                }
                title={t(entry.nameKey)}
                subtitle={t(entry.descriptionKey)}
                trailing={<CaretRightIcon size={16} color={semantic.text.secondary} />}
                onPress={() => onOpen(entry)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
