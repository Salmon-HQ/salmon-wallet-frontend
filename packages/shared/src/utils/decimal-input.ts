/**
 * Normalizes typed amounts so keyboards that use a comma as the decimal
 * separator work the same as dot keyboards, keeping a single dot-decimal
 * string for the parsing layer.
 */
export function sanitizeDecimalInput(text: string): string {
  const dotted = text.replace(/,/g, '.').replace(/[^0-9.]/g, '');
  const parts = dotted.split('.');
  return parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : dotted;
}
