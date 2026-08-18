/**
 * The grid's whole promise, asserted.
 *
 * jsdom cannot resolve React Native flex geometry, so a rendered Y is not
 * available here — but it does not need to be. The column is a fixed-height
 * stack: `chrome`, `mark`, `title` and `description` above one flexible
 * `body`, then `assist`, `secondary` and `action` below it. In that stack the
 * Y of every slot above `body` is the sum of the reserved heights before it,
 * and the Y of every slot below `body` is the column height minus the reserved
 * heights after it. So if two screens agree on all seven reserved heights,
 * every slot on them is at the identical Y — which is what these tests check.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Text, View } from 'react-native';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('../../../test-utils/themeTokens'),
}));

const mockKeyboardVisible = jest.fn(() => false);
jest.mock('../../../hooks/useKeyboardHeight', () => ({
  useKeyboardHeight: () => 0,
  useKeyboardVisible: () => mockKeyboardVisible(),
}));

import { onboardingGridFull } from '@salmon/shared';
import { OnboardingLayout } from './OnboardingLayout';
import { ReservedSlot } from './ReservedSlot';

const SLOTS = ['chrome', 'mark', 'title', 'description', 'assist', 'secondary', 'action'] as const;

/**
 * The reserved height each slot actually renders at. `title` and `description`
 * are allowed to grow, so they declare a `minHeight`; the rest are fixed.
 */
const reservedHeights = () =>
  Object.fromEntries(
    SLOTS.map((slot) => {
      const style = screen.getByTestId(`onboarding-slot-${slot}`).props.style;
      const flat = (Array.isArray(style) ? style : [style]).filter(Boolean);
      const merged = Object.assign({}, ...flat);
      return [slot, merged.height ?? merged.minHeight];
    })
  );

describe('OnboardingLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKeyboardVisible.mockReturnValue(false);
  });

  it('reserves every slot at the shared table height', () => {
    render(<OnboardingLayout />);

    expect(reservedHeights()).toEqual({
      chrome: onboardingGridFull.chrome,
      mark: onboardingGridFull.mark,
      title: onboardingGridFull.title,
      description: onboardingGridFull.description,
      assist: onboardingGridFull.assist,
      secondary: onboardingGridFull.secondary,
      action: onboardingGridFull.action,
    });
  });

  it('leaves an unused slot empty rather than collapsing it', () => {
    // The whole point. A screen with nothing in `assist` and nothing in
    // `secondary` reserves exactly as much as one that fills both, so moving
    // between them cannot move the primary action.
    const bare = render(<OnboardingLayout action={<Text>Go</Text>} />);
    const bareHeights = reservedHeights();
    bare.unmount();

    render(
      <OnboardingLayout
        chrome={<Text>back</Text>}
        title={<Text>Title</Text>}
        description={<Text>Description</Text>}
        body={<Text>Body</Text>}
        assist={<Text>What is a derivable?</Text>}
        secondary={<Text>Check derivables</Text>}
        action={<Text>Go</Text>}
      />
    );

    expect(reservedHeights()).toEqual(bareHeights);
  });

  it('does not move a slot when an optional element is revealed', () => {
    // The Success screen's helper, and the recover screen's Next: both arrive
    // after first paint, and neither may shift anything.
    const before = render(
      <OnboardingLayout
        action={
          <ReservedSlot visible={false}>
            <Text>Next</Text>
          </ReservedSlot>
        }
      />
    );
    const beforeHeights = reservedHeights();
    before.unmount();

    render(
      <OnboardingLayout
        assist={<Text>ⓘ What is a derivable?</Text>}
        action={
          <ReservedSlot visible>
            <Text>Next</Text>
          </ReservedSlot>
        }
      />
    );

    expect(reservedHeights()).toEqual(beforeHeights);
  });

  it('draws the larger mark on unlock, inside the same reserved band', () => {
    // Unlock keeps the larger mark — it is the app's front door — so the band
    // is sized by unlock and every other screen's 80 centres inside it. If the
    // band moved with the mark, the mark would jump between the unlock screen
    // and everything that follows it.
    const onboarding = render(<OnboardingLayout />);
    const onboardingBand = reservedHeights().mark;
    const onboardingMark = screen.getByTestId('brand-mark').props.width;
    onboarding.unmount();

    render(<OnboardingLayout variant="unlock" />);

    expect(reservedHeights().mark).toBe(onboardingBand);
    expect(screen.getByTestId('brand-mark').props.width).toBeGreaterThanOrEqual(onboardingMark);
    expect(screen.getByTestId('brand-mark').props.width).toBe(onboardingGridFull.markBox);
  });

  it('collapses only the mark and the description while the keyboard is up', () => {
    mockKeyboardVisible.mockReturnValue(true);
    render(
      <OnboardingLayout
        chrome={<Text>back</Text>}
        title={<Text>Title</Text>}
        body={<Text>Body</Text>}
        action={<Text>Go</Text>}
      />
    );

    // Decorative and explanatory respectively; neither is needed while typing.
    expect(screen.queryByTestId('onboarding-slot-mark')).toBeNull();
    expect(screen.queryByTestId('onboarding-slot-description')).toBeNull();

    // The field being typed into and the button that commits it both hold.
    for (const slot of ['chrome', 'title', 'body', 'assist', 'secondary', 'action']) {
      expect(screen.getByTestId(`onboarding-slot-${slot}`)).toBeTruthy();
    }
  });
});

describe('ReservedSlot', () => {
  it('keeps a hidden control out of the accessibility tree entirely', () => {
    // Reserving space for an absent control must not leave a focusable ghost:
    // a screen reader landing on a button nobody can see is worse than the
    // jump the reservation exists to prevent.
    const hidden = render(
      <ReservedSlot visible={false}>
        <View testID="ghost" />
      </ReservedSlot>
    );
    // Not merely transparent: the query itself walks the accessibility tree,
    // so failing to find it is the assertion.
    expect(screen.queryByTestId('ghost')).toBeNull();
    hidden.unmount();

    render(
      <ReservedSlot visible>
        <View testID="ghost" />
      </ReservedSlot>
    );
    expect(screen.getByTestId('ghost')).toBeTruthy();
  });
});
