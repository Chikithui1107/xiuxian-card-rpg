require('./register-ts.cjs');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { CARD_TEMPLATES } = require('../src/lib/battle-deck.ts');
const { resolveCardEffects, INITIAL_COMBAT_BUFFS } = require('../src/lib/battle-resolve.ts');
const face = require('../src/lib/card-face-display.ts');
const { getCardKeywordTips } = require('../src/data/sword-keywords.ts');
const lineText = line => line && line.tokens.map(t => t.text).join('');

test('一劍霜寒 face shows the damage the card will actually deal, hidden when it equals the base', () => {
  const yijian = CARD_TEMPLATES.yijian;
  const base = yijian.effects.find(fx => fx.kind === 'damage_yijian').base;
  for (const swordIntent of [0, 1, 4, 9]) for (const nurtureSword of [0, 1, 2]) for (const enemyVulnerable of [false, true]) {
    const preview = face.buildCardFacePreviewFromSword({ swordIntent, nurtureSword, enemyVulnerable });
    const [dealt] = resolveCardEffects(yijian, { hp: 60, energy: 3, ...INITIAL_COMBAT_BUFFS, swordIntent, nurtureSword }, { enemyVulnerable }).damageHits;
    assert.equal(lineText(face.getSwordFaceLiveLine('yijian', preview)), dealt === base ? null : `目前 ${dealt} 點傷害`);
  }
  const boosted = face.buildCardFacePreviewFromSword({ swordIntent: 4, nurtureSword: 1, enemyVulnerable: true });
  assert.equal(face.getSwordFaceLiveLine('fuxue', boosted), null);
  assert.equal(face.getSwordFaceLiveLine('yijian', undefined), null);
  assert.equal(face.getKarmaCardFaceDisplay('yijian', boosted), null);
});

test('detail keyword tips follow description order without duplicates, skip card names, then add 能力／消耗', () => {
  const terms = card => getCardKeywordTips(card).map(k => k.term);
  assert.deepEqual(terms({ description: '找出【一劍霜寒】。附加 1 層【破綻】，獲得【劍意】與【破綻】。', type: '技能' }), ['破綻', '劍意']);
  assert.deepEqual(terms({ description: '【toString】【劍罡】', type: '能力', isExhaust: true }), ['劍罡', '能力', '消耗']);
  assert.deepEqual(terms({ description: '造成 7 點傷害。', type: '攻擊' }), []);
});
