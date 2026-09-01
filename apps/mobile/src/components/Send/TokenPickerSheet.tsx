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
import { StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { fontFamilyNative, fontSize, letterSpacing, lineHeight, ms, semantic } from '@salmon/shared';
import type { SendToken } from '@salmon/shared';

import { BottomSheetContainer } from '../BottomSheetContainer';
import { Thermocline } from '../Thermocline';
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
  const { t } = useTranslation();
  return (
    <BottomSheetContainer
      visible={visible}
      onClose={onClose}
      testID={testID}
      style={styles.sheet}
      title={<Text style={styles.title}>{t('wallet.select_token', 'Select Token')}</Text>}
      // The sheet's ground is the thermocline at its thick tier, the same
      // material Receive rides.
      background={<Thermocline tier="thick" style={styles.thermocline} />}
    >
      <TokenSelectList
        tokens={tokens}
        loading={loading}
        showUnverifiedTokens={showUnverifiedTokens}
        onSelectToken={onSelectToken}
      />
    </BottomSheetContainer>
  );
}

const styles = StyleSheet.create({
  // A sheet hugs its content, and a virtualised list has none to hug — it
  // fills whatever it is given. So this one sheet is given a height, or the
  // list collapses to the handle.
  sheet: {
    height: '70%',
    overflow: 'hidden',
  },
  thermocline: {
    ...StyleSheet.absoluteFillObject,
  },
  // The title Receive draws: 24 semibold, centred.
  title: {
    fontSize: ms(fontSize.headline),
    fontFamily: fontFamilyNative.semiBold,
    color: semantic.text.primary,
    textAlign: 'center',
    letterSpacing: letterSpacing.snug,
    lineHeight: ms(fontSize.headline * lineHeight.condensed),
    marginBottom: ms(12),
  },
});

export default TokenPickerSheet;
