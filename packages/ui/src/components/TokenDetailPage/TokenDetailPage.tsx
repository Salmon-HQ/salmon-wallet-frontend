/**
 * TokenDetailPage — the pushed form of the token detail screen, on the DOM.
 *
 * Mobile's `app/(app)/token/[id].tsx`: the screen mounts its own water, the
 * kit header names the token (name over symbol), and the body is
 * `TokenDetailContent` at the screen gutter. This file owns the chrome and
 * nothing else; order, rhythm, titles and skeletons belong to the body,
 * which the Bitcoin home tab renders too.
 */
import React from 'react';
import { spacing } from '@salmon/shared';

import { SettingsPanelContent } from '../SettingsPanelContent';
import { TokenDetailContent } from './TokenDetailContent';
import type { TokenDetailPageProps } from './types';

export function TokenDetailPage({
  onBack,
  token,
  style,
  className,
  ...content
}: TokenDetailPageProps): React.ReactElement {
  return (
    <SettingsPanelContent
      testID="token-detail-screen"
      title={token.name}
      subtitle={token.symbol}
      onBack={onBack}
      style={style}
      className={className}
    >
      <TokenDetailContent {...content} token={token} bleed={spacing.screenGutter} />
    </SettingsPanelContent>
  );
}
