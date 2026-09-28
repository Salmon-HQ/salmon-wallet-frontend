import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key }),
}));

// The @salmon/shared barrel drags the ESM-only @solana/kit into Jest; the
// theme modules the screen draws from are runtime-agnostic, so they are
// loaded directly (the PowerupsFab test's convention).
jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('@salmon/shared/src/theme/spacing'),
  ...jest.requireActual('@salmon/shared/src/theme/shadows'),
  ...jest.requireActual('@salmon/shared/src/theme/flesh'),
  ...jest.requireActual('@salmon/shared/src/theme/typography'),
  ...jest.requireActual('@salmon/shared/src/theme/durations'),
  ...jest.requireActual('@salmon/shared/src/theme/brand'),
  semantic: jest.requireActual('@salmon/shared/src/theme/semantic').semantic,
  s: (value: number) => value,
  vs: (value: number) => value,
  ms: (value: number) => value,
}));

jest.mock('../../theme/useThemedStyles', () => ({
  useThemedStyles: (stylesFor: (t: unknown) => unknown) =>
    stylesFor(jest.requireActual('@salmon/shared/src/theme/semantic').createSemantic('dark')),
}));

jest.mock('../Button', () => {
  const ReactActual = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    PrimaryButton: ({
      children,
      onPress,
      testID,
    }: {
      children: string;
      onPress: () => void;
      testID: string;
    }) =>
      ReactActual.createElement(
        Pressable,
        { onPress, testID },
        ReactActual.createElement(Text, null, children)
      ),
  };
});

import { UpdateRequiredScreen } from './UpdateRequiredScreen';

describe('UpdateRequiredScreen', () => {
  it('says the build is unsupported and that the funds are safe', () => {
    const { getByTestId, getByText } = render(<UpdateRequiredScreen onOpenStore={jest.fn()} />);

    expect(getByTestId('update-required')).toBeTruthy();
    expect(getByText('Update Salmon to continue')).toBeTruthy();
    expect(getByText(/Your accounts and funds are safe/)).toBeTruthy();
  });

  it('offers the store as the one way out', () => {
    const onOpenStore = jest.fn();
    const { getByTestId } = render(<UpdateRequiredScreen onOpenStore={onOpenStore} />);

    fireEvent.press(getByTestId('update-required-open-store'));

    expect(onOpenStore).toHaveBeenCalledTimes(1);
  });
});
