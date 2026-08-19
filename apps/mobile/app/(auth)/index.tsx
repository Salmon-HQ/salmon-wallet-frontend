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
 * Composed on the onboarding slot grid. The brand appears once, as the mark
 * alone — the wordmark came off this screen at the owner's request
 * (2026-08-18: only the fish, no "Salmon" text) — so the `mark` slot carries
 * the screen's accessible name and the `title` band stays reserved and empty.
 * The third action, offered only when accounts already exist, is a text
 * affordance in `assist`: the reserved `secondary` band holds one control, and
 * a third button would be the one place in the flow where the grid overflows.
 */

import { onboardingIdentityGridFull, useAccountsContext, wordmarkText } from '@salmon/shared';
import {
  BrandMark,
  OnboardingLayout,
  PrimaryButton,
  SecondaryButton,
  TextButton,
} from '../../src/components';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

// ============================================================================
// Component
// ============================================================================

export default function WelcomeScreen() {
  const { t } = useTranslation();
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
   * Lock accounts and navigate to main app where the GateContainer
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
        The brand alone (product, 2026-08-18): the fish, no wordmark. The mark
        slot centres its children itself, so the vector needs no alignSelf
        here. The wrapper keeps the screen named — the mark is the only thing
        on it, so the reader announces "Salmon" as the header the eye
        recognises. Drawn at the grid's own size — the lock is the identity
        reference, so this fish and the lock's are the same fish at the same Y
        (markSize is identical at both rungs; the full table is safe to read).
      */
      mark={
        <View
          accessible
          accessibilityRole="header"
          accessibilityLabel={wordmarkText}
          testID="welcome-brand-mark"
        >
          <BrandMark size={onboardingIdentityGridFull.markSize} />
        </View>
      }
      /*
        No title and no description: the mark says what the screen is. Both
        bands stay reserved and empty — passing nothing leaves each slot at
        its full height, which is the whole point of the grid: everything
        below holds its Y.
      */
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
