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
  block?: number;
  karmaMode?: boolean;
}

export function CombatPlayerBar({
  hero,
  stats,
  currentHp,
  energy,
  combatBuffs,
  maxEnergy = 3,
  block = 0,
  karmaMode = false,
}: CombatPlayerBarProps) {
  const hpPercent = Math.max(0, (currentHp / stats.maxHp) * 100);
  const dodgeChance = getStackDodgeChance(combatBuffs.dodge);
  const avatarSrc = hero.avatar ? publicAsset(hero.avatar) : null;
  const orbCount = Math.min(8, Math.max(maxEnergy, energy));

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
              aria-label={`真元 ${energy}`}
            >
              {energy > maxEnergy && (
                <span className="text-[10px] font-semibold tabular-nums text-[#7aab9a]">
                  {energy}
                </span>
              )}
              {Array.from({ length: orbCount }, (_, i) => (
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
            {karmaMode ? (
              <>
                <span>
                  護盾{" "}
                  <span
                    className={
                      block > 0
                        ? "font-semibold text-[#9ab8aa]"
                        : "tabular-nums"
                    }
                  >
                    {block}
                  </span>
                </span>
                <span className="text-stone-600">因果道</span>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
