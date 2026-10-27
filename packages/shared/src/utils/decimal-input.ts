/**
 * Normalizes typed amounts so keyboards that use a comma as the decimal
 * separator work the same as dot keyboards, keeping a single dot-decimal
 * string for the parsing layer.
 *
 * `maxDecimals` is the token's decimal places: a fraction digit past it is
 * not taken, and a token with none takes no separator. No message — the
 * field simply keeps what it had (`withinDecimals` still refuses a finer
 * amount further on).
 */
export function sanitizeDecimalInput(text: string, maxDecimals?: number): string {
  const dotted = text.replace(/,/g, '.').replace(/[^0-9.]/g, '');
  const [whole, ...rest] = dotted.split('.');
  if (rest.length === 0) return dotted;
  if (maxDecimals !== undefined && maxDecimals <= 0) return whole;
  const fraction = rest.join('');
  return `${whole}.${maxDecimals === undefined ? fraction : fraction.slice(0, maxDecimals)}`;
}
