// Run: node --test tests/tutorial.test.cjs. Uses the project's TypeScript compiler.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const root = path.resolve(__dirname, '..');
const resolve = Module._resolveFilename;
Module._resolveFilename = function(request, ...args) {
  return resolve.call(this, request.startsWith('@/') ? path.join(root, 'src', request.slice(2)) : request, ...args);
};
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, filename);
const t = require('../src/lib/tutorial.ts');
const { planPlayerHitSteps } = require('../src/lib/combat-feedback.ts');
const hit = (state, id) => {
  const card = state.deck.hand.find(c => c.id === id);
  assert.ok(card, id);
  const played = t.playTutorialCard(state, card.instanceId);
  assert.notEqual(played, state);
  return t.impactTutorialCard(played);
};
const nextTurn = state => {
  let s = t.endTutorialTurn(state);
  assert.notEqual(s, state);
  for (const step of planPlayerHitSteps(s.buffs.swordGuard, t.PRACTICE_ATTACK)) {
    s = step.kind === 'hp' ? { ...s, hp: s.hp - step.amount } : { ...s, buffs: { ...s.buffs, swordGuard: s.buffs.swordGuard - step.amount } };
  }
  return { ...t.drawTutorialTurn(s), busy: false };
};
test('guided sequence uses real cost, block, draw and 33 damage; free play can win', () => {
  let s = { ...t.createTutorialState(), step: 'guard' };
  const initial = s;
  assert.equal(t.playTutorialCard(s, s.deck.hand.find(c => c.id === 'fuxue').instanceId), s);
  assert.equal(t.endTutorialTurn(s), s);
  s = hit(s, 'jiangang');
  assert.equal(s.energy, 2); assert.equal(s.buffs.swordGuard, 7);
  s = hit(s, 'fuxue');
  assert.equal(s.enemyHp, 45); assert.equal(s.buffs.swordIntent, 2);
  s = nextTurn(s);
  assert.equal(s.hp, 60); assert.equal(s.buffs.swordGuard, 0); assert.equal(s.energy, 3);
  s = hit(s, 'ningshuang');
  assert.equal(s.energy, 2); assert.equal(s.buffs.swordIntent, 6);
  s = hit(s, 'yijian');
  assert.equal(s.lastDamage, 33); assert.equal(s.enemyHp, 12); assert.equal(s.energy, 0); assert.equal(s.step, 'free');
  assert.equal(t.playTutorialCard(s, s.deck.hand[0].instanceId), s);
  for (let i = 0; i < 15 && s.step !== 'won'; i++) {
    const card = s.deck.hand.find(c => c.cost <= s.energy && ['fuxue', 'yijian'].includes(c.id));
    s = card ? hit(s, card.id) : nextTurn(s);
  }
  assert.equal(s.step, 'won');
  assert.equal(initial.enemyHp, 52); assert.equal(initial.energy, 3);
});
test('double input, stale instance, early end and duplicate impact cannot advance teaching', () => {
  let s = t.createTutorialState();
  assert.equal(t.playTutorialCard(s, s.deck.hand[0].instanceId), s);
  s = { ...s, step: 'guard' };
  const played = t.playTutorialCard(s, s.deck.hand[0].instanceId);
  assert.equal(t.playTutorialCard(played, s.deck.hand[0].instanceId), played);
  assert.equal(t.endTutorialTurn(played), played);
  const done = t.impactTutorialCard(played);
  assert.equal(t.impactTutorialCard(done), done);
  assert.equal(t.playTutorialCard(done, 'missing'), done);
});
test('only tutorial status is stored; skipped replay preserves completion; unavailable storage is safe', () => {
  const values = new Map([['xiuxian_run_v2', 'original-save'], ['xiuxian_story_seen_v1', '[]']]);
  global.localStorage = { getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
  assert.equal(t.readTutorialOutcome(), null);
  t.saveTutorialOutcome('skipped'); assert.equal(t.readTutorialOutcome(), 'skipped');
  t.saveTutorialOutcome('completed'); t.saveTutorialOutcome('skipped');
  assert.equal(t.readTutorialOutcome(), 'completed');
  assert.equal(values.get('xiuxian_run_v2'), 'original-save');
  assert.equal(values.get('xiuxian_story_seen_v1'), '[]');
  global.localStorage = { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } };
  assert.equal(t.readTutorialOutcome(), null); assert.doesNotThrow(() => t.saveTutorialOutcome('completed'));
  delete global.localStorage;
});
