/**
 * TokenListFoldRow — the "Show N more" / "Show less" disclosure that closes a
 * folded token list (spec 044). The row is shared (`createTokenListFoldRow`);
 * this twin supplies its `ListRow` and caret. The DOM twin is
 * `packages/ui/src/components/TokenList/TokenListFoldRow.tsx`.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { createTokenListFoldRow } from '@salmon/shared';

import { CaretDownIcon, iconSize } from '../../icons';
import { useSemantic } from '../../theme/useThemedStyles';
import { ListRow } from '../ListRow';
import type { TokenListFoldRowProps } from './types';

function Caret({ expanded }: { expanded: boolean }) {
  const semantic = useSemantic();
  return (
    <View style={expanded ? styles.caretExpanded : undefined}>
      <CaretDownIcon size={iconSize.sm} color={semantic.text.secondary} />
    </View>
  );
}

export const TokenListFoldRow: React.ComponentType<TokenListFoldRowProps> = createTokenListFoldRow({
  ListRow,
  Caret,
});

const styles = StyleSheet.create({
  caretExpanded: {
    transform: [{ rotate: '180deg' }],
  },
});
