/**
 * Suite-local secrets loader for the extension Playwright suite.
 *
 * Reads apps/extension/.playwright/.env.test (gitignored) into process.env.
 * Runs at config load so worker processes inherit the values. No dotenv
 * dependency — the format is the same KEY=value the legacy .mjs driver used.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const suiteRoot = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(suiteRoot, '.env.test');

/**
 * Drop surrounding quotes, the way dotenv does. Seed phrases contain spaces, so
 * they get quoted naturally — and the sibling Maestro .env.test quotes every
 * value because it is sourced from a shell. Without this, the quotes end up
 * inside the value and a "valid" address silently stops validating.
 */
function unquote(value: string): string {
  const trimmed = value.trim();
  const quote = trimmed[0];
  if ((quote === '"' || quote === "'") && trimmed.length >= 2 && trimmed.endsWith(quote)) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function loadTestEnv(): void {
  if (!fs.existsSync(envPath)) {
    throw new Error(`Missing ${envPath}. Copy .env.test.example to .env.test and fill it in.`);
  }
  const raw = fs.readFileSync(envPath, 'utf8');
  for (const line of raw.split('\n')) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match && process.env[match[1]] === undefined) {
      process.env[match[1]] = unquote(match[2]);
    }
  }
}

export function requireSecrets(keys: readonly string[]): void {
  const missing = keys.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required secrets in .env.test: ${missing.join(', ')}`);
  }
}

/** Backend base URL the extension talks to during e2e (salmon-api). */
export const API_URL = process.env.SALMON_API_URL ?? 'http://127.0.0.1:3001';

/**
 * True when the salmon-api backend answers (any HTTP status = reachable).
 *
 * Generous, and retried. serverless-offline can take several seconds to answer
 * its first request, and every spec here skips when this returns false — so a
 * too-tight timeout does not fail loudly, it silently turns the suite green
 * while testing nothing at all. Slow is fine; a false negative is not.
 */
export async function isBackendUp(): Promise<boolean> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10_000);
      await fetch(API_URL, { signal: controller.signal });
      clearTimeout(timer);
      return true;
    } catch {
      // Cold start or a momentarily busy backend — try once more before giving up.
    }
  }
  return false;
}
