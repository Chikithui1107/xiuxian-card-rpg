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

  return (
    <div className="glass-panel-gold shrink-0 px-3 py-2.5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-[#c9a84c]">{hero.name}</p>
          <p className="text-[10px] text-[#7aab9a]">{hero.realm}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-stone-500">攻伐</p>
          <p className="stat-value text-sm font-bold text-[#c9a84c]">
            {formatNumber(stats.attack)}
          </p>
          {(stats.equipmentDefenseBonus > 0 ||
            stats.equipmentDodgeRate > 0 ||
            stats.equipmentDamageReduction > 0) && (
            <p className="text-[9px] text-[#7aab9a]">
              {stats.equipmentDefenseBonus > 0 &&
                `防 ${stats.equipmentDefenseBonus}`}
              {stats.equipmentDefenseBonus > 0 &&
                (stats.equipmentDodgeRate > 0 ||
                  stats.equipmentDamageReduction > 0) &&
                " · "}
              {stats.equipmentDodgeRate > 0 &&
                `閃 ${(stats.equipmentDodgeRate * 100).toFixed(0)}%`}
              {stats.equipmentDodgeRate > 0 &&
                stats.equipmentDamageReduction > 0 &&
                " · "}
              {stats.equipmentDamageReduction > 0 &&
                `減 ${(stats.equipmentDamageReduction * 100).toFixed(0)}%`}
            </p>
          )}
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

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[#7aab9a]">真元</span>
        <div className="flex items-center gap-1.5">
          {Array.from({ length: maxEnergy }, (_, i) => (
            <span
              key={i}
              className={`energy-orb ${i < energy ? "energy-orb-lit" : ""}`}
            />
          ))}
          <span className="stat-value ml-1 text-[10px] text-[#9ab8aa]">
            {energy}/{maxEnergy}
          </span>
        </div>
      </div>
    </div>
  );
}
