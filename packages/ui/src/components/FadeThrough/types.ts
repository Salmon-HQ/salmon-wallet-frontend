import type { ReactNode } from 'react';

export interface FadeThroughProps {
  /**
   * Identity of the content being shown. When it changes, the subtree is
   * remounted and enters with the fade-through animation.
   */
  transitionKey: string;
  children: ReactNode;
}
