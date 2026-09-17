"use client";

import { useCallback, useState } from "react";
import {
  createBattleDeck,
  discardHand,
  drawCards,
  getCardTemplate,
  playCardFromHand,
  type CardTemplateId,
} from "@/lib/battle-deck";
import {
  INITIAL_COMBAT_BUFFS,
  resolveCardEffects,
  type PlayerBattleState,
} from "@/lib/battle-resolve";
import type { BattleDeckState, Card } from "@/types/battle";
import { getEffectiveCost } from "@/types/battle";

const MAX_HP = 60;
const MAX_ENERGY = 3;
const HAND_SIZE = 4;
const ENEMY_MAX_HP = 45;

const STARTER_DECK: CardTemplateId[] = [
  "fuxue",
  "fuxue",
  "jiangang",
  "lingtai",
];

const ENEMY_INTENTS = [
  { id: "attack", label: "斬擊", damage: 7, description: "造成 7 點傷害" },
  { id: "charge", label: "蓄勢", damage: 0, description: "積蓄劍勢，下回合重擊" },
  { id: "heavy", label: "重擊", damage: 12, description: "造成 12 點重擊傷害" },
] as const;

type Phase = "playing" | "won" | "lost";

function initialPlayer(): PlayerBattleState {
  return {
    hp: MAX_HP,
    energy: MAX_ENERGY,
    ...INITIAL_COMBAT_BUFFS,
  };
}

