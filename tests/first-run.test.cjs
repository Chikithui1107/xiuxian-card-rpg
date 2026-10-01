require('./register-ts.cjs');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createActionScope } = require('../src/lib/action-scope.ts');
const journal = require('../src/lib/journey-events.ts');

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

test('abandon during windup or multi-hit cancels old damage and releases waits before a new battle', async () => {
  const old = createActionScope();
  let hp = 60;
  let oldActions = 0;
  old.schedule(() => { hp -= 7; oldActions++; }, 15);
  const enemyTurn = (async () => {
    if (!(await old.wait(20))) return;
    hp -= 6; oldActions++;
  })();
  old.cancel();
  const fresh = createActionScope();
  fresh.schedule(() => { hp -= 3; }, 1);
  await enemyTurn;
  await pause(35);
  assert.equal(oldActions, 0);
  assert.equal(hp, 57);
  assert.equal(await old.wait(0), false);
  old.schedule(() => { hp = 0; }, 0);
  await pause(5);
  assert.equal(hp, 57);
  fresh.cancel();
});

test('journey journal is bounded and hints never change run, tutorial or permanent saves', () => {
  const entries = new Map([
    ['xiuxian_active_run_v1', 'run'],
    ['xiuxian_character_progress_v1', 'progress'],
    ['xiuxian_baiye_tutorial_v1', 'completed'],
  ]);
  global.localStorage = { getItem: k => entries.get(k) ?? null, setItem: (k, v) => entries.set(k, v) };
  for (let i = 0; i < 210; i++) journal.recordJourneyEvent('battle_started', { index: i });
  assert.equal(journal.readJourneyEvents().length, 200);
  assert.equal(journal.readJourneyEvents()[0].data.index, 10);
  assert.equal(journal.shouldShowHint('path'), true);
  journal.rememberHint('path');
  assert.equal(journal.shouldShowHint('path'), false);
  assert.equal(journal.shouldShowHint('reward'), true);
  journal.rememberHint('disabled');
  assert.equal(journal.shouldShowHint('reward'), false);
  assert.equal(entries.get('xiuxian_active_run_v1'), 'run');
  assert.equal(entries.get('xiuxian_character_progress_v1'), 'progress');
  assert.equal(entries.get('xiuxian_baiye_tutorial_v1'), 'completed');
  entries.set(journal.JOURNEY_EVENTS_KEY, '{bad json');
  assert.deepEqual(journal.readJourneyEvents(), []);
  global.localStorage = { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } };
  assert.doesNotThrow(() => journal.recordJourneyEvent('run_started'));
  assert.doesNotThrow(() => journal.rememberHint('path'));
  delete global.localStorage;
});

test('cold hit loads once without late playback; cached hit starts now and scene exit stops it', async () => {
  let requests = 0;
  let starts = 0;
  let stops = 0;
  let release;
  class FakeAudioContext {
    state = 'running';
    destination = {};
    createGain() { return { gain: { value: 0 }, connect() {}, disconnect() {} }; }
    createBufferSource() { return { playbackRate: { value: 1 }, connect() {}, disconnect() {}, start() { starts++; }, stop() { stops++; } }; }
    async decodeAudioData() { return { duration: 1 }; }
  }
  const originalFetch = global.fetch;
  global.window = { AudioContext: FakeAudioContext };
  global.fetch = () => {
    requests++;
    return new Promise(resolve => { release = () => resolve({ ok: true, arrayBuffer: async () => new ArrayBuffer(512) }); });
  };
  const audio = require('../src/lib/combat-audio.ts');
  try {
    audio.playImpact('yijian');
    audio.playImpact('yijian');
    assert.equal(requests, 1);
    release();
    await pause(0);
    assert.equal(starts, 0, 'loading an expired hit must not replay it');
    audio.playImpact('yijian');
    assert.equal(starts, 1);
    audio.playBattleWinSfx();
    audio.cancelCombatAudio();
    assert.equal(stops, 1);
    assert.equal(starts, 1);
  } finally {
    audio.cancelCombatAudio();
    global.fetch = originalFetch;
    delete global.window;
  }
});
