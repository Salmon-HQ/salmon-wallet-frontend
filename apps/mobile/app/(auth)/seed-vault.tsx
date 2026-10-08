/**
 * Seed Vault Screen — first launch on a Seeker, with the wallet the user
 * already keeps in Seed Vault (spec 037, US1 scenario 5).
 *
 * Lists the accounts of the seeds Salmon may use (authorizing one first when
 * none is), then hands the chosen one to the password screen — in memory,
 * not as a route param a deep link could forge — which sets Salmon's password
 * as in any onboarding. Nothing secret passes through here: the key stays in
 * Seed Vault.
 */

import {
  componentSizes,
  isSeedVaultError,
  seedVaultRows,
  spacing,
  useAccountsContext,
  type SeedVaultListedAccount,
  type SeedVaultFailure,
  type SeedVaultRow,
} from '@salmon/shared';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, View } from 'react-native';

import {
  DerivedAccountCard,
  OnboardingDescription,
  OnboardingLayout,
  OnboardingTitle,
  PrimaryButton,
  ReservedSlot,
  ScreenHeader,
  SecondaryButton,
  Spinner,
  WarningNotice,
} from '../../src/components';
import { VaultIcon } from '../../src/icons';
import { setPendingSeedVaultSelection } from '../../src/seed-vault/pendingSelection';
import { useSeedVaultAccess } from '../../src/seed-vault/useSeedVaultAccess';
import { useSemantic } from '../../src/theme/useThemedStyles';

export default function SeedVaultScreen() {
  const { t } = useTranslation();
  const semantic = useSemantic();
  const seedVault = useSeedVaultAccess();
  const [{ accounts }] = useAccountsContext();

  const [listed, setListed] = useState<SeedVaultListedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<SeedVaultFailure | null>(null);
  const [selected, setSelected] = useState<SeedVaultRow | null>(null);
  const rows = useMemo(() => seedVaultRows(listed, accounts), [listed, accounts]);

  const load = useCallback(
    async (before?: () => Promise<void>) => {
      if (seedVault === undefined) return;
      if (seedVault === null) {
        setFailure('unavailable');
        setLoading(false);
        return;
      }
      setLoading(true);
      setFailure(null);
      try {
        await before?.();
        setListed(await seedVault.listAccounts());
      } catch (error) {
        setFailure(isSeedVaultError(error) ? error.reason : 'failed');
      } finally {
        setLoading(false);
      }
    },
    [seedVault]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const handleNext = useCallback(() => {
    if (!selected) return;
    const { authToken, derivationPath, address } = selected;
    setPendingSeedVaultSelection({ authToken, derivationPath, address });
    router.push({ pathname: '/(auth)/password', params: { type: 'seed-vault' } });
  }, [selected]);

  return (
    <OnboardingLayout
      testID="seed-vault-screen"
      variant="content"
      scrollBody
      float
      chrome={
        <ScreenHeader
          onBack={() => router.back()}
          stepIndicator={{ totalSteps: 2, currentStep: 1 }}
        />
      }
      mark={<VaultIcon size={componentSizes.logoSizeSmall} color={semantic.text.primary} />}
      title={<OnboardingTitle>{t('wallet.seedVault.title')}</OnboardingTitle>}
      description={<OnboardingDescription>{t('wallet.seedVault.subtitle')}</OnboardingDescription>}
      body={
        loading ? (
          <Spinner size={32} color={semantic.accent.ink} />
        ) : (
          <View style={{ gap: spacing.md }}>
            {failure && (
              <WarningNotice tone="error" title={t(`wallet.seedVault.errors.${failure}`)} />
            )}
            {rows.map((row) => (
              <DerivedAccountCard
                key={`${row.authToken}-${row.address}`}
                testID={`seed-vault-account-${row.address}`}
                address={row.address}
                networkName={row.name}
                path={row.derivationPath.replace(/^bip32:\//, '')}
                balanceFormatted={row.isUserWallet ? t('wallet.seedVault.in_use') : ''}
                selected={selected?.address === row.address && selected.authToken === row.authToken}
                dimmed={false}
                onToggle={() => setSelected((prev) => (prev?.address === row.address ? null : row))}
                blockchain="solana"
              />
            ))}
          </View>
        )
      }
      secondary={
        failure === 'blocked' ? (
          <SecondaryButton
            onPress={() => void Linking.openSettings()}
            testID="seed-vault-settings-button"
          >
            {t('wallet.seedVault.open_settings')}
          </SecondaryButton>
        ) : failure === 'no-seeds' ? (
          <SecondaryButton
            onPress={() => void load(() => seedVault?.createSeed() ?? Promise.resolve())}
            disabled={loading}
            testID="seed-vault-create-button"
          >
            {t('wallet.seedVault.create_seed')}
          </SecondaryButton>
        ) : (
          <SecondaryButton
            onPress={() => void load(() => seedVault?.authorizeAnother() ?? Promise.resolve())}
            disabled={loading || !seedVault}
            testID="seed-vault-authorize-button"
          >
            {t('wallet.seedVault.authorize_another')}
          </SecondaryButton>
        )
      }
      action={
        <ReservedSlot visible={!!selected}>
          <PrimaryButton onPress={handleNext} testID="seed-vault-next-button">
            {t('actions.next')}
          </PrimaryButton>
        </ReservedSlot>
      }
    />
  );
}
