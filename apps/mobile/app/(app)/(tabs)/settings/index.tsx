import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

// Placeholder route body: the real settings UI renders as a sheet from the
// tabs layout Gate, so this screen is normally never visible.
export default function SettingsOptionsScreen() {
  const { t } = useTranslation();
  return (
    <View>
      <Text>{t('settings.title', 'Settings')}</Text>
    </View>
  );
}
