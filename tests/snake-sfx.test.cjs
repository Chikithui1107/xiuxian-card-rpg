require('./register-ts.cjs');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { getSnakeAttackTimeline, SNAKE_ATTACK_TIMELINES, SNAKE_MIN_RETRACT_MS } = require('../src/lib/snake-sfx.ts');

const snake = { id: 'enemy_spirit_snake', monsterSprite: 'spirit_snake' };
const gaps = t => t.impactsMs.slice(1).map((ms, i) => ms - t.impactsMs[i]);

function wavSeconds(file) {
  const buf = fs.readFileSync(file);
  assert.equal(buf.toString('ascii', 0, 4), 'RIFF');
  assert.equal(buf.toString('ascii', 8, 12), 'WAVE');
  let off = 12, byteRate = 0, dataBytes = 0;
  while (off + 8 <= buf.length) {
    const id = buf.toString('ascii', off, off + 4), size = buf.readUInt32LE(off + 4);
    if (id === 'fmt ') byteRate = buf.readUInt32LE(off + 16);
    if (id === 'data') dataBytes = size;
    off += 8 + size + (size % 2);
  }
  return dataBytes / byteRate;
}

test('雙噬: one short hiss, bites at 0.25s and 0.40s', () => {
  const t = getSnakeAttackTimeline(snake, '雙噬', 2);
  assert.deepEqual(t.impactsMs, [250, 400]);
  assert.ok(t.hiss.durationSec <= 0.25);
  assert.equal(t.impactsMs[0] - t.lungeMs[0], 60, 'first lunge starts after the hiss begins');
});

test('毒牙: a single 0.15–0.25s hiss and one hit', () => {
  const t = getSnakeAttackTimeline(snake, '毒牙', 1);
  assert.equal(t.impactsMs.length, 1);
  assert.ok(t.hiss.durationSec >= 0.15 && t.hiss.durationSec <= 0.25);
});

test('亂噬: one thin hiss up to 0.5s, three hits tighter than 雙噬 but still separate', () => {
  const t = getSnakeAttackTimeline(snake, '亂噬', 3);
  assert.equal(t.impactsMs.length, 3);
  assert.ok(t.hiss.durationSec <= 0.5 && t.hiss.highpassHz > 0);
  const tight = gaps(t), double = gaps(getSnakeAttackTimeline(snake, '雙噬', 2));
  for (const g of tight) assert.ok(g < double[0] && g >= 100);
});

test('every follow-up lunge leaves time to retract so the animation replays', () => {
  for (const move of Object.keys(SNAKE_ATTACK_TIMELINES)) {
    const t = getSnakeAttackTimeline(snake, move, 5);
    for (let i = 1; i < t.impactsMs.length; i++) {
      assert.ok(t.impactsMs[i] - t.lungeMs[i] - t.impactsMs[i - 1] >= SNAKE_MIN_RETRACT_MS, `${move} hit ${i}`);
    }
  }
});

test('each clip fits inside snake_hiss.wav and only the snake gets a timeline', () => {
  const seconds = wavSeconds(path.join(__dirname, '../public/audio/sfx/snake_hiss.wav'));
  for (const { hiss } of Object.values(SNAKE_ATTACK_TIMELINES)) {
    assert.ok(hiss.offsetSec + hiss.durationSec * hiss.playbackRate <= seconds, 'clip within file');
  }
  assert.equal(getSnakeAttackTimeline({ id: 'enemy_wolf' }, '連爪', 3), null);
  assert.equal(getSnakeAttackTimeline({ id: 'enemy_bandit' }, '橫斬', 1), null);
  assert.equal(getSnakeAttackTimeline(snake, '蓄勢', 1), null);
});
