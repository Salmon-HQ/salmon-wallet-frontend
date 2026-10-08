/**
 * SkrScreen — the SKR Powerup's Home surface on mobile (spec 039). The
 * blocks are built in shared (`skrBlocks`). DOM twin:
 * `packages/ui/src/components/SkrPage`.
 */
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { s, spacing, vs } from '@salmon/shared';
import { skrBlocks, useSkrScreenLogic } from '@salmon/shared/powerups';

import { BlockList } from '../BlockList';
import type { SkrScreenProps } from './types';

export function SkrScreen({ publicKey, style }: SkrScreenProps) {
  const { t } = useTranslation();
  const logic = useSkrScreenLogic({ publicKey });
  return (
    <ScrollView style={style} contentContainerStyle={styles.content}>
      <BlockList testID="skr-screen" blocks={skrBlocks(logic, t)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: s(spacing.screenGutter), paddingBottom: vs(spacing.screenBottom) },
});
