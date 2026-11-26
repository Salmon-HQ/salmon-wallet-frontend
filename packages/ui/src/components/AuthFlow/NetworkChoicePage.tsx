/**
 * "Choose your networks", between the phrase and the password (spec 045).
 *
 * The mobile twin is `apps/mobile/app/(auth)/networks.tsx`. The step itself
 * is made once in shared (`createNetworkChoiceScreen`); this file hands it the
 * DOM kit and the flow's water.
 */
import {
  componentSizes,
  createNetworkChoiceScreen,
  type OnboardingLayoutPropsBase,
} from '@salmon/shared';

import { GlobeIcon } from '../../icons';
import { useSemantic } from '../../theme/ThemeProvider';
import { OnboardingLayout, OnboardingTitle } from '../OnboardingLayout';
import { ScreenHeader } from '../ScreenHeader';
import { SettingsSelectorList } from '../SettingsSelectorList';
import { WaterColumn } from '../WaterColumn';
import type { NetworkChoicePageProps } from './types';

function Mark() {
  const { text } = useSemantic();
  return <GlobeIcon size={componentSizes.logoSizeSmall} color={text.primary} />;
}

const NetworkChoiceScreen = createNetworkChoiceScreen({
  Layout: (props: OnboardingLayoutPropsBase) => (
    <OnboardingLayout {...props} background={<WaterColumn />} />
  ),
  Title: OnboardingTitle,
  Header: ScreenHeader,
  SettingsSelectorList,
  mark: <Mark />,
});

export function NetworkChoicePage(props: NetworkChoicePageProps): React.ReactElement {
  return <NetworkChoiceScreen {...props} />;
}
