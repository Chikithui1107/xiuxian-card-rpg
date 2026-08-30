"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import cardsData from "@/data/cards.json";
import enemiesData from "@/data/enemies.json";
import startingDeckIds from "@/data/starting-deck.json";
import { HeroPanel } from "@/components/HeroPanel";
import { EnemyPanel } from "@/components/EnemyPanel";
import { CardHand } from "@/components/CardHand";
import { CardRewardModal } from "@/components/CardRewardModal";
import {
  calculateCardDamage,
  calculateHeroStats,
  getHero,
} from "@/lib/stats";
import {
  createDeckState,
  discardAllHand,
  drawCards,
  drawToHandSize,
  expandDeckTemplates,
  HAND_SIZE,
  MAX_ENERGY,
  pickRandomCards,
  playCardFromHand,
  resetInstanceCounter,
  type DeckState,
} from "@/lib/deck";
import type {
  Card,
  CombatEnemy,
  CombatPhase,
  DamagePopup,
  Enemy,
} from "@/types/game";
import { HIGH_DAMAGE_THRESHOLD } from "@/types/game";

const CARD_POOL = cardsData as Card[];
const ENEMY_LIST = enemiesData as Enemy[];
const INITIAL_DECK_IDS = startingDeckIds as string[];

const EMPTY_DECK: DeckState = { drawPile: [], hand: [], discardPile: [] };

function createEnemy(template: Enemy): CombatEnemy {
  return { ...template, currentHp: template.maxHp };
}

function initBattleDeck(permanentDeck: Card[]): DeckState {
  resetInstanceCounter();
  const deck = createDeckState(permanentDeck);
  return drawCards(deck, HAND_SIZE);
}

function createInitialGameState() {
  const permanentDeck = expandDeckTemplates(INITIAL_DECK_IDS, CARD_POOL);
  return {
    permanentDeck,
    deckState: initBattleDeck(permanentDeck),
  };
}

