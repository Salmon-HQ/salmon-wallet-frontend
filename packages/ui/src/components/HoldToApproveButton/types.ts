export interface HoldToApproveButtonProps {
  onApprove: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  children: string;
  testID?: string;
  /**
   * Which control the hold wraps. `secondary` for a held action that is not
   * the screen's committing one — the seed-phrase copy, for instance. The
   * progress ink follows: `text.onAccent` on the salmon fill, `text.primary`
   * on the secondary fill where onAccent would vanish.
   */
  variant?: 'primary' | 'secondary';
}
