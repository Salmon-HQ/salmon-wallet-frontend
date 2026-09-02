/**
 * WelcomeScreen - Onboarding entry point
 *
 * This screen is displayed when the user first opens the app or when
 * they need to create or recover a wallet. It provides options to
 * create a new account or recover an existing one.
 *
 * If the user has existing accounts stored, it also shows an option
 * to access them via the lock screen.
 *
 * Composed on the onboarding slot grid. The brand speaks in full here (owner,
 * 2026-08-18, superseding "only the fish"): the fish in `mark`, the wordmark
 * in `title` — its pinned gap is the grid's own fish→title air, the same
 * distance success keeps to "Congratulations!" — and the slogan in
 * `description`, so nothing below the pair moves.
 * The third action, offered only when accounts already exist, is a text
 * affordance in `assist`: the reserved `secondary` band holds one control, and
 * a third button would be the one place in the flow where the grid overflows.
 */

import {
  fontFamilyNative,
  fontSize,
  lineHeight,
  onboardingIdentityGridFull,
  s,
  useAccountsContext,
  type Semantic,
} from '@salmon/shared';
import {
  BrandMark,
  OnboardingLayout,
  PrimaryButton,
  SecondaryButton,
  TextButton,
  Wordmark,
} from '../../src/components';
import { useThemedStyles } from '../../src/theme/useThemedStyles';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useSemantic } from '../../src/theme/useThemedStyles';
import { StyleSheet, Text, View } from 'react-native';

// ============================================================================
// Component
// ============================================================================

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const { accent } = useSemantic();
  const styles = useThemedStyles(stylesFor);
  const [state, actions] = useAccountsContext();

  // Check if there are existing accounts stored
  const hasAccounts = state.accounts && state.accounts.length > 0;

  /**
   * Navigate to account creation flow
   */
  const handleCreateAccount = () => {
    router.push('/(auth)/seed-warning');
  };

  /**
   * Navigate to account recovery flow
   */
  const handleRecoverAccount = () => {
    router.push('/(auth)/recover');
  };

  /**
   * Lock accounts and navigate to main app where the lock overlay
   * lock state will show.
   */
  const handleAccessExistingAccount = async () => {
    await actions.lockAccounts();
    router.replace('/(app)/(tabs)');
  };

  return (
    <OnboardingLayout
      testID="welcome-screen"
      // Arrivals float — including backing out of recover/seed-warning to
      // here. The fish stays: welcome and the lock are the identity pair, the
      // only screens that keep the brand mark (owner, 2026-08-18).
      float
      /*
        The fish, drawn at the grid's own size — this fish and the lock's are
        the same fish at the same Y (markSize is identical at both rungs; the
        full table is safe to read). No accessible name here: the wordmark
        below is the screen's header and announces "Salmon" — labelling the
        fish too would say it twice.
      */
      mark={
        <View testID="welcome-brand-mark">
          {/* The fish at the door is the brand accent, as it is on the lock and
              the wait (owner, 2026-09-02). */}
          <BrandMark size={onboardingIdentityGridFull.markSize} color={accent.fill} />
        </View>
      }
      /*
        The name and the lema (owner, 2026-08-18): the wordmark in the title
        band — its own pinned gap puts it at the grid's fish→title distance —
        and the slogan in the description band, so both live in bands the grid
        already reserved and nothing below them moves.
      */
      title={<Wordmark />}
      description={
        // Brand line, not UI copy — deliberately untranslated, like the wordmark itself (PRODUCT.md §Positioning).
        <Text style={styles.slogan} testID="welcome-slogan">
          Open code. Open ownership.
        </Text>
      }
      assist={
        hasAccounts ? (
          <TextButton onPress={handleAccessExistingAccount} testID="select-access-existing-button">
            {t('wallet.access_existing_account')}
          </TextButton>
        ) : undefined
      }
      secondary={
        <SecondaryButton onPress={handleRecoverAccount} testID="select-recover-button">
          {t('wallet.recover_wallet')}
        </SecondaryButton>
      }
      action={
        <PrimaryButton onPress={handleCreateAccount} testID="select-create-button">
          {t('wallet.create_wallet')}
        </PrimaryButton>
      }
    />
  );
}

// ============================================================================
// Styles
// ============================================================================

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    // The slogan is a brand line at body size in secondary ink — quieter than
    // the flow's description token, subordinate to the wordmark above it.
    slogan: {
      color: t.text.secondary,
      fontFamily: fontFamilyNative.regular,
      fontSize: s(fontSize.body),
      lineHeight: fontSize.body * lineHeight.normal,
      textAlign: 'center',
    },
  });
