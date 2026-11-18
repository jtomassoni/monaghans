import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { safeAdminPath, signEmailLogin, verifyEmailLogin } from './email-login-link';

describe('email login links', () => {
  it('round-trips a user id and rejects a tampered link', () => {
    process.env.NEXTAUTH_SECRET = 'test-secret';
    const token = signEmailLogin('user-1', '/admin/private-dining-leads/lead-1');
    assert.ok(token);
    assert.deepEqual(verifyEmailLogin(token!), {
      userId: 'user-1',
      nextPath: '/admin/private-dining-leads/lead-1',
    });
    assert.equal(verifyEmailLogin(`${token}x`), null);
  });

  it('only allows admin paths', () => {
    assert.equal(safeAdminPath('/admin/private-dining-leads/abc'), '/admin/private-dining-leads/abc');
    assert.equal(safeAdminPath('https://evil.example/admin'), null);
    assert.equal(safeAdminPath('//evil.example'), null);
  });
});
