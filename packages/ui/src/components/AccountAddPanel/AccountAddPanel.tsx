/**
 * AccountAddPanel — the multi-step add-account flow, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/AccountPanels/AccountAddPanel`:
 * the method list as `ListRow`s, the derived scan on `DerivedAccountCard`,
 * the seed grid, the private-key and watch-only fields, the name step and
 * the re-auth step, each a stack of kit blocks under a title and a subtitle.
 * The flow itself is the shared `useAccountAddFlow`, the same machine the
 * mobile twin runs; this file renders it and raises the wait.
 *
 * Steps:
 * 1. select-method: derive, import seed, import private key, watch an address
 * 2. derive-scan: scan the active seed's paths
 * 3. import-*: the credential
 * 4. set-name: the name
 * 5. reauth: the password, when the vault key has lapsed
 */
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  fontFamily,
  fontSize,
  getShortAddress,
  lineHeight,
  NETWORK_DISPLAY,
  spacing,
  useAccountsContext,
  useAccountAddFlow,
  type AccountAddStep,
  type IconGlyphProps,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import {
  CaretRightIcon,
  EyeIcon,
  FileTextIcon,
  KeyIcon,
  TreeStructureIcon,
  iconSize,
} from '../../icons';
import { PrimaryButton, SecondaryButton } from '../Button';
import { Card } from '../Card';
import { ConfirmDialog } from '../ConfirmDialog';
import { DerivedAccountCard, DerivedAccountCardSkeleton } from '../DerivedAccountCard';
import { IconBubble } from '../IconBubble';
import { ListRow } from '../ListRow';
import { ReservedSlot } from '../OnboardingLayout';
import { PasswordInput } from '../PasswordInput';
import { SectionLabel } from '../SectionLabel';
import { SeedPhraseEntry } from '../SeedPhrase';
import { SettingsPanelContent } from '../SettingsPanelContent';
import { TextInput } from '../TextInput';
import { WarningNotice } from '../WarningNotice';
import type { AccountAddPanelProps } from './types';

/** The leading well every settings row carries. */
const ROW_BUBBLE_SIZE = 40;
/** Mirrors the cards a scan lists, so the wait does not jump on swap. */
const SCAN_SKELETON_COUNT = 3;

