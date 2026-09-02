/**
 * ScreenHeader — the header every onboarding/auth screen and pushed settings
 * screen composes, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/ScreenHeader/ScreenHeader.tsx`.
 * Two anatomies, same as mobile:
 * - **Titled**: the back well (an `IconBubble`) and the title share ONE row,
 *   the subtitle on its own line under it. No `onBack` means no well at all —
 *   an empty touch target still spent the row's gap for nothing.
 * - **Untitled**: the back well, a centred `StepIndicator`, and a trailing
 *   spacer of the same width, so the indicator sits on the row's true centre
 *   whether or not a back well is drawn.
 *
 * Only the drawing differs from mobile: the leading affordance is the DOM
 * `IconBubble` itself acting as the pressable (it already renders a real
 * `<button>` when given `onPress`), rather than mobile's `TouchableOpacity`
 * wrapping a decorative `IconBubble` — nesting a `<button>` inside a
 * `<button>` is invalid HTML, and `IconBubble`'s own disabled tone already
 * draws "disabled is a different object", the same DESIGN.md rule mobile's
 * manual opacity dimming was reaching for.
 */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  componentSizes,
  contentPadding,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  lineHeight,
  spacing,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { CaretLeftIcon, XIcon } from '../../icons';
import { StepIndicator } from '../StepIndicator';
import { IconBubble } from '../IconBubble';
import type { ScreenHeaderProps } from './types';

/** The affordance's well — the redesign's 38pt surface circle, mobile's own constant. */
const BACK_BUBBLE_SIZE = 38;

export function ScreenHeader({
  onBack,
  glyph = 'back',
  backLabel,
  stepIndicator,
  backDisabled,
  title,
  titleGlyph,
  subtitle,
  style,
  className,
  testID,
}: ScreenHeaderProps) {
  const { t } = useTranslation();
  const tokens = useSemantic();
  const Glyph = glyph === 'close' ? XIcon : CaretLeftIcon;
  const accessibilityLabel = backLabel ?? t('accessibility.go_back', 'Go back');

  // `.pen` CORE 04 "Send header": the back well and the title on ONE row,
  // the subtitle on its own line under it.
  if (title) {
    return (
      <div
        data-testid={testID}
        className={className}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          // The panel's inset stands in for mobile's safe area (spacing.ts).
          paddingTop: spacing.panelTop + spacing.screenTop,
          paddingBottom: spacing.xl,
          paddingLeft: spacing.screenGutter,
          paddingRight: spacing.screenGutter,
          display: 'flex',
          flexDirection: 'column',
          gap: spacing.md,
          ...style,
        }}
      >
        <div
          data-testid="screen-header-title-row"
          style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
        >
          {onBack && (
            <IconBubble
              testID="screen-header-back-button"
              size={BACK_BUBBLE_SIZE}
              shape="circle"
              tone="surface"
              icon={Glyph}
              iconSize={componentSizes.iconSizeSmall}
              onPress={onBack}
              disabled={backDisabled}
              accessibilityLabel={accessibilityLabel}
            />
          )}
          {titleGlyph as ReactNode}
          <div
            data-testid="screen-header-title-box"
            style={{
              flexShrink: 1,
              height: BACK_BUBBLE_SIZE,
              display: 'flex',
              alignItems: 'center',
              overflow: 'hidden',
            }}
          >
            <h1
              style={{
                margin: 0,
                fontFamily: fontFamily.sans,
                fontWeight: fontWeight.bold,
                fontSize: fontSize.headline,
                letterSpacing: letterSpacing.snug,
                color: tokens.text.primary,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {title}
            </h1>
          </div>
        </div>
        {subtitle ? (
          <p
            style={{
              margin: 0,
              fontFamily: fontFamily.sans,
              fontWeight: fontWeight.medium,
              fontSize: fontSize.body,
              lineHeight: `${fontSize.body * lineHeight.snug}px`,
              color: tokens.text.secondary,
            }}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div
      data-testid={testID}
      className={className}
      style={{
        width: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: contentPadding.screen,
        paddingRight: contentPadding.screen,
        height: componentSizes.headerHeight,
        ...style,
      }}
    >
      <div
        style={{
          width: BACK_BUBBLE_SIZE,
          height: BACK_BUBBLE_SIZE,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
        }}
      >
        {onBack && (
          <IconBubble
            testID="screen-header-back-button"
            size={BACK_BUBBLE_SIZE}
            shape="circle"
            tone="surface"
            icon={Glyph}
            iconSize={componentSizes.iconSizeSmall}
            onPress={onBack}
            disabled={backDisabled}
            accessibilityLabel={accessibilityLabel}
          />
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {stepIndicator && (
          <StepIndicator
            totalSteps={stepIndicator.totalSteps}
            currentStep={stepIndicator.currentStep}
          />
        )}
      </div>

      <div style={{ width: BACK_BUBBLE_SIZE }} />
    </div>
  );
}
