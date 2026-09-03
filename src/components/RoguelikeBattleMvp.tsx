"use client";

import { useCallback, useMemo, useState } from "react";
import {
  CARD_TEMPLATES,
  createBattleDeck,
  discardHand,
  drawCards,
  getCardTemplate,
  playCardFromHand,
  type CardTemplateId,
} from "@/lib/battle-deck";
import { resolveCardEffects, rollStackDodge } from "@/lib/battle-resolve";
import type { BattleDeckState, Card } from "@/types/battle";
import type { PlayerBattleState } from "@/lib/battle-resolve";

const MAX_HP = 60;
const MAX_ENERGY = 3;
const HAND_SIZE = 4;
const ENEMY_MAX_HP = 45;

const STARTER_DECK: CardTemplateId[] = [
  "fuxue",
  "fuxue",
  "tuxu",
  "lingtai",
  "cangfeng",
  "ningshuang",
  "yijian",
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
    swordIntent: 0,
    dodge: 0,
    nextSwordBonus: 0,
  };
}

export default function RoguelikeBattleMvp() {
  const [player, setPlayer] = useState<PlayerBattleState>(initialPlayer);
  const [enemy, setEnemy] = useState({ hp: ENEMY_MAX_HP, intentIndex: 0 });
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
    setEnemy({ hp: ENEMY_MAX_HP, intentIndex: 0 });
    setDeck(createBattleDeck(STARTER_DECK, HAND_SIZE));
    setPhase("playing");
    setLastHit(null);
    setLog(["重新開始試煉。"]);
  }, []);

  const playCard = useCallback(
    (card: Card) => {
      if (phase !== "playing") return;
      if (player.energy < card.cost) return;

      const template = getCardTemplate(card);
      if (!template) return;

      const { deck: afterPlay, played } = playCardFromHand(deck, card.instanceId);
      if (!played) return;

      const { player: nextPlayer, damage, draw, energyDelta } = resolveCardEffects(
        template,
        player
      );

      const updatedPlayer: PlayerBattleState = {
        ...nextPlayer,
        energy: Math.min(MAX_ENERGY, player.energy + energyDelta),
      };

      let nextDeck = drawCards(afterPlay, draw);

      let enemyHp = enemy.hp;
      if (damage > 0) {
        enemyHp = Math.max(0, enemy.hp - damage);
        setLastHit(damage);
        pushLog(`【${card.name}】造成 ${damage} 傷害`);
      } else {
        pushLog(`打出【${card.name}】`);
      }

      setPlayer(updatedPlayer);
      setDeck(nextDeck);
      setEnemy((e) => ({ ...e, hp: enemyHp }));

      if (enemyHp <= 0) {
        setPhase("won");
        pushLog("妖狼伏誅，試煉勝利！");
      }
    },
    [phase, player, deck, enemy.hp, pushLog]
  );

  const endTurn = useCallback(() => {
    if (phase !== "playing") return;

    let nextDeck = discardHand(deck);
    const intent = ENEMY_INTENTS[enemy.intentIndex];
    let dmg = intent.damage;

    let nextPlayer = { ...player };
    if (dmg > 0 && nextPlayer.dodge > 0) {
      const dodged = rollStackDodge(nextPlayer.dodge);
      nextPlayer = { ...nextPlayer, dodge: 0 };
      if (dodged) {
        dmg = 0;
        pushLog(`【閃避】化解了敵人的${intent.label}！`);
      } else {
        pushLog(`【閃避】未能完全化解，受到 ${dmg} 傷害`);
      }
    } else if (dmg > 0) {
      pushLog(`敵人${intent.label}，受到 ${dmg} 傷害`);
    } else {
      pushLog(`敵人${intent.label}（${intent.description}）`);
    }

    const newHp = Math.max(0, nextPlayer.hp - dmg);
    nextPlayer = { ...nextPlayer, hp: newHp, energy: MAX_ENERGY };
    const nextIntent = (enemy.intentIndex + 1) % ENEMY_INTENTS.length;

    nextDeck = drawCards(nextDeck, HAND_SIZE);

    setPlayer(nextPlayer);
    setDeck(nextDeck);
    setEnemy({ hp: enemy.hp, intentIndex: nextIntent });
    setLastHit(null);

    if (newHp <= 0) {
      setPhase("lost");
      pushLog("氣血耗盡，試煉失敗……");
    }
  }, [phase, deck, player, enemy, pushLog]);

  const deckTotal = useMemo(
    () =>
      deck.drawPile.length +
      deck.hand.length +
      deck.discardPile.length +
      deck.exhaustPile.length,
    [deck]
  );

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col bg-[#0c0b0a] font-serif text-stone-100">
      <header className="border-b border-[#4a7c6f]/20 px-4 py-3 text-center">
        <p className="text-[10px] tracking-[0.35em] text-[#7aab9a]">霜寒試煉</p>
        <h1 className="text-lg font-bold text-[#c9a84c]">劍修戰鬥 MVP</h1>
      </header>

      <section className="mx-3 mt-3 rounded-lg border border-[#8b3a3a]/40 bg-[#1a1414]/90 p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-[#c48888]">妖狼 · 練氣圓滿</p>
            <p className="text-2xl font-bold text-stone-200">
              {enemy.hp}
              <span className="text-sm text-stone-500"> / {ENEMY_MAX_HP}</span>
            </p>
          </div>
          <div className="rounded border border-amber-500/40 bg-amber-950/40 px-2 py-1 text-right">
            <p className="text-[9px] text-amber-400">下回合意圖</p>
            <p className="text-sm font-bold text-amber-200">{currentIntent.label}</p>
            <p className="text-[9px] text-stone-400">{currentIntent.description}</p>
          </div>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/50">
          <div
            className="h-full rounded-full bg-gradient-to-r from-red-900 to-red-500 transition-all"
            style={{ width: `${(enemy.hp / ENEMY_MAX_HP) * 100}%` }}
          />
        </div>
        <div className="mt-2 flex gap-1">
          {ENEMY_INTENTS.map((it, i) => (
            <span
              key={it.id}
              className={`rounded px-1.5 py-0.5 text-[8px] ${
                i === enemy.intentIndex
                  ? "bg-amber-500/30 text-amber-200"
                  : "bg-stone-800 text-stone-500"
              }`}
            >
              {it.label}
            </span>
          ))}
        </div>
      </section>

      <section className="mx-3 mt-3 rounded-lg border border-[#c9a84c]/25 bg-[#1a1814]/90 p-4">
        <div className="mb-2 flex gap-2 text-[10px]">
          <BuffPill label="劍意" value={player.swordIntent} highlight={player.swordIntent > 0} />
          <BuffPill
            label="閃避"
            value={
              player.dodge > 0
                ? `${player.dodge}層 ${Math.round(Math.min(1, player.dodge * 0.5) * 100)}%`
                : "0"
            }
            highlight={player.dodge > 0}
          />
          {player.nextSwordBonus > 0 && (
            <BuffPill
              label="養劍"
              value={`+${Math.round(player.nextSwordBonus * 100)}%`}
              highlight
            />
          )}
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-[#7aab9a]">
            氣血 {player.hp}/{MAX_HP}
          </span>
          <span className="text-[#c9a84c]">
            真元 {player.energy}/{MAX_ENERGY}
          </span>
          {lastHit !== null && (
            <span className="text-stone-400">上式 {lastHit}</span>
          )}
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-black/50">
          <div
            className="h-full rounded-full bg-[#4a7c6f] transition-all"
            style={{ width: `${(player.hp / MAX_HP) * 100}%` }}
          />
        </div>
      </section>

      <section className="mx-3 mt-2 flex justify-center gap-4 text-center text-[10px] text-stone-500">
        <span>牌庫 {deck.drawPile.length}</span>
        <span>手牌 {deck.hand.length}</span>
        <span>棄牌 {deck.discardPile.length}</span>
        <span>消耗 {deck.exhaustPile.length}</span>
        <span>牌組 {deckTotal}</span>
      </section>

      <section className="mx-3 mt-3 flex-1 overflow-x-auto">
        <p className="mb-2 text-[10px] text-[#7aab9a]">手牌</p>
        <div className="flex gap-2 pb-2">
          {deck.hand.map((card) => {
            const template = CARD_TEMPLATES[card.id as CardTemplateId];
            const affordable = player.energy >= card.cost;
            return (
              <button
                key={card.instanceId}
                type="button"
                disabled={phase !== "playing" || !affordable}
                onClick={() => playCard(card)}
                className="ink-card flex flex-col p-2 text-left transition hover:border-[#7aab9a]/50 disabled:opacity-40"
              >
                <div className="flex justify-between text-[9px]">
                  <span className="text-[#c9a84c]">{template?.type}</span>
                  <span className={affordable ? "text-[#7aab9a]" : "text-red-400"}>
                    {card.cost}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-[10px] font-bold leading-tight text-stone-200">{card.name}</p>
                <p className="mt-0.5 text-[8px] text-stone-600">{card.instanceId}</p>
                <p className="mt-1 min-h-0 flex-1 overflow-hidden text-[8px] leading-snug text-stone-500">
                  {template?.description}
                </p>
                {card.isExhaust && (
                  <p className="mt-1 text-[8px] text-amber-500">消耗</p>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <footer className="mx-3 mb-4 space-y-2">
        <button
          type="button"
          disabled={phase !== "playing"}
          onClick={endTurn}
          className="w-full rounded-lg border border-[#c9a84c]/50 bg-[#2a2620] py-3 text-sm font-bold text-[#c9a84c] disabled:opacity-40"
        >
          收功結束回合
        </button>
        {(phase === "won" || phase === "lost") && (
          <button
            type="button"
            onClick={resetBattle}
            className="w-full rounded-lg border border-[#7aab9a]/40 py-2 text-xs text-[#7aab9a]"
          >
            再戰一局
          </button>
        )}
        <div className="max-h-24 overflow-y-auto rounded border border-stone-800 bg-black/30 p-2 text-[9px] text-stone-500">
          {log.map((line, i) => (
            <p key={`${line}-${i}`}>{line}</p>
          ))}
        </div>
      </footer>
    </div>
  );
}

function BuffPill({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded border px-2 py-0.5 ${
        highlight
          ? "border-[#c9a84c]/40 bg-[#c9a84c]/10 text-[#c9a84c]"
          : "border-stone-700 text-stone-500"
      }`}
    >
      <span className="opacity-70">{label} </span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
