"use client";

import { EnemyPanel } from "@/components/EnemyPanel";
import { CardHand } from "@/components/CardHand";
import { CombatPlayerBar } from "@/components/CombatPlayerBar";
import type { Card } from "@/types/battle";
import type { Hero, HeroStats } from "@/lib/stats";
import type { CombatBuffs } from "@/lib/battle-resolve";
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
  combatBuffs: CombatBuffs;
  phase: CombatPhase;
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
          lastPassiveHeal={lastPassiveHeal}
        />
        <CombatPlayerBar
          hero={hero}
          stats={heroStats}
          currentHp={playerHp}
          energy={energy}
          combatBuffs={combatBuffs}
        />
      </div>

      <div className="shrink-0 border-t border-[#4a7c6f]/20 bg-[#121110]/95 px-3 pb-2 pt-2">
        <CardHand
          hand={hand}
          energy={energy}
          drawPileCount={drawPileCount}
          discardPileCount={discardPileCount}
          exhaustPileCount={exhaustPileCount}
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
