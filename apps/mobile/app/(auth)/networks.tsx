/**
 * "Choose your networks", between the phrase and the password (spec 045).
 *
 * The DOM twin is `packages/ui/src/components/AuthFlow/NetworkChoicePage.tsx`.
 * The step itself is made once in shared (`createNetworkChoiceScreen`); this
 * route hands it the mobile kit and passes the flow's params on to the
 * password screen, which reads the phrase from the stash as before.
 */
import {
  componentSizes,
  createNetworkChoiceScreen,
  spacing,
  vs,
  type NetworkChoiceOption,
  type OnboardingLayoutPropsBase,
  type SettingsSelectorListPropsBase,
} from '@salmon/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import {
  OnboardingLayout,
  OnboardingTitle,
  ScreenHeader,
  SettingsSelectorList,
} from '../../src/components';
import { GlobeIcon } from '../../src/icons';
import { useSemantic } from '../../src/theme/useThemedStyles';

function Mark() {
  const semantic = useSemantic();
  return <GlobeIcon size={componentSizes.logoSizeSmall} color={semantic.text.primary} />;
}

const NetworkChoiceScreen = createNetworkChoiceScreen({
  Layout: (props: OnboardingLayoutPropsBase) => <OnboardingLayout {...props} float scrollBody />,
  Title: OnboardingTitle,
  Header: ScreenHeader,
  // Settings spaces its rows from the screen; here the rows bring their own.
  SettingsSelectorList: (props: SettingsSelectorListPropsBase<NetworkChoiceOption>) => (
    <View style={{ gap: vs(spacing.screenGutter) }}>
      <SettingsSelectorList {...props} />
    </View>
  ),
  mark: <Mark />,
});

export default function NetworksScreen() {
  const params = useLocalSearchParams<{ type?: string }>();

  return (
    <NetworkChoiceScreen
      flowType={params.type === 'create' ? 'create' : 'recover'}
      onBack={() => router.back()}
      onContinue={() => router.push({ pathname: '/(auth)/password', params })}
    />
  );
}
