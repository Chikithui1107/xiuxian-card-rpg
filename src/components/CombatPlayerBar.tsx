"use client";

import type { Hero, HeroStats } from "@/lib/stats";
import { formatNumber } from "@/lib/stats";
import type { CombatBuffs } from "@/lib/battle-resolve";
import { getStackDodgeChance } from "@/lib/battle-resolve";
import { publicAsset } from "@/lib/paths";

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
  const avatarSrc = hero.avatar ? publicAsset(hero.avatar) : null;

  return (
    <div className="rounded-lg border border-[#8a7340]/40 bg-stone-950/60 px-2.5 py-2 shadow-[0_8px_20px_rgba(0,0,0,0.35)] backdrop-blur-[3px]">
      <div className="flex items-center gap-2.5">
        {avatarSrc && (
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-[#c9a84c]/40">
            <img
              src={avatarSrc}
              alt=""
              className="h-full w-full object-cover object-center"
            />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-bold tracking-wide text-[#e4d4a8]">
                {hero.name}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {Array.from({ length: maxEnergy }, (_, i) => (
                <span
                  key={i}
                  className={`energy-orb ${i < energy ? "energy-orb-lit" : ""}`}
                />
              ))}
            </div>
          </div>

          <div className="mb-0.5 flex justify-between text-[10px]">
            <span className="text-[#9ab8aa]">氣血</span>
            <span className="stat-value text-[#c5d8cc]">
              {formatNumber(currentHp)}/{formatNumber(stats.maxHp)}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-black/45">
            <div
              className="hp-bar-fill h-full rounded-full transition-all"
              style={{ width: `${hpPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-1.5 flex flex-wrap gap-1">
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
              ? `${combatBuffs.dodge}·${Math.round(dodgeChance * 100)}%`
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
      ? "border-[#c9a84c]/45 text-[#e4d4a8] bg-[#c9a84c]/12"
      : "border-stone-600/50 text-stone-400",
    jade: active
      ? "border-[#7aab9a]/45 text-[#9fd0c0] bg-[#7aab9a]/12"
      : "border-stone-600/50 text-stone-400",
    crimson: "border-[#c45c5c]/45 text-[#e0a0a0] bg-[#c45c5c]/12",
  }[color];

  return (
    <div
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] ${styles}`}
    >
      <span className="opacity-75">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
