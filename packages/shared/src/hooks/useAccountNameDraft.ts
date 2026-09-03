/**
 * The name being typed on the rename screen, and the one rule it enforces:
 * a wallet cannot be left unnamed.
 *
 * Both twins ran this identically — the draft, the empty-name error, and the
 * clearing of that error on the next keystroke — which is exactly the logic
 * that belongs to neither platform. The panels keep the field and the button;
 * this keeps what they mean.
 */
import { useCallback, useState } from 'react';

export interface UseAccountNameDraftParams {
  /** The name the wallet has now. */
  currentName: string;
  /** Runs with the trimmed name once it is valid. */
  onSave: (name: string) => void | Promise<void>;
  /** The empty-name message, already translated. */
  emptyMessage: string;
}

export interface UseAccountNameDraftResult {
  name: string;
  /** Empty while the draft is fine — the panels pass `|| undefined` on. */
  error: string;
  /** Types a character and clears any standing error. */
  changeName: (next: string) => void;
  /** Saves, or raises the empty-name error and saves nothing. */
  save: () => void;
}

export function useAccountNameDraft({
  currentName,
  onSave,
  emptyMessage,
}: UseAccountNameDraftParams): UseAccountNameDraftResult {
  const [name, setName] = useState(currentName);
  const [error, setError] = useState('');

  const save = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(emptyMessage);
      return;
    }
    setError('');
    void onSave(trimmed);
  }, [name, onSave, emptyMessage]);

  const changeName = useCallback(
    (next: string) => {
      setName(next);
      setError((standing) => (standing ? '' : standing));
    },
    []
  );

  return { name, error, changeName, save };
}
