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
 * Composed on the onboarding slot grid. It used to render its title *above*
 * the mark — the only screen in the flow that did — so the wordmark is the
 * `title` slot's content now and the welcome line is the `description`.
 * The third action, offered only when accounts already exist, is a text
 * affordance in `assist`: the reserved `secondary` band holds one control, and
 * a third button would be the one place in the flow where the grid overflows.
 */

import { useAccountsContext } from '@salmon/shared';
import {
  OnboardingDescription,
  OnboardingLayout,
  OnboardingTitle,
  PrimaryButton,
  SecondaryButton,
  TextButton,
} from '../../src/components';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

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

  // Determine the welcome line based on whether the user has accounts
  const welcome = hasAccounts
    ? t('wallet.onboarding.titleOnboarded')
    : t('wallet.onboarding.titleWelcome');

  return (
    <OnboardingLayout
      testID="welcome-screen"
      title={<OnboardingTitle>Salmon</OnboardingTitle>}
      description={<OnboardingDescription>{welcome}</OnboardingDescription>}
      assist={
        hasAccounts ? (
          <TextButton onPress={handleAccessExistingAccount} testID="select-access-existing-button">
            {t('wallet.access_existing_account')}
          </TextButton>
        ) : undefined
      }
      secondary={
        <SecondaryButton onPress={handleRecoverAccount} testID="select-recover-button">
          {t('wallet.recover_wallet').toUpperCase()}
        </SecondaryButton>
      }
      action={
        <PrimaryButton onPress={handleCreateAccount} testID="select-create-button">
          {t('wallet.create_wallet').toUpperCase()}
        </PrimaryButton>
      }
    />
  );
}
