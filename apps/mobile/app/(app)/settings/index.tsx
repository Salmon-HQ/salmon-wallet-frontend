/**
 * Settings — the screen, not a panel behind a header.
 *
 * The information architecture is the one the gate's sheet carried; what
 * changed is the surface under it. Sections are `SectionLabel` caps over a
 * `Card` group of `ListRow`s, each row a leading `IconBubble` and a trailing
 * value or chevron. Every entry pushes its own sub-screen.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AddressBookIcon,
  ArrowSquareOutIcon,
  CaretRightIcon,
  ChartBarIcon,
  CircleHalfIcon,
  CodeIcon,
  InfoIcon,
  KeyIcon,
  LockIcon,
  MoneyIcon,
  QuestionIcon,
  ShieldCheckIcon,
  SignOutIcon,
  SquaresFourIcon,
  EyeIcon,
  TranslateIcon,
  TrashIcon,
  UserCircleIcon,
  UsersIcon,
  iconSize,
} from '../../../src/icons';
import {
  useAccountRemoval,
  useAccountsContext,
  useAnalyticsConsent,
  useCurrencyContext,
  useDeveloperModeToggles,
  useTheme,
  useUserConfig,
  getSettingsItemTestId,
  fontFamilyNative,
  fontSize,
  s,
  spacing,
  vs,
  SETTINGS_GROUPS,
  settingsRowValues,
  type SettingsIconName,
  type SettingsRowDef,
  type SettingsToggleKey,
  type Semantic,
} from '@salmon/shared';
import {
  ConfirmSheet,
  DepthBackground,
  IconBubble,
  ListRow,
  ScalesBackground,
  ScreenHeader,
  SectionLabel,
} from '../../../src/components';
import { useLanguage } from '../../../src/i18n';
import { useBiometric } from '../../../src/contexts/BiometricContext';
import { useSemantic, useThemedStyles } from '../../../src/theme/useThemedStyles';

/** The leading well every settings row carries. */
const ROW_BUBBLE_SIZE = 40;

/** The table is shared (`SETTINGS_GROUPS`); the glyphs are this platform's. */
const SETTINGS_ICONS: Record<
  SettingsIconName,
  React.ComponentType<{ size?: number; color?: string }>
> = {
  users: UsersIcon,
  userCircle: UserCircleIcon,
  shieldCheck: ShieldCheckIcon,
  key: KeyIcon,
  lock: LockIcon,
  translate: TranslateIcon,
  money: MoneyIcon,
  arrowSquareOut: ArrowSquareOutIcon,
  circleHalf: CircleHalfIcon,
  addressBook: AddressBookIcon,
  squaresFour: SquaresFourIcon,
  chartBar: ChartBarIcon,
  code: CodeIcon,
  eye: EyeIcon,
  question: QuestionIcon,
  info: InfoIcon,
  trash: TrashIcon,
  signOut: SignOutIcon,
};

