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
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { BottomSheetContainer, SheetTitle } from '../BottomSheetContainer';
import { Thermocline } from '../Thermocline';
import { TokenSelectList } from '../TokenSelectList';
import type { TokenPickerSheetProps } from './types';

export type { TokenPickerSheetProps };

export function TokenPickerSheet({
  visible,
  onClose,
  testID = 'send-token-picker',
  ...list
}: TokenPickerSheetProps) {
  const { t } = useTranslation();
  return (
    <BottomSheetContainer
      visible={visible}
      onClose={onClose}
      testID={testID}
      // The search field takes the keyboard: the sheet stands full height so
      // the field and the first results stay above it.
      forTyping
      style={styles.sheet}
      title={<SheetTitle>{t('wallet.select_token', 'Select Token')}</SheetTitle>}
      // The sheet's ground is the thermocline at its thick tier, the same
      // material Receive rides.
      background={<Thermocline tier="thick" style={styles.thermocline} />}
    >
      <TokenSelectList {...list} />
    </BottomSheetContainer>
  );
}

const styles = StyleSheet.create({
  // A virtualised list has no content to hug; `forTyping` gives the sheet its
  // full height, and the list fills it.
  sheet: {
    overflow: 'hidden',
  },
  thermocline: {
    ...StyleSheet.absoluteFill,
  },
});

export default TokenPickerSheet;
