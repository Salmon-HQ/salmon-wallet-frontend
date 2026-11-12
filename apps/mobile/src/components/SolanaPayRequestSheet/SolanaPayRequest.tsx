/**
 * One merchant payment while its link is open (spec 043). Mounted by the Send
 * recipient screen only then; `useSolanaPayRequest` runs the flow, this draws
 * the sheet. Core's review and receipt are the confirmation host's.
 */
import React from 'react';
import { useSolanaPayRequest } from '@salmon/shared';

import { SolanaPayRequestSheet } from './SolanaPayRequestSheet';
import type { SolanaPayRequestProps } from './types';

export function SolanaPayRequest(props: SolanaPayRequestProps) {
  return <SolanaPayRequestSheet {...useSolanaPayRequest(props)} />;
}
