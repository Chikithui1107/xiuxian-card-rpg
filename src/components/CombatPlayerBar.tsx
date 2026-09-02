"use client";

import type { Hero, HeroStats } from "@/lib/stats";
import { formatNumber } from "@/lib/stats";
import type { CombatBuffs } from "@/lib/battle-resolve";
import { getStackDodgeChance } from "@/lib/battle-resolve";

interface CombatPlayerBarProps {
  hero: Hero;
  stats: HeroStats;
  currentHp: number;
  energy: number;
  combatBuffs: CombatBuffs;
  maxEnergy?: number;
}

export function CombatPlayerBar({
  hero,
  stats,
  currentHp,
  energy,
  combatBuffs,
  maxEnergy = 3,
}: CombatPlayerBarProps) {
  const hpPercent = Math.max(0, (currentHp / stats.maxHp) * 100);
  const dodgeChance = getStackDodgeChance(combatBuffs.dodge);

  return (
    <div className="glass-panel-gold shrink-0 px-3 py-2.5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-[#c9a84c]">{hero.name}</p>
          <p className="text-[10px] text-[#7aab9a]">{hero.realm}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-1 text-[9px]">
          <BuffPill
            label="劍意"
            value={String(combatBuffs.swordIntent)}
            active={combatBuffs.swordIntent > 0}
            color="gold"
          />
          <BuffPill
            label="閃避"
            value={
              combatBuffs.dodge > 0
                ? `${combatBuffs.dodge}層 ${Math.round(dodgeChance * 100)}%`
                : "0"
            }
            active={combatBuffs.dodge > 0}
            color="jade"
          />
          {combatBuffs.nextSwordBonus > 0 && (
            <BuffPill
              label="養劍"
              value={`+${Math.round(combatBuffs.nextSwordBonus * 100)}%`}
              active
              color="crimson"
            />
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

function BuffPill({
  label,
  value,
  active,
  color,
}: {
  label: string;
  value: string;
  active: boolean;
  color: "gold" | "jade" | "crimson";
}) {
  const styles = {
    gold: active
      ? "border-[#c9a84c]/40 text-[#c9a84c] bg-[#c9a84c]/10"
      : "border-stone-700 text-stone-500",
    jade: active
      ? "border-[#7aab9a]/40 text-[#7aab9a] bg-[#7aab9a]/10"
      : "border-stone-700 text-stone-500",
    crimson: "border-[#c45c5c]/40 text-[#c45c5c] bg-[#c45c5c]/10",
  }[color];

  return (
    <div className={`rounded border px-1.5 py-0.5 ${styles}`}>
      <p className="text-[8px] opacity-70">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}
