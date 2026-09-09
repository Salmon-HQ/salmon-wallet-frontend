/**
 * AccountAddPanel - Multi-step account creation flow for mobile
 *
 * The flow itself — steps, the derived scan, the seed grid, the imports, the
 * name, the re-auth and both confirms — is the shared `useAccountAddFlow`,
 * the same machine the DOM twin runs. This file renders it and owns the wait.
 *
 * Steps:
 * 1. select-method: Choose between deriving or importing
 * 2. derive-scan: Scan for derived accounts using DerivedAccountCard
 * 3. import-seed: Enter seed phrase using SeedPhrase component
 * 4. set-name: Choose account name
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import {
  CaretRightIcon,
  EyeIcon,
  FileTextIcon,
  KeyIcon,
  TreeStructureIcon,
  iconSize,
} from '../../../icons';
import { useTranslation } from 'react-i18next';
import * as Clipboard from 'expo-clipboard';

import {
  spacing,
  useAccountsContext,
  useAccountAddFlow,
  getShortAddress,
  NETWORK_DISPLAY,
  type AccountAddStep,
  type DerivedAccountInfo,
} from '@salmon/shared';
import { SettingsScreenLayout } from '../../SettingsScreenLayout';
import { PrimaryButton, SecondaryButton } from '../../Button';
// Direct, not the barrel: the layout's own motion has no place in a panel.
import { ReservedSlot } from '../../OnboardingLayout/ReservedSlot';
import { Card } from '../../Card';
import { TextField } from '../../TextInput';
import { ConfirmSheet } from '../../ConfirmSheet';
import { IconBubble } from '../../IconBubble';
import { ListRow } from '../../ListRow';
import { SectionLabel } from '../../SectionLabel';
import { DerivedAccountCard } from '../../DerivedAccountCard';
import { LoadingScreen } from '../../LoadingScreen';
import { WarningNotice } from '../../WarningNotice';
import { SeedPhraseEntry } from '../../SeedPhrase';
import { PasswordInput } from '../../PasswordInput';
import { useSecretScreen } from '../../../../hooks/useSecretScreen';
import { useWaitPassage } from '../../../utils/useWaitPassage';
import { useSemantic, useThemedStyles } from '../../../theme/useThemedStyles';
import { stylesFor } from './styles';
import type { AccountAddPanelProps } from './types';

// ============================================================================
// Component
// ============================================================================

/** The leading well every settings row carries. */
const ROW_BUBBLE_SIZE = 40;

