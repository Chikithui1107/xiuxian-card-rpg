"use client";

import { useEffect, useRef, useState } from "react";
import type { Hero, HeroStats } from "@/lib/stats";
import { formatNumber } from "@/lib/stats";
import type { CombatBuffs } from "@/lib/battle-resolve";
import { getStackDodgeChance } from "@/lib/battle-resolve";
import { publicAsset } from "@/lib/paths";
import { SHIELD_AURA_MS, STAT_PULSE_MS } from "@/lib/combat-feedback";

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

  const [blockPulse, setBlockPulse] = useState(false);
  const [shieldAura, setShieldAura] = useState(false);
  const [intentPulse, setIntentPulse] = useState(false);
  const [dodgePulse, setDodgePulse] = useState(false);
  const prevBlock = useRef(block);
  const prevIntent = useRef(combatBuffs.swordIntent);
  const prevDodge = useRef(combatBuffs.dodge);

  useEffect(() => {
    if (block > prevBlock.current) {
      setBlockPulse(true);
      setShieldAura(true);
      const tPulse = window.setTimeout(() => setBlockPulse(false), STAT_PULSE_MS);
      const tAura = window.setTimeout(() => setShieldAura(false), SHIELD_AURA_MS);
      prevBlock.current = block;
      return () => {
        window.clearTimeout(tPulse);
        window.clearTimeout(tAura);
      };
    }
    prevBlock.current = block;
  }, [block]);

  useEffect(() => {
    if (combatBuffs.swordIntent > prevIntent.current) {
      setIntentPulse(true);
      const t = window.setTimeout(() => setIntentPulse(false), STAT_PULSE_MS);
      prevIntent.current = combatBuffs.swordIntent;
      return () => window.clearTimeout(t);
    }
    prevIntent.current = combatBuffs.swordIntent;
  }, [combatBuffs.swordIntent]);

  useEffect(() => {
    if (combatBuffs.dodge > prevDodge.current) {
      setDodgePulse(true);
      const t = window.setTimeout(() => setDodgePulse(false), STAT_PULSE_MS);
      prevDodge.current = combatBuffs.dodge;
      return () => window.clearTimeout(t);
    }
    prevDodge.current = combatBuffs.dodge;
  }, [combatBuffs.dodge]);

  return (
    <div className="combat-player-hud">
      {avatarSrc && (
        <div className="combat-player-hud__avatar relative">
          <img
            src={avatarSrc}
            alt=""
            className="h-full w-full object-cover object-center"
          />
          {shieldAura && <span className="combat-shield-aura" aria-hidden />}
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
              <span className={blockPulse ? "hud-stat-pulse" : undefined}>
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
              <span className={intentPulse ? "hud-stat-pulse" : undefined}>
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
              <span className={dodgePulse ? "hud-stat-pulse" : undefined}>
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
