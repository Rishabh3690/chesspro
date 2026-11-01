import { test } from 'node:test';
import assert from 'node:assert/strict';
import themeConfig from './theme.json';

test('theme.json defines baseBackground and all 4 emotional states without stressed', () => {
  assert.equal(themeConfig.baseBackground, '#0A192F');
  const emotions = ['calm', 'confident', 'angry', 'sad'] as const;
  
  for (const emo of emotions) {
    const config = themeConfig.emotions[emo];
    assert.ok(config, `Missing theme config for emotion: ${emo}`);
    assert.ok(config.name, `Missing name for ${emo}`);
    assert.match(config.uiBorder, /^#[0-9a-fA-F]{6}$/, `uiBorder should be a valid hex color for ${emo}`);
    assert.match(config.textGlow, /^#[0-9a-fA-F]{6}$/, `textGlow should be a valid hex color for ${emo}`);
    assert.ok(config.uiBorderGlow, `Missing uiBorderGlow for ${emo}`);
    assert.ok(typeof config.rotationSpeed === 'number', `rotationSpeed must be numeric for ${emo}`);
    assert.match(config.primary3d, /^#[0-9a-fA-F]{6}$/);
    assert.match(config.secondary3d, /^#[0-9a-fA-F]{6}$/);
    assert.match(config.reticleColor, /^#[0-9a-fA-F]{6}$/);
    assert.match(config.gyroColor, /^#[0-9a-fA-F]{6}$/);
    assert.match(config.stressColor, /^#[0-9a-fA-F]{6}$/);
    assert.match(config.scaffoldCore, /^#[0-9a-fA-F]{6}$/);
    assert.match(config.scaffoldMid, /^#[0-9a-fA-F]{6}$/);
    assert.match(config.scaffoldOuter, /^#[0-9a-fA-F]{6}$/);
    assert.ok(typeof config.pulseSpeed === 'number');
    assert.ok(typeof config.glitchIntensity === 'number');
  }

  // Ensure 'stressed' is completely removed
  assert.equal((themeConfig.emotions as Record<string, unknown>).stressed, undefined);
});

test('Calm emotional state characteristics: Midnight blue base and smooth rotations', () => {
  const calm = themeConfig.emotions.calm;
  assert.equal(calm.name, 'Calm');
  assert.equal(calm.rotationSpeed, 0.8);
  assert.equal(calm.shakeEnabled, false);
  assert.equal(calm.hazardStripes, false);
});

test('Confident emotional state characteristics: Emerald/cyan, fast rotations, pulsing light', () => {
  const confident = themeConfig.emotions.confident;
  assert.equal(confident.name, 'Confident');
  assert.equal(confident.primary3d.toLowerCase(), '#10b981');
  assert.equal(confident.secondary3d.toLowerCase(), '#00f0ff');
  assert.ok(confident.rotationSpeed >= 2.0);
});

test('Angry emotional state characteristics: Crimson/orange, erratic glitch, screen shake', () => {
  const angry = themeConfig.emotions.angry;
  assert.equal(angry.name, 'Angry');
  assert.equal(angry.primary3d.toLowerCase(), '#ef4444');
  assert.equal(angry.shakeEnabled, true);
  assert.ok(angry.rotationSpeed >= 3.0);
  assert.ok(angry.glitchIntensity >= 0.7);
});

test('Sad emotional state characteristics: Deep purple/dim gray, sluggish drooping rotation', () => {
  const sad = themeConfig.emotions.sad;
  assert.equal(sad.name, 'Sad');
  assert.equal(sad.primary3d.toLowerCase(), '#6b21a8');
  assert.ok(sad.rotationSpeed <= 0.5);
  assert.equal(sad.shakeEnabled, false);
});
