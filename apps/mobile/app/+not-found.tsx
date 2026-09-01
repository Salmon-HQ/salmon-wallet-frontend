import { Link, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { Text, View } from 'react-native';
import { fontFamilyNative, fontSize, s, semantic, spacing } from '@salmon/shared';

export default function NotFoundScreen() {
  const { t } = useTranslation();
  return (
    <>
      <Stack.Screen options={{ title: t('general.not_found.title', 'Oops!') }} />
      <View style={styles.container}>
        <Text style={styles.title}>
          {t('general.not_found.message', "This screen doesn't exist.")}
        </Text>

        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>
            {t('general.not_found.go_home', 'Go to home screen!')}
          </Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  title: {
    fontSize: s(fontSize.title),
    fontFamily: fontFamilyNative.bold,
    color: semantic.text.primary,
  },
  link: {
    marginTop: spacing.lg,
    paddingVertical: spacing.lg,
  },
  linkText: {
    fontSize: s(fontSize.body),
    color: semantic.accent.ink,
  },
});
