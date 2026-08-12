// Web fallback: pbkdf2 is not available, encryption.ts will use CryptoJS fallback
export const pbkdf2:
  | {
      deriveAsync: (
        password: Uint8Array,
        salt: Uint8Array,
        iterations: number,
        keyLength: number,
        digest: string
      ) => Promise<ArrayBuffer>;
    }
  | undefined = undefined;
