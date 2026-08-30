"use client";

import type { Hero, HeroStats } from "@/lib/stats";
import { formatNumber } from "@/lib/stats";

interface CombatPlayerBarProps {
  hero: Hero;
  stats: HeroStats;
  currentHp: number;
  energy: number;
  maxEnergy?: number;
}

export function CombatPlayerBar({
  hero,
  stats,
  currentHp,
  energy,
  maxEnergy = 3,
}: CombatPlayerBarProps) {
  const hpPercent = Math.max(0, (currentHp / stats.maxHp) * 100);
  const energyPercent = (energy / maxEnergy) * 100;

  return (
    <div className="glass-panel-gold mx-3 shrink-0 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-[#c9a84c]">{hero.name}</p>
          <p className="text-[10px] text-[#7aab9a]">{hero.realm}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-stone-500">攻伐</p>
          <p className="stat-value text-sm font-bold text-[#c9a84c]">
            {formatNumber(stats.attack)}
          </p>
        </div>
      </div>

      <div className="mb-2">
        <div className="mb-0.5 flex justify-between text-[10px]">
          <span className="text-[#7aab9a]">氣血</span>
          <span className="stat-value text-[#9ab8aa]">
            {formatNumber(currentHp)}/{formatNumber(stats.maxHp)}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-black/40">
          <div
            className="hp-bar-fill h-full rounded-full transition-all"
            style={{ width: `${hpPercent}%` }}
          />
        </div>
      </div>

      <div>
        <div className="mb-0.5 flex justify-between text-[10px]">
          <span className="text-[#7aab9a]">真元</span>
          <span className="stat-value text-[#9ab8aa]">
            {energy}/{maxEnergy}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-black/40">
          <div
            className="energy-bar-fill h-full rounded-full transition-all"
            style={{ width: `${energyPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
