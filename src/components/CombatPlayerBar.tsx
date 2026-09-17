"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Hero, HeroStats } from "@/lib/stats";
import { formatNumber } from "@/lib/stats";
import type { CombatBuffs } from "@/lib/battle-resolve";
import { publicAsset } from "@/lib/paths";
import {
  DAMAGE_NUMBER_MS,
  PLAYER_HIT_SHAKE_MS,
  PLAYER_HP_TRANSITION_MS,
  SHIELD_AURA_MS,
  STAT_PULSE_MS,
  type PlayerImpactFeedback,
} from "@/lib/combat-feedback";

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
  playerImpact?: PlayerImpactFeedback | null;
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
  playerImpact = null,
}: CombatPlayerBarProps) {
  const avatarSrc = hero.avatar ? publicAsset(hero.avatar) : null;
  const orbCount = Math.min(8, Math.max(maxEnergy, energy));
  const swordGuard = combatBuffs.swordGuard ?? 0;

  const [displayHp, setDisplayHp] = useState(currentHp);
  const [displayBlock, setDisplayBlock] = useState(
    karmaMode ? block : swordGuard
  );
  const [hitShake, setHitShake] = useState(false);
  const [hitFlash, setHitFlash] = useState(false);
  const [shieldHit, setShieldHit] = useState(false);
  const [dmgFloat, setDmgFloat] = useState<{
    id: number;
    amount: number;
    kind: PlayerImpactFeedback["kind"];
  } | null>(null);
  const [blockPulse, setBlockPulse] = useState(false);
  const [shieldAura, setShieldAura] = useState(false);
  const [intentPulse, setIntentPulse] = useState(false);
  const [guardPulse, setGuardPulse] = useState(false);
  const prevBlock = useRef(karmaMode ? block : swordGuard);
  const prevIntent = useRef(combatBuffs.swordIntent);
  const prevGuard = useRef(swordGuard);
  const lastImpactId = useRef(0);
  const timersRef = useRef<number[]>([]);

  const clearTimers = () => {
    for (const id of timersRef.current) window.clearTimeout(id);
    timersRef.current = [];
  };

  useLayoutEffect(() => {
    if (!playerImpact || playerImpact.id === lastImpactId.current) return;
    lastImpactId.current = playerImpact.id;
    clearTimers();

    setDisplayHp(playerImpact.displayHp);
    setDisplayBlock(playerImpact.displayBlock);
    setDmgFloat({
      id: playerImpact.id,
      amount: playerImpact.amount,
      kind: playerImpact.kind,
    });
    timersRef.current.push(
      window.setTimeout(() => setDmgFloat(null), DAMAGE_NUMBER_MS)
    );

    if (playerImpact.kind === "hp") {
      setHitShake(true);
      setHitFlash(true);
      timersRef.current.push(
        window.setTimeout(() => setHitShake(false), PLAYER_HIT_SHAKE_MS)
      );
      timersRef.current.push(
        window.setTimeout(() => setHitFlash(false), 220)
      );
    } else if (
      playerImpact.kind === "shield" ||
      playerImpact.kind === "shieldBreak"
    ) {
      setShieldHit(true);
      setBlockPulse(true);
      timersRef.current.push(
        window.setTimeout(() => setShieldHit(false), PLAYER_HIT_SHAKE_MS)
      );
      timersRef.current.push(
        window.setTimeout(() => setBlockPulse(false), STAT_PULSE_MS)
      );
    }

    return () => clearTimers();
  }, [playerImpact]);

  useEffect(() => {
    if (playerImpact) return;
    setDisplayHp(currentHp);
  }, [currentHp, playerImpact]);

  useEffect(() => {
    if (playerImpact) return;
    setDisplayBlock(karmaMode ? block : swordGuard);
  }, [block, swordGuard, karmaMode, playerImpact]);

  const trackedBlock = karmaMode ? block : swordGuard;
  useEffect(() => {
    if (trackedBlock > prevBlock.current) {
      setBlockPulse(true);
      setShieldAura(true);
      const tPulse = window.setTimeout(() => setBlockPulse(false), STAT_PULSE_MS);
      const tAura = window.setTimeout(() => setShieldAura(false), SHIELD_AURA_MS);
      prevBlock.current = trackedBlock;
      return () => {
        window.clearTimeout(tPulse);
        window.clearTimeout(tAura);
      };
    }
    prevBlock.current = trackedBlock;
  }, [trackedBlock]);

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
    if (swordGuard > prevGuard.current) {
      setGuardPulse(true);
      const t = window.setTimeout(() => setGuardPulse(false), STAT_PULSE_MS);
      prevGuard.current = swordGuard;
      return () => window.clearTimeout(t);
    }
    prevGuard.current = swordGuard;
  }, [swordGuard]);

  const hpPercent = Math.max(0, (displayHp / stats.maxHp) * 100);
  const showBlock = displayBlock;

  const powerBits: string[] = [];
  if (!karmaMode) {
    if (combatBuffs.cangfengStacks > 0) {
      powerBits.push(`藏鋒×${combatBuffs.cangfengStacks}`);
    }
    if (combatBuffs.shuangjianStacks > 0) {
      powerBits.push(`霜劍×${combatBuffs.shuangjianStacks}`);
    }
    if (combatBuffs.jianxinStacks > 0) {
      powerBits.push(`劍心×${combatBuffs.jianxinStacks}`);
    }
  }

  return (
    <div
      className={`combat-player-hud relative ${
        hitShake ? "player-hud-hit-shake" : ""
      } ${hitFlash ? "player-hud-hit-flash" : ""}`}
    >
      {avatarSrc && (
        <div className="combat-player-hud__avatar relative">
          <img
            src={avatarSrc}
            alt=""
            className="h-full w-full object-cover object-center"
          />
          {shieldAura && <span className="combat-shield-aura" aria-hidden />}
          {shieldHit && (
            <span className="combat-shield-hit-flash" aria-hidden />
          )}
        </div>
      )}

      <div className="combat-player-hud__body">
        <div className="combat-player-hud__row">
          <p className="combat-player-hud__name">
            {hero.name}
            <span className="combat-player-hud__hp-num">
              {formatNumber(displayHp)}/{formatNumber(stats.maxHp)}
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
            className="hp-bar-fill h-full rounded-full"
            style={{
              width: `${hpPercent}%`,
              transition: `width ${PLAYER_HP_TRANSITION_MS}ms ease-out`,
            }}
          />
        </div>

        <div className="combat-player-hud__meta">
          {karmaMode ? (
            <>
              <span className={blockPulse ? "hud-stat-pulse" : undefined}>
                護盾{" "}
                <span
                  className={
                    showBlock > 0
                      ? "font-semibold text-[#9ab8aa]"
                      : "tabular-nums"
                  }
                >
                  {showBlock}
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
              <span
                className={
                  guardPulse || blockPulse ? "hud-stat-pulse" : undefined
                }
              >
                劍罡{" "}
                <span
                  className={
                    swordGuard > 0
                      ? "font-semibold text-[#9ab8aa]"
                      : "tabular-nums"
                  }
                >
                  {swordGuard}
                </span>
              </span>
              {combatBuffs.nurtureSword > 0 && (
                <span className="font-semibold text-[#e0a0a0]">
                  養劍 {combatBuffs.nurtureSword}
                </span>
              )}
            </>
          )}
        </div>
        {!karmaMode && powerBits.length > 0 && (
          <p className="mt-0.5 truncate text-[9px] tracking-wide text-stone-500">
            {powerBits.join(" · ")}
          </p>
        )}
      </div>

      {dmgFloat && (
        <span
          key={dmgFloat.id}
          className={`player-dmg-float player-dmg-float--${dmgFloat.kind}`}
        >
          -{dmgFloat.amount}
        </span>
      )}
    </div>
  );
}
