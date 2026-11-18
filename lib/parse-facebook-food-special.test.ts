import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseFacebookFoodSpecial } from './parse-facebook-food-special';

describe('parseFacebookFoodSpecial', () => {
  it('reads a labeled daily special and its price', () => {
    const parsed = parseFacebookFoodSpecial(
      "Today's special: Fish and chips with house tartar and fries. $14"
    );
    assert.ok(parsed);
    assert.equal(parsed.title, 'Fish and chips with house tartar and fries');
    assert.equal(parsed.priceNotes, '$14');
    assert.equal(parsed.description, null);
  });

  it('keeps the rest of the post as the description', () => {
    const parsed = parseFacebookFoodSpecial(
      "Lunch special — Reuben and fries. Served until 3pm. $12"
    );
    assert.ok(parsed);
    assert.equal(parsed.title, 'Reuben and fries');
    assert.equal(parsed.description, 'Served until 3pm. $12');
    assert.equal(parsed.priceNotes, '$12');
  });

  it('catches a dish plus a price when the word special is missing', () => {
    const parsed = parseFacebookFoodSpecial('Taco Tuesday! $2 tacos all day.');
    assert.ok(parsed);
    assert.match(parsed.title, /Taco Tuesday/i);
    assert.equal(parsed.priceNotes, '$2');
  });

  it('ignores drink specials, events, hiring, and the app roundup post', () => {
    assert.equal(parseFacebookFoodSpecial('Happy hour $5 wells from 4-6'), null);
    assert.equal(parseFacebookFoodSpecial('Trivia tonight at 7. Come hang out.'), null);
    assert.equal(parseFacebookFoodSpecial("We're hiring cooks. Apply at the bar."), null);
    assert.equal(
      parseFacebookFoodSpecial("📅 What's happening at Monaghan's today: Today's Specials: Burger"),
      null
    );
  });

  it('ignores a food mention that is not offered as a special', () => {
    assert.equal(parseFacebookFoodSpecial('Come get a burger and watch the game with us'), null);
  });
});
