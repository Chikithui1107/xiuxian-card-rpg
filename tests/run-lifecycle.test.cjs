// Exercise the real GamePage hooks and saves; child presentation is stubbed.
require('./register-ts.cjs');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { JSDOM } = require('jsdom');
const React = require('react');
const { act } = React;
const { createRoot } = require('react-dom/client');
require.extensions['.tsx'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
}).outputText, filename);
const views = new Map();
const components = new Map();
const originalLoad = Module._load;
Module._load = function(request, ...args) {
  if (request === '@/lib/combat-audio' || request === '@/lib/bgm') return new Proxy({}, { get: () => () => {} });
  if (request.startsWith('@/components/')) {
    const name = request.split('/').at(-1);
    if (!components.has(name)) components.set(name, props => {
      views.set(name, props);
      return React.createElement('section', { 'data-view': name }, props.children, props.inGameMenu, props.bottomNav);
    });
    return { [name]: components.get(name), MAX_CALAMITY_LEVEL: 10, getCalamityLabel: () => '凡境' };
  }
  return originalLoad.call(this, request, ...args);
};
const GamePage = require('../src/app/page.tsx').default;
const { getCharacter } = require('../src/data/characters.ts');
const { getAvailableNodes } = require('../src/lib/map.ts');
const RUN = 'xiuxian_active_run_v1';
const PROGRESS = 'xiuxian_character_progress_v1';
const readRun = () => JSON.parse(localStorage.getItem(RUN));
const props = name => { assert.ok(views.has(name), name); return views.get(name); };
const step = callback => act(async () => { callback(); });

