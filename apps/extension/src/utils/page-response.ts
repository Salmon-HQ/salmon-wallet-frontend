/**
 * What a website receives when its request is answered.
 *
 * The approval window posts its answer to the background, which relays it to
 * the page. The page is untrusted, so the relay copies only the fields a
 * response is made of: anything else an approval returns (an account object,
 * a signer) stays inside the extension.
 */

/** Result fields a signing approval returns, each a string or a list of strings. */
const RESULT_FIELDS = [
  'signature',
  'signatures',
  'publicKey',
  'address',
  'signedMessage',
  'signedMessageFormat',
  'signedOffchainMessage',
  'signatureType',
] as const;

const isText = (value: unknown): value is string => typeof value === 'string';
const isTextList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(isText);
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export function toPageResponse(message: object): Record<string, unknown> {
  const data = message as Record<string, unknown>;
  const response: Record<string, unknown> = { id: data.id };
  if (isText(data.error)) response.error = data.error;
  if (isText(data.method)) response.method = data.method;
  if (isRecord(data.params) && isText(data.params.publicKey)) {
    response.params = { publicKey: data.params.publicKey };
  }
  if (isRecord(data.result)) {
    const result = data.result;
    response.result = Object.fromEntries(
      RESULT_FIELDS.filter((field) => isText(result[field]) || isTextList(result[field])).map(
        (field) => [field, result[field]]
      )
    );
  }
  return response;
}
