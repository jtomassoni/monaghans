import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { groupPollsByDay, oauthStatePurpose } from './facebook-special-poll';

describe('oauthStatePurpose', () => {
  it('reads the specials login state', () => {
    const state = Buffer.from(JSON.stringify({ purpose: 'specials' })).toString('base64url');
    assert.equal(oauthStatePurpose(state), 'specials');
    assert.equal(oauthStatePurpose(null), null);
    const social = Buffer.from(JSON.stringify({ userId: 'abc+def/ghi' })).toString('base64');
    assert.equal(oauthStatePurpose(social), null);
  });
});

describe('groupPollsByDay', () => {
  it('collapses checks onto Denver days', () => {
    const days = groupPollsByDay(
      [
        { ranAt: '2026-11-18T15:00:00.000Z' },
        { ranAt: '2026-11-18T14:00:00.000Z' },
        { ranAt: '2026-11-18T06:30:00.000Z' },
      ],
      'America/Denver'
    );
    assert.deepEqual(days.map((day) => [day.date, day.polls.length]), [
      ['2026-11-18', 2],
      ['2026-11-17', 1],
    ]);
    assert.match(days[0].label, /November 18/);
  });
});
