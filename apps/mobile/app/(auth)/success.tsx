/**
 * SuccessScreen - Congratulations screen shown after wallet creation/recovery
 *
 * This screen is displayed after the user has successfully created or recovered
 * their wallet. It provides navigation to the main app and option to check
 * derived accounts.
 *
 * This is the screen the whole slot grid was asked for. Its "What is a
 * derivable?" helper is 60px — a 44px text button plus a 16px gap — and it
 * used to arrive with the screen, shoving the primary action 132px up on the
 * way in and 64px back down on the way out. The helper now occupies the
 * `assist` band, which is reserved at exactly that 60px on every screen in the
 * flow and stands empty on all the others. Arriving here fills space that was
 * always there.
 */

import { Ionicons } from '@expo/vector-icons';
import {
  borderRadius,
  colors,
  componentSizes,
  contentPadding,
  fontFamilyNative,
  fontSize,
  lineHeight,
  spacing,
} from '@salmon/shared';
import {
  OnboardingDescription,
  OnboardingLayout,
  OnboardingTitle,
  PrimaryButton,
  SecondaryButton,
  TextButton,
} from '../../src/components';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, Text } from 'react-native';

// ============================================================================
// Component
// ============================================================================

export default function SuccessScreen() {
  const { t } = useTranslation();
  const [showDialog, setShowDialog] = useState(false);

  /**
   * Toggle the derivable info dialog
   */
  const toggleDialog = useCallback(() => {
    setShowDialog((prev) => !prev);
  }, []);

  /**
   * Leave through the analytics-consent step, which is what enters the app.
   * Consent comes after success so the first-run ask never interrupts the
   * congratulations moment.
   */
  const handleGoToWallet = useCallback(() => {
    router.replace('/(auth)/analytics-consent');
  }, []);

  /**
   * Navigate to derived accounts screen
   */
  const handleGoToDerived = useCallback(() => {
    router.push('/(auth)/derived-accounts');
  }, []);

  return (
    <>
      <OnboardingLayout
        testID="success-screen"
        title={<OnboardingTitle>{t('wallet.create.success_message')}</OnboardingTitle>}
        description={
          <OnboardingDescription>{t('wallet.create.success_message_body')}</OnboardingDescription>
        }
        assist={
          <TextButton
            onPress={toggleDialog}
            color={colors.text.secondary}
            // The glyph belongs to the component, not the string — it used to
            // ride inside the translation as a literal "ⓘ".
            icon={
              <Ionicons
                name="information-circle-outline"
                size={componentSizes.iconSizeXs}
                color={colors.text.secondary}
              />
            }
            testID="success-info-button"
          >
            {t('wallet.create.derivable_info_icon')}
          </TextButton>
        }
        secondary={
          <SecondaryButton onPress={handleGoToDerived} testID="success-check-derived-button">
            {t('wallet.create.check_derivables')}
          </SecondaryButton>
        }
        action={
          <PrimaryButton onPress={handleGoToWallet} testID="success-go-to-wallet-button">
            {t('wallet.create.go_to_my_wallet')}
          </PrimaryButton>
        }
      />

      {/* Derivable Info Dialog */}
      <Modal visible={showDialog} transparent animationType="fade" onRequestClose={toggleDialog}>
        <Pressable style={styles.dialogOverlay} onPress={toggleDialog}>
          <Pressable style={styles.dialogContent} onPress={() => {}}>
            {/* Dialog Title */}
            <Text style={styles.dialogTitle}>{t('wallet.create.derivable_info')}</Text>

            {/* Dialog Description */}
            <Text style={styles.dialogBody}>{t('wallet.create.derivable_description')}</Text>

            {/* Close Button */}
            <PrimaryButton onPress={toggleDialog} testID="success-dialog-continue-button">
              {t('actions.continue')}
            </PrimaryButton>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  // Dialog styles
  dialogOverlay: {
    flex: 1,
    backgroundColor: colors.dialog.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: contentPadding.screen,
  },
  dialogContent: {
    width: '100%',
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing['2xl'],
  },
  dialogTitle: {
    color: colors.text.primary,
    fontFamily: fontFamilyNative.bold,
    fontSize: fontSize.title,
    lineHeight: fontSize.title * lineHeight.snug,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  dialogBody: {
    color: colors.text.secondary,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.body,
    lineHeight: fontSize.body * lineHeight.normal,
    textAlign: 'center',
    marginBottom: spacing['2xl'],
  },
});
