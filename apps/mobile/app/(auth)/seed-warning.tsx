/**
 * SeedWarningScreen — the recovery-phrase consequences, as a step of its own.
 *
 * This copy used to be the first step *inside* the create screen, sharing a
 * route with the phrase it warns about. The product owner's reasoning for
 * pulling it out: "psicológicamente, si muestro una pantalla para esto doy a
 * entender que es importante." A warning that shares a screen with the thing
 * it warns about reads as boilerplate; a warning that costs its own step reads
 * as a gate.
 *
 * So the copy is not shortened — the loss and theft consequences stand intact
 * — and it is not squeezed alongside anything. It gets `body`, which is the
 * flexible slot and the only one that scrolls, and the create flow gains a
 * step: warning, phrase, confirm, password.
 *
 * It must not be skippable by reflex, so the action stays disabled until the
 * warning has actually been scrolled to its end. Advancing costs a deliberate
 * act rather than a thumb landing on a button that was already under it.
 */

import {
  componentSizes,
  fontFamilyNative,
  fontScaleCap,
  fontSize,
  lineHeight,
  s,
  type Semantic,
} from '@salmon/shared';
import { WarningIcon } from '../../src/icons';
import {
  OnboardingLayout,
  OnboardingTitle,
  PrimaryButton,
  ScreenHeader,
} from '../../src/components';
import { useSemantic, useThemedStyles } from '../../src/theme/useThemedStyles';
import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ScrollView,
  StyleSheet,
  Text,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

/** Slop, in px, so a scroll that stops a hair short of the end still counts. */
const END_SLOP = 8;

export default function SeedWarningScreen() {
  const { t } = useTranslation();
  const styles = useThemedStyles(stylesFor);
  const semantic = useSemantic();
  const [read, setRead] = useState(false);
  const viewportHeight = useRef(0);
  const contentHeight = useRef(0);

  /** Copy that fits without scrolling has already been shown in full. */
  const settleIfWholeCopyVisible = useCallback(() => {
    if (viewportHeight.current === 0 || contentHeight.current === 0) return;
    if (contentHeight.current <= viewportHeight.current + END_SLOP) setRead(true);
  }, []);

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      viewportHeight.current = event.nativeEvent.layout.height;
      settleIfWholeCopyVisible();
    },
    [settleIfWholeCopyVisible]
  );

  const handleContentSize = useCallback(
    (_width: number, height: number) => {
      contentHeight.current = height;
      settleIfWholeCopyVisible();
    },
    [settleIfWholeCopyVisible]
  );

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    if (contentOffset.y + layoutMeasurement.height >= contentSize.height - END_SLOP) setRead(true);
  }, []);

  return (
    <OnboardingLayout
      testID="seed-warning-screen"
      variant="content"
      /*
        Bedrock: the narrowed Bedrock Rule (owner, 2026-08-18) keeps the whole
        seed EXHIBITION — this warning, the display, the validation — on the
        opaque ground, matching the DOM twin, which already painted this step
        bedrock. Only recover (seed ENTRY) left the rule.
      */
      backgroundColor={semantic.surface.bedrock}
      float
      chrome={
        <ScreenHeader onBack={router.back} stepIndicator={{ totalSteps: 4, currentStep: 1 }} />
      }
      /*
        The warning glyph, in the mark slot the fish used to hold — the fish
        stays on welcome and the lock only. The gate names itself: this step
        exists to be read as a warning, so it wears one.
      */
      mark={<WarningIcon size={componentSizes.logoSizeSmall} color={semantic.text.primary} />}
      title={<OnboardingTitle>{t('wallet.create.messageTitle')}</OnboardingTitle>}
      body={
        <ScrollView
          onLayout={handleLayout}
          onContentSizeChange={handleContentSize}
          onScroll={handleScroll}
          scrollEventThrottle={64}
          showsVerticalScrollIndicator
          contentContainerStyle={styles.bodyContent}
        >
          <Text style={styles.body} maxFontSizeMultiplier={fontScaleCap.chrome}>
            {t('wallet.create.messageBody')}
          </Text>
        </ScrollView>
      }
      action={
        <PrimaryButton
          onPress={() => router.push('/(auth)/create')}
          disabled={!read}
          testID="seed-warning-continue-button"
        >
          {t('actions.start')}
        </PrimaryButton>
      }
    />
  );
}

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    bodyContent: {
      flexGrow: 1,
      justifyContent: 'center',
    },
    body: {
      color: t.text.secondary,
      fontFamily: fontFamilyNative.regular,
      fontSize: s(fontSize.bodyLg),
      lineHeight: fontSize.bodyLg * lineHeight.normal,
      textAlign: 'center',
    },
  });
