import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { textFromVisionResponse } from './read-image-text';
import { parseSpecialText, reviewMessage } from './facebook-special-source';

describe('textFromVisionResponse', () => {
  it('keeps the words from the photo and drops an empty read', () => {
    assert.equal(
      textFromVisionResponse({ choices: [{ message: { content: "Today's special\nFish and chips $14" } }] }),
      "Today's special\nFish and chips $14"
    );
    assert.equal(textFromVisionResponse({ choices: [{ message: { content: 'NONE' } }] }), null);
    assert.equal(
      textFromVisionResponse({
        choices: [{ message: { content: [{ type: 'text', text: 'Broncos vs Chiefs' }] } }],
      }),
      'Broncos vs Chiefs'
    );
  });
});

describe('photo and story text', () => {
  const postedAt = new Date('2026-11-18T18:00:00Z');

  it('parses words read from a photo when the caption is empty', () => {
    const imageText = "Today's special: Fish and chips. $14";
    const parsed = parseSpecialText(imageText, postedAt, 'America/Denver');
    assert.equal(parsed?.kind, 'food');
    assert.match(reviewMessage({ caption: '', imageLabel: 'Text read from the photo', imageText }), /Fish and chips/);
  });

  it('keeps a written caption ahead of the text read from a story still', () => {
    const message = reviewMessage({
      caption: 'Come watch tonight',
      imageLabel: 'Text read from the story video still',
      imageText: 'Broncos vs. the Chiefs Sunday. Pot luck. House is bringing green chile.',
    });
    assert.ok(message.startsWith('Come watch tonight'));
    assert.match(message, /story video still/);
    const parsed = parseSpecialText(message.split('\n').slice(2).join('\n'), postedAt, 'America/Denver');
    assert.equal(parsed?.kind, 'football');
  });
});
