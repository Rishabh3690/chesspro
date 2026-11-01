import { test } from 'node:test';
import assert from 'node:assert/strict';
import { customSoundManager, VOICE_EVENT_LINES } from '../utils/customSounds';

// Test pure odometer formatting and glitch logic
function computeOdometerDigits(val: number, prevVal: number, padLength = 2) {
  const currentStr = Math.max(0, Math.floor(val)).toString().padStart(padLength, '0');
  const prevStr = Math.max(0, Math.floor(prevVal)).toString().padStart(padLength, '0');

  return currentStr.split('').map((char, index) => {
    const current = parseInt(char, 10) || 0;
    const prevChar = prevStr[index] ?? char;
    const prev = parseInt(prevChar, 10) || 0;
    return {
      current,
      prev,
      hasChanged: current !== prev,
      key: `digit-${index}-${current}`,
    };
  });
}

function checkIsGlitching(val: number, threshold = 10) {
  return typeof threshold === 'number' && val <= threshold && val > 0;
}

test('computeOdometerDigits pads 2 digits and tracks single-digit rollover', () => {
  const digits30to29 = computeOdometerDigits(29, 30, 2);
  assert.equal(digits30to29.length, 2);
  // Tens digit changed from 3 to 2
  assert.equal(digits30to29[0].prev, 3);
  assert.equal(digits30to29[0].current, 2);
  assert.equal(digits30to29[0].hasChanged, true);
  // Units digit changed from 0 to 9
  assert.equal(digits30to29[1].prev, 0);
  assert.equal(digits30to29[1].current, 9);
  assert.equal(digits30to29[1].hasChanged, true);
});

test('computeOdometerDigits handles non-rollover tick (29 to 28)', () => {
  const digits29to28 = computeOdometerDigits(28, 29, 2);
  assert.equal(digits29to28[0].hasChanged, false);
  assert.equal(digits29to28[0].current, 2);
  assert.equal(digits29to28[1].hasChanged, true);
  assert.equal(digits29to28[1].current, 8);
  assert.equal(digits29to28[1].prev, 9);
});

test('checkIsGlitching triggers strictly when value <= 10 and value > 0', () => {
  assert.equal(checkIsGlitching(30), false);
  assert.equal(checkIsGlitching(15), false);
  assert.equal(checkIsGlitching(11), false);
  assert.equal(checkIsGlitching(10), true);
  assert.equal(checkIsGlitching(9), true);
  assert.equal(checkIsGlitching(1), true);
  assert.equal(checkIsGlitching(0), false); // 0 is timeout state, not active glitch countdown
});

test('customSoundManager invokes fallback synthesizers and voice event callbacks cleanly', () => {
  let sfxFallbackCalled = false;
  customSoundManager.setMuted(false);
  customSoundManager.playCustomSfx('move', () => {
    sfxFallbackCalled = true;
  });
  assert.equal(sfxFallbackCalled, true);

  let fallbackLine = '';
  customSoundManager.playVoiceForEvent(
    'puzzle_won',
    undefined,
    (ttsFallback) => {
      fallbackLine = ttsFallback;
    }
  );
  assert.ok(VOICE_EVENT_LINES.puzzle_won.includes(fallbackLine));
});
