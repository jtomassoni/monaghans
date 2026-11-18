import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { chooseManagedPage, oauthQueryValue, type ManagedPage } from './facebook-specials-reader';
import { groupPollsByDay, oauthStatePurpose, pollPostText, readablePollExcerpt, readablePollSummary } from './facebook-special-poll';

describe('oauthQueryValue', () => {
  it('keeps a plus sign in the Facebook code', () => {
    assert.equal(oauthQueryValue('?code=AQD+abc%2Fdef&state=x', 'code'), 'AQD+abc/def');
  });
});

describe('chooseManagedPage', () => {
  const pageUrl = 'https://www.facebook.com/p/Monaghans-Bar-and-Grill-100063611261508/';
  const monaghans: ManagedPage = {
    id: '555',
    name: "Monaghan's Bar & Grill",
    accessToken: 'page-token',
    username: null,
  };

  it('uses the managed page when the public URL id is different', () => {
    const choice = chooseManagedPage([monaghans], pageUrl);
    assert.equal(choice.ok, true);
    if (choice.ok) assert.equal(choice.page.id, '555');
  });

  it('says when the login manages a different page', () => {
    const choice = chooseManagedPage(
      [{ id: '9', name: 'Other Spot', accessToken: 't', username: null }],
      pageUrl
    );
    assert.equal(choice.ok, false);
    if (!choice.ok) assert.match(choice.reason, /Other Spot/);
  });
});

describe('oauthStatePurpose', () => {
  it('reads the specials login state', () => {
    const state = Buffer.from(JSON.stringify({ purpose: 'specials' })).toString('base64url');
    assert.equal(oauthStatePurpose(state), 'specials');
    assert.equal(oauthStatePurpose(null), null);
    const social = Buffer.from(JSON.stringify({ userId: 'abc+def/ghi' })).toString('base64');
    assert.equal(oauthStatePurpose(social), null);
  });
});

describe('readable poll log', () => {
  it('drops the repeated scan prefix', () => {
    assert.equal(
      readablePollSummary('Last 24 hours scan. 2 posts from the last 24 hours. Nothing was emailed.'),
      '2 posts from the last 24 hours. Nothing was emailed.'
    );
    assert.equal(readablePollSummary('Facebook returned no posts.'), 'Facebook returned no posts.');
  });

  it('keeps the full post and a short line', () => {
    const text = pollPostText(`${'Carnitas chimichanga. '.repeat(20)}Come hungry.`);
    assert.ok(text.message.includes('Come hungry.'));
    assert.ok(text.excerpt.endsWith('...'));
    assert.ok(text.excerpt.length < text.message.length);
  });

  it('keeps a real caption and hides page code', () => {
    assert.deepEqual(
      readablePollExcerpt("Wednesday at Monaghan's. Today's special is carnitas."),
      { text: "Wednesday at Monaghan's. Today's special is carnitas.", pageCode: false }
    );
    assert.deepEqual(
      readablePollExcerpt('{"routing_namespace":"fb_comet","ghlss":"h1pLEp"}'),
      { text: 'Page code, not a caption.', pageCode: true }
    );
    assert.deepEqual(
      readablePollExcerpt('Facebook :root,.__fb-light-mode:root,--fds-black:#000000'),
      { text: 'Page code, not a caption.', pageCode: true }
    );
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
