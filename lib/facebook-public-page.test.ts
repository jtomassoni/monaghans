import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  facebookPageTarget,
  looseFacebookTime,
  normalizeFacebookPageUrl,
  normalizeVisitorCookie,
  pageRequiresLogin,
  parsePublicFacebookHtml,
} from './facebook-public-page';

describe('normalizeFacebookPageUrl', () => {
  it('accepts a public Facebook page URL', () => {
    assert.equal(
      normalizeFacebookPageUrl('https://www.facebook.com/p/Monaghans-Bar-and-Grill-100063611261508/'),
      'https://www.facebook.com/p/Monaghans-Bar-and-Grill-100063611261508/'
    );
  });

  it('rejects anything that is not a Facebook page', () => {
    assert.equal(normalizeFacebookPageUrl('https://example.com/page'), null);
    assert.equal(normalizeFacebookPageUrl('https://facebook.com'), null);
  });

  it('reads the page id from a public page URL', () => {
    assert.deepEqual(
      facebookPageTarget('https://www.facebook.com/p/Monaghans-Bar-and-Grill-100063611261508/'),
      { id: '100063611261508', slug: null }
    );
    assert.deepEqual(facebookPageTarget('https://www.facebook.com/monaghans'), { id: null, slug: 'monaghans' });
  });
});

describe('visitor login', () => {
  it('keeps the session cookies and drops the rest', () => {
    const cookie = normalizeVisitorCookie('cookie: c_user=12345; xs=abc%3Adef; datr=zzz; extra=no');
    assert.equal(cookie, 'c_user=12345; xs=abc%3Adef; datr=zzz');
    assert.equal(normalizeVisitorCookie('xs=only'), null);
  });

  it('reads a relative Facebook time', () => {
    const now = new Date('2026-11-18T18:00:00.000Z');
    assert.equal(looseFacebookTime('posted 3 hrs ago', now), '2026-11-18T15:00:00.000Z');
  });
});

describe('parsePublicFacebookHtml', () => {
  it('reads a post embedded in the public page', () => {
    const html = `
      <div data-ft="story">
        "message":{"text":"Today's special: Fish and chips. $14"}
        "created_time":"2026-11-18T15:00:00+0000"
        href="https://www.facebook.com/monaghans/posts/12345"
        src="https://scontent.xx.fbcdn.net/v/special.jpg"
      </div>
    `;
    const posts = parsePublicFacebookHtml(html);
    assert.equal(posts.length, 1);
    assert.equal(posts[0].id, '12345');
    assert.match(posts[0].message, /Fish and chips/);
    assert.equal(posts[0].permalink, 'https://www.facebook.com/monaghans/posts/12345');
    assert.match(posts[0].imageUrl || '', /special\.jpg/);
  });

  it('reads the basic page markup', () => {
    const html = `
      <div class="story_body_container">
        <a href="/permalink.php?story_fbid=999&id=100">2 hrs</a>
        <p>Broncos vs. the Chiefs this Sunday. Pot luck. House is bringing green chile.</p>
        <img src="https://scontent.xx.fbcdn.net/v/game.jpg" />
      </div>
    `;
    const posts = parsePublicFacebookHtml(html);
    assert.equal(posts.length, 1);
    assert.equal(posts[0].id, '999');
    assert.match(posts[0].message, /Pot luck/);
  });

  it('ignores Facebook’s error page', () => {
    const html = '<!DOCTYPE html><html><head><title>Error</title></head><body>Sorry</body></html>';
    assert.deepEqual(parsePublicFacebookHtml(html), []);
  });

  it('reads a normal logged-in timeline post', () => {
    const html = `
      <div>
        <a href="/story.php?story_fbid=pfbid123&id=100063611261508">3 hrs</a>
        <div>Today's special: pot roast. $15</div>
      </div>
    `;
    const posts = parsePublicFacebookHtml(html);
    assert.equal(posts.length, 1);
    assert.equal(posts[0].id, 'pfbid123');
    assert.match(posts[0].message, /pot roast/);
  });

  it('recognizes the logged-out page shell', () => {
    const html = '<html><title>Facebook</title>"ssrEnabled":false,"haste_session":"comet_loggedout_pkg"</html>';
    assert.equal(pageRequiresLogin(html), true);
    assert.deepEqual(parsePublicFacebookHtml(html), []);
  });
});
