import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildFoodSpecialReviewEmail } from './facebook-food-special-import';

describe('buildFoodSpecialReviewEmail', () => {
  it('puts the full post ahead of the parser fields', () => {
    const { text, html } = buildFoodSpecialReviewEmail({
      postedLabel: 'Tue, Nov 17, 9:00 AM',
      link: 'https://example.com/review',
      row: {
        id: 'row-1',
        facebookPostId: 'post-1',
        permalink: 'https://facebook.com/post/1',
        imageUrl: 'https://cdn.example/photo.jpg',
        rawMessage: "Today's special:\nFish and chips. $14\n\nCome in hungry.",
        kind: 'food',
        title: 'Fish and chips',
        description: null,
        priceNotes: '$14',
        postedAt: new Date('2026-11-17T16:00:00Z'),
        status: 'pending',
        specialId: null,
      },
    });

    const postAt = text.indexOf("Today's special:");
    const parserAt = text.indexOf('What the parser pulled out');
    assert.ok(postAt > -1 && parserAt > postAt);
    assert.match(text, /Come in hungry\./);
    assert.match(text, /Name: Fish and chips/);
    assert.match(text, /Description: \(none\)/);
    assert.match(text, /Price: \$14/);
    assert.match(html, /What the parser pulled out/);
    assert.match(html, /Fish and chips/);
    assert.ok(html.indexOf("Today's special:") < html.indexOf('What the parser pulled out'));
  });

  it('labels a Broncos post as a football special', () => {
    const { subject, text } = buildFoodSpecialReviewEmail({
      postedLabel: 'Wed, Nov 18, 11:00 AM',
      link: 'https://example.com/review',
      row: {
        id: 'row-2',
        facebookPostId: 'post-2',
        permalink: null,
        imageUrl: null,
        rawMessage: 'Broncos vs. the Chiefs this Sunday. House is bringing green chile.',
        kind: 'football',
        title: 'Broncos vs. Chiefs',
        description: 'green chile',
        priceNotes: '2026-11-22T14:00',
        postedAt: new Date('2026-11-18T18:00:00Z'),
        status: 'pending',
        specialId: null,
      },
    });

    assert.equal(subject, 'Football special ready: Broncos vs. Chiefs');
    assert.match(text, /Kind: Football special/);
    assert.match(text, /Opponent: Chiefs/);
    assert.match(text, /House meal: green chile/);
    assert.match(text, /Kickoff: Sun, Nov 22, 2:00 PM/);
  });
});
