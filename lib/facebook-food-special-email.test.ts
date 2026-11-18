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
});
