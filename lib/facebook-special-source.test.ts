import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseSpecialText, specialScanLabel } from './facebook-special-source';

describe('specialScanLabel', () => {
  const postedAt = new Date('2026-11-18T18:00:00.000Z');

  it('names a food special and a football game without sending anything', () => {
    const food = parseSpecialText("Today's special: Fish and chips. $14", postedAt, 'America/Denver');
    assert.equal(specialScanLabel(food, false).outcome, 'food');
    assert.match(specialScanLabel(food, false).detail, /Food special: Fish and chips/);
    assert.match(specialScanLabel(food, false).detail, /\$14/);

    const football = parseSpecialText(
      'Broncos vs. the Chiefs this Sunday. Pot luck! House is bringing green chile for the pot luck. Kickoff 2pm.',
      postedAt,
      'America/Denver'
    );
    const labeled = specialScanLabel(football, true);
    assert.equal(labeled.outcome, 'football');
    assert.match(labeled.detail, /Read from the photo/);
    assert.match(labeled.detail, /Broncos vs Chiefs/);
    assert.match(labeled.detail, /green chile/);
  });

  it('says when a post is neither', () => {
    assert.equal(specialScanLabel(null, false).outcome, 'not-a-special');
  });
});