export function AccountAddPanel({
  onComplete,
  onBack,
  onWait,
  onCloseSettings,
}: AccountAddPanelProps): React.ReactElement {
  const { t } = useTranslation();
  const { text, status } = useSemantic();
  const [{ counter }] = useAccountsContext();

  // Creation-failure notice, surfaced as a sheet rather than inline.
  const [creationError, setCreationError] = useState<{ title: string; message: string } | null>(
    null
  );

  // A wait this panel raised may not outlive the panel unnoticed. Read
  // through a ref so only unmount — never a new `onWait` identity — lowers it.
  const onWaitRef = useRef(onWait);
  useEffect(() => {
    onWaitRef.current = onWait;
  }, [onWait]);
  useEffect(() => () => onWaitRef.current(null), []);

  const defaultName = useMemo(
    () => t('settings.account_add.default_name', { number: counter + 1 }),
    [counter, t]
  );

  // The wait's title names the flow, which the hook knows and this panel does
  // not until it asks — so the raise reads the flow's selection at call time.
  const selectedDerivedRef = useRef(false);
  /**
   * The wait is **not rendered here**. This panel lives inside the settings
   * stack, and the add finishes by closing it — a wait mounted in here would
   * be torn down with it and its closing wave would play nowhere. The panel
   * raises the wait on the stack (`onWait`), which hosts it outside.
   */
  const onWaitStart = useCallback(() => {
    onWait({
      title: selectedDerivedRef.current
        ? t('settings.account_add.confirm_create')
        : t('settings.account_add.confirm_import'),
      subtitle: t('general.loading'),
    });
  }, [onWait, t]);
  const onWaitEnd = useCallback(() => onWait(null), [onWait]);
  // The account has landed: the wait is lowered and settings closes under
  // it, so the last wave crosses the screen the user is returned to.
  const onPersisted = useCallback(() => {
    onWait(null);
    onComplete();
    onCloseSettings();
  }, [onWait, onComplete, onCloseSettings]);
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
  useEffect(() => {
    selectedDerivedRef.current = !!selectedDerived;
  }, [selectedDerived]);

  // ========================================================================
  // Render helpers
  // ========================================================================

  const hintStyle: React.CSSProperties = {
    margin: 0,
    color: text.secondary,
    fontFamily: fontFamily.sans,
    fontSize: fontSize.caption,
    padding: `0 ${spacing.xs}px`,
  };
  const errorStyle: React.CSSProperties = { ...hintStyle, color: status.danger };
  const addressStyle: React.CSSProperties = {
    margin: 0,
    color: text.primary,
    fontFamily: fontFamily.mono,
    fontSize: fontSize.mono,
  };
  /** The inside of one step: 12 binds a label to its field and a field to its hint. */
  const stack: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: spacing.md };

  const methods: {
    id: string;
    icon: React.ComponentType<IconGlyphProps>;
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
            onPress: () => void flow.selectDerive(),
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
        <div style={stack} aria-busy="true" aria-label={t('settings.account_add.scanning')}>
          {Array.from({ length: SCAN_SKELETON_COUNT }, (_, i) => (
            <DerivedAccountCardSkeleton key={i} />
          ))}
          <p style={{ ...hintStyle, textAlign: 'center' }}>{t('settings.account_add.scanning')}</p>
        </div>
      );
    }

    if (flow.derivedAccounts.length === 0 && flow.failedNetworks.length > 0) {
      return (
        <div style={stack} data-testid="derived-scan-error">
          <WarningNotice tone="error" title={t('wallet.derived.scan_failed_title')}>
            {t('wallet.derived.scan_failed_body')}
          </WarningNotice>
          <PrimaryButton
            onPress={() => void flow.selectDerive()}
            testID="derived-scan-retry-button"
          >
            {t('transactions.tapToRetry')}
          </PrimaryButton>
        </div>
      );
    }

    return (
      <div style={stack}>
        {flow.failedNetworks.length > 0 && (
          <WarningNotice tone="warning" title={t('wallet.derived.scan_partial')} />
        )}
        {flow.derivedAccounts.map((item) => (
          <DerivedAccountCard
            key={`${item.networkId}-${item.address}`}
            testID={`account-add-derived-${item.address}`}
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
      </div>
    );
  };

  const handlePasteSeed = useCallback(async () => {
    try {
      flow.pasteSeed(await navigator.clipboard.readText());
    } catch (error) {
      console.error('Failed to paste from clipboard:', error);
    }
  }, [flow]);

  const renderImportSeed = () => (
    <div style={stack}>
      <SectionLabel variant="caps">{t('settings.account_add.import_seed')}</SectionLabel>
      <SeedPhraseEntry
        testID="account-add-seed"
        words={flow.seedWords}
        onChange={flow.setSeedWords}
        onLengthChange={flow.setSeedLength}
        onPasteRejected={flow.setPastedCount}
      />
      {flow.pastedCount !== null ? (
        <p style={errorStyle}>{t('wallet.recover.pastedWordCount', { count: flow.pastedCount })}</p>
      ) : flow.seedError ? (
        <p style={errorStyle}>{t(flow.seedError)}</p>
      ) : null}
      {/* The recover page's rule: paste is the one action on offer, and
          Continue takes its reserved place only once the phrase checks out. */}
      <SecondaryButton
        onPress={() => void handlePasteSeed()}
        fullWidth
        testID="account-add-seed-paste-button"
      >
        {t('wallet.recover.pasteSeed')}
      </SecondaryButton>
      <ReservedSlot visible={flow.seedValid}>
        <PrimaryButton
          onPress={flow.submitSeed}
          fullWidth
          testID="account-add-seed-continue-button"
        >
          {t('actions.continue')}
        </PrimaryButton>
      </ReservedSlot>
    </div>
  );

  const renderImportPrivateKey = () => (
    <div style={stack}>
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
        onSubmitEditing={() => void flow.submitPrivateKey()}
        autoFocus
      />
      {/* One slot under the field: the hint stands where the error will
          stand, so the layout does not shift when a message replaces it. */}
      {!privateKeyImport.error && <p style={hintStyle}>{t('wallet.import.help')}</p>}
      {privateKeyImport.address && (
        <Card
          padding="md"
          gap={spacing.xxs}
          style={{ flexDirection: 'column' }}
          testID="account-add-private-key-address"
        >
          <p style={hintStyle}>{t('wallet.import.resolved_address')}</p>
          <p style={addressStyle}>{getShortAddress(privateKeyImport.address)}</p>
        </Card>
      )}
      <PrimaryButton
        onPress={() => void flow.submitPrivateKey()}
        disabled={!privateKeyImport.hasInput || privateKeyImport.validating}
        testID="account-add-private-key-continue-button"
      >
        {t('actions.continue')}
      </PrimaryButton>
    </div>
  );

  const renderImportWatchOnly = () => (
    <div style={stack}>
      {/* No warning notice and no masked field: an address is public. */}
      <SectionLabel variant="caps">{t('wallet.watchOnly.label')}</SectionLabel>
      <TextInput
        testID="account-add-watch-only-input"
        value={watchOnlyImport.value}
        onChangeText={watchOnlyImport.setValue}
        placeholder={t('wallet.watchOnly.placeholder')}
        accessibilityLabel={t('wallet.watchOnly.label')}
        autoFocus
        mono
        onSubmitEditing={flow.submitWatchOnly}
      />
      <p
        data-testid="account-add-watch-only-message"
        style={watchOnlyImport.error ? errorStyle : hintStyle}
      >
        {watchOnlyImport.error ? t(watchOnlyImport.error) : t('wallet.watchOnly.help')}
      </p>
      {watchOnlyImport.address && (
        <Card
          padding="md"
          gap={spacing.xxs}
          style={{ flexDirection: 'column' }}
          testID="account-add-watch-only-address"
        >
          <p style={hintStyle}>{t('wallet.watchOnly.resolved_address')}</p>
          <p style={addressStyle}>{getShortAddress(watchOnlyImport.address)}</p>
        </Card>
      )}
      <PrimaryButton
        onPress={flow.submitWatchOnly}
        disabled={!watchOnlyImport.hasInput}
        testID="account-add-watch-only-continue-button"
      >
        {t('actions.continue')}
      </PrimaryButton>
    </div>
  );

  const renderReauth = () => (
    <div style={stack}>
      <p
        style={{
          margin: 0,
          color: text.secondary,
          fontFamily: fontFamily.sans,
          fontSize: fontSize.body,
          lineHeight: `${fontSize.body * lineHeight.snug}px`,
        }}
      >
        {t('settings.account_add.reauth_body')}
      </p>
      <SectionLabel variant="caps">{t('lock.password_label', 'Password')}</SectionLabel>
      <PasswordInput
        testID="account-add-reauth-password"
        value={flow.reauthPassword}
        onChangeText={flow.setReauthPassword}
        placeholder={t('lock.password_placeholder')}
        error={flow.reauthError ? t(flow.reauthError) : undefined}
        onSubmitEditing={() => void flow.confirmReauth()}
        autoFocus
      />
      <PrimaryButton
        onPress={() => void flow.confirmReauth()}
        disabled={!flow.reauthPassword || flow.reauthChecking}
        testID="account-add-reauth-confirm-button"
      >
        {t('settings.account_add.reauth_confirm')}
      </PrimaryButton>
    </div>
  );

  const renderSetName = () => (
    <div style={stack}>
      <SectionLabel variant="caps">{t('settings.account_add.set_name')}</SectionLabel>
      <TextInput
        testID="account-add-name-input"
        value={flow.accountName}
        onChangeText={flow.setAccountName}
        placeholder={t('settings.account_add.set_name_placeholder')}
        accessibilityLabel={t('settings.account_add.set_name')}
        autoFocus
        maxLength={32}
        onSubmitEditing={() => void flow.confirm()}
      />
      <PrimaryButton onPress={() => void flow.confirm()} testID="account-add-confirm-button">
        {selectedDerived
          ? t('settings.account_add.confirm_create')
          : t('settings.account_add.confirm_import')}
      </PrimaryButton>
    </div>
  );

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

  return (
    <>
      <SettingsPanelContent
        title={stepTitles[step]}
        subtitle={stepSubtitles[step]}
        onBack={flow.stepBack}
      >
        {step === 'select-method' && renderSelectMethod()}
        {step === 'derive-scan' && renderDeriveScan()}
        {step === 'import-seed' && renderImportSeed()}
        {step === 'import-private-key' && renderImportPrivateKey()}
        {step === 'import-watch-only' && renderImportWatchOnly()}
        {step === 'set-name' && renderSetName()}
        {step === 'reauth' && renderReauth()}
      </SettingsPanelContent>

      {/* Failure notice as a sheet: nothing to confirm, one dismiss button. */}
      <ConfirmDialog
        visible={creationError !== null}
        onClose={() => setCreationError(null)}
        title={creationError?.title ?? ''}
        message={creationError?.message ?? ''}
        acknowledgeOnly
        confirmText={t('actions.close')}
        onConfirm={async () => {}}
        confirmTestID="account-add-error-close"
      />
    </>
  );
}
