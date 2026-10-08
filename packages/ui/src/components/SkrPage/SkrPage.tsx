/**
 * SkrPage — the SKR Powerup's Home surface on the DOM (spec 039). The blocks
 * are built in shared (`skrBlocks`). Mobile twin:
 * `apps/mobile/src/components/SkrScreen`.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { spacing } from '@salmon/shared';
import { skrBlocks, useSkrScreenLogic } from '@salmon/shared/powerups';

import { BlockList } from '../BlockList';
import type { SkrPageProps } from './types';

export function SkrPage({ publicKey, style }: SkrPageProps) {
  const { t } = useTranslation();
  const logic = useSkrScreenLogic({ publicKey });
  return (
    <div
      style={{
        padding: `0 ${spacing.screenGutter}px ${spacing.screenBottom}px`,
        overflowY: 'auto',
        ...style,
      }}
    >
      <BlockList testID="skr-screen" blocks={skrBlocks(logic, t)} />
    </div>
  );
}
