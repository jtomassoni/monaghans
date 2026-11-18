import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseFacebookFootballPost } from './parse-facebook-football';
import { parseFacebookFoodSpecial } from './parse-facebook-food-special';

const WEDNESDAY = new Date('2026-11-18T18:00:00Z');

describe('parseFacebookFootballPost', () => {
  it('reads a Broncos pot luck as a football game', () => {
    const parsed = parseFacebookFootballPost(
      "Broncos vs. the Chiefs this Sunday. Pot luck! House is bringing green chile for the pot luck. Kickoff 2pm.",
      WEDNESDAY
    );
    assert.ok(parsed);
    assert.equal(parsed.opponent, 'Chiefs');
    assert.equal(parsed.houseMeal, 'green chile');
    assert.equal(parsed.kickoffLocal, '2026-11-22T14:00');
  });

  it('uses the next Sunday when the post does not name a day', () => {
    const parsed = parseFacebookFootballPost(
      'Come watch the Broncos game. Pot luck buffet. We are making meatballs.',
      WEDNESDAY
    );
    assert.ok(parsed);
    assert.equal(parsed.opponent, null);
    assert.equal(parsed.houseMeal, 'meatballs');
    assert.equal(parsed.kickoffLocal, '2026-11-22T14:00');
  });

  it('leaves a priced Broncos burger as a food special', () => {
    const message = "Today's special: Broncos burger and fries. $14";
    assert.equal(parseFacebookFootballPost(message, WEDNESDAY), null);
    const food = parseFacebookFoodSpecial(message);
    assert.ok(food);
    assert.match(food.title, /Broncos burger/i);
  });

  it('ignores the app roundup post', () => {
    assert.equal(
      parseFacebookFootballPost(
        "📅 What's happening at Monaghan's today: Broncos vs Chiefs pot luck",
        WEDNESDAY
      ),
      null
    );
  });
});