export function AccountAddPanel({ onComplete, onBack }: AccountAddPanelProps): React.ReactElement {
  const { t } = useTranslation();
  const styles = useThemedStyles(stylesFor);
  const { text, accent } = useSemantic();
  const [{ accounts }] = useAccountsContext();

  // The imported seed lives in this panel's memory for its whole lifetime,
  // not just while the grid is mounted (`SeedWordInput` covers those frames).
  useSecretScreen('account-add-panel');

  // Loading state
  const [loading, setLoading] = useState(false);

  // Creation-failure notice, surfaced as a sheet rather than an OS alert.
  // Title and body together: the failure is named in the heading rather than
  // filed under "unexpected", which is wrong for a cause the code detected on
  // purpose and leaves the user with nothing to act on.
  const [creationError, setCreationError] = useState<{ title: string; message: string } | null>(
    null
  );

  // The wait's passage: the panel keeps the wait mounted until its closing
  // wave has left, and the completion handoff is parked behind that report —
  // completing earlier unmounts the wait mid-wave. LoadingScreen's watchdog
  // guarantees the report, so the handoff cannot be stranded.
  const { onExited: waitExited } = useWaitPassage(loading);
  const pendingCompleteRef = useRef(false);
  const handleWaitExited = useCallback(() => {
    waitExited();
    if (!pendingCompleteRef.current) return;
    pendingCompleteRef.current = false;
    onComplete();
  }, [waitExited, onComplete]);

  const defaultName = useMemo(
    () => t('settings.account_add.default_name', { number: accounts.length + 1 }),
    [accounts.length, t]
  );

  const onWaitStart = useCallback(() => setLoading(true), []);
  const onWaitEnd = useCallback(() => setLoading(false), []);
  // Parked, not fired: dropping `loading` starts the wait's exit, and
  // `handleWaitExited` completes once the last wave has left the screen.
  const onPersisted = useCallback(() => {
    pendingCompleteRef.current = true;
    setLoading(false);
  }, []);
  const onFailure = useCallback(
    (err: unknown) => {
      console.error('Failed to add account:', err);
      setCreationError({
        title: t('general.error'),
        message: t('settings.account_add.creation_error'),
      });
    },
    [t]
  );

  const flow = useAccountAddFlow({
    defaultName,
    onBack,
    onWaitStart,
    onWaitEnd,
    onPersisted,
    onFailure,
  });
  const { step, privateKeyImport, watchOnlyImport, selectedDerived } = flow;

  // ========================================================================
  // Render helpers
  // ========================================================================

  // Deriving is offered only when there is a phrase to derive from, so the
  // list is built per render rather than declared at module scope.
  const methods: {
    id: string;
    icon: React.ComponentType<{ size?: number; color?: string }>;
    titleKey: string;
    descriptionKey: string;
    onPress: () => void;
  }[] = [
    ...(flow.canDerive
      ? [
          {
            id: 'derive',
            icon: TreeStructureIcon,
            titleKey: 'settings.account_add.create_new',
            descriptionKey: 'settings.account_add.create_new_description',
            onPress: flow.selectDerive,
          },
        ]
      : []),
    {
      id: 'import',
      icon: FileTextIcon,
      titleKey: 'settings.account_add.import_seed',
      descriptionKey: 'settings.account_add.import_seed_description',
      onPress: flow.selectImport,
    },
    {
      id: 'private-key',
      icon: KeyIcon,
      titleKey: 'settings.account_add.import_private_key',
      descriptionKey: 'settings.account_add.import_private_key_description',
      onPress: flow.selectImportPrivateKey,
    },
    {
      id: 'watch-only',
      icon: EyeIcon,
      titleKey: 'settings.account_add.import_watch_only',
      descriptionKey: 'settings.account_add.import_watch_only_description',
      onPress: flow.selectImportWatchOnly,
    },
  ];

  const renderSelectMethod = () =>
    methods.map((method) => (
      <ListRow
        key={method.id}
        testID={`account-add-method-${method.id}`}
        leading={
          <IconBubble
            size={ROW_BUBBLE_SIZE}
            shape="rounded"
            tone="accent-tint"
            icon={method.icon}
            iconSize={iconSize.md}
          />
        }
        title={t(method.titleKey)}
        subtitle={t(method.descriptionKey)}
        onPress={method.onPress}
        trailing={<CaretRightIcon size={iconSize.sm} color={text.tertiary} />}
      />
    ));

  const renderDeriveScan = () => {
    if (flow.scanning) {
      return (
        <View style={styles.scanState}>
          <ActivityIndicator size="large" color={accent.ink} />
          <Text style={styles.scanStateText}>{t('settings.account_add.scanning')}</Text>
        </View>
      );
    }

    if (flow.derivedAccounts.length === 0 && flow.failedNetworks.length > 0) {
      return (
        <View style={styles.stack} testID="derived-scan-error">
          <WarningNotice tone="error" title={t('wallet.derived.scan_failed_title')}>
            {t('wallet.derived.scan_failed_body')}
          </WarningNotice>
          <PrimaryButton onPress={flow.selectDerive} testID="derived-scan-retry-button">
            {t('transactions.tapToRetry')}
          </PrimaryButton>
        </View>
      );
    }

    return (
      <View style={styles.stack}>
        {flow.failedNetworks.length > 0 && (
          <WarningNotice tone="warning" title={t('wallet.derived.scan_partial')} />
        )}
        {flow.derivedAccounts.map((item: DerivedAccountInfo) => (
          <DerivedAccountCard
            key={`${item.networkId}-${item.address}`}
            address={item.address}
            networkName={item.networkName}
            path={item.path}
            balanceFormatted={item.balanceFormatted}
            selected={selectedDerived?.address === item.address}
            dimmed={item.balance === 0}
            onToggle={() => flow.toggleDerived(item)}
            blockchain={NETWORK_DISPLAY[item.networkId]?.blockchain}
          />
        ))}
        <PrimaryButton
          onPress={flow.continueDerived}
          disabled={!selectedDerived}
          testID="account-add-derive-continue-button"
        >
          {t('actions.continue')}
        </PrimaryButton>
      </View>
    );
  };

  const handlePasteSeed = useCallback(async () => {
    try {
      flow.pasteSeed(await Clipboard.getStringAsync());
    } catch (error) {
      console.error('Failed to paste from clipboard:', error);
    }
  }, [flow]);

  const renderImportSeed = () => (
    <View style={styles.stack}>
      <SectionLabel variant="caps">{t('settings.account_add.import_seed')}</SectionLabel>
      <SeedPhraseEntry
        testID="account-add-seed"
        words={flow.seedWords}
        onChange={flow.setSeedWords}
        onLengthChange={flow.setSeedLength}
        onPasteRejected={flow.setPastedCount}
      />
      {flow.pastedCount !== null ? (
        <Text style={styles.errorText}>
          {t('wallet.recover.pastedWordCount', { count: flow.pastedCount })}
        </Text>
      ) : flow.seedError ? (
        <Text style={styles.errorText}>{t(flow.seedError)}</Text>
      ) : null}
      {/* The recover screen's rule: paste is the one action on offer, and
          Continue takes its reserved place only once the phrase checks out. */}
      <SecondaryButton onPress={handlePasteSeed} testID="account-add-seed-paste-button">
        {t('wallet.recover.pasteSeed')}
      </SecondaryButton>
      <ReservedSlot visible={flow.seedValid}>
        <PrimaryButton onPress={flow.submitSeed} testID="account-add-seed-continue-button">
          {t('actions.continue')}
        </PrimaryButton>
      </ReservedSlot>
    </View>
  );

  const renderImportPrivateKey = () => (
    <View style={styles.stack}>
      <WarningNotice tone="warning" title={t('wallet.import.warning_title')}>
        {t('wallet.import.warning_body')}
      </WarningNotice>
      <SectionLabel variant="caps">{t('wallet.import.label')}</SectionLabel>
      <PasswordInput
        testID="account-add-private-key-input"
        value={privateKeyImport.value}
        onChangeText={privateKeyImport.setValue}
        placeholder={t('wallet.import.placeholder')}
        error={privateKeyImport.error ? t(privateKeyImport.error) : undefined}
        onSubmitEditing={flow.submitPrivateKey}
        autoFocus
      />
      {/* One slot under the field: the hint stands where the error will stand,
          so the layout does not shift when a message replaces it. */}
      {!privateKeyImport.error && <Text style={styles.hintText}>{t('wallet.import.help')}</Text>}
      {privateKeyImport.address && (
        <Card padding="md" gap={spacing.xxs} testID="account-add-private-key-address">
          <Text style={styles.hintText}>{t('wallet.import.resolved_address')}</Text>
          <Text style={styles.addressText}>{getShortAddress(privateKeyImport.address)}</Text>
        </Card>
      )}
      <PrimaryButton
        onPress={flow.submitPrivateKey}
        disabled={!privateKeyImport.hasInput || privateKeyImport.validating}
        testID="account-add-private-key-continue-button"
      >
        {t('actions.continue')}
      </PrimaryButton>
    </View>
  );

  const renderImportWatchOnly = () => (
    <View style={styles.stack}>
      {/* No warning notice and no masked field: an address is public. The
          private-key step's PasswordInput would imply otherwise. */}
      <SectionLabel variant="caps">{t('wallet.watchOnly.label')}</SectionLabel>
      <TextField
        testID="account-add-watch-only-input"
        value={watchOnlyImport.value}
        onChangeText={watchOnlyImport.setValue}
        placeholder={t('wallet.watchOnly.placeholder')}
        accessibilityLabel={t('wallet.watchOnly.label')}
        autoFocus
        mono
        onSubmitEditing={flow.submitWatchOnly}
      />
      {/* One slot under the field: the hint stands where the error will
          stand, so the layout does not shift when a message replaces it. */}
      <Text
        testID="account-add-watch-only-message"
        style={watchOnlyImport.error ? styles.errorText : styles.hintText}
      >
        {watchOnlyImport.error ? t(watchOnlyImport.error) : t('wallet.watchOnly.help')}
      </Text>
      {watchOnlyImport.address && (
        <Card padding="md" gap={spacing.xxs} testID="account-add-watch-only-address">
          <Text style={styles.hintText}>{t('wallet.watchOnly.resolved_address')}</Text>
          <Text style={styles.addressText}>{getShortAddress(watchOnlyImport.address)}</Text>
        </Card>
      )}
      <PrimaryButton
        onPress={flow.submitWatchOnly}
        disabled={!watchOnlyImport.hasInput}
        testID="account-add-watch-only-continue-button"
      >
        {t('actions.continue')}
      </PrimaryButton>
    </View>
  );

  const renderReauth = () => (
    <View style={styles.stack}>
      <Text style={styles.bodyText}>{t('settings.account_add.reauth_body')}</Text>
      <SectionLabel variant="caps">{t('lock.password_label', 'Password')}</SectionLabel>
      <PasswordInput
        testID="account-add-reauth-password"
        value={flow.reauthPassword}
        onChangeText={flow.setReauthPassword}
        placeholder={t('lock.password_placeholder')}
        error={flow.reauthError ? t(flow.reauthError) : undefined}
        onSubmitEditing={flow.confirmReauth}
        autoFocus
      />
      <PrimaryButton
        onPress={flow.confirmReauth}
        disabled={!flow.reauthPassword || flow.reauthChecking}
        testID="account-add-reauth-confirm-button"
      >
        {t('settings.account_add.reauth_confirm')}
      </PrimaryButton>
    </View>
  );

  const renderSetName = () => (
    <View style={styles.stack}>
      <SectionLabel variant="caps">{t('settings.account_add.set_name')}</SectionLabel>
      <TextField
        testID="account-add-name-input"
        value={flow.accountName}
        onChangeText={flow.setAccountName}
        placeholder={t('settings.account_add.set_name_placeholder')}
        accessibilityLabel={t('settings.account_add.set_name')}
        autoFocus
        maxLength={32}
        onSubmitEditing={flow.confirm}
      />
      <PrimaryButton onPress={flow.confirm} testID="account-add-confirm-button">
        {t('settings.account_add.confirm')}
      </PrimaryButton>
    </View>
  );

  // ========================================================================
  // Main render
  // ========================================================================

  const stepTitles: Record<AccountAddStep, string> = {
    'select-method': t('settings.account_add.title'),
    'derive-scan': t('settings.account_add.create_new'),
    'import-seed': t('settings.account_add.import_seed'),
    'import-private-key': t('wallet.import.title'),
    'import-watch-only': t('wallet.watchOnly.title'),
    'set-name': t('settings.account_add.set_name'),
    reauth: t('settings.account_add.reauth_title'),
    complete: t('settings.account_add.title'),
  };
  const currentTitle = stepTitles[step];

  const stepSubtitles: Record<AccountAddStep, string> = {
    'select-method': t(
      'settings.account_add.select_method_subtitle',
      'Choose how you want to add this account.'
    ),
    'derive-scan': t(
      'settings.account_add.create_new_description',
      'Derive a new account from your existing seed phrase'
    ),
    'import-seed': t(
      'settings.account_add.import_seed_description',
      'Import an account using a different seed phrase'
    ),
    'import-private-key': t(
      'settings.account_add.import_private_key_description',
      'Add a wallet you already own using its private key'
    ),
    'import-watch-only': t(
      'settings.account_add.watch_only_subtitle',
      "Follow a wallet's address without moving its funds"
    ),
    'set-name': t(
      'settings.account_add.set_name_subtitle',
      "Give this account a name you'll recognize"
    ),
    reauth: t('settings.account_add.reauth_subtitle', 'Enter your password to keep going.'),
    complete: t('settings.account_add.title'),
  };
  const currentSubtitle = stepSubtitles[step];

  return (
    <>
      <LoadingScreen
        visible={loading}
        // Its own window: rendered inline it sits under the gate's header, so
        // the chevron and close button stayed tappable over a flow in flight.
        fullScreen
        title={
          selectedDerived
            ? t('settings.account_add.confirm_create')
            : t('settings.account_add.confirm_import')
        }
        subtitle={t('general.loading')}
        onExited={handleWaitExited}
      />
      <SettingsScreenLayout title={currentTitle} subtitle={currentSubtitle} onBack={flow.stepBack}>
        {step === 'select-method' && renderSelectMethod()}
        {step === 'derive-scan' && renderDeriveScan()}
        {step === 'import-seed' && renderImportSeed()}
        {step === 'import-private-key' && renderImportPrivateKey()}
        {step === 'import-watch-only' && renderImportWatchOnly()}
        {step === 'set-name' && renderSetName()}
        {step === 'reauth' && renderReauth()}
      </SettingsScreenLayout>

      {/* Failure notice as a sheet: there is nothing to confirm here, so it
          carries one dismiss button instead of a cancel/confirm pair that both
          did the same thing. */}
      <ConfirmSheet
        visible={creationError !== null}
        onClose={() => setCreationError(null)}
        title={creationError?.title ?? ''}
        message={creationError?.message ?? ''}
        acknowledgeOnly
        confirmText={t('actions.close')}
        onConfirm={async () => {}}
      />
    </>
  );
}