export default function CombatSandbox() {
  const hero = getHero();
  const heroStats = calculateHeroStats(hero);

  const [ready, setReady] = useState(false);
  const [permanentDeck, setPermanentDeck] = useState<Card[]>([]);
  const [enemyIndex, setEnemyIndex] = useState(0);
  const [floor, setFloor] = useState(1);
  const [enemy, setEnemy] = useState<CombatEnemy>(() =>
    createEnemy(ENEMY_LIST[0])
  );
  const [deckState, setDeckState] = useState<DeckState>(EMPTY_DECK);
  const popupIdRef = useRef(0);
  const [energy, setEnergy] = useState(MAX_ENERGY);
  const [playerHp, setPlayerHp] = useState(heroStats.maxHp);
  const [phase, setPhase] = useState<CombatPhase>("playing");
  const [damagePopups, setDamagePopups] = useState<DamagePopup[]>([]);
  const [isShaking, setIsShaking] = useState(false);
  const [lastDamage, setLastDamage] = useState<ReturnType<
    typeof calculateCardDamage
  > | null>(null);
  const [lastEnemyDamage, setLastEnemyDamage] = useState<number | null>(null);
  const [totalDamage, setTotalDamage] = useState(0);
  const [rewardCards, setRewardCards] = useState<Card[]>([]);
  const [defeatedEnemyName, setDefeatedEnemyName] = useState("");

  useEffect(() => {
    const initial = createInitialGameState();
    setPermanentDeck(initial.permanentDeck);
    setDeckState(initial.deckState);
    setReady(true);
  }, []);

  const isPlaying = phase === "playing";
  const deckCount = permanentDeck.length;

  const addDamagePopup = useCallback((result: ReturnType<typeof calculateCardDamage>) => {
    popupIdRef.current += 1;
    const popup: DamagePopup = {
      id: `popup_${popupIdRef.current}`,
      value: result.damage,
      isCrit: result.isCrit,
      isHighDamage: result.damage >= HIGH_DAMAGE_THRESHOLD,
      x: 30 + Math.random() * 40,
      y: 20 + Math.random() * 20,
    };
    setDamagePopups((prev) => [...prev, popup]);
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 350);
    setTimeout(() => {
      setDamagePopups((prev) => prev.filter((p) => p.id !== popup.id));
    }, 1100);
  }, []);

  const checkVictory = useCallback(
    (newHp: number, enemyName: string) => {
      if (newHp <= 0) {
        setPhase("victory");
        setDefeatedEnemyName(enemyName);
        setRewardCards(pickRandomCards(CARD_POOL, 3));
      }
    },
    []
  );

  const playCard = useCallback(
    (instance: { instanceId: string; card: Card }) => {
      if (!isPlaying || enemy.currentHp <= 0) return;
      if (energy < instance.card.energyCost) return;

      const { state: afterPlay, played } = playCardFromHand(
        deckState,
        instance.instanceId
      );
      if (!played) return;

      const result = calculateCardDamage(heroStats, played.card);
      setLastDamage(result);
      setEnergy((e) => e - played.card.energyCost);

      const newHp = Math.max(0, enemy.currentHp - result.damage);
      setEnemy((prev) => ({ ...prev, currentHp: newHp }));
      setTotalDamage((prev) => prev + result.damage);
      addDamagePopup(result);

      // 出牌後補牌至 HAND_SIZE
      setDeckState(drawToHandSize(afterPlay, HAND_SIZE));

      checkVictory(newHp, enemy.name);
    },
    [
      isPlaying,
      enemy,
      energy,
      deckState,
      heroStats,
      addDamagePopup,
      checkVictory,
    ]
  );

  const endTurn = useCallback(() => {
    if (!isPlaying || enemy.currentHp <= 0) return;

    // a. 清空手牌至棄牌堆
    let newDeck = discardAllHand(deckState);

    // b. 重置靈力
    setEnergy(MAX_ENERGY);

    // c. 敵人反擊
    const dmg = enemy.attackDamage;
    setLastEnemyDamage(dmg);
    const newPlayerHp = Math.max(0, playerHp - dmg);
    setPlayerHp(newPlayerHp);

    if (newPlayerHp <= 0) {
      setDeckState(newDeck);
      setPhase("defeat");
      return;
    }

    // d. 從牌庫重抽 HAND_SIZE 張
    newDeck = drawCards(newDeck, HAND_SIZE);
    setDeckState(newDeck);
    setLastDamage(null);
  }, [isPlaying, enemy, deckState, playerHp]);

  const startNextBattle = useCallback(
    (updatedDeck: Card[]) => {
      const nextIndex = enemyIndex + 1;
      const nextEnemy = ENEMY_LIST[nextIndex % ENEMY_LIST.length];

      setPermanentDeck(updatedDeck);
      setEnemyIndex(nextIndex);
      setFloor((f) => f + 1);
      setEnemy(createEnemy(nextEnemy));
      setDeckState(initBattleDeck(updatedDeck));
      setEnergy(MAX_ENERGY);
      setPhase("playing");
      setDamagePopups([]);
      setLastDamage(null);
      setLastEnemyDamage(null);
      setRewardCards([]);
      setDefeatedEnemyName("");
    },
    [enemyIndex]
  );

  const handleRewardSelect = useCallback(
    (card: Card) => {
      const updatedDeck = [...permanentDeck, card];
      startNextBattle(updatedDeck);
    },
    [permanentDeck, startNextBattle]
  );

  const handleRestart = useCallback(() => {
    const initial = createInitialGameState();
    setPermanentDeck(initial.permanentDeck);
    setEnemyIndex(0);
    setFloor(1);
    setEnemy(createEnemy(ENEMY_LIST[0]));
    setDeckState(initial.deckState);
    setEnergy(MAX_ENERGY);
    setPlayerHp(heroStats.maxHp);
    setPhase("playing");
    setDamagePopups([]);
    setLastDamage(null);
    setLastEnemyDamage(null);
    setTotalDamage(0);
    setRewardCards([]);
  }, [heroStats.maxHp]);

  const deckInfo = useMemo(
    () => ({
      draw: deckState.drawPile.length,
      discard: deckState.discardPile.length,
    }),
    [deckState]
  );

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <p className="text-sm tracking-[0.4em] text-[#8a7340]">載入中…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      <header className="border-b border-[#2a2824] bg-[#1a1814]/80 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-[0.3em] text-[#c9a84c]">
              修仙卡牌
            </h1>
            <p className="text-xs text-[#5a5550]">
              階段一 · 牌庫流轉與回合制戰鬥
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-[#5a5550]">累計傷害</p>
            <p className="stat-value text-lg font-bold text-[#c9a84c]">
              {totalDamage.toLocaleString()}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 p-6 lg:grid-cols-[280px_1fr]">
        <aside>
          <HeroPanel
            hero={hero}
            stats={heroStats}
            currentHp={playerHp}
            energy={energy}
            floor={floor}
          />
        </aside>

        <section className="space-y-6">
          <EnemyPanel
            enemy={enemy}
            damagePopups={damagePopups}
            isShaking={isShaking}
            lastEnemyDamage={lastEnemyDamage}
          />

          <div className="rounded-lg border border-[#3a3530] bg-[#1a1814] p-4">
            <CardHand
              hand={deckState.hand}
              energy={energy}
              drawPileCount={deckInfo.draw}
              discardPileCount={deckInfo.discard}
              deckCount={deckCount}
              onPlayCard={playCard}
              onEndTurn={endTurn}
              lastDamage={lastDamage}
              disabled={!isPlaying || enemy.currentHp <= 0}
            />
          </div>
        </section>
      </div>

      {phase === "victory" && (
        <CardRewardModal
          rewardCards={rewardCards}
          onSelect={handleRewardSelect}
          enemyName={defeatedEnemyName}
        />
      )}

      {phase === "defeat" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0a]/85 backdrop-blur-sm">
          <div className="mx-4 rounded-xl border-2 border-[#8b2020]/50 bg-[#1a1814] p-8 text-center">
            <p className="text-sm tracking-[0.4em] text-[#8a7340]">氣血耗盡</p>
            <h2 className="mt-2 text-2xl font-bold tracking-widest text-[#c45c5c]">
              道途殞落
            </h2>
            <p className="mt-2 text-xs text-[#5a5550]">第 {floor} 層 · 修為歸零</p>
            <button
              onClick={handleRestart}
              className="mt-6 rounded-lg border-2 border-[#c9a84c]/40 px-8 py-2.5 text-sm font-bold tracking-widest text-[#c9a84c] transition hover:bg-[#c9a84c]/10"
            >
              重新修煉
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
