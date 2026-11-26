/**
 * "Choose your networks" on mobile: the shared step drawn with the mobile kit,
 * floating into place like every onboarding screen. The step's own decisions
 * are tested once, in `packages/shared/src/kit/createNetworkChoiceScreen.test.tsx`.
 */
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockParams = jest.fn((): Record<string, string> => ({}));
const mockSave = jest.fn(async (_enabled: boolean) => {});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockPush(...args),
    back: (...args: unknown[]) => mockBack(...args),
  },
  useLocalSearchParams: () => mockParams(),
}));

jest.mock('../../../../packages/shared/src/hooks/useUserConfig', () => ({
  ...jest.requireActual('../../../../packages/shared/src/hooks/useUserConfig'),
  saveBitcoinChoice: (enabled: boolean) => mockSave(enabled),
}));

jest.mock('../../src/icons', () => ({ GlobeIcon: () => null }));

jest.mock('../../src/theme/useThemedStyles', () => ({
  useSemantic: () => ({ text: { primary: '#fff' } }),
}));

jest.mock('../../src/components', () => {
  const React = require('react');
  const { Text, TouchableOpacity, View } = require('react-native');
  return {
    OnboardingTitle: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(Text, null, children),
    OnboardingLayout: (props: Record<string, React.ReactNode> & { testID?: string }) =>
      React.createElement(
        View,
        { testID: props.testID },
        props.float ? React.createElement(Text, null, 'float') : null,
        props.chrome,
        props.title,
        props.body
      ),
    ScreenHeader: ({
      testID,
      onBack,
      stepIndicator,
    }: {
      testID?: string;
      onBack?: () => void;
      stepIndicator?: { currentStep: number; totalSteps: number };
    }) =>
      React.createElement(
        TouchableOpacity,
        { testID, onPress: onBack },
        React.createElement(
          Text,
          null,
          `${stepIndicator?.currentStep} of ${stepIndicator?.totalSteps}`
        )
      ),
    SettingsSelectorList: ({
      items,
      getKey,
      onSelect,
      testIdPrefix,
    }: {
      items: unknown[];
      getKey: (item: unknown) => string;
      onSelect: (item: unknown) => void;
      testIdPrefix: string;
    }) =>
      React.createElement(
        View,
        null,
        items.map((item) =>
          React.createElement(TouchableOpacity, {
            key: getKey(item),
            testID: `${testIdPrefix}-${getKey(item)}`,
            onPress: () => onSelect(item),
          })
        )
      ),
  };
});

import NetworksScreen from '../../app/(auth)/networks';

describe('the networks step', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams.mockReturnValue({});
  });

  it('draws the step floating in, with its test ids', () => {
    render(<NetworksScreen />);

    expect(screen.getByTestId('onboarding-networks-screen')).toBeTruthy();
    expect(screen.getByText('float')).toBeTruthy();
    expect(screen.getByTestId('onboarding-networks-back')).toBeTruthy();
    expect(screen.getByTestId('onboarding-networks-option-solana-bitcoin')).toBeTruthy();
    expect(screen.getByTestId('onboarding-networks-option-solana-only')).toBeTruthy();
  });

  it.each([
    [{ type: 'create' }, '3 of 4'],
    [{}, '2 of 3'],
  ])('reads its step from the flow (%o)', (params, dots) => {
    mockParams.mockReturnValue(params);

    render(<NetworksScreen />);

    expect(screen.getByText(dots)).toBeTruthy();
  });

  it('saves the choice and opens the password with the params it received', async () => {
    mockParams.mockReturnValue({ type: 'create' });
    render(<NetworksScreen />);

    await act(async () => {
      fireEvent.press(screen.getByTestId('onboarding-networks-option-solana-only'));
    });

    expect(mockSave).toHaveBeenCalledWith(false);
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/(auth)/password',
      params: { type: 'create' },
    });
  });

  it('goes back', () => {
    render(<NetworksScreen />);

    fireEvent.press(screen.getByTestId('onboarding-networks-back'));

    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
