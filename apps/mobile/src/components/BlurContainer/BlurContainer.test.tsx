import React from 'react';
import { render } from '@testing-library/react-native';
import { Platform } from 'react-native';
import type { View } from 'react-native';

const mockBlurView = jest.fn(({ children }: { children?: React.ReactNode }) => <>{children}</>);
const mockUseBlurTarget = jest.fn();

jest.mock('@salmon/shared', () => ({
  semantic: {
    // Opaque, as the shipped token is: a list row is content, and DESIGN.md
    // gives translucency only to floating chrome.
    surface: { raised: '#161C2D' },
    border: { default: '#404962' },
  },
  isOpaqueColor: (color: string) => color.startsWith('#'),
}));

jest.mock('expo-blur', () => ({
  BlurView: (props: { children?: React.ReactNode }) => mockBlurView(props),
}));

jest.mock('./BlurTargetContext', () => ({
  useBlurTarget: () => mockUseBlurTarget(),
}));

import { BlurContainer } from './BlurContainer';

describe('BlurContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseBlurTarget.mockReturnValue({ current: {} as View });
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => 'android',
    });
  });

  it('spends no blur on an opaque fill', () => {
    // A backdrop blur behind an opaque surface samples pixels nobody sees and
    // still costs a surface per row on Android.
    render(
      <BlurContainer style={{ borderRadius: 12 }}>
        <>child</>
      </BlurContainer>
    );

    expect(mockBlurView).not.toHaveBeenCalled();
  });

  it('uses BlurView with the Android blur target when the fill is translucent', () => {
    render(
      <BlurContainer style={{ borderRadius: 12 }} backgroundColor="rgba(11, 15, 25, 0.62)">
        <>child</>
      </BlurContainer>
    );

    expect(mockBlurView).toHaveBeenCalledTimes(1);
    expect(mockBlurView.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        blurTarget: expect.objectContaining({ current: expect.any(Object) }),
        blurMethod: 'dimezisBlurView',
        blurReductionFactor: 1,
        intensity: 4,
        tint: 'dark',
        pointerEvents: 'none',
        style: expect.any(Array),
      })
    );
  });
});
