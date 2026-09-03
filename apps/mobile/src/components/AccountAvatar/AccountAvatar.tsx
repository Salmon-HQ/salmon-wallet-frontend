/**
 * AccountAvatar — the identity well a wallet row carries (mobile).
 *
 * The DOM twin is `packages/ui/src/components/AccountAvatar`. The account's
 * picture when it has one and it loads; its initials otherwise. The active
 * wallet's well is ink, every other one the accent tint — the same
 * `IconBubble` the rest of the identity chrome is made of.
 */
import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Image } from 'expo-image';
import { fontFamilyNative, fontSize, getInitials, type Semantic } from '@salmon/shared';

import { IconBubble } from '../IconBubble';
import { useThemedStyles } from '../../theme/useThemedStyles';
import type { AccountAvatarProps } from './types';

/** The wallet thumb, per `.pen` CORE 10. */
export const ACCOUNT_AVATAR_SIZE = 44;

export function AccountAvatar({
  name,
  avatarUrl,
  active,
  testID,
}: AccountAvatarProps): React.ReactElement {
  const styles = useThemedStyles(stylesFor);
  const [imgError, setImgError] = useState(false);

  return (
    <IconBubble
      size={ACCOUNT_AVATAR_SIZE}
      shape="circle"
      tone={active ? 'ink' : 'accent-tint'}
      testID={testID}
    >
      {avatarUrl && !imgError ? (
        <Image
          source={{ uri: avatarUrl }}
          style={styles.image}
          contentFit="cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <Text style={styles.initials}>{getInitials(name)}</Text>
      )}
    </IconBubble>
  );
}

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    image: {
      width: '100%',
      height: '100%',
      borderRadius: 9999,
    },
    initials: {
      color: t.text.primary,
      fontFamily: fontFamilyNative.bold,
      fontSize: fontSize.body,
    },
  });
