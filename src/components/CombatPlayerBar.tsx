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
    <div className="combat-player-hud">
      <div className="flex items-center gap-2">
        {avatarSrc && (
          <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full border border-[#c9a84c]/30">
            <img
              src={avatarSrc}
              alt=""
              className="h-full w-full object-cover object-center"
            />
          </div>
        )}

        <p className="shrink-0 text-[12px] font-bold tracking-wide text-[#e4d4a8]">
          {hero.name}
        </p>

        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex items-center justify-between gap-2 text-[10px]">
            <span className="tabular-nums text-[#c5d8cc]">
              {formatNumber(currentHp)}/{formatNumber(stats.maxHp)}
            </span>
            <div className="flex shrink-0 items-center gap-1">
              {Array.from({ length: maxEnergy }, (_, i) => (
                <span
                  key={i}
                  className={`energy-orb ${i < energy ? "energy-orb-lit" : ""}`}
                />
              ))}
            </div>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-black/40">
            <div
              className="hp-bar-fill h-full rounded-full transition-all"
              style={{ width: `${hpPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-1 flex items-center gap-2.5 text-[10px] tracking-wide">
        <StatusChip
          icon="劍"
          label="劍意"
          value={String(combatBuffs.swordIntent)}
          active={combatBuffs.swordIntent > 0}
          tone="gold"
        />
        <StatusChip
          icon="閃"
          label="閃避"
          value={
            combatBuffs.dodge > 0
              ? `${combatBuffs.dodge}·${Math.round(dodgeChance * 100)}%`
              : "0"
          }
          active={combatBuffs.dodge > 0}
          tone="jade"
        />
        {combatBuffs.nextSwordBonus > 0 && (
          <StatusChip
            icon="養"
            label="養劍"
            value={`+${Math.round(combatBuffs.nextSwordBonus * 100)}%`}
            active
            tone="crimson"
          />
        )}
      </div>
    </div>
  );
}

function StatusChip({
  icon,
  label,
  value,
  active,
  tone,
}: {
  icon: string;
  label: string;
  value: string;
  active: boolean;
  tone: "gold" | "jade" | "crimson";
}) {
  const color = {
    gold: active ? "text-[#e4d4a8]" : "text-stone-500",
    jade: active ? "text-[#9fd0c0]" : "text-stone-500",
    crimson: "text-[#e0a0a0]",
  }[tone];

  return (
    <span className={`inline-flex items-center gap-1 ${color}`} title={label}>
      <span
        className={`flex h-3.5 w-3.5 items-center justify-center rounded-sm border text-[8px] ${
          active
            ? "border-current/40 bg-black/25"
            : "border-stone-600/40 bg-transparent"
        }`}
      >
        {icon}
      </span>
      <span className="font-semibold tabular-nums">{value}</span>
    </span>
  );
}
