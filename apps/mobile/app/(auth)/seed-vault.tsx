/**
 * Seed Vault Screen — first launch on a Seeker, with the wallet the user
 * already keeps in Seed Vault (spec 037, US1 scenario 5).
 *
 * Lists the accounts of the seeds Salmon may use (authorizing one first when
 * none is), then hands the chosen one to the password screen, which sets
 * Salmon's password as in any onboarding. Nothing secret passes through here:
 * the key stays in Seed Vault.
 */

import {
  componentSizes,
  seedVaultRows,
  spacing,
  useAccountsContext,
  type SeedVaultListedAccount,
  type SeedVaultRow,
} from '@salmon/shared';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

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
import { useSeedVaultAccess } from '../../src/seed-vault/useSeedVaultAccess';
import { useSemantic } from '../../src/theme/useThemedStyles';

export default function SeedVaultScreen() {
  const { t } = useTranslation();
  const semantic = useSemantic();
  const seedVault = useSeedVaultAccess();
  const [{ accounts }] = useAccountsContext();

  const [listed, setListed] = useState<SeedVaultListedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<SeedVaultRow | null>(null);
  const rows = useMemo(() => seedVaultRows(listed, accounts), [listed, accounts]);

  const load = useCallback(
    async (before?: () => Promise<void>) => {
      if (!seedVault) return;
      setLoading(true);
      setFailed(false);
      try {
        await before?.();
        setListed(await seedVault.listAccounts());
      } catch {
        setFailed(true);
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
    router.push({
      pathname: '/(auth)/password',
      params: {
        type: 'seed-vault',
        seedVault: JSON.stringify({ authToken, derivationPath, address }),
      },
    });
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
            {failed && <WarningNotice tone="error" title={t('wallet.seedVault.errors.failed')} />}
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
        <SecondaryButton
          onPress={() => void load(() => seedVault?.authorizeAnother() ?? Promise.resolve())}
          testID="seed-vault-authorize-button"
        >
          {t('wallet.seedVault.authorize_another')}
        </SecondaryButton>
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
