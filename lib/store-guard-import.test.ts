import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

/**
 * The main door must be importable from a plain Node script under
 * `--conditions=react-server` without pulling in the request layer.
 *
 * The hook is the proof: it fails the import if `lib/store-guard.ts` reaches
 * `next/headers`, Clerk, or the request-only `lib/space.ts`. The dynamic import
 * below is exactly what a CLI or a main-only route does.
 */
const forbidden: string[] = [];

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'next/headers' || specifier === '@clerk/nextjs/server') {
      forbidden.push(specifier);
      throw new Error(`forbidden request-layer import: ${specifier}`);
    }

    if (
      (specifier === './space' || specifier === './space.ts') &&
      context.parentURL?.includes('/lib/store-guard.ts')
    ) {
      forbidden.push(specifier);
      throw new Error(`forbidden request-layer import: ${specifier}`);
    }

    return nextResolve(specifier, context);
  },
});

test('the main door imports without the request layer', async () => {
  await assert.doesNotReject(() => import('./store-guard'));
  assert.deepEqual(forbidden, []);
});

test('the import guard is live', async () => {
  await assert.rejects(() => import('next/headers'), /forbidden request-layer import/);
});