export default function SettingsScreenIndex() {
  const { t } = useTranslation();
  const router = useRouter();
  const styles = useThemedStyles(stylesFor);
  const semantic = useSemantic();

  const [accountState, accountActions] = useAccountsContext();
  const { activeAccount, activeBlockchainAccount, networkId } = accountState;
  const [removing, setRemoving] = useState(false);

  const userConfigAccount = useMemo(
    () => ({
      network: {
        environment: (activeBlockchainAccount
          ? networkId || 'solana-mainnet'
          : 'solana-mainnet') as 'solana-mainnet' | 'solana-devnet',
        blockchain: 'solana',
      },
    }),
    [activeBlockchainAccount, networkId]
  );
  const { explorer } = useUserConfig({
    activeBlockchainAccount: userConfigAccount,
  });
  const { consent: analyticsConsent, setConsent: setAnalyticsConsent } = useAnalyticsConsent();
  // The two "show me more" settings and their toggle handlers are the same
  // shape on both platforms — hoisted to `useDeveloperModeToggles`.
  const {
    developerNetworks,
    showUnverifiedTokens,
    handleToggleDeveloperNetworks,
    handleToggleUnverifiedTokens,
  } = useDeveloperModeToggles();
  const toggles = useMemo<
    Record<SettingsToggleKey, { checked: boolean; onChange: (next: boolean) => void }>
  >(
    () => ({
      analytics: { checked: analyticsConsent, onChange: setAnalyticsConsent },
      developerNetworks: { checked: developerNetworks, onChange: handleToggleDeveloperNetworks },
      unverifiedTokens: { checked: showUnverifiedTokens, onChange: handleToggleUnverifiedTokens },
    }),
    [
      analyticsConsent,
      setAnalyticsConsent,
      developerNetworks,
      handleToggleDeveloperNetworks,
      showUnverifiedTokens,
      handleToggleUnverifiedTokens,
    ]
  );
  const { currentLanguage } = useLanguage();
  const [{ currency }] = useCurrencyContext();
  const { preference: appearancePreference } = useTheme();
  const { disarm: disarmBiometric } = useBiometric();
  const accountRemoval = useAccountRemoval();
  const [removeWalletVisible, setRemoveWalletVisible] = useState(false);

  const appearanceLabels: Record<typeof appearancePreference, string> = useMemo(
    () => ({
      system: t('settings.appearance_options.system', 'System'),
      light: t('settings.appearance_options.light', 'Light'),
      dark: t('settings.appearance_options.dark', 'Dark'),
    }),
    [t]
  );

  // What the four choosable rows currently read. Proper nouns and a currency
  // code — identical in both languages, so the list states the user's own
  // choice without inventing copy.
  const rowValues = useMemo(
    () =>
      settingsRowValues({
        language: currentLanguage,
        currency,
        explorerName: explorer?.name,
        appearance: appearancePreference,
        appearanceLabels,
      }),
    [currentLanguage, currency, explorer, appearanceLabels, appearancePreference]
  );

  const handleRemoveAllWallets = useCallback(() => {
    Alert.alert(
      t('settings.remove_all_title'),
      t('settings.wallets.remove_all_wallets_description'),
      [
        { text: t('actions.cancel'), style: 'cancel' },
        {
          text: t('actions.remove_all'),
          style: 'destructive',
          onPress: async () => {
            if (removing) return;
            setRemoving(true);
            try {
              await disarmBiometric();
              await accountActions.removeAllAccounts();
              router.replace('/(auth)');
            } catch (error) {
              console.error('Failed to remove all wallets:', error);
              Alert.alert(t('general.error'), t('settings.remove_wallets_error'));
            } finally {
              setRemoving(false);
            }
          },
        },
      ]
    );
  }, [accountActions, removing, router, disarmBiometric, t]);

  // Removing one wallet re-encrypts the ones that are left, so it asks for the
  // password whenever the unlock key cache has lapsed — which an `Alert` has
  // nowhere to put. Removing the *last* wallet wipes the vault instead, so it
  // needs no key and keeps its alert.
  const handleRemoveWallet = useCallback(() => {
    if (!activeAccount) return;

    if (accountState.accounts.length <= 1) {
      handleRemoveAllWallets();
      return;
    }

    setRemoveWalletVisible(true);
  }, [accountState.accounts.length, activeAccount, handleRemoveAllWallets]);

  const confirmRemoveWallet = useCallback(
    async (password?: string) => {
      const currentAccount = activeAccount;
      if (!currentAccount) return;
      try {
        await accountRemoval.remove(currentAccount.id, password);
        setRemoveWalletVisible(false);
        router.back();
      } catch (error) {
        console.error('Failed to remove wallet:', error);
        Alert.alert(t('general.error'), t('settings.remove_wallet_error'));
        // Rethrown so the sheet stays open: when the vault key had just
        // expired it now carries the password field.
        throw error;
      }
    },
    [accountRemoval, activeAccount, router, t]
  );

  const handleRowPress = useCallback(
    (row: SettingsRowDef) => {
      if (row.kind === 'action') {
        if (row.id === 'removeWallet') handleRemoveWallet();
        else if (row.id === 'removeAll') handleRemoveAllWallets();
        return;
      }
      router.push({ pathname: '/settings/[panel]', params: { panel: row.id } });
    },
    [handleRemoveAllWallets, handleRemoveWallet, router]
  );

  const renderRow = useCallback(
    (row: SettingsRowDef) => {
      const label = t(row.labelKey);
      const testID = getSettingsItemTestId(row.id);
      const icon = SETTINGS_ICONS[row.icon];

      // Three toggles, one row shape; which setting each flips is this
      // platform's wiring, the row itself is the shared table's.
      if (row.kind === 'toggle') {
        const toggle = toggles[row.id];
        const { checked } = toggle;
        const descriptionKey = row.descriptionKey;
        const toggleTestId = row.testId;
        return (
          <ListRow
            key={row.id}
            testID={testID}
            leading={
              <IconBubble
                size={ROW_BUBBLE_SIZE}
                shape="rounded"
                tone="surface"
                icon={icon}
                iconSize={iconSize.md}
              />
            }
            title={label}
            subtitle={t(descriptionKey)}
            trailing={
              // The switch semantics live on the Switch itself — a wrapper
              // carrying role="switch" around a real Switch announced twice.
              <Switch
                testID={toggleTestId}
                accessibilityLabel={label}
                accessibilityHint={t(descriptionKey)}
                value={checked}
                onValueChange={toggle.onChange}
                trackColor={{ false: semantic.border.default, true: semantic.accent.ink }}
                thumbColor={semantic.text.primary}
              />
            }
          />
        );
      }

      const value = row.kind === 'panel' ? rowValues[row.id as keyof typeof rowValues] : undefined;
      return (
        <ListRow
          key={row.id}
          testID={testID}
          leading={
            <IconBubble
              size={ROW_BUBBLE_SIZE}
              shape="rounded"
              tone="surface"
              icon={icon}
              iconSize={iconSize.md}
              iconColor={row.isDanger ? semantic.status.danger : undefined}
            />
          }
          title={label}
          onPress={() => handleRowPress(row)}
          trailing={
            value ? (
              <Text
                testID={`${testID}-value`}
                style={styles.rowValue}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {value}
              </Text>
            ) : (
              <CaretRightIcon
                size={iconSize.sm}
                color={row.isDanger ? semantic.status.danger : semantic.text.tertiary}
              />
            )
          }
          style={row.isDanger ? styles.dangerRow : undefined}
        />
      );
    },
    [handleRowPress, rowValues, semantic, styles, t, toggles]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Pushed over the tab shell, so it mounts its own water. */}
      <DepthBackground />
      <ScalesBackground variant="deepField" />

      <ScreenHeader
        onBack={() => router.back()}
        title={t('settings.title', 'Settings')}
        subtitle={t('settings.subtitle')}
      />
      <ScrollView
        testID="settings-screen"
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: vs(spacing.screenGutter) }]}
        showsVerticalScrollIndicator={false}
      >
        {SETTINGS_GROUPS.map((group) => (
          <View key={group.titleKey} style={styles.section}>
            <SectionLabel variant="caps" style={group.isDanger ? styles.dangerLabel : undefined}>
              {t(group.titleKey)}
            </SectionLabel>
            {/* A plain group, not a card: every row already draws its own,
                and a card of cards paints the membrane twice. */}
            <View testID={`settings-section-${group.titleKey}`} style={styles.sectionCard}>
              {group.rows.map(renderRow)}
            </View>
          </View>
        ))}
      </ScrollView>

      <ConfirmSheet
        visible={removeWalletVisible}
        onClose={() => setRemoveWalletVisible(false)}
        title={t('settings.remove_wallet_title')}
        message={t('settings.wallets.remove_wallet_description')}
        confirmText={t('settings.confirm_remove')}
        isDanger
        requirePassword={accountRemoval.requiresPassword}
        validatePassword={accountRemoval.validatePassword}
        onConfirm={confirmRemoveWallet}
      />
    </SafeAreaView>
  );
}

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: s(spacing.screenGutter),
      // No top padding: the header block already ends 20 above the content.
      gap: vs(spacing.xl),
    },
    // The component gap (DESIGN.md §Layout): the caps label, and every row card
    // under it, are sibling components — 20 between each, as the `.pen` draws
    // them (CORE 10: heading y=140/h16 → first card y=176).
    section: {
      gap: vs(spacing.screenGutter),
    },
    sectionCard: {
      gap: vs(spacing.screenGutter),
    },
    dangerLabel: {
      color: t.status.danger,
    },
    dangerRow: {
      backgroundColor: t.status.dangerTint,
    },
    rowValue: {
      color: t.text.secondary,
      fontFamily: fontFamilyNative.bold,
      fontSize: s(fontSize.body),
      maxWidth: '45%',
      textAlign: 'right',
    },
  });
