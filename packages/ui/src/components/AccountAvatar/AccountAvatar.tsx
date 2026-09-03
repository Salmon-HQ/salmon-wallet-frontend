/**
 * AccountAvatar — the identity well a wallet row carries, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/AccountAvatar`. The
 * account's picture when it has one and it loads; its initials otherwise.
 * The active wallet's well is ink, every other one the accent tint — the
 * same `IconBubble` the rest of the identity chrome is made of.
 */
import React, { useState } from 'react';
import { fontFamily, fontSize, fontWeight, getInitials } from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { IconBubble } from '../IconBubble';
import type { AccountAvatarProps } from './types';

/** The wallet thumb, per `.pen` CORE 10. */
export const ACCOUNT_AVATAR_SIZE = 44;

export function AccountAvatar({
  name,
  avatarUrl,
  active,
  testID,
}: AccountAvatarProps): React.ReactElement {
  const { text } = useSemantic();
  const [imgError, setImgError] = useState(false);

  return (
    <IconBubble
      size={ACCOUNT_AVATAR_SIZE}
      shape="circle"
      tone={active ? 'ink' : 'accent-tint'}
      testID={testID}
    >
      {avatarUrl && !imgError ? (
        <img
          src={avatarUrl}
          alt=""
          onError={() => setImgError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
        />
      ) : (
        <span
          style={{
            color: text.primary,
            fontFamily: fontFamily.sans,
            fontWeight: fontWeight.bold,
            fontSize: fontSize.body,
          }}
        >
          {getInitials(name)}
        </span>
      )}
    </IconBubble>
  );
}
