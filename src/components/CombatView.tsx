"use client";

import { EnemyPanel } from "@/components/EnemyPanel";
import { CardHand } from "@/components/CardHand";
import { CombatPlayerBar } from "@/components/CombatPlayerBar";
import type { CardInstance } from "@/lib/deck";
import type { Hero, HeroStats, DamageResult } from "@/lib/stats";
import type {
  CombatEnemy,
  CombatPhase,
  DamagePopup,
} from "@/types/game";

interface CombatViewProps {
  hero: Hero;
  heroStats: HeroStats;
  enemy: CombatEnemy;
  tierName?: string;
  tierFloor?: number;
  totalFloors?: number;
  playerHp: number;
  energy: number;
  phase: CombatPhase;
  hand: CardInstance[];
  drawPileCount: number;
  discardPileCount: number;
  deckCount: number;
  damagePopups: DamagePopup[];
  isShaking: boolean;
  lastDamage: DamageResult | null;
  lastEnemyDamage: number | null;
  lastDodge?: boolean;
  lastCounterDamage?: number | null;
  lastComboDamage?: number | null;
  lastReflectDamage?: number | null;
  lastPassiveHeal?: number | null;
  totalDamage: number;
  onPlayCard: (instance: CardInstance) => void;
  onEndTurn: () => void;
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
  phase,
  hand,
  drawPileCount,
  discardPileCount,
  deckCount,
  damagePopups,
  isShaking,
  lastDamage,
  lastEnemyDamage,
  lastDodge,
  lastCounterDamage,
  lastComboDamage,
  lastReflectDamage,
  lastPassiveHeal,
  totalDamage,
  onPlayCard,
  onEndTurn,
}: CombatViewProps) {
  const isPlaying = phase === "playing";
  const floorLabel =
    tierName && tierFloor && totalFloors
      ? `${tierName} · 關卡 ${tierFloor}/${totalFloors}`
      : tierFloor
        ? `關卡 ${tierFloor}`
        : "祕境試煉";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
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
        <EnemyPanel
          enemy={enemy}
          damagePopups={damagePopups}
          isShaking={isShaking}
          lastEnemyDamage={lastEnemyDamage}
          lastDodge={lastDodge}
          lastCounterDamage={lastCounterDamage}
          lastComboDamage={lastComboDamage}
          lastReflectDamage={lastReflectDamage}
          lastPassiveHeal={lastPassiveHeal}
        />
        <CombatPlayerBar
          hero={hero}
          stats={heroStats}
          currentHp={playerHp}
          energy={energy}
        />
      </div>

      <div className="shrink-0 border-t border-[#4a7c6f]/20 bg-[#121110]/95 px-3 pb-2 pt-2">
        <CardHand
          hand={hand}
          energy={energy}
          drawPileCount={drawPileCount}
          discardPileCount={discardPileCount}
          deckCount={deckCount}
          onPlayCard={onPlayCard}
          onEndTurn={onEndTurn}
          lastDamage={lastDamage}
          disabled={!isPlaying || enemy.currentHp <= 0}
        />
      </div>
    </div>
  );
}
