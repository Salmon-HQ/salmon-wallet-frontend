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
  useAccountsContext,
  useAnalyticsConsent,
  useCurrencyContext,
  useTheme,
  useUserConfig,
  getSettingsItemTestId,
  fontFamilyNative,
  fontSize,
  s,
  spacing,
  vs,
  LANGUAGE_NAMES,
  type LanguageCode,
  type SettingsScreen,
  type Semantic,
} from '@salmon/shared';
import {
  DepthBackground,
  IconBubble,
  ListRow,
  ScalesBackground,
  ScreenHeader,
  SectionLabel,
} from '../../../src/components';
import { useDeveloperModeSettings } from '../../../src/contexts/DeveloperModeContext';
import { useLanguage } from '../../../src/i18n';
import { useBiometricAuth } from '../../../hooks/useBiometricAuth';
import { useSemantic, useThemedStyles } from '../../../src/theme/useThemedStyles';

/** The leading well every settings row carries. */
const ROW_BUBBLE_SIZE = 40;

type RowId = SettingsScreen | 'analytics' | 'developerNetworks' | 'unverifiedTokens';

interface SettingsRow {
  id: RowId;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  labelKey: string;
  /** A row that flips a switch in place rather than pushing a screen. */
  isToggle?: boolean;
  /** A row that runs a destructive action rather than pushing a screen. */
  isAction?: boolean;
  isDanger?: boolean;
}

interface SettingsGroup {
  titleKey: string;
  isDanger?: boolean;
  rows: SettingsRow[];
}

