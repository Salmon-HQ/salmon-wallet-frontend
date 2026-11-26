/**
 * The "Choose your networks" step of setup (spec 045), made once from a
 * platform's onboarding layout, title, header and single-choice list. Both
 * apps draw it between the recovery phrase and the password, on create and on
 * recover-from-phrase, so the two cannot drift: the same options, copy, test
 * ids and write.
 */
import React, { useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { saveBitcoinChoice } from '../hooks/useUserConfig';
import type { OnboardingLayoutPropsBase } from '../types/ui/onboarding-layout';
import type { ScreenHeaderPropsBase } from '../types/ui/screen-header';
import type { SettingsSelectorListPropsBase } from '../types/ui/settings-panels';

export interface NetworkChoiceOption {
  key: 'solana-bitcoin' | 'solana-only';
  bitcoinEnabled: boolean;
  label: string;
  description: string;
  /** Read in place of `label` where its symbol does not read aloud ("+"). */
  spokenLabel?: string;
}

export interface NetworkChoiceScreenKit {
  /** The platform's `OnboardingLayout`, its ground already bound. */
  Layout: ComponentType<OnboardingLayoutPropsBase>;
  Title: ComponentType<{ children: ReactNode }>;
  Header: ComponentType<ScreenHeaderPropsBase>;
  SettingsSelectorList: ComponentType<SettingsSelectorListPropsBase<NetworkChoiceOption>>;
  /** An error line that screen readers announce as it appears. */
  Alert: ComponentType<{ testID: string; children: ReactNode }>;
  /** `GlobeIcon` at the grid's mark size, in the primary ink. */
  mark: ReactNode;
}

export interface NetworkChoiceScreenProps {
  flowType: 'create' | 'recover';
  onBack: () => void;
  onContinue: () => void;
}

/** Warning, phrase, networks, password — and phrase, networks, password. */
const STEPS = {
  create: { currentStep: 3, totalSteps: 4 },
  recover: { currentStep: 2, totalSteps: 3 },
} as const;

// The options are their own label: a well would only repeat it.
const noWell = () => null;

export function createNetworkChoiceScreen(
  kit: NetworkChoiceScreenKit
): ComponentType<NetworkChoiceScreenProps> {
  // One tap is the whole step: nothing is preselected and there is no
  // Continue button, so a row saves and moves on.
  return function NetworkChoiceScreen({ flowType, onBack, onContinue }) {
    const { t } = useTranslation();
    const saving = useRef(false);
    const [failed, setFailed] = useState(false);

    const options = useMemo<NetworkChoiceOption[]>(
      () => [
        {
          key: 'solana-bitcoin',
          bitcoinEnabled: true,
          label: t('wallet.networks.solana_bitcoin'),
          spokenLabel: t('wallet.networks.solana_bitcoin_spoken'),
          description: t('wallet.networks.solana_bitcoin_description'),
        },
        {
          key: 'solana-only',
          bitcoinEnabled: false,
          label: t('wallet.networks.solana_only'),
          description: t('wallet.networks.solana_only_description'),
        },
      ],
      [t]
    );

    const choose = async (option: NetworkChoiceOption) => {
      if (saving.current) return;
      saving.current = true;
      setFailed(false);
      try {
        await saveBitcoinChoice(option.bitcoinEnabled);
      } catch (error) {
        // The screen stays and says so, so the tap can be repeated.
        console.error('Failed to save the network choice:', error);
        setFailed(true);
        return;
      } finally {
        // Mobile keeps this screen mounted under the password screen: coming
        // back must find the rows alive.
        saving.current = false;
      }
      onContinue();
    };

    return (
      <kit.Layout
        testID="onboarding-networks-screen"
        variant="content"
        chrome={
          <kit.Header
            testID="onboarding-networks-back"
            onBack={onBack}
            stepIndicator={STEPS[flowType]}
          />
        }
        mark={kit.mark}
        title={<kit.Title>{t('wallet.networks.title')}</kit.Title>}
        body={
          <kit.SettingsSelectorList
            items={options}
            getKey={(option) => option.key}
            isSelected={() => false}
            onSelect={(option) => void choose(option)}
            getPrimaryText={(option) => option.label}
            getSecondaryText={(option) => option.description}
            getAccessibilityLabel={(option) =>
              option.spokenLabel && `${option.spokenLabel}, ${option.description}`
            }
            renderLeadingElement={noWell}
            testIdPrefix="onboarding-networks-option"
          />
        }
        assist={
          failed ? (
            <kit.Alert testID="onboarding-networks-error">{t('errors.save_failed')}</kit.Alert>
          ) : undefined
        }
      />
    );
  };
}
