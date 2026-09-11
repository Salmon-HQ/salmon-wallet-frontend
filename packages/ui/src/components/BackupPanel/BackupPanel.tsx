/**
 * BackupPanel — the settings surface that re-shows a wallet's seed phrase,
 * on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/BackupPanel`. The phrase is
 * exhibited on `SeedWordGrid`, the same primitive the onboarding grid uses
 * (DESIGN.md §The Seed Phrase Rule): bedrock cells, mono words, tertiary
 * numbers, one implementation. Around it: a `WarningNotice` for the standing
 * warning, a bedrock cover for the reveal gate, kit buttons.
 *
 * The gate itself is unchanged: an unlocked session is not proof of
 * identity, so the password is asked again before the phrase comes into view.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  fontFamily,
  fontSize,
  lineHeight,
  spacing,
  useAccountsContext,
  useBackupPanelLogic,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { PrimaryButton, SecondaryButton } from '../Button';
import { ConfirmDialog } from '../ConfirmDialog';
import { RevealCover } from '../RevealCover';
import { SeedWordGrid } from '../SeedPhrase';
import { SettingsPanelContent } from '../SettingsPanelContent';
import { WarningNotice } from '../WarningNotice';
import type { BackupPanelProps } from './types';

export function BackupPanel({ onBack }: BackupPanelProps): React.ReactElement {
  const { t } = useTranslation();
  const { text } = useSemantic();
  const [state, actions] = useAccountsContext();
  const { activeAccount } = state;

  // The DOM twin never passes biometric options, so `handleReveal` always
  // falls through to the password gate — the same behavior this had before
  // the reveal/copy/reauth state moved into shared.
  const {
    hasNoMnemonic,
    shownWords,
    showSeedPhrase,
    reauthVisible: reauthOpen,
    setReauthVisible: setReauthOpen,
    copied,
    copyFailed,
    handleReveal,
    handleReauthenticated,
    handleCopy,
  } = useBackupPanelLogic({
    activeAccount,
    copyToClipboard: (mnemonic) => navigator.clipboard.writeText(mnemonic),
  });

  return (
    <SettingsPanelContent
      title={t('general.seed_phrase')}
      subtitle={t('settings.backup_subtitle', 'View or back up your recovery phrase.')}
      onBack={onBack}
    >
      <WarningNotice tone="warning" title={t('wallet.create.messageTitle')}>
        {t('wallet.create.messageBody')}
      </WarningNotice>

      {hasNoMnemonic ? (
        <p
          data-testid="backup-no-seed-phrase"
          style={{
            margin: 0,
            color: text.secondary,
            fontFamily: fontFamily.sans,
            fontSize: fontSize.body,
            lineHeight: `${fontSize.body * lineHeight.snug}px`,
          }}
        >
          {t('settings.no_seed_phrase')}
        </p>
      ) : (
        <div style={{ position: 'relative' }} data-testid="backup-seed-phrase">
          <SeedWordGrid words={shownWords} columns={3} />
          {!showSeedPhrase && (
            <RevealCover
              testID="backup-seed-reveal-overlay"
              label={t('settings.wallets.tap_to_reveal')}
              onPress={handleReveal}
            />
          )}
        </div>
      )}

      {showSeedPhrase && !hasNoMnemonic && (
        <div data-testid="backup-seed-clipboard-warning">
          <WarningNotice tone="warning" title={t('settings.clipboard_warning_title')}>
            {t('settings.clipboard_warning_description')}
          </WarningNotice>
        </div>
      )}

      {copyFailed && (
        <div data-testid="backup-seed-copy-error">
          <WarningNotice tone="error" title={t('settings.copy_failed')} />
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
        <SecondaryButton
          onPress={() => void handleCopy()}
          disabled={!showSeedPhrase}
          testID="backup-seed-copy-button"
        >
          {copied ? t('wallet.copied') : t('actions.copy')}
        </SecondaryButton>
        <PrimaryButton onPress={onBack} testID="backup-seed-done-button">
          {t('actions.done')}
        </PrimaryButton>
      </div>

      <ConfirmDialog
        visible={reauthOpen}
        onClose={() => setReauthOpen(false)}
        title={t('settings.reveal_phrase_title')}
        message={t('settings.reveal_phrase_message')}
        confirmText={t('actions.reveal', 'Reveal')}
        requirePassword
        validatePassword={actions.checkPassword}
        onConfirm={handleReauthenticated}
        confirmTestID="backup-reauth-confirm"
      />
    </SettingsPanelContent>
  );
}
