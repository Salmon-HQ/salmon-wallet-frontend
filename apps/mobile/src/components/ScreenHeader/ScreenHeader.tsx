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
import type { ReactNode } from 'react';
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
  /**
   * A mark drawn immediately before the title — the Powerups lightning. Only
   * meaningful alongside `title`.
   */
  titleGlyph?: ReactNode;
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
  titleGlyph,
  subtitle,
  testID,
}: ScreenHeaderProps) {
  const { t } = useTranslation();
  const Glyph = glyph === 'close' ? XIcon : CaretLeftIcon;
  // The `.pen`'s "Receive header", shared by CORE 03/04/05/10 and every
  // settings sub-screen: the back well and the title on ONE row, the subtitle
  // on its own line under it. A title stacked below the well left a 56pt band
  // of nothing across the top of every pushed screen.
  if (title) {
    return (
      <View style={styles.titledWrapper}>
        <View style={styles.titledRow} testID="screen-header-title-row">
          {/* No `onBack` ⇒ no well at all. An empty touch target still spent
              the row's gap, so a screen that cannot be backed out of (the
              powerups browse screen, dismissed by its own FAB) started with a
              12pt indent nothing explained. */}
          {onBack && (
            <TouchableOpacity
              testID={testID ?? 'screen-header-back-button'}
              accessibilityRole="button"
              accessibilityLabel={backLabel ?? t('accessibility.go_back', 'Go back')}
              accessibilityState={{ disabled: !!backDisabled }}
              onPress={onBack}
              disabled={backDisabled}
              // 38pt visual box + 3pt slop per side = the 44pt minimum target.
              hitSlop={{ top: 3, bottom: 3, left: 3, right: 3 }}
            >
              <IconBubble
                size={BACK_BUBBLE_SIZE}
                shape="circle"
                tone="surface"
                icon={Glyph}
                iconSize={componentSizes.iconSizeSmall}
                style={backDisabled ? styles.backDisabled : undefined}
              />
            </TouchableOpacity>
          )}
          {titleGlyph}
          <View style={styles.titleBox} testID="screen-header-title-box">
            <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
              {title}
            </Text>
          </View>
        </View>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    );
  }

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
  // `.pen` CORE 04 "Send header": `screenTop` under the safe area, the
  // screen gutter at the sides, 20 of air before the content starts, and a
  // vertical stack with gap 12 between the navigation row and the subtitle.
  titledWrapper: {
    width: '100%',
    paddingTop: vs(spacing.screenTop),
    paddingBottom: vs(spacing.xl),
    paddingHorizontal: s(spacing.screenGutter),
    gap: vs(spacing.md),
  },
  // `.pen` "Send navigation": row, gap 12, `alignItems: center` — the row's
  // cross-axis centre does the centring, not the title's baseline.
  titledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(spacing.md),
  },
  // The headline role (DESIGN.md §Hierarchy): 24/700; the subtitle steps
  // with it to 14/500.
  //
  // Centring: the mock ("Send navigation", CORE 04) gives the title a text
  // box exactly as tall as the back well (38) with the glyphs centred inside
  // it. That is what `titleBox` reproduces — a well-height container that
  // centres the Text — so iOS and Android land identically, with no
  // font-metric nudges. The Text keeps its natural line box.
  titleBox: {
    flexShrink: 1,
    height: BACK_BUBBLE_SIZE,
    justifyContent: 'center',
  },
  title: {
    fontFamily: fontFamilyNative.bold,
    fontSize: s(fontSize.headline),
    letterSpacing: letterSpacing.snug,
    color: semantic.text.primary,
    includeFontPadding: false,
  },
  subtitle: {
    fontFamily: fontFamilyNative.medium,
    fontSize: s(fontSize.body),
    lineHeight: s(fontSize.body) * lineHeight.snug,
    color: semantic.text.secondary,
  },
});
