/**
 * The grid's whole promise, asserted — per variant.
 *
 * jsdom cannot resolve React Native flex geometry, so a rendered Y is not
 * available here — but it does not need to be. The column is a fixed-height
 * stack: `chrome`, `mark`, `title` and `description` above one flexible
 * `body`, then `assist`, `secondary` and `action` below it. In that stack the
 * Y of every slot above `body` is the sum of the reserved heights before it,
 * and the Y of every slot below `body` is the column height minus the reserved
 * heights after it. So if two screens agree on all eight reserved heights,
 * every slot on them is at the identical Y — which is what these tests check.
 *
 * The invariant is **within a family**. `identity` (welcome, unlock in every
 * state, the password screen, the biometric opt-in, success) draws the mark
 * large and high; `content` (the seed screens, the consent copy, the derived
 * accounts list) hands the middle of the screen to `body`. Unlock is not its
 * own variant: it is the founding case of `identity` — the app's front door,
 * where the mark is the point.
 */
import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { Text, View } from 'react-native';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Reanimated pulls the Worklets native module, which does not exist under
// Jest; the float region only needs a View and the reduce-motion flag.
jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: { View },
    useReducedMotion: () => false,
    withTiming: (toValue: unknown) => toValue,
    Easing: { bezier: () => () => 0 },
  };
});

// The float region re-keys itself on focus; there is no navigator here.
jest.mock('expo-router', () => ({ useFocusEffect: () => {} }));

jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('../../../test-utils/themeTokens'),
}));

const mockKeyboardHeight = jest.fn(() => 0);
jest.mock('../../../hooks/useKeyboardHeight', () => ({
  useKeyboardHeight: () => mockKeyboardHeight(),
}));

import {
  onboardingContentGridFull,
  onboardingIdentityGridFull,
  onboardingLockGridFull,
  semantic,
  spacing,
  type OnboardingVariant,
} from '@salmon/shared';
import { OnboardingLayout } from './OnboardingLayout';
import { ReservedSlot } from './ReservedSlot';

const SLOTS = [
  'chrome',
  'mark',
  'title',
  'description',
  'body',
  'assist',
  'secondary',
  'action',
] as const;

/**
 * The reserved height each slot actually renders at. `title` and `description`
 * are allowed to grow, so they declare a `minHeight`; the rest are fixed.
 */
const reservedHeights = () =>
  Object.fromEntries(
    SLOTS.filter((slot) => screen.queryByTestId(`onboarding-slot-${slot}`)).map((slot) => {
      const style = screen.getByTestId(`onboarding-slot-${slot}`).props.style;
      const flat = (Array.isArray(style) ? style : [style]).filter(Boolean);
      const merged = Object.assign({}, ...flat);
      return [slot, merged.height ?? merged.minHeight];
    })
  );

/** Simulates the column being measured — nothing lays out for real in jsdom. */
const layout = (height: number) =>
  fireEvent(screen.getByTestId('onboarding-column'), 'layout', {
    nativeEvent: { layout: { height, width: 400, x: 0, y: 0 } },
  });

const tableFor = (variant: OnboardingVariant) =>
  variant === 'content' ? onboardingContentGridFull : onboardingIdentityGridFull;

