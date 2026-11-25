/**
 * The "Show N more" / "Show less" disclosure that closes a folded token list
 * (spec 044), made once from a platform's `ListRow` and caret. Each twin's
 * `TokenListFoldRow` passes its own, so the row's anatomy — a clear row, the
 * label as title, the caret at its end, the expanded state announced — cannot
 * drift between mobile and the DOM.
 */
import React, { type ComponentType } from 'react';

import { useTokenListFoldLabel } from '../hooks/useTokenListPreference';
import type { ListRowPropsBase } from '../types/ui/list-row';
import type { TokenListFoldRowPropsBase } from '../types/ui/token-list';

export interface TokenListFoldRowKit {
  ListRow: ComponentType<ListRowPropsBase>;
  /** The caret, turned half a circle when the list is open. */
  Caret: ComponentType<{ expanded: boolean }>;
}

export function createTokenListFoldRow(
  kit: TokenListFoldRowKit
): ComponentType<TokenListFoldRowPropsBase> {
  return function TokenListFoldRow({
    foldedCount,
    expanded,
    onToggle,
    testID = 'token-list-fold-row',
  }: TokenListFoldRowPropsBase) {
    const title = useTokenListFoldLabel(foldedCount, expanded);
    return (
      <kit.ListRow
        testID={testID}
        tone="clear"
        padding="lg"
        leading={null}
        title={title}
        trailing={<kit.Caret expanded={expanded} />}
        onPress={onToggle}
        accessibilityExpanded={expanded}
      />
    );
  };
}
