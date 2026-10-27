/**
 * Error tracking for TrueSpec.
 *
 * Sentry is wired behind an optional `SENTRY_DSN` (server) /
 * `NEXT_PUBLIC_SENTRY_DSN` (client). With no DSN the app builds and runs with no
 * error-tracker network call — `captureException` / `captureMessage` are no-ops.
 *
 * `scrub` removes known sensitive fields before anything is sent: customer names,
 * phone numbers, costs, private notes, cookies and environment values.
 */

import {
  captureException as sentryCaptureException,
  captureMessage as sentryCaptureMessage,
} from '@sentry/nextjs';

const SENSITIVE_WORDS = new Set([
  'password',
  'passwd',
  'secret',
  'api',
  'key',
  'token',
  'dsn',
  'access',
  'session',
  'cookie',
  'authorization',
  'private',
  'note',
  'customer',
  'email',
  'phone',
  'cost',
  'price',
  'amount',
  'kobo',
]);

function isSensitiveKey(key: string): boolean {
  return key
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .some((part) => SENSITIVE_WORDS.has(part));
}

const CARD = /^[0-9]{4}[\s-]?[0-9]{4}[\s-]?[0-9]{4}[\s-]?[0-9]{4}$/;
const PHONE = /^\+?[0-9]{7,15}$/;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function scrubValue(key: string, value: unknown): unknown {
  if (isSensitiveKey(key)) return '[redacted]';
  if (typeof value === 'string' && (EMAIL.test(value) || PHONE.test(value) || CARD.test(value))) {
    return '[redacted]';
  }
  return value;
}

/**
 * Recursively scrub sensitive fields from an object. Arrays and plain objects are walked;
 * primitives are returned as-is unless they look like contact/payment data.
 */
export function scrub(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(scrub);
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = scrubValue(k, scrub(v));
    return out;
  }
  return value;
}

function tags(context?: {
  route?: string;
  release?: string;
  errorType?: string;
}): Record<string, string> {
  const t: Record<string, string> = {};
  if (context?.errorType) t['error.type'] = context.errorType;
  if (context?.route) t.route = context.route;
  return t;
}

/**
 * Capture an exception with optional route/release/type context. No-ops when Sentry is not
 * initialized (i.e. no DSN configured).
 */
export function captureException(
  error: unknown,
  context?: { route?: string; release?: string; errorType?: string }
): void {
  sentryCaptureException(error, { tags: tags(context) });
}

/**
 * Capture a message with optional route/release/type context. No-ops when Sentry is not
 * initialized.
 */
export function captureMessage(
  message: string,
  context?: { route?: string; release?: string; errorType?: string }
): void {
  sentryCaptureMessage(message, { tags: tags(context) });
}