describe('OnboardingLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKeyboardHeight.mockReturnValue(0);
  });

  it.each(['identity', 'content'] as const)(
    '%s: reserves every slot at that variant’s table height',
    (variant) => {
      render(<OnboardingLayout variant={variant} />);
      const grid = tableFor(variant);

      expect(reservedHeights()).toEqual({
        chrome: grid.chrome,
        mark: grid.mark,
        title: grid.title,
        description: grid.description,
        body: grid.body,
        assist: grid.assist,
        secondary: grid.secondary,
        action: grid.action,
      });
    }
  );

  it('defaults to identity, so unlock and welcome need not ask for it', () => {
    render(<OnboardingLayout />);
    expect(reservedHeights().mark).toBe(onboardingIdentityGridFull.mark);
  });

  it.each(['identity', 'content'] as const)(
    '%s: leaves an unused slot empty rather than collapsing it',
    (variant) => {
      // The whole point. A screen with nothing in `assist` and nothing in
      // `secondary` reserves exactly as much as one that fills both, so moving
      // between them cannot move the primary action.
      const bare = render(<OnboardingLayout variant={variant} action={<Text>Go</Text>} />);
      const bareHeights = reservedHeights();
      bare.unmount();

      render(
        <OnboardingLayout
          variant={variant}
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
    }
  );

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

  it('draws the mark far larger on identity than on content', () => {
    // The first pass drew 80 everywhere and it read as a badge floating in a
    // void. On the screens where the mark *is* the screen it is the hero; on
    // the seed screens the words are, and the mark gets out of their way.
    const identity = render(<OnboardingLayout variant="identity" />);
    const identityMark = screen.getByTestId('brand-mark').props.width;
    identity.unmount();

    render(<OnboardingLayout variant="content" />);
    const contentMark = screen.getByTestId('brand-mark').props.width;

    expect(identityMark).toBe(onboardingIdentityGridFull.markSize);
    expect(contentMark).toBe(onboardingContentGridFull.markSize);
    expect(identityMark).toBeGreaterThan(2 * contentMark);
  });

  it('holds the two families’ control bands at one height', () => {
    // Only the mark and the body differ between families, and the difference
    // cancels — so the action, the secondary, the assist band and the chrome
    // land at the same Y on all sixteen screens.
    const identity = render(<OnboardingLayout variant="identity" />);
    const identityHeights = reservedHeights();
    identity.unmount();

    render(<OnboardingLayout variant="content" />);
    const contentHeights = reservedHeights();

    for (const slot of ['chrome', 'title', 'description', 'assist', 'secondary', 'action']) {
      expect(contentHeights[slot]).toBe(identityHeights[slot]);
    }
    expect(contentHeights.mark).toBeLessThan(identityHeights.mark);
    expect(contentHeights.body).toBeGreaterThan(identityHeights.body);
  });

  it('moves nothing when the keyboard is open but covers nothing', () => {
    // The regression this replaces: the mark and the description collapsed
    // whenever the keyboard was merely up, so tapping the seed field pushed
    // the brand mark off the top of a screen the keyboard never reached.
    render(
      <OnboardingLayout
        variant="content"
        title={<Text>Title</Text>}
        body={<Text>Body</Text>}
        action={<Text>Go</Text>}
      />
    );
    // A tall column: the stack ends well above where the keyboard starts.
    layout(onboardingContentGridFull.stack + 400);
    const before = reservedHeights();

    mockKeyboardHeight.mockReturnValue(300);
    layout(onboardingContentGridFull.stack + 400);

    expect(reservedHeights()).toEqual(before);
    expect(screen.getByTestId('onboarding-slot-mark')).toBeTruthy();
    expect(screen.getByTestId('onboarding-slot-description')).toBeTruthy();
  });

  it('never drops copy for a viewport a few points short — only for a keyboard', () => {
    // The iOS regression. An iPhone 17 has ~781pt of layout height once the
    // Dynamic Island and the home indicator are out, against an 817 stack. That
    // 36pt shortfall used to delete the whole description, so the welcome
    // screen read "Salmon" with nothing under it on iOS while Android, with
    // 876dp and no shortfall, showed both lines. `body` absorbs it instead.
    const IPHONE_17 = 781;
    render(
      <OnboardingLayout
        title={<Text>Salmon</Text>}
        description={<Text>Welcome</Text>}
        action={<Text>Go</Text>}
      />
    );
    layout(IPHONE_17);

    expect(screen.getByTestId('onboarding-slot-description')).toBeTruthy();
    expect(screen.getByTestId('onboarding-slot-mark')).toBeTruthy();
    expect(reservedHeights().description).toBe(onboardingIdentityGridFull.description);
  });

  it.each(['identity', 'lock'] as const)(
    '%s: centres the mark band on the middle of the screen',
    (variant) => {
      // The owner's rule for the two doors (2026-08-18): the fish sits at the
      // middle of the SCREEN. The stack fills the column, the computed lead
      // drops the mark band's centre to half the screen height, and the
      // actions anchor at the bottom.
      const TALL = 1200; // roomy enough that the centring lead never clamps
      render(<OnboardingLayout variant={variant} />);
      layout(TALL);

      const grid = variant === 'lock' ? onboardingLockGridFull : onboardingIdentityGridFull;
      const lead = screen.getByTestId('onboarding-lead').props.style.height;
      expect(grid.chrome + lead + grid.mark / 2).toBe(TALL / 2);

      const stackStyle = screen.getByTestId('onboarding-stack').props.style;
      const flat = (Array.isArray(stackStyle) ? stackStyle : [stackStyle]).filter(Boolean);
      const merged = Object.assign({}, ...flat);
      // The stack fills the screen — the actions stay at the bottom.
      expect(merged.height).toBe(TALL);
      expect(merged.marginTop).toBe(0);
    }
  );

  it('welcome and the lock clamp their fish to one Y when the centre does not fit', () => {
    // On a viewport too short to centre the fish above the flowing cluster
    // and the bottom bands, both doors rise together — to `minStack`'s shared
    // ceiling, never each to its own.
    const IPHONE_17 = 781;
    const ceiling = IPHONE_17 - onboardingIdentityGridFull.minStack;

    const leadAt = (variant: 'identity' | 'lock') => {
      const view = render(<OnboardingLayout variant={variant} />);
      layout(IPHONE_17);
      const lead = screen.getByTestId('onboarding-lead').props.style.height;
      view.unmount();
      return lead;
    };

    const identityLead = leadAt('identity');
    expect(identityLead).toBe(ceiling);
    expect(leadAt('lock')).toBe(identityLead);
  });

  it('drops the description first when the keyboard costs a little room', () => {
    // Explanatory, and not what someone is reading while they type. `body`
    // keeps its whole band, so the field and the grid inside it do not move.
    // `credential` — the field family whose stack stays fixed; the hero pair
    // re-centres its fish instead and hands `body` the difference.
    const grid = onboardingIdentityGridFull;
    const view = render(
      <OnboardingLayout variant="credential" title={<Text>Title</Text>} body={<Text>Body</Text>} />
    );
    layout(grid.stack);
    expect(screen.getByTestId('onboarding-slot-description')).toBeTruthy();

    mockKeyboardHeight.mockReturnValue(grid.description - 1);
    view.rerender(
      <OnboardingLayout variant="credential" title={<Text>Title</Text>} body={<Text>Body</Text>} />
    );

    expect(screen.queryByTestId('onboarding-slot-description')).toBeNull();
    expect(screen.getByTestId('onboarding-slot-mark')).toBeTruthy();
    expect(reservedHeights().body).toBe(grid.body);
    // The controls never give: the button that commits the field holds.
    expect(reservedHeights().action).toBe(grid.action);
    expect(reservedHeights().assist).toBe(grid.assist);
  });

  it('keeps the whole twelve-word grid clear of the keyboard', () => {
    // The defect this pins, found on a Pixel 9 Pro: with the keyboard up,
    // `body` had been squeezed to 52dp and the seed grid's fourth row — cells
    // 10 to 12 — sat underneath the keyboard where it could not be reached.
    // Decoration gives way before `body` does.
    const grid = onboardingContentGridFull;
    const COLUMN = 876; // the measured layout height on that device
    const KEYBOARD = 300; // roughly what its IME takes
    const TWELVE_WORD_GRID = 208; // four rows of 52dp, measured on the device

    const view = render(<OnboardingLayout variant="content" body={<Text>Body</Text>} />);
    layout(COLUMN);
    mockKeyboardHeight.mockReturnValue(KEYBOARD);
    view.rerender(<OnboardingLayout variant="content" body={<Text>Body</Text>} />);

    expect(screen.queryByTestId('onboarding-slot-mark')).toBeNull();
    expect(screen.queryByTestId('onboarding-slot-description')).toBeNull();
    expect(reservedHeights().body).toBeGreaterThanOrEqual(TWELVE_WORD_GRID);

    // And the stack gave up exactly what the keyboard took, no more.
    const stackStyle = screen.getByTestId('onboarding-stack').props.style;
    const flat = (Array.isArray(stackStyle) ? stackStyle : [stackStyle]).filter(Boolean);
    expect(Object.assign({}, ...flat).height).toBe(COLUMN - KEYBOARD);
    expect(grid.stack).toBeGreaterThan(COLUMN - KEYBOARD);
  });

  it('paints `background` behind the stack, absolute-fill and untouchable', () => {
    // The lock screen mounts the water column through this prop, exactly as
    // the DOM twin does. It must fill the whole ground — outside the
    // safe-area padding — and never swallow a touch meant for a control.
    render(<OnboardingLayout background={<View testID="water" />} title={<Text>Salmon</Text>} />);

    const host = screen.getByTestId('onboarding-background');
    expect(within(host).getByTestId('water')).toBeTruthy();
    expect(host.props.pointerEvents).toBe('none');
    const flat = (Array.isArray(host.props.style) ? host.props.style : [host.props.style]).filter(
      Boolean
    );
    expect(Object.assign({}, ...flat).position).toBe('absolute');
  });

  it('mounts no background host when none is passed', () => {
    render(<OnboardingLayout />);
    expect(screen.queryByTestId('onboarding-background')).toBeNull();
  });

  it('sits the mark at the bottom of its band, tight to the title', () => {
    // "El icono + salmon deben ir más pegados." The band is the mark plus the
    // gap under it; centring the ink left half that gap above the mark, where
    // it met the title's unused second line.
    render(<OnboardingLayout title={<Text>Salmon</Text>} />);
    const style = screen.getByTestId('onboarding-slot-mark').props.style;
    const flat = (Array.isArray(style) ? style : [style]).filter(Boolean);
    expect(Object.assign({}, ...flat).justifyContent).toBe('flex-end');
  });

  it('draws the mark white, not in the accent', () => {
    // Product owner, 2026-08-18: the mark is white. `text.primary` rather than
    // a literal, so it stays a token and follows the theme — the raster's
    // baked-in white is exactly what going vector removed.
    render(<OnboardingLayout />);
    // react-native-svg serialises a fill to packed ARGB, so compare on that.
    const argb = (hex: string) => (0xff000000 + parseInt(hex.slice(1), 16)) >>> 0;
    const json = JSON.stringify(screen.toJSON());
    expect(json).toContain(String(argb(semantic.text.primary)));
    expect(json).not.toContain(String(argb(semantic.text.accent)));
  });

  it('anchors the title and the description inward, not each to its own centre', () => {
    // Both bands reserve two rendered lines because Spanish expands. On the
    // welcome screen — "Salmon" over "Welcome", one line each — centring each
    // band left 21dp under the title and 24dp over the description, which met
    // as a 45dp hole nobody could justify. The reserved heights are unchanged;
    // the unused line now collects outside the pair.
    render(<OnboardingLayout title={<Text>Salmon</Text>} description={<Text>Welcome</Text>} />);

    const styleOf = (slot: string) => {
      const style = screen.getByTestId(`onboarding-slot-${slot}`).props.style;
      const flat = (Array.isArray(style) ? style : [style]).filter(Boolean);
      return Object.assign({}, ...flat);
    };
    expect(styleOf('title').justifyContent).toBe('flex-end');
    expect(styleOf('description').justifyContent).toBe('flex-start');
    // What is left between them is the gap the title's reservation was derived
    // from in the first place.
    expect(styleOf('title').paddingBottom).toBe(spacing.md);
  });

  it('keeps every slot in place when the float region wraps the content', () => {
    // The sink and the float travels only the region between `chrome` and
    // `action`; grouping the slots must not lose any of them, and the two
    // pieces of furniture stay direct children of the stack — they never
    // travel.
    render(
      <OnboardingLayout
        float
        chrome={<Text>chrome</Text>}
        title={<Text>Title</Text>}
        description={<Text>Description</Text>}
        body={<Text>Body</Text>}
        action={<Text>action</Text>}
      />
    );

    for (const slot of SLOTS) {
      expect(screen.getByTestId(`onboarding-slot-${slot}`)).toBeTruthy();
    }
    const stack = screen.getByTestId('onboarding-stack');
    const directTestIds = (stack.children as Array<{ props?: { testID?: string } }>)
      .map((child) => child?.props?.testID)
      .filter(Boolean);
    expect(directTestIds).toContain('onboarding-slot-chrome');
    expect(directTestIds).toContain('onboarding-slot-action');
    expect(directTestIds).not.toContain('onboarding-slot-title');
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
