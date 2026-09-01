/**
 * TokenPickerSheet — the send flow's one token picker, used twice.
 *
 * Choosing a token is one pick and the sheet is gone (DESIGN.md §Sheets, the
 * state rule), which is what keeps it a sheet rather than a screen even
 * though two different screens open it: `/send` picks the token up front and
 * `/send/review`'s "Change" reopens the same list to correct it. Written once
 * here instead of inline on either screen so the two call sites cannot drift.
 */
import React from 'react';
import type { SendToken } from '@salmon/shared';

import { BottomSheetContainer } from '../BottomSheetContainer';
import { TokenSelectList } from './TokenSelectList';

export interface TokenPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  tokens: SendToken[];
  loading: boolean;
  showUnverifiedTokens: boolean;
  onSelectToken: (token: SendToken) => void;
  testID?: string;
}

export function TokenPickerSheet({
  visible,
  onClose,
  tokens,
  loading,
  showUnverifiedTokens,
  onSelectToken,
  testID = 'send-token-picker',
}: TokenPickerSheetProps) {
  return (
    <BottomSheetContainer visible={visible} onClose={onClose} testID={testID}>
      <TokenSelectList
        tokens={tokens}
        loading={loading}
        showUnverifiedTokens={showUnverifiedTokens}
        onSelectToken={onSelectToken}
      />
    </BottomSheetContainer>
  );
}

export default TokenPickerSheet;
