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
} from '@salmon/shared';
import { BlurContainer } from '../BlurContainer';
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
 * Send. Neutral on purpose.
 *
 * The One Living Thing Rule: salmon appears once per screen, and on the home
 * screen it is spent on the active tab item — which is exactly why the action
 * pills are neutral. This one used to be a salmon-to-oxblood gradient with a
 * white label, so the home screen shipped three competing salmon objects and
 * a 3.06:1 label on the loudest of them.
 */
const PrimaryButton = styled(Button)({
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: s(spacing.sm),
  backgroundColor: semantic.surface.raised,
  border: `${borderWidth.thin}px solid ${semantic.border.raised}`,
  borderRadius: ms(componentSizes.actionButtonRadius),
  textTransform: 'none',
  minWidth: 0,
  padding: 0,
  '&:hover': {
    backgroundColor: semantic.surface.crest,
    borderColor: semantic.border.strong,
  },
  '&.Mui-disabled': {
    backgroundColor: semantic.surface.raised,
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
          <SendIcon sx={{ fontSize: iconSize, color: colors.text.balance }} />
          <ButtonText>{t('actions.send', 'Send')}</ButtonText>
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