const SETTINGS_GROUPS: SettingsGroup[] = [
  {
    titleKey: 'settings.sections.account',
    rows: [
      { id: 'accounts', icon: UsersIcon, labelKey: 'settings.accounts.title' },
      { id: 'avatar', icon: UserCircleIcon, labelKey: 'settings.profile_picture' },
      { id: 'security', icon: ShieldCheckIcon, labelKey: 'settings.security.title' },
      { id: 'backup', icon: KeyIcon, labelKey: 'settings.backup' },
      { id: 'privateKey', icon: LockIcon, labelKey: 'settings.private_key' },
    ],
  },
  {
    titleKey: 'settings.sections.preferences',
    rows: [
      { id: 'language', icon: TranslateIcon, labelKey: 'settings.display_language' },
      { id: 'currency', icon: MoneyIcon, labelKey: 'settings.currency' },
      { id: 'explorer', icon: ArrowSquareOutIcon, labelKey: 'settings.select_explorer' },
      { id: 'appearance', icon: CircleHalfIcon, labelKey: 'settings.appearance' },
    ],
  },
  {
    titleKey: 'settings.sections.advanced',
    rows: [
      { id: 'addressBook', icon: AddressBookIcon, labelKey: 'settings.address_book' },
      { id: 'trustedApps', icon: SquaresFourIcon, labelKey: 'settings.trusted_apps' },
      { id: 'analytics', icon: ChartBarIcon, labelKey: 'settings.analytics', isToggle: true },
      {
        id: 'developerNetworks',
        icon: CodeIcon,
        labelKey: 'settings.developer_networks',
        isToggle: true,
      },
      {
        id: 'unverifiedTokens',
        icon: EyeIcon,
        labelKey: 'settings.unverified_tokens',
        isToggle: true,
      },
    ],
  },
  {
    titleKey: 'settings.sections.support',
    rows: [
      { id: 'support', icon: QuestionIcon, labelKey: 'settings.help_support' },
      { id: 'about', icon: InfoIcon, labelKey: 'settings.about' },
    ],
  },
  {
    titleKey: 'settings.sections.danger_zone',
    isDanger: true,
    rows: [
      {
        id: 'removeWallet',
        icon: TrashIcon,
        labelKey: 'settings.wallets.remove_wallet',
        isAction: true,
        isDanger: true,
      },
      {
        id: 'removeAll',
        icon: SignOutIcon,
        labelKey: 'settings.wallets.remove_all_wallets',
        isAction: true,
        isDanger: true,
      },
    ],
  },
];

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
  // The two "show me more" settings come from the `(app)` provider, so this
  // screen reads the same instance the carousel and the network panel do.
  const {
    developerNetworks,
    showUnverifiedTokens,
    toggleDeveloperNetworks,
    setShowUnverifiedTokens,
  } = useDeveloperModeSettings();

  // Turning the flag off while the session stands on devnet moves it to the
  // mainnet sibling first — the shared toggle owns that passage, it only needs
  // the session's network and the switch to make it with.
  const handleToggleDeveloperNetworks = useCallback(() => {
    void toggleDeveloperNetworks({
      activeNetworkId: networkId,
      changeNetwork: accountActions.changeNetwork,
    });
  }, [toggleDeveloperNetworks, networkId, accountActions]);

  const handleToggleUnverifiedTokens = useCallback(
    (show: boolean) => {
      void setShowUnverifiedTokens(show);
    },
    [setShowUnverifiedTokens]
  );
  const { currentLanguage } = useLanguage();
  const [{ currency }] = useCurrencyContext();
  const { preference: appearancePreference } = useTheme();
  const { setEnableBiometric } = useBiometricAuth();

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
  const rowValues: Partial<Record<RowId, string | undefined>> = useMemo(
    () => ({
      language: LANGUAGE_NAMES[currentLanguage as LanguageCode] || currentLanguage,
      currency: currency?.toUpperCase(),
      explorer: explorer?.name,
      appearance: appearanceLabels[appearancePreference],
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
              await setEnableBiometric(false);
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
  }, [accountActions, removing, router, setEnableBiometric, t]);

  const handleRemoveWallet = useCallback(() => {
    const currentAccount = activeAccount;
    if (!currentAccount) return;

    if (accountState.accounts.length <= 1) {
      handleRemoveAllWallets();
      return;
    }

    Alert.alert(
      t('settings.remove_wallet_title'),
      t('settings.wallets.remove_wallet_description'),
      [
        { text: t('actions.cancel'), style: 'cancel' },
        {
          text: t('settings.confirm_remove'),
          style: 'destructive',
          onPress: async () => {
            try {
              await accountActions.removeAccount(currentAccount.id);
              router.back();
            } catch (error) {
              console.error('Failed to remove wallet:', error);
              Alert.alert(t('general.error'), t('settings.remove_wallet_error'));
            }
          },
        },
      ]
    );
  }, [
    accountState.accounts.length,
    activeAccount,
    accountActions,
    handleRemoveAllWallets,
    router,
    t,
  ]);

  const handleRowPress = useCallback(
    (row: SettingsRow) => {
      if (row.isAction) {
        if (row.id === 'removeWallet') handleRemoveWallet();
        else if (row.id === 'removeAll') handleRemoveAllWallets();
        return;
      }
      router.push({ pathname: '/settings/[panel]', params: { panel: row.id } });
    },
    [handleRemoveAllWallets, handleRemoveWallet, router]
  );

  const renderRow = useCallback(
    (row: SettingsRow) => {
      const label = t(row.labelKey);
      const testID = getSettingsItemTestId(row.id);

      // Three toggles, one row shape. Developer Networks decides which
      // networks the carousel offers; unverified tokens decide what the lists
      // show — the two used to be the same boolean (spec 026 D4).
      if (row.isToggle) {
        const toggle =
          row.id === 'developerNetworks'
            ? {
                checked: developerNetworks,
                onChange: handleToggleDeveloperNetworks,
                descriptionKey: 'settings.developer_networks_description',
                testId: 'settings-developer-networks-toggle',
              }
            : row.id === 'unverifiedTokens'
              ? {
                  checked: showUnverifiedTokens,
                  onChange: handleToggleUnverifiedTokens,
                  descriptionKey: 'settings.unverified_tokens_description',
                  testId: 'settings-unverified-tokens-toggle',
                }
              : {
                  checked: analyticsConsent,
                  onChange: setAnalyticsConsent,
                  descriptionKey: 'settings.analytics_description',
                  testId: 'settings-analytics-toggle',
                };
        const { checked, descriptionKey } = toggle;
        const toggleTestId = toggle.testId;
        return (
          <ListRow
            key={row.id}
            testID={testID}
            leading={
              <IconBubble
                size={ROW_BUBBLE_SIZE}
                shape="rounded"
                tone="surface"
                icon={row.icon}
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

      const value = rowValues[row.id];
      return (
        <ListRow
          key={row.id}
          testID={testID}
          leading={
            <IconBubble
              size={ROW_BUBBLE_SIZE}
              shape="rounded"
              tone="surface"
              icon={row.icon}
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
    [
      analyticsConsent,
      developerNetworks,
      handleRowPress,
      handleToggleDeveloperNetworks,
      handleToggleUnverifiedTokens,
      rowValues,
      semantic,
      setAnalyticsConsent,
      showUnverifiedTokens,
      styles,
      t,
    ]
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
