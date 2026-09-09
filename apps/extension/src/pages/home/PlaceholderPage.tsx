import React from 'react';
import { useTranslation } from 'react-i18next';
import { fontSize } from '@salmon/shared';

import { SettingsPanelContent, useSemantic } from '../../components';

/**
 * Placeholder page for a view that has nothing to show yet.
 */
export function PlaceholderPage({
  title,
  onBack,
}: {
  title: string;
  onBack: () => void;
}): React.ReactElement {
  const { t } = useTranslation();
  const { text } = useSemantic();

  return (
    <SettingsPanelContent title={title} onBack={onBack}>
      <p style={{ margin: 0, color: text.secondary, fontSize: fontSize.body, textAlign: 'center' }}>
        {t('common.coming_soon', 'Coming soon...')}
      </p>
    </SettingsPanelContent>
  );
}
