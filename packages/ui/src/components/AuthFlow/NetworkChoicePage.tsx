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
  fontFamily,
  fontSize,
  lineHeight,
  spacing,
  type NetworkChoiceOption,
  type OnboardingLayoutPropsBase,
  type SettingsSelectorListPropsBase,
} from '@salmon/shared';
import type { ReactNode } from 'react';

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

function Alert({ testID, children }: { testID: string; children: ReactNode }) {
  const { status } = useSemantic();
  return (
    <p
      role="alert"
      data-testid={testID}
      style={{
        color: status.danger,
        fontFamily: fontFamily.sans,
        fontSize: fontSize.body,
        lineHeight: lineHeight.snug,
        textAlign: 'center',
        margin: 0,
      }}
    >
      {children}
    </p>
  );
}

const NetworkChoiceScreen = createNetworkChoiceScreen({
  Layout: (props: OnboardingLayoutPropsBase) => (
    <OnboardingLayout {...props} background={<WaterColumn />} />
  ),
  Title: OnboardingTitle,
  Header: ScreenHeader,
  // Settings spaces its rows from the panel; here the rows bring their own.
  SettingsSelectorList: (props: SettingsSelectorListPropsBase<NetworkChoiceOption>) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.screenGutter }}>
      <SettingsSelectorList {...props} />
    </div>
  ),
  Alert,
  mark: <Mark />,
});

export function NetworkChoicePage(props: NetworkChoicePageProps): React.ReactElement {
  return <NetworkChoiceScreen {...props} />;
}
