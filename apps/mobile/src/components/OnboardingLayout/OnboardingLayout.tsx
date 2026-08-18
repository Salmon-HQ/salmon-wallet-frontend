/**
 * OnboardingLayout — the React Native half of the onboarding slot grid.
 *
 * Every screen in the create, recover and unlock flows composes on this. The
 * reserved heights come from `resolveOnboardingGrid` in `@salmon/shared`, so
 * mobile and the DOM read one table instead of each re-deriving spacing per
 * screen. Nothing here decides a number.
 *
 * Two rules do all the work:
 *
 * 1. **Every slot but `body` occupies its reserved height whether or not it is
 *    filled.** A screen that has no secondary action still leaves the band. So
 *    arriving at the screen that carries "What is a derivable?" reveals the
 *    link in space that was always there, and the button does not move.
 * 2. **`body` is the give.** It is the only flexible slot, and the only one
 *    permitted to scroll. When a title wraps to a third line or a translation
 *    runs long, `body` shrinks to pay for it — the action, pinned at the
 *    bottom of a fixed-height column, cannot move.
 *
 * While the keyboard is open the mark and the description collapse to zero.
 * They are decorative and explanatory respectively, and neither is needed
 * while typing; the field and the button that commits it both stay visible.
 * That is the only sanctioned slot movement in the design, it is symmetric on
 * dismissal, and it is driven by one shared signal rather than per screen.
 */
import { resolveOnboardingGrid, spacing, contentPadding } from '@salmon/shared';
import type { OnboardingLayoutPropsBase } from '@salmon/shared';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useKeyboardVisible } from '../../../hooks/useKeyboardHeight';
import { BrandMark } from '../BrandMark';

export interface OnboardingLayoutProps extends OnboardingLayoutPropsBase {
  /**
   * Painted behind the whole column. The seed screens pass
   * `semantic.surface.bedrock` — the Bedrock Rule allows no motif behind a
   * recovery phrase — and everything else leaves the water column showing.
   */
  backgroundColor?: string;
}

export function OnboardingLayout({
  chrome,
  mark,
  title,
  description,
  body,
  assist,
  secondary,
  action,
  variant = 'onboarding',
  scrollBody = false,
  backgroundColor,
  testID,
}: OnboardingLayoutProps) {
  // Measured rather than read off `Dimensions`: the grid has to react to the
  // height the column actually gets, insets and all, and `Dimensions` is the
  // window. Undefined until first layout, which resolves to the full grid —
  // safe, because the compact grid only ever reserves less.
  const [available, setAvailable] = useState<number | undefined>(undefined);
  const grid = resolveOnboardingGrid(available);
  const keyboardVisible = useKeyboardVisible();

  const onLayout = (event: LayoutChangeEvent) => {
    const height = event.nativeEvent.layout.height;
    if (height > 0) setAvailable(height);
  };

  const markSize = variant === 'unlock' ? grid.markBox : grid.markSize;

  const bodyContent = scrollBody ? (
    <ScrollView
      contentContainerStyle={styles.bodyScrollContent}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
    >
      {body}
    </ScrollView>
  ) : (
    body
  );

  return (
    <SafeAreaView
      style={[styles.safeArea, backgroundColor ? { backgroundColor } : null]}
      edges={['top', 'bottom']}
      testID={testID}
    >
      {/*
        iOS floats the keyboard over the app, so the column has to be told to
        shorten; Android declares `windowSoftInputMode="adjustResize"`, so the
        window already shrinks and a second correction would double-count it.
        Either way the column keeps its own height, `body` absorbs the loss and
        the action stays pinned to the bottom of what is left.
      */}
      <KeyboardAvoidingView
        style={styles.column}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        onLayout={onLayout}
      >
        <View style={[styles.slot, { height: grid.chrome }]} testID="onboarding-slot-chrome">
          {chrome}
        </View>

        {!keyboardVisible && (
          <View style={[styles.centered, { height: grid.mark }]} testID="onboarding-slot-mark">
            {mark ?? <BrandMark size={markSize} />}
          </View>
        )}

        <View style={[styles.padded, { minHeight: grid.title }]} testID="onboarding-slot-title">
          {title}
        </View>

        {!keyboardVisible && (
          <View
            style={[styles.padded, { minHeight: grid.description }]}
            testID="onboarding-slot-description"
          >
            {description}
          </View>
        )}

        <View style={styles.body} testID="onboarding-slot-body">
          {bodyContent}
        </View>

        <View style={[styles.padded, { height: grid.assist }]} testID="onboarding-slot-assist">
          {assist}
        </View>

        <View
          style={[styles.padded, { height: grid.secondary }]}
          testID="onboarding-slot-secondary"
        >
          {secondary}
        </View>

        <View style={[styles.action, { height: grid.action }]} testID="onboarding-slot-action">
          {action}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  column: {
    flex: 1,
  },
  slot: {
    justifyContent: 'center',
  },
  /**
   * The mark centres inside its band rather than shrinking it. That is what
   * lets unlock keep the larger mark without every other screen's smaller
   * mark landing at a different Y.
   */
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  padded: {
    paddingHorizontal: contentPadding.screen,
    justifyContent: 'center',
  },
  /**
   * `minHeight: 0` is what makes `body` the give: without it a tall child
   * would push the column past its own height and take the action off the
   * bottom of the screen.
   */
  body: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: contentPadding.screen,
  },
  bodyScrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.sm,
  },
  action: {
    paddingHorizontal: contentPadding.screen,
    paddingTop: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
});
