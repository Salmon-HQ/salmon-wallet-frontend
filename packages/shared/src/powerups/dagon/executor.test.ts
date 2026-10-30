import { describe, expect, it, vi } from 'vitest';
import {
  ExecutorReadError,
  decodeReadResponse,
  encodeReadRequest,
  readHiddenBalance,
} from './executor';

const auth = {
  message: new Uint8Array(43).fill(1),
  signature: new Uint8Array(64).fill(2),
  signer: new Uint8Array(32).fill(3),
};

/** A gRPC-web frame: type, u32 BE length, payload. */
function frame(type: number, payload: Uint8Array): Uint8Array {
  const out = new Uint8Array(5 + payload.length);
  out[0] = type;
  new DataView(out.buffer).setUint32(1, payload.length);
  out.set(payload, 5);
  return out;
}

const field = (tag: number, bytes: Uint8Array) => Uint8Array.from([tag, bytes.length, ...bytes]);
const concat = (...parts: Uint8Array[]) => Uint8Array.from(parts.flatMap((part) => [...part]));
const trailer = (text: string) => frame(0x80, new TextEncoder().encode(text));
const u64le = (value: bigint) => {
  const out = new Uint8Array(8);
  new DataView(out.buffer).setBigUint64(0, value, true);
  return out;
};

describe('encodeReadRequest — contracts/encrypt-executor-and-config.md §2', () => {
  it('frames fields 1-3 behind 0x00 and a u32 BE length', () => {
    const bytes = encodeReadRequest(auth);
    const protobuf = concat(
      field(0x0a, auth.message),
      field(0x12, auth.signature),
      field(0x1a, auth.signer)
    );
    expect([...bytes]).toEqual([...frame(0x00, protobuf)]);
    expect(bytes.length).toBe(5 + 2 + 43 + 2 + 64 + 2 + 32);
  });
});

describe('decodeReadResponse', () => {
  const message = (value: Uint8Array) =>
    frame(
      0x00,
      concat(field(0x0a, value), Uint8Array.from([0x10, 4]), field(0x1a, new Uint8Array(32)))
    );

  it('reads field 1 as u64 little-endian, with the 0x80 trailer split off', () => {
    const body = concat(message(u64le(123_456n)), trailer('grpc-status:0\r\ngrpc-message:\r\n'));
    expect(decodeReadResponse(body, null)).toBe(123_456n);
  });

  it('is an error when grpc-status is non-zero, in the headers or the trailer', () => {
    expect(() => decodeReadResponse(message(u64le(1n)), '7')).toThrow(ExecutorReadError);
    const body = concat(trailer('grpc-status:7\r\ngrpc-message:signer is not authorized\r\n'));
    expect(() => decodeReadResponse(body, null)).toThrow(ExecutorReadError);
  });

  it('is an error, never 0, when the value is shorter than 8 bytes', () => {
    const body = concat(message(new Uint8Array(7)), trailer('grpc-status:0\r\n'));
    expect(() => decodeReadResponse(body, null)).toThrow(ExecutorReadError);
    const empty = concat(frame(0x00, new Uint8Array(0)), trailer('grpc-status:0\r\n'));
    expect(() => decodeReadResponse(empty, null)).toThrow(ExecutorReadError);
  });

  it('is an error when no message frame came back', () => {
    expect(() => decodeReadResponse(trailer('grpc-status:0\r\n'), null)).toThrow(ExecutorReadError);
    expect(() => decodeReadResponse(new Uint8Array([0, 0, 0]), null)).toThrow(ExecutorReadError);
  });
});

describe('readHiddenBalance', () => {
  it('posts the frame to the service path with the gRPC-web headers, port dropped', async () => {
    const body = concat(frame(0x00, field(0x0a, u64le(1_000n))), trailer('grpc-status:0\r\n'));
    const fetchFn = vi.fn(
      async (_url: string, _init: RequestInit) =>
        new Response(body, { status: 200, headers: { 'grpc-status': '0' } })
    );
    const value = await readHiddenBalance(
      'https://pre-alpha-dev-1.encrypt.ika-network.net:443',
      auth,
      fetchFn as unknown as typeof fetch
    );
    expect(value).toBe(1_000n);
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe(
      'https://pre-alpha-dev-1.encrypt.ika-network.net/encrypt.v1.EncryptService/ReadCiphertext'
    );
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({
      'content-type': 'application/grpc-web+proto',
      'x-grpc-web': '1',
      accept: 'application/grpc-web+proto',
    });
    expect([...new Uint8Array(init.body as ArrayBuffer)]).toEqual([...encodeReadRequest(auth)]);
  });

  it('never posts anywhere but the pinned executor, whatever URL it is handed', async () => {
    const fetchFn = vi.fn(async () => new Response('', { status: 503 }));
    await expect(
      readHiddenBalance(
        'https://evil.example/@pre-alpha-dev-1.encrypt.ika-network.net',
        auth,
        fetchFn as unknown as typeof fetch
      )
    ).rejects.toBeInstanceOf(ExecutorReadError);
    for (const [url] of fetchFn.mock.calls as unknown as [string][]) {
      expect(url).toBe(
        'https://pre-alpha-dev-1.encrypt.ika-network.net/encrypt.v1.EncryptService/ReadCiphertext'
      );
    }
  });

  it('is an error on a non-2xx answer or a transport failure', async () => {
    const notOk = vi.fn(async () => new Response('', { status: 503 }));
    await expect(
      readHiddenBalance('https://pre-alpha-dev-1.encrypt.ika-network.net', auth, notOk as never)
    ).rejects.toBeInstanceOf(ExecutorReadError);
    const offline = vi.fn(async () => {
      throw new TypeError('offline');
    });
    await expect(
      readHiddenBalance('https://pre-alpha-dev-1.encrypt.ika-network.net', auth, offline as never)
    ).rejects.toBeInstanceOf(ExecutorReadError);
  });
});
