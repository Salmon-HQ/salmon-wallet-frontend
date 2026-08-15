/**
 * ActionButtonRow - Row of Send/Receive/Activity action buttons
 *
 * Web version using MUI and @emotion/styled for browser extension.
 * Uses responsive scaling (s, vs, ms) from shared to match mobile proportions.
 */
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import {
  colors,
  spacing,
  borderWidth,
  semantic,
  fontFamily,
  fontSize,
  componentSizes,
  s,
  vs,
  ms,
  fontWeight,
  opacity,
  duration,
  easing,
  palette,
} from '@salmon/shared';
import { BlurContainer } from '../BlurContainer';
import { ScalesBackground } from '../ScalesBackground';
import { SendIcon, ReceiveIcon, ActivityIcon } from '../Icon';
import type { ActionButtonRowProps } from './types';

const Container = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: s(spacing.sm),
  paddingLeft: s(spacing.xl),
  paddingRight: s(spacing.xl),
  paddingTop: vs(spacing.md),
  paddingBottom: vs(spacing.md),
});

const ButtonWrapper = styled(Box)<{ $disabled?: boolean }>(({ $disabled }) => ({
  flex: 1,
  height: vs(componentSizes.actionButtonHeight),
  borderRadius: ms(componentSizes.actionButtonRadius),
  overflow: 'hidden',
  opacity: $disabled ? colors.button.disabledOpacity : 1,
  transition: `opacity ${duration.normal} ${easing.ease}`,
}));

/**
 * Send. The screen's one living thing.
 *
 * The One Living Thing Rule says salmon appears once per screen; it does not
 * say where. It was spent on the active tab underline — the brand's single
 * warm element sitting on "you are on Home" while the action that moves money
 * looked identical to the two beside it. It is spent here now: a `accent.fill`
 * pill with `accent.onFill` ink at 6.50:1 — never white, which is 3.06:1 and
 * banned — and the scales at their true 1.0x scale pressed into the fill, the
 * same body the `PrimaryButton` has. The tab underline went neutral in return.
 */
const PrimaryButton = styled(Button)({
  position: 'relative',
  overflow: 'hidden',
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: s(spacing.sm),
  backgroundColor: semantic.accent.fill,
  border: `${borderWidth.thin}px solid ${semantic.accent.fill}`,
  borderRadius: ms(componentSizes.actionButtonRadius),
  textTransform: 'none',
  minWidth: 0,
  padding: 0,
  '&:hover': {
    backgroundColor: palette.salmon[600],
    borderColor: palette.salmon[600],
  },
  // Disabled is `surface.crest` with disabled ink: the salmon never dims,
  // it is either alive or absent — and so is the fish inside it.
  '&.Mui-disabled': {
    backgroundColor: semantic.surface.crest,
    borderColor: semantic.border.raised,
    color: semantic.text.disabled,
  },
});

const SecondaryButton = styled(Button)({
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: s(spacing.sm),
  backgroundColor: 'transparent',
  border: 'none',
  borderRadius: ms(componentSizes.actionButtonRadius),
  textTransform: 'none',
  minWidth: 0,
  padding: 0,
  '&:hover': {
    backgroundColor: 'transparent',
    opacity: opacity.high,
  },
  '&.Mui-disabled': {
    backgroundColor: 'transparent',
  },
});

const ButtonText = styled(Typography)<{ $disabled?: boolean }>(({ $disabled }) => ({
  fontSize: ms(fontSize.actionButton),
  fontWeight: fontWeight.regular,
  fontFamily: fontFamily.sans,
  color: $disabled ? colors.button.disabledText : colors.text.balance,
}));

/** Sits above the fish, never under it. Decoration is never a hit target. */
const OnFillContent = styled(Box)({
  position: 'relative',
  zIndex: 1,
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: s(spacing.sm),
});

export function ActionButtonRow({
  onSendPress,
  onReceivePress,
  onActivityPress,
  sendDisabled = false,
  receiveDisabled = false,
  activityDisabled = false,
  style,
  className,
}: ActionButtonRowProps) {
  const { t } = useTranslation();

  const handleSendPress = useCallback(() => {
    if (!sendDisabled) {
      onSendPress?.();
    }
  }, [onSendPress, sendDisabled]);

  const handleReceivePress = useCallback(() => {
    if (!receiveDisabled) {
      onReceivePress?.();
    }
  }, [onReceivePress, receiveDisabled]);

  const handleActivityPress = useCallback(() => {
    if (!activityDisabled) {
      onActivityPress?.();
    }
  }, [onActivityPress, activityDisabled]);

  const iconSize = ms(componentSizes.actionButtonIcon);

  return (
    <Container style={style} className={className}>
      {/* Send Button - Primary */}
      <ButtonWrapper $disabled={sendDisabled}>
        <PrimaryButton
          onClick={handleSendPress}
          disabled={sendDisabled}
          aria-label={t('accessibility.send_tokens', 'Send tokens')}
          data-testid="home-send-button"
        >
          {/* The fish: the scales at 1.0x, pressed into the salmon fill and
              nowhere else on this screen. Absent when the fill is absent. */}
          {!sendDisabled && <ScalesBackground variant="fish" />}
          <OnFillContent>
            <SendIcon
              sx={{
                fontSize: iconSize,
                color: sendDisabled ? semantic.text.disabled : semantic.accent.onFill,
              }}
            />
            <ButtonText
              sx={{ color: sendDisabled ? semantic.text.disabled : semantic.accent.onFill }}
            >
              {t('actions.send', 'Send')}
            </ButtonText>
          </OnFillContent>
        </PrimaryButton>
      </ButtonWrapper>

      {/* Receive Button - Secondary with BlurContainer */}
      <ButtonWrapper $disabled={receiveDisabled}>
        <BlurContainer
          borderColor={semantic.border.raised}
          borderWidth={borderWidth.actionButton}
          style={{ borderRadius: ms(componentSizes.actionButtonRadius), height: '100%' }}
        >
          <SecondaryButton
            onClick={handleReceivePress}
            disabled={receiveDisabled}
            aria-label={t('accessibility.receive_tokens', 'Receive tokens')}
            data-testid="home-receive-button"
          >
            <ReceiveIcon
              sx={{
                fontSize: iconSize,
                color: receiveDisabled ? colors.button.disabledText : colors.text.balance,
              }}
            />
            <ButtonText $disabled={receiveDisabled}>{t('actions.receive', 'Receive')}</ButtonText>
          </SecondaryButton>
        </BlurContainer>
      </ButtonWrapper>

      {/* Activity Button - Secondary with BlurContainer */}
      <ButtonWrapper $disabled={activityDisabled}>
        <BlurContainer
          borderColor={semantic.border.raised}
          borderWidth={borderWidth.actionButton}
          style={{ borderRadius: ms(componentSizes.actionButtonRadius), height: '100%' }}
        >
          <SecondaryButton
            onClick={handleActivityPress}
            disabled={activityDisabled}
            aria-label={t('accessibility.view_activity', 'View activity')}
            data-testid="home-activity-button"
          >
            <ActivityIcon
              sx={{
                fontSize: iconSize,
                color: activityDisabled ? colors.button.disabledText : colors.text.balance,
              }}
            />
            <ButtonText $disabled={activityDisabled}>
              {t('actions.activity', 'Activity')}
            </ButtonText>
          </SecondaryButton>
        </BlurContainer>
      </ButtonWrapper>
    </Container>
  );
}
