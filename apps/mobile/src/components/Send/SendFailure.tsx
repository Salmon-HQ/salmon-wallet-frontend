/**
 * The send failure, reported on the task surface the passage already owns.
 *
 * A failed transfer does not rewind the passage. The sheet has already ebbed
 * and the home has already sunk behind it (DESIGN.md §The sink and the float),
 * and unwinding all of that only to wind it up again on the next attempt is
 * what read as the UI breaking on a flaky network. So the screen the wait was
 * standing on stays, and this is what stands on it instead: what went wrong,
 * the action that tries again without leaving, and the one gesture out.
 *
 * The wave cuts rather than ebbing — DESIGN.md §The wait says a failure is the
 * exception where "nothing surfaces" — and this report floats up into the
 * space it left, the verb's arriving half.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fontFamilyNative, fontSize, ms, s, spacing, vs, type Semantic } from '@salmon/shared';

import { useThemedStyles } from '../../theme/useThemedStyles';
import { PrimaryButton, SecondaryButton } from '../Button';
import type { SendFailureProps } from './types';

export type { SendFailureProps };

export const SendFailure: React.FC<SendFailureProps> = ({
  title,
  message,
  onRetry,
  onDismiss,
  retryLabel,
  dismissLabel,
  bottomInset,
}) => {
  const styles = useThemedStyles(stylesFor);

  return (
    <View style={styles.container} testID="send-failure">
      <View style={styles.report}>
        <Text style={styles.title} testID="send-failure-title">
          {title}
        </Text>
        <Text style={styles.message} testID="send-failure-message">
          {message}
        </Text>
      </View>

      <View style={[styles.actions, { paddingBottom: bottomInset + vs(spacing.xl) }]}>
        <PrimaryButton testID="send-failure-retry" onPress={onRetry}>
          {retryLabel}
        </PrimaryButton>
        <SecondaryButton testID="send-failure-dismiss" onPress={onDismiss}>
          {dismissLabel}
        </SecondaryButton>
      </View>
    </View>
  );
};

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'space-between',
    },
    report: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: s(spacing.headerPadding),
      gap: vs(spacing.md),
    },
    title: {
      fontSize: ms(fontSize.xl),
      fontFamily: fontFamilyNative.bold,
      color: t.text.primary,
      textAlign: 'center',
    },
    message: {
      fontSize: ms(fontSize.sm),
      fontFamily: fontFamilyNative.regular,
      color: t.status.danger,
      textAlign: 'center',
    },
    actions: {
      paddingHorizontal: s(spacing.headerPadding),
      gap: vs(spacing.md),
    },
  });

export default SendFailure;
