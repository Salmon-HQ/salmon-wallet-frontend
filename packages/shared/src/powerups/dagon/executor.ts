/**
 * The device's one read from Encrypt: `ReadCiphertext`, a unary gRPC-web
 * call over plain `fetch` + `arrayBuffer()`, because React Native's `fetch`
 * has no streaming body (research R7). The authorization was signed by core
 * with a viewer key it already discarded; this file only carries it.
 */
import type { ReadAuthorization } from '../../core/confirmation';
import { EXECUTOR_HOST, EXECUTOR_URLS } from './constants';

const PATH = '/encrypt.v1.EncryptService/ReadCiphertext';
const HEADERS = {
  'content-type': 'application/grpc-web+proto',
  'x-grpc-web': '1',
  accept: 'application/grpc-web+proto',
};
const DATA_FRAME = 0x00;
const TRAILER_FRAME = 0x80;

export class ExecutorReadError extends Error {
  constructor(readonly detail: string) {
    super('dagon.errors.readFailed');
    this.name = 'ExecutorReadError';
  }
}

function varint(value: number): number[] {
  const out: number[] = [];
  let rest = value;
  while (rest > 0x7f) {
    out.push((rest & 0x7f) | 0x80);
    rest >>>= 7;
  }
  out.push(rest);
  return out;
}

const bytesField = (field: number, bytes: Uint8Array) => [
  (field << 3) | 2,
  ...varint(bytes.length),
  ...bytes,
];

/** `0x00` ‖ u32 BE length ‖ protobuf { 1: message, 2: signature, 3: signer }. */
export function encodeReadRequest({ message, signature, signer }: ReadAuthorization): Uint8Array {
  // `signer` is the viewer's 32-byte public key; core already dropped its key.
  const protobuf = Uint8Array.from([
    ...bytesField(1, message),
    ...bytesField(2, signature),
    ...bytesField(3, signer),
  ]);
  const out = new Uint8Array(5 + protobuf.length);
  out[0] = DATA_FRAME;
  new DataView(out.buffer).setUint32(1, protobuf.length);
  out.set(protobuf, 5);
  return out;
}

function readVarint(bytes: Uint8Array, start: number): [number, number] {
  let value = 0;
  let shift = 0;
  let at = start;
  for (;;) {
    if (at >= bytes.length || shift > 28) throw new ExecutorReadError('malformed varint');
    const byte = bytes[at++];
    value |= (byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) return [value >>> 0, at];
    shift += 7;
  }
}

/** Field 1 (`value`) of a `ReadCiphertextResponse`, or null when absent. */
function valueField(message: Uint8Array): Uint8Array | null {
  let at = 0;
  while (at < message.length) {
    const [tag, afterTag] = readVarint(message, at);
    const wire = tag & 7;
    if (wire === 0) {
      at = readVarint(message, afterTag)[1];
    } else if (wire === 2) {
      const [length, start] = readVarint(message, afterTag);
      if (start + length > message.length) throw new ExecutorReadError('truncated field');
      if (tag >>> 3 === 1) return message.subarray(start, start + length);
      at = start + length;
    } else {
      throw new ExecutorReadError('unexpected wire type');
    }
  }
  return null;
}

/**
 * The plaintext balance in base units. Any non-zero grpc-status, a missing
 * message or a value shorter than 8 bytes is an error, never 0 (FR-031).
 */
export function decodeReadResponse(body: Uint8Array, headerStatus: string | null): bigint {
  if (headerStatus !== null && headerStatus !== '0') {
    throw new ExecutorReadError(`grpc-status ${headerStatus}`);
  }
  let message: Uint8Array | null = null;
  let at = 0;
  while (at + 5 <= body.length) {
    const type = body[at];
    const length = new DataView(body.buffer, body.byteOffset + at + 1, 4).getUint32(0);
    const payload = body.subarray(at + 5, at + 5 + length);
    if (payload.length !== length) throw new ExecutorReadError('truncated frame');
    if (type === TRAILER_FRAME) {
      const status = /grpc-status:\s*(\d+)/i.exec(new TextDecoder().decode(payload))?.[1];
      if (status !== undefined && status !== '0') {
        throw new ExecutorReadError(`grpc-status ${status}`);
      }
    } else if (type === DATA_FRAME && message === null) {
      message = payload;
    }
    at += 5 + length;
  }
  const value = message ? valueField(message) : null;
  if (!value || value.length < 8) throw new ExecutorReadError('value shorter than 8 bytes');
  return new DataView(value.buffer, value.byteOffset, 8).getBigUint64(0, true);
}

/** One `ReadCiphertext` call against the configured executor. */
export async function readHiddenBalance(
  encryptGrpcUrl: string,
  auth: ReadAuthorization,
  fetchFn: typeof fetch = fetch
): Promise<bigint> {
  // The URL is built from the pinned host, never parsed out of the config.
  if (!EXECUTOR_URLS.includes(encryptGrpcUrl)) throw new ExecutorReadError('executor');
  let response: Response;
  let body: Uint8Array;
  try {
    response = await fetchFn(`https://${EXECUTOR_HOST}${PATH}`, {
      method: 'POST',
      headers: HEADERS,
      // A plain ArrayBuffer: the body type React Native's fetch sends as is.
      body: encodeReadRequest(auth).buffer as ArrayBuffer,
    });
    body = new Uint8Array(await response.arrayBuffer());
  } catch {
    throw new ExecutorReadError('transport');
  }
  if (!response.ok) throw new ExecutorReadError(`http ${response.status}`);
  return decodeReadResponse(body, response.headers.get('grpc-status'));
}
