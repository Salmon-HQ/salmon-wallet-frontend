/**
 * ScreenHeader - Common header for onboarding/auth screens
 *
 * Includes back button, optional step indicator, an optional title/subtitle
 * block, and a spacer for alignment.
 *
 * The leading affordance is an `IconBubble`: a bare glyph floating in the
 * corner gave the eye no target, and the redesign draws every affordance as a
 * well the glyph sits inside.
 */
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CaretLeftIcon, XIcon } from '../../icons';
import {
  colors,
  componentSizes,
  contentPadding,
  fontFamilyNative,
  fontSize,
  letterSpacing,
  lineHeight,
  s,
  semantic,
  spacing,
  vs,
} from '@salmon/shared';
import type { Testable } from '@salmon/shared';
import { StepIndicator } from '../StepIndicator';
import { IconBubble } from '../IconBubble';

/** The affordance's well — the redesign's 38pt surface circle. */
const BACK_BUBBLE_SIZE = 38;

export interface ScreenHeaderProps extends Testable {
  /** Callback when back button is pressed */
  onBack?: () => void;
  /**
   * Glyph for the leading affordance. `close` for screens the affordance
   * exits rather than backs out of — declining advances, so a back chevron
   * would describe the wrong direction.
   */
  glyph?: 'back' | 'close';
  /** Accessible name for the affordance. Defaults to "Go back". */
  backLabel?: string;
  /** Show step indicator */
  stepIndicator?: {
    totalSteps: number;
    currentStep: number;
  };
  /** Disable back button */
  backDisabled?: boolean;
  /** Screen title, rendered below the affordance row. */
  title?: string;
  /** Supporting line under the title. Only meaningful alongside `title`. */
  subtitle?: string;
}

export function ScreenHeader({
  onBack,
  glyph = 'back',
  backLabel,
  stepIndicator,
  backDisabled,
  title,
  subtitle,
  testID,
}: ScreenHeaderProps) {
  const { t } = useTranslation();
  const Glyph = glyph === 'close' ? XIcon : CaretLeftIcon;
  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        {/* Leading affordance: back, or close where declining advances */}
        <TouchableOpacity
          testID={testID ?? 'screen-header-back-button'}
          accessibilityRole="button"
          accessibilityLabel={backLabel ?? t('accessibility.go_back', 'Go back')}
          accessibilityState={{ disabled: !onBack || !!backDisabled }}
          onPress={onBack}
          disabled={!onBack || backDisabled}
          style={styles.backButton}
          // 38pt visual box + 3pt slop per side = the 44pt minimum target
          // (DESIGN.md: hit-slop, never inflated visual size).
          hitSlop={{ top: 3, bottom: 3, left: 3, right: 3 }}
        >
          {onBack && (
            <IconBubble
              size={BACK_BUBBLE_SIZE}
              shape="circle"
              tone="surface"
              icon={Glyph}
              iconSize={componentSizes.iconSizeSmall}
              style={backDisabled ? styles.backDisabled : undefined}
            />
          )}
        </TouchableOpacity>

        {/* Step indicator (centered) */}
        <View style={styles.center}>
          {stepIndicator && (
            <StepIndicator
              totalSteps={stepIndicator.totalSteps}
              currentStep={stepIndicator.currentStep}
            />
          )}
        </View>

        {/* Spacer for alignment */}
        <View style={styles.spacer} />
      </View>

      {title ? (
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: contentPadding.screen,
    height: componentSizes.headerHeight,
  },
  backButton: {
    width: s(BACK_BUBBLE_SIZE),
    height: s(BACK_BUBBLE_SIZE),
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  // The glyph dims; the well stays, so the target never moves or disappears.
  backDisabled: {
    opacity: colors.button.disabledOpacity,
  },
  center: {
    flex: 1,
    alignItems: 'center',
  },
  spacer: {
    width: s(BACK_BUBBLE_SIZE),
  },
  titleBlock: {
    paddingHorizontal: contentPadding.screen,
    paddingTop: vs(spacing.sm),
    gap: vs(spacing.xs),
  },
  title: {
    fontFamily: fontFamilyNative.bold,
    fontSize: s(fontSize.title),
    lineHeight: s(fontSize.title) * lineHeight.tight,
    letterSpacing: letterSpacing.snug,
    color: semantic.text.primary,
  },
  subtitle: {
    fontFamily: fontFamilyNative.medium,
    fontSize: s(fontSize.caption),
    lineHeight: s(fontSize.caption) * lineHeight.snug,
    color: semantic.text.secondary,
  },
});