test('earned deck restores from checkpoint; defeat, abandon, stale callbacks, refresh and character switch cannot leak it to a new run', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' });
  Object.assign(global, { window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true });
  window.confirm = () => true;
  let root = createRoot(document.getElementById('root'));
  localStorage.setItem('xiuxian_baiye_tutorial_v1', 'skipped');
  const render = () => step(() => root.render(React.createElement(React.StrictMode, null, React.createElement(GamePage))));
  const skipStory = async () => {
    for (let i = 0; i < 15 && document.querySelector('[data-view="StoryOverlay"]'); i++) await step(() => props('StoryOverlay').onSkip());
  };
  const start = async () => {
    await step(() => props('LobbyView').onEnterDungeon());
    await step(() => props('CultivationStartView').onStart());
    await skipStory();
  };
  try {
    await render();
    await start();
    const fresh = readRun();
    assert.deepEqual(fresh.permanentDeck, getCharacter('baiye').startingDeck);
    assert.equal(fresh.runSpirit, 100);
    // A valid checkpoint with earned cards represents both reward and shop acquisition.
    const earned = { ...fresh, permanentDeck: [...fresh.permanentDeck, 'fuxue', 'yijian'], runSpirit: 45 };
    await step(() => root.unmount());
    localStorage.setItem(RUN, JSON.stringify(earned));
    root = createRoot(document.getElementById('root'));
    await render();
    assert.equal(props('LobbyView').deckCount, earned.permanentDeck.length);
    await step(() => props('LobbyView').onContinueGame());
    const node = getAvailableNodes(readRun().dungeonMap).find(n => ['combat', 'elite', 'boss'].includes(n.type));
    assert.ok(node);
    await step(() => props('PathChoiceView').onSelectNode(node));
    await skipStory();
    const oldCombat = props('CombatView');
    assert.equal(oldCombat.deckCount, earned.permanentDeck.length);
    await step(() => props('InGameMenu').onQuit());
    assert.equal(localStorage.getItem(RUN), null);
    assert.equal(props('DefeatOverlay').reason, 'abandoned');
    const restart = props('DefeatOverlay').onRestart;
    await step(() => { restart(); restart(); });
    const restarted = readRun();
    assert.notEqual(restarted.runSessionId, fresh.runSessionId);
    assert.deepEqual(restarted.permanentDeck, getCharacter('baiye').startingDeck);
    assert.equal(restarted.runSpirit, 100);
    assert.equal(restarted.playerHp, fresh.playerHp);
    await skipStory();
    // A callback from the abandoned battle arrives after the new run has already started.
    await step(() => {
      assert.equal(oldCombat.onPlayCard(oldCombat.hand[0]), false);
      assert.equal(oldCombat.onEndTurn(), false);
      oldCombat.onCombatImpact('yijian');
      oldCombat.applyPlayerImpactStep({ kind: 'hp', amount: 999 });
      oldCombat.onEndTurnDraw();
      oldCombat.onEndTurnSequenceDone();
    });
    assert.deepEqual(readRun(), restarted);
    const nextNode = getAvailableNodes(restarted.dungeonMap).find(n => n.type === 'combat');
    await step(() => props('PathChoiceView').onSelectNode(nextNode));
    await skipStory();
    await step(() => props('CombatView').applyPlayerImpactStep({ kind: 'hp', amount: 999 }));
    assert.equal(localStorage.getItem(RUN), null);
    assert.equal(props('DefeatOverlay').reason, 'defeated');
    // Refresh directly on defeat cannot resurrect a checkpoint or reward cards.
    await step(() => root.unmount());
    root = createRoot(document.getElementById('root'));
    await render();
    assert.equal(props('LobbyView').hasActiveRun, false);
    assert.equal(props('LobbyView').deckCount, getCharacter('baiye').startingDeck.length);
    await step(() => props('CharacterSelectModal').onConfirm('moyi'));
    assert.equal(props('LobbyView').character.id, 'moyi');
    await start();
    assert.deepEqual(readRun().permanentDeck, getCharacter('moyi').startingDeck);
    await step(() => props('InGameMenu').onQuit());
    await step(() => props('DefeatOverlay').onReturnMenu());
    assert.equal(props('LobbyView').hasActiveRun, false);
    assert.equal(localStorage.getItem(RUN), null);
    const progress = JSON.parse(localStorage.getItem(PROGRESS));
    assert.deepEqual(progress.baiye.permanentDeck, getCharacter('baiye').startingDeck);
    assert.deepEqual(progress.moyi.permanentDeck, getCharacter('moyi').startingDeck);
    assert.equal(progress.baiye.spiritStones, fresh.spiritStones);
    // Resume at the earliest possible shop after one completed combat.
    // Exercise actual page pricing, affordability, offer validation and double clicks.
    const { completeMapNode } = require('../src/lib/map.ts');
    const map = completeMapNode(fresh.dungeonMap, fresh.dungeonMap[0][0].id);
    map[1][0].type = 'shop';
    for (const balance of [79, 80, 112]) {
      await step(() => root.unmount());
      localStorage.setItem(RUN, JSON.stringify({ ...fresh, dungeonMap: map, runSpirit: balance }));
      root = createRoot(document.getElementById('root'));
      await render();
      await step(() => props('LobbyView').onContinueGame());
      await skipStory();
      await step(() => props('PathChoiceView').onSelectNode(map[1][0]));
      const shop = props('ShopModal');
      assert.equal(shop.price, 80);
      assert.equal(shop.offerIds.length, 3);
      await step(() => shop.onBuy('not-an-offer'));
      assert.equal(readRun().runSpirit, balance);
      assert.deepEqual(readRun().permanentDeck, fresh.permanentDeck);
      await step(() => { shop.onBuy(shop.offerIds[0]); shop.onBuy(shop.offerIds[0]); });
      if (balance < 80) {
        assert.equal(readRun().runSpirit, balance);
        assert.deepEqual(readRun().permanentDeck, fresh.permanentDeck);
        await step(() => shop.onLeave());
      } else {
        assert.equal(readRun().runSpirit, balance - shop.price);
        assert.deepEqual(readRun().permanentDeck, [...fresh.permanentDeck, shop.offerIds[0]]);
      }
      assert.equal(readRun().dungeonMap[1][0].status, 'completed');
    }

  } finally {
    await step(() => root.unmount());
    dom.window.close();
    delete global.window; delete global.document; delete global.localStorage;
  }
});
