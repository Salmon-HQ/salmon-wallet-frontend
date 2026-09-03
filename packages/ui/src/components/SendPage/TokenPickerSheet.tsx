/**
 * TokenPickerSheet — the send flow's one token picker, used twice.
 *
 * The mobile twin is `apps/mobile/src/components/Send/TokenPickerSheet.tsx`:
 * choosing a token is one pick and the sheet is gone, which is what keeps it
 * a sheet even though two screens open it — the recipient step up front, the
 * review step's "Change" to correct it.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';

import { BottomSheetContainer, SheetTitle } from '../BottomSheetContainer';
import { TokenSelectList } from './TokenSelectList';
import type { TokenPickerSheetProps } from './types';

export function TokenPickerSheet({
  visible,
  onClose,
  tokens,
  loading,
  onSelectToken,
  testID = 'send-token-picker',
}: TokenPickerSheetProps) {
  const { t } = useTranslation();
  return (
    <BottomSheetContainer
      visible={visible}
      onClose={onClose}
      testID={testID}
      // The list draws its own row padding and its rows bleed to the edge.
      contentGutter={false}
      title={<SheetTitle>{t('wallet.select_token', 'Select Token')}</SheetTitle>}
      // A sheet hugs its content, and a scrolling list has none to hug — it
      // fills whatever it is given. So this one sheet is given a height.
      style={{ height: '70vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
    >
      <TokenSelectList tokens={tokens} loading={loading} onSelectToken={onSelectToken} />
    </BottomSheetContainer>
  );
}
