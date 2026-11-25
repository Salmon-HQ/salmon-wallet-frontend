/**
 * TokenListFoldRow — the "Show N more" / "Show less" disclosure that closes a
 * folded token list, on the DOM (spec 044). The row is shared
 * (`createTokenListFoldRow`); this twin supplies its `ListRow` and caret. The
 * mobile twin is `apps/mobile/src/components/TokenList/TokenListFoldRow.tsx`.
 */
import React from 'react';
import { componentSizes, createTokenListFoldRow } from '@salmon/shared';

import { CaretDownIcon } from '../../icons';
import { useSemantic } from '../../theme/ThemeProvider';
import { ListRow } from '../ListRow';
import type { TokenListFoldRowProps } from './types';

function Caret({ expanded }: { expanded: boolean }) {
  const semantic = useSemantic();
  return (
    <span
      aria-hidden
      style={{ display: 'inline-flex', transform: expanded ? 'rotate(180deg)' : undefined }}
    >
      <CaretDownIcon size={componentSizes.iconSizeSmall} color={semantic.text.secondary} />
    </span>
  );
}

export const TokenListFoldRow: React.ComponentType<TokenListFoldRowProps> = createTokenListFoldRow({
  ListRow,
  Caret,
});
