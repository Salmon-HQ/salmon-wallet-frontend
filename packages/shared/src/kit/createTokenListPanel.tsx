/**
 * The Token list screen of Settings (spec 044), made once from a platform's
 * settings frame, section label and single-choice list. Each app's panel
 * registry makes it with its own three, so the two screens cannot drift: the
 * same two lists, the same copy, the same test ids, the same writes.
 */
import React, { type ComponentType } from 'react';
import { useTranslation } from 'react-i18next';

import { useTokenListPreference } from '../contexts/DeveloperModeContext';
import { useTokenListLabels, type TokenListOption } from '../hooks/useTokenListPreference';
import type { SectionLabelPropsBase } from '../types/ui/section-label';
import type {
  SettingsScreenLayoutPropsBase,
  SettingsSelectorListPropsBase,
} from '../types/ui/settings-panels';

export interface TokenListPanelKit {
  /** `SettingsPanelContent` on the DOM, `SettingsScreenLayout` on mobile. */
  Frame: ComponentType<SettingsScreenLayoutPropsBase>;
  SectionLabel: ComponentType<SectionLabelPropsBase>;
  SettingsSelectorList: ComponentType<SettingsSelectorListPropsBase<TokenListOption>>;
}

// The options are their own label: a well would only repeat it.
const noWell = () => null;

export function createTokenListPanel(
  kit: TokenListPanelKit
): ComponentType<{ onBack: () => void }> {
  // Two choices on one screen, so a pick stays here rather than going back.
  return function TokenListPanel({ onBack }: { onBack: () => void }) {
    const { t } = useTranslation();
    const { tokenListPreference, setTokenListPreference } = useTokenListPreference();
    const { countOptions, minValueOptions } = useTokenListLabels();

    return (
      <kit.Frame
        title={t('settings.token_list')}
        subtitle={t('settings.token_list_subtitle')}
        onBack={onBack}
      >
        <kit.SectionLabel variant="group">{t('settings.token_list_count_title')}</kit.SectionLabel>
        <kit.SettingsSelectorList
          items={countOptions}
          getKey={(option) => option.key}
          isSelected={(option) => option.value === tokenListPreference.maxCount}
          onSelect={(option) => void setTokenListPreference({ maxCount: option.value })}
          getPrimaryText={(option) => option.label}
          renderLeadingElement={noWell}
          testIdPrefix="token-list-count"
        />
        <kit.SectionLabel variant="group">
          {t('settings.token_list_min_value_title')}
        </kit.SectionLabel>
        <kit.SettingsSelectorList
          items={minValueOptions}
          getKey={(option) => option.key}
          isSelected={(option) => option.value === tokenListPreference.minValue}
          onSelect={(option) => void setTokenListPreference({ minValue: option.value })}
          getPrimaryText={(option) => option.label}
          renderLeadingElement={noWell}
          testIdPrefix="token-list-min-value"
        />
      </kit.Frame>
    );
  };
}
