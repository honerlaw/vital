/// <reference types="node" />
/**
 * Tests the sign-in status gate offline. The binding property (proposal 020's degradation
 * fence): `finalize` is returned for exactly the `complete` status — every other member of
 * the union maps to a recovery step or a blocked message, so a screen that finalizes only
 * on this helper's say-so can never hit clerk-js's "Cannot finalize sign-in without a
 * created session" throw. `needs_client_trust` (the suspected production trigger) is
 * covered explicitly per the panel-carried implementer note.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { signInNextStep } from '@/auth/sign-in-next-step';
import type { SignInSecondFactor, SignInStatus } from '@/auth/sign-in-next-step';

const ALL_STATUSES: SignInStatus[] = [
  'needs_identifier',
  'needs_first_factor',
  'needs_second_factor',
  'needs_client_trust',
  'needs_new_password',
  'complete',
];

const EMAIL_CODE_FACTOR: SignInSecondFactor = {
  strategy: 'email_code',
  emailAddressId: 'idn_1',
  safeIdentifier: 'y**@example.com',
};

const TOTP_FACTOR: SignInSecondFactor = { strategy: 'totp' };

void test('the fence: only the complete status ever yields finalize', () => {
  for (const status of ALL_STATUSES) {
    for (const factors of [[], [EMAIL_CODE_FACTOR], [TOTP_FACTOR]]) {
      const step = signInNextStep(status, factors);
      assert.equal(step.kind === 'finalize', status === 'complete', `${status} must ${
        status === 'complete' ? '' : 'NOT '}finalize`);
    }
  }
});

void test('complete finalizes regardless of factors', () => {
  assert.deepEqual(signInNextStep('complete', []), { kind: 'finalize' });
});

void test('needs_client_trust routes to the email-code step, never finalize', () => {
  assert.deepEqual(signInNextStep('needs_client_trust', []), { kind: 'verify-email-code' });
});

void test('needs_second_factor verifies only when an email_code factor is supported', () => {
  assert.deepEqual(signInNextStep('needs_second_factor', [EMAIL_CODE_FACTOR, TOTP_FACTOR]), {
    kind: 'verify-email-code',
  });
  const blocked = signInNextStep('needs_second_factor', [TOTP_FACTOR]);
  assert.equal(blocked.kind, 'blocked');
});

void test('needs_new_password blocks with a message directing to the reset flow', () => {
  const step = signInNextStep('needs_new_password', []);
  assert.equal(step.kind, 'blocked');
  assert.ok(step.kind === 'blocked' && step.message.includes('Forgot password?'));
});

void test('needs_identifier and needs_first_factor block with a readable message', () => {
  for (const status of ['needs_identifier', 'needs_first_factor'] as const) {
    const step = signInNextStep(status, []);
    assert.equal(step.kind, 'blocked');
    assert.ok(step.kind === 'blocked' && step.message.length > 0);
  }
});
