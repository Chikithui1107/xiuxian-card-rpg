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
      <div className="flex items-center gap-2.5">
        {avatarSrc && (
          <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-[#c9a84c]/28">
            <img
              src={avatarSrc}
              alt=""
              className="h-full w-full object-cover object-center"
            />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 truncate text-[12px] font-bold tracking-wide text-[#e4d4a8]">
              {hero.name}
              <span className="ml-2 font-semibold tabular-nums text-[#c5d8cc]">
                {formatNumber(currentHp)}/{formatNumber(stats.maxHp)}
              </span>
            </p>
            <div
              className="flex shrink-0 items-center gap-2"
              aria-label={`真元 ${energy}/${maxEnergy}`}
            >
              {Array.from({ length: maxEnergy }, (_, i) => (
                <span
                  key={i}
                  className={`energy-orb ${i < energy ? "energy-orb-lit" : ""}`}
                />
              ))}
            </div>
          </div>
          <div className="mt-1 h-1 max-w-[14rem] overflow-hidden rounded-full bg-black/40">
            <div
              className="hp-bar-fill h-full rounded-full transition-all"
              style={{ width: `${hpPercent}%` }}
            />
          </div>
          <div className="mt-1.5 flex items-center gap-4 text-[10px] tracking-wide text-stone-500">
            <span>
              劍意{" "}
              <span
                className={
                  combatBuffs.swordIntent > 0
                    ? "font-semibold text-[#e4d4a8]"
                    : "tabular-nums"
                }
              >
                {combatBuffs.swordIntent}
              </span>
            </span>
            <span>
              閃避{" "}
              <span
                className={
                  combatBuffs.dodge > 0
                    ? "font-semibold text-[#9fd0c0]"
                    : "tabular-nums"
                }
              >
                {combatBuffs.dodge > 0
                  ? `${combatBuffs.dodge}·${Math.round(dodgeChance * 100)}%`
                  : "0"}
              </span>
            </span>
            {combatBuffs.nextSwordBonus > 0 && (
              <span className="font-semibold text-[#e0a0a0]">
                養劍 +{Math.round(combatBuffs.nextSwordBonus * 100)}%
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