export default function RoguelikeBattleMvp() {
  const [player, setPlayer] = useState<PlayerBattleState>(initialPlayer);
  const [enemy, setEnemy] = useState({
    hp: ENEMY_MAX_HP,
    intentIndex: 0,
    vulnerabilityStacks: 0,
  });
  const [deck, setDeck] = useState<BattleDeckState>(() =>
    createBattleDeck(STARTER_DECK, HAND_SIZE)
  );
  const [phase, setPhase] = useState<Phase>("playing");
  const [log, setLog] = useState<string[]>(["試煉開始。妖狼 HP 45，擇劍而行。"]);
  const [lastHit, setLastHit] = useState<number | null>(null);

  const currentIntent = ENEMY_INTENTS[enemy.intentIndex];

  const pushLog = useCallback((msg: string) => {
    setLog((prev) => [msg, ...prev].slice(0, 8));
  }, []);

  const resetBattle = useCallback(() => {
    setPlayer(initialPlayer());
    setEnemy({ hp: ENEMY_MAX_HP, intentIndex: 0, vulnerabilityStacks: 0 });
    setDeck(createBattleDeck(STARTER_DECK, HAND_SIZE));
    setPhase("playing");
    setLastHit(null);
    setLog(["重新開始試煉。"]);
  }, []);

  const playCard = useCallback(
    (card: Card) => {
      if (phase !== "playing") return;
      const paid = getEffectiveCost(card);
      if (player.energy < paid) return;

      const template = getCardTemplate(card);
      if (!template) return;

      const { deck: afterPlay, played } = playCardFromHand(deck, card.instanceId);
      if (!played) return;

      const resolved = resolveCardEffects(template, player, {
        enemyVulnerable: enemy.vulnerabilityStacks > 0,
      });

      const updatedPlayer: PlayerBattleState = {
        ...resolved.player,
        energy: Math.max(0, player.energy - paid + (resolved.energyDelta + template.cost)),
      };

      let nextDeck = drawCards(afterPlay, resolved.draw);
      const totalDmg = resolved.damageHits.reduce((a, b) => a + b, 0);
      let enemyHp = enemy.hp;
      if (totalDmg > 0) {
        enemyHp = Math.max(0, enemy.hp - totalDmg);
        setLastHit(totalDmg);
        pushLog(`打出「${card.name}」，造成 ${totalDmg} 傷害。`);
      } else {
        setLastHit(null);
        pushLog(`打出「${card.name}」。`);
      }

      const vulnerabilityStacks =
        enemy.vulnerabilityStacks + resolved.applyVulnerabilityStacks;

      setPlayer(updatedPlayer);
      setDeck(nextDeck);
      setEnemy((prev) => ({ ...prev, hp: enemyHp, vulnerabilityStacks }));

      if (enemyHp <= 0) {
        setPhase("won");
        pushLog("妖狼倒下。試煉通過。");
      }
    },
    [phase, player, deck, enemy, pushLog]
  );

  const endTurn = useCallback(() => {
    if (phase !== "playing") return;

    let nextPlayer = {
      ...player,
      energy: MAX_ENERGY,
      swordGuard: 0,
      nurtureSword: Math.max(0, player.nurtureSword - 1),
    };
    let nextDeck = discardHand(deck);
    nextDeck = drawCards(nextDeck, HAND_SIZE);

    const intent = ENEMY_INTENTS[enemy.intentIndex];
    let dmg = intent.damage;
    let guard = nextPlayer.swordGuard;
    if (dmg > 0) {
      const blocked = Math.min(guard, dmg);
      guard -= blocked;
      dmg -= blocked;
      nextPlayer = {
        ...nextPlayer,
        swordGuard: guard,
        hp: Math.max(0, nextPlayer.hp - dmg),
      };
      pushLog(
        blocked > 0
          ? `敵方「${intent.label}」：劍罡抵 ${blocked}，受到 ${dmg} 傷害。`
          : `敵方「${intent.label}」：受到 ${dmg} 傷害。`
      );
    } else {
      pushLog(`敵方「${intent.label}」。`);
    }

    setPlayer(nextPlayer);
    setDeck(nextDeck);
    setEnemy((prev) => ({
      ...prev,
      intentIndex: (prev.intentIndex + 1) % ENEMY_INTENTS.length,
      vulnerabilityStacks: Math.max(0, prev.vulnerabilityStacks - 1),
    }));

    if (nextPlayer.hp <= 0) {
      setPhase("lost");
      pushLog("氣血歸零，試煉失敗。");
    }
  }, [phase, player, deck, enemy.intentIndex, pushLog]);

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col gap-4 bg-stone-950 px-4 py-6 text-stone-200">
      <header>
        <h1 className="text-lg font-bold tracking-[0.2em] text-[#c9a84c]">
          劍修試煉 MVP
        </h1>
        <p className="mt-1 text-xs text-stone-500">白夜養劍機制速測</p>
      </header>

      <section className="rounded-lg border border-stone-800 bg-stone-900/80 p-3">
        <p className="text-sm">
          妖狼 {enemy.hp}/{ENEMY_MAX_HP}
          {enemy.vulnerabilityStacks > 0
            ? ` · 破綻 ${enemy.vulnerabilityStacks}`
            : ""}
        </p>
        <p className="mt-1 text-xs text-stone-400">
          意圖：{currentIntent.label} — {currentIntent.description}
        </p>
        {lastHit != null && (
          <p className="mt-1 text-xs text-[#e09090]">上次傷害 {lastHit}</p>
        )}
      </section>

      <section className="rounded-lg border border-stone-800 bg-stone-900/80 p-3 text-sm">
        <p>
          HP {player.hp}/{MAX_HP} · 真元 {player.energy}
        </p>
        <p className="mt-1 text-xs text-stone-400">
          劍意 {player.swordIntent} · 劍罡 {player.swordGuard} · 養劍{" "}
          {player.nurtureSword}
        </p>
      </section>

      <section className="flex flex-col gap-2">
        {deck.hand.map((card) => (
          <button
            key={card.instanceId}
            type="button"
            disabled={phase !== "playing" || player.energy < getEffectiveCost(card)}
            onClick={() => playCard(card)}
            className="rounded border border-stone-700 bg-stone-900 px-3 py-2 text-left text-sm disabled:opacity-40"
          >
            <span className="font-semibold text-[#e8e0d4]">
              {card.name} · {getEffectiveCost(card)}
            </span>
          </button>
        ))}
      </section>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={endTurn}
          disabled={phase !== "playing"}
          className="flex-1 rounded bg-[#c9a84c]/20 py-2 text-sm text-[#c9a84c] disabled:opacity-40"
        >
          結束回合
        </button>
        <button
          type="button"
          onClick={resetBattle}
          className="rounded border border-stone-700 px-3 py-2 text-sm"
        >
          重置
        </button>
      </div>

      <ul className="space-y-1 text-xs text-stone-500">
        {log.map((line, i) => (
          <li key={`${i}-${line}`}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
