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
  yinPullUsed?: boolean;
  yangPullUsed?: boolean;
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
  yinPullUsed = false,
  yangPullUsed = false,
}: CombatPlayerBarProps) {
  const hpPercent = Math.max(0, (currentHp / stats.maxHp) * 100);
  const dodgeChance = getStackDodgeChance(combatBuffs.dodge);
  const avatarSrc = hero.avatar ? publicAsset(hero.avatar) : null;
  const orbCount = Math.min(8, Math.max(maxEnergy, energy));

  return (
    <div className="combat-player-hud">
      {avatarSrc && (
        <div className="combat-player-hud__avatar">
          <img src={avatarSrc} alt="" className="h-full w-full object-cover object-center" />
        </div>
      )}

      <div className="combat-player-hud__body">
        <div className="combat-player-hud__row">
          <p className="combat-player-hud__name">
            {hero.name}
            <span className="combat-player-hud__hp-num">
              {formatNumber(currentHp)}/{formatNumber(stats.maxHp)}
            </span>
          </p>
          <div
            className="combat-player-hud__energy"
            aria-label={`真元 ${energy}`}
          >
            {energy > maxEnergy && (
              <span className="combat-player-hud__energy-extra">{energy}</span>
            )}
            {Array.from({ length: orbCount }, (_, i) => (
              <span
                key={i}
                className={`energy-orb ${i < energy ? "energy-orb-lit" : ""}`}
              />
            ))}
          </div>
        </div>

        <div className="combat-player-hud__bar">
          <div
            className="hp-bar-fill h-full rounded-full transition-all"
            style={{ width: `${hpPercent}%` }}
          />
        </div>

        <div className="combat-player-hud__meta">
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
              <span
                className="combat-player-hud__karma"
                aria-label={`因果相生 因${yinPullUsed ? "已觸發" : "可觸發"} 果${yangPullUsed ? "已觸發" : "可觸發"}`}
              >
                因 {yinPullUsed ? "●" : "○"}
                <span className="mx-0.5 text-stone-600">/</span>
                果 {yangPullUsed ? "●" : "○"}
              </span>
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
  );
}
