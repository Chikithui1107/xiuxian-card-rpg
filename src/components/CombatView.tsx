"use client";

import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { EnemyPanel } from "@/components/EnemyPanel";
import { CardHand } from "@/components/CardHand";
import { CombatPlayerBar } from "@/components/CombatPlayerBar";
import {
  CARD_TEMPLATES,
  type CardTemplateId,
} from "@/lib/battle-deck";
import type { Card } from "@/types/battle";
import type { Hero, HeroStats } from "@/lib/stats";
import type { CombatBuffs } from "@/lib/battle-resolve";
import type {
  BattlePhase,
  CombatEnemy,
  CombatPhase,
  DamagePopup,
} from "@/types/game";
import { CARD_TYPE_COLORS } from "@/types/game";

interface CombatViewProps {
  hero: Hero;
  heroStats: HeroStats;
  enemy: CombatEnemy;
  tierName?: string;
  tierFloor?: number;
  totalFloors?: number;
  playerHp: number;
  energy: number;
  combatBuffs: CombatBuffs;
  phase: CombatPhase;
  battlePhase: BattlePhase;
  hand: Card[];
  drawPileCount: number;
  discardPileCount: number;
  exhaustPileCount: number;
  deckCount: number;
  damagePopups: DamagePopup[];
  isShaking: boolean;
  lastDamage: number | null;
  lastEnemyDamage: number | null;
  lastDodge?: boolean;
  lastPassiveHeal?: number | null;
  totalDamage: number;
  onPlayCard: (card: Card) => void;
  onEndTurn: () => void;
}

interface Flight {
  key: string;
  name: string;
  type: string;
  cost: number;
  from: DOMRect;
  toX: number;
  toY: number;
}

function isDamageCard(card: Card): boolean {
  const template = CARD_TEMPLATES[card.id as CardTemplateId];
  return !!template?.effects.some(
    (e) => e.kind === "damage" || e.kind === "damage_consume_intent"
  );
}

export function CombatView({
  hero,
  heroStats,
  enemy,
  tierName,
  tierFloor,
  totalFloors,
  playerHp,
  energy,
  combatBuffs,
  phase,
  battlePhase,
  hand,
  drawPileCount,
  discardPileCount,
  exhaustPileCount,
  deckCount,
  damagePopups,
  isShaking,
  lastDamage,
  lastEnemyDamage,
  lastDodge,
  lastPassiveHeal,
  totalDamage,
  onPlayCard,
  onEndTurn,
}: CombatViewProps) {
  const isPlaying = phase === "playing" && battlePhase === "IN_BATTLE";
  const floorLabel =
    tierName && tierFloor && totalFloors
      ? `${tierName} · 關卡 ${tierFloor}/${totalFloors}`
      : tierFloor
        ? `關卡 ${tierFloor}`
        : "祕境試煉";

  const enemyTargetRef = useRef<HTMLDivElement>(null);
  const playerTargetRef = useRef<HTMLDivElement>(null);
  const flightId = useId();
  const flightSeq = useRef(0);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [hitFlash, setHitFlash] = useState(false);
  const [denyShake, setDenyShake] = useState(false);
  const [feelToast, setFeelToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const showToast = useCallback((msg: string) => {
    setFeelToast(msg);
    setDenyShake(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      setFeelToast(null);
      setDenyShake(false);
    }, 900);
  }, []);

  const handleDenyPlay = useCallback(
    (reason: "energy" | "locked") => {
      if (reason === "energy") showToast("真元不足");
      else showToast("尚不可出牌");
    },
    [showToast]
  );

  const handlePlayCard = useCallback(
    (card: Card, origin: DOMRect) => {
      const damage = isDamageCard(card);
      const target = damage
        ? enemyTargetRef.current
        : playerTargetRef.current;
      const targetRect = target?.getBoundingClientRect();

      const toX = targetRect
        ? targetRect.left + targetRect.width / 2 - origin.width / 2
        : origin.left;
      const toY = targetRect
        ? targetRect.top + targetRect.height * 0.35 - origin.height / 2
        : origin.top - 120;

      const template = CARD_TEMPLATES[card.id as CardTemplateId];
      flightSeq.current += 1;
      const key = `${flightId}-${flightSeq.current}`;

      setFlights((prev) => [
        ...prev,
        {
          key,
          name: card.name,
          type: template?.type ?? "",
          cost: card.cost,
          from: origin,
          toX: toX - origin.left,
          toY: toY - origin.top,
        },
      ]);

      onPlayCard(card);

      window.setTimeout(() => {
        setFlights((prev) => prev.filter((f) => f.key !== key));
        if (damage) {
          setHitFlash(true);
          window.setTimeout(() => setHitFlash(false), 220);
        }
      }, 340);
    },
    [flightId, onPlayCard]
  );

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#4a7c6f]/15 bg-stone-950/80 px-3 py-1.5">
        <p className="zone-label shrink-0">戰鬥中</p>
        <p className="min-w-0 flex-1 truncate text-center text-[10px] text-[#7aab9a]">
          {floorLabel}
        </p>
        <p className="stat-value shrink-0 text-[11px] font-bold text-[#c9a84c]">
          {totalDamage.toLocaleString()}
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-2">
        <div ref={enemyTargetRef}>
          <EnemyPanel
            enemy={enemy}
            damagePopups={damagePopups}
            isShaking={isShaking}
            hitFlash={hitFlash}
            lastEnemyDamage={lastEnemyDamage}
            lastDodge={lastDodge}
            lastPassiveHeal={lastPassiveHeal}
          />
        </div>
        <div ref={playerTargetRef}>
          <CombatPlayerBar
            hero={hero}
            stats={heroStats}
            currentHp={playerHp}
            energy={energy}
            combatBuffs={combatBuffs}
          />
        </div>
      </div>

      <div className="relative z-20 shrink-0 overflow-visible border-t border-[#4a7c6f]/20 bg-[#121110]/95 px-3 pb-2 pt-2">
        <CardHand
          hand={hand}
          energy={energy}
          drawPileCount={drawPileCount}
          discardPileCount={discardPileCount}
          exhaustPileCount={exhaustPileCount}
          deckCount={deckCount}
          onPlayCard={handlePlayCard}
          onDenyPlay={handleDenyPlay}
          onEndTurn={onEndTurn}
          lastDamage={lastDamage}
          disabled={!isPlaying || enemy.currentHp <= 0}
          denyShake={denyShake}
          feelToast={feelToast}
        />
      </div>

      {flights.map((flight) => {
        const typeStyle =
          CARD_TYPE_COLORS[flight.type] ?? "ink-card-type-basic bg-[#1a1814]";
        return (
          <div
            key={flight.key}
            className={`animate-card-fly ink-card pointer-events-none fixed z-[80] overflow-hidden p-1.5 shadow-xl ${typeStyle}`}
            style={
              {
                left: flight.from.left,
                top: flight.from.top,
                width: flight.from.width,
                height: flight.from.height,
                ["--fly-x" as string]: `${flight.toX}px`,
                ["--fly-y" as string]: `${flight.toY}px`,
              } as CSSProperties
            }
          >
            <p className="text-[10px] font-bold text-[#f0e6d3]">{flight.name}</p>
            <p className="mt-1 text-[9px] text-[#7aab9a]">真元 {flight.cost}</p>
          </div>
        );
      })}
    </div>
  );
}
