/// <reference types="node" />
/**
 * Tests the per-route auth guard at two levels, fully offline and cast-free:
 *  - requireAuth() in isolation, with an injected typed fake verifier.
 *  - the real GET /api/me route handler, with the fake installed via verifierRegistry, proving
 *    the route itself returns 401 unauthenticated and { userId } when signed in.
 *
 * Run via `npm test` (node --import tsx --test), so the `@/` tsconfig alias resolves.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GET } from '@/app/api/me+api';
import { type AuthVerifier } from '@/server/clerk-verifier';
import { requireAuth } from '@/server/requireAuth';
import { verifierRegistry } from '@/server/verifier-registry';

void test('requireAuth returns the userId for an authenticated request', async () => {
  const verify: AuthVerifier = () => Promise.resolve({ userId: 'user_authed' });
  const result = await requireAuth(new Request('http://localhost/api/me'), verify);
  if (result instanceof Response) throw new Error('expected AuthResult, got Response');
  assert.equal(result.userId, 'user_authed');
});

void test('requireAuth returns 401 when there is no authenticated user', async () => {
  const verify: AuthVerifier = () => Promise.resolve({ userId: null });
  const result = await requireAuth(new Request('http://localhost/api/me'), verify);
  if (!(result instanceof Response)) throw new Error('expected a 401 Response');
  assert.equal(result.status, 401);
});

void test('requireAuth fails closed with 401 when the verifier throws', async () => {
  const verify: AuthVerifier = () => Promise.reject(new Error('publishable key is missing'));
  const result = await requireAuth(new Request('http://localhost/api/me'), verify);
  if (!(result instanceof Response)) throw new Error('expected a 401 Response');
  assert.equal(result.status, 401);
});

void test('GET /api/me responds 401 without a valid session', async () => {
  verifierRegistry.current = () => Promise.resolve({ userId: null });
  try {
    const res = await GET(new Request('http://localhost/api/me'));
    assert.equal(res.status, 401);
  } finally {
    verifierRegistry.current = null;
  }
});

void test('GET /api/me responds 200 with the userId for a valid session', async () => {
  verifierRegistry.current = () => Promise.resolve({ userId: 'user_route' });
  try {
    const res = await GET(new Request('http://localhost/api/me'));
    assert.equal(res.status, 200);
    const body: unknown = await res.json();
    if (typeof body !== 'object' || body === null || !('userId' in body)) {
      throw new Error('expected a userId in the response body');
    }
    assert.equal(body.userId, 'user_route');
  } finally {
    verifierRegistry.current = null;
  }
});
