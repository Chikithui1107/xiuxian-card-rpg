"use client";

import { useEffect, useRef, useState } from "react";
import { getMonsterConfig } from "@/data/monsters";
import { formatNumber } from "@/lib/stats";
import { getEnemyIntent } from "@/lib/dungeon";
import type { CombatEnemy, DamagePopup } from "@/types/game";

interface EnemyPanelProps {
  enemy: CombatEnemy;
  damagePopups: DamagePopup[];
  isShaking?: boolean;
  hitFlash?: boolean;
  lastEnemyDamage?: number | null;
  lastDodge?: boolean;
  lastPassiveHeal?: number | null;
}

export function EnemyPanel({
  enemy,
  damagePopups,
  isShaking = false,
  hitFlash = false,
  lastEnemyDamage,
  lastDodge,
  lastPassiveHeal,
}: EnemyPanelProps) {
  const hpPercent = Math.max(0, (enemy.currentHp / enemy.maxHp) * 100);
  const isDefeated = enemy.currentHp <= 0;
  const intent = getEnemyIntent(enemy);
  const monster = getMonsterConfig(enemy);
  const displayName = monster?.name ?? enemy.name;

  const intentDamage =
    intent.damage > 0
      ? enemy.attackPattern === "triple_slash"
        ? intent.damage * 3
        : intent.damage
      : 0;
  const intentDamageHint =
    enemy.attackPattern === "triple_slash" && intent.damage > 0
      ? `（${intent.damage}×3）`
      : "";

  const [hitShake, setHitShake] = useState(false);
  const prevHpRef = useRef(enemy.currentHp);

  useEffect(() => {
    if (enemy.currentHp < prevHpRef.current) {
      setHitShake(true);
      const timer = setTimeout(() => setHitShake(false), 350);
      prevHpRef.current = enemy.currentHp;
      return () => clearTimeout(timer);
    }
    prevHpRef.current = enemy.currentHp;
  }, [enemy.currentHp]);

  const shaking = isShaking || hitShake;
  const hasFeedback =
    lastDodge ||
    (lastEnemyDamage != null && lastEnemyDamage > 0) ||
    (lastPassiveHeal != null && lastPassiveHeal > 0);

  return (
    <div className={`relative ${isDefeated ? "opacity-70" : ""}`}>
      <div
        className={`enemy-sprite-stage relative mx-auto flex h-52 w-full max-w-[18rem] items-end justify-center sm:h-56 ${
          shaking ? "animate-shake" : ""
        } ${hitFlash ? "enemy-hit-flash" : ""}`}
      >
        {monster ? (
          <img
            src={monster.image}
            alt={displayName}
            className={`enemy-sprite max-h-full w-auto object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.55)] ${
              isDefeated
                ? "scale-90 opacity-40 grayscale transition-all duration-500"
                : "enemy-sprite-float"
            }`}
            draggable={false}
          />
        ) : (
          <div className="mb-2 flex h-28 w-28 items-center justify-center rounded-full border border-[#8b3a3a]/45 bg-stone-950/70">
            <span className="text-4xl font-black text-[#c48888]/80">
              {displayName.slice(0, 1)}
            </span>
          </div>
        )}

        {!isDefeated && (
          <div className="pointer-events-none absolute left-1/2 top-1 z-10 -translate-x-1/2">
            <div className="rounded-full border border-amber-400/45 bg-stone-950/75 px-3 py-1 shadow-[0_4px_16px_rgba(0,0,0,0.45)] backdrop-blur-[2px]">
              <p className="whitespace-nowrap text-center text-[11px] font-semibold tracking-wide text-amber-200">
                {intent.label}
                {intentDamage > 0 ? ` · ${intentDamage} 傷${intentDamageHint}` : ""}
              </p>
            </div>
          </div>
        )}

        {damagePopups.map((popup) => (
          <DamageNumber key={popup.id} popup={popup} />
        ))}
      </div>

      <div className="mx-auto mt-1 max-w-sm rounded-lg border border-[#8b3a3a]/35 bg-stone-950/55 px-3 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-[3px]">
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <h2
            className={`text-[15px] font-bold tracking-[0.12em] ${
              isDefeated ? "text-stone-500 line-through" : "text-[#e0a8a8]"
            }`}
          >
            {displayName}
          </h2>
          <span className="shrink-0 text-[10px] text-stone-400">{enemy.realm}</span>
        </div>

        <div className="mb-0.5 flex justify-between text-[10px]">
          <span className="text-[#c48888]/90">氣血</span>
          <span className="stat-value font-bold text-[#e0b0b0]">
            {formatNumber(Math.max(0, enemy.currentHp))} /{" "}
            {formatNumber(enemy.maxHp)}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-black/50">
          <div
            className="enemy-hp-fill h-full rounded-full transition-all duration-300"
            style={{ width: `${hpPercent}%` }}
          />
        </div>

        {(enemy.passiveLabel || hasFeedback) && (
          <div className="mt-1.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 text-[10px]">
            {enemy.passiveLabel && (
              <span className="text-[#a8a8c8]">{enemy.passiveLabel}</span>
            )}
            {lastDodge && <span className="text-[#8bc4b0]">閃避成功</span>}
            {lastEnemyDamage != null && lastEnemyDamage > 0 && (
              <span className="text-[#d08888]">
                反噬 -{lastEnemyDamage}
                {enemy.passive === "burn" ? "（灼燒）" : ""}
              </span>
            )}
            {lastPassiveHeal != null && lastPassiveHeal > 0 && (
              <span className="text-[#8bc4b0]">回復 +{lastPassiveHeal}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DamageNumber({ popup }: { popup: DamagePopup }) {
  const isCrit = popup.isCrit;
  const isHigh = popup.isHighDamage;

  return (
    <div
      className={`pointer-events-none absolute z-20 font-black ${isCrit ? "animate-crit-pop" : "animate-float-up"}`}
      style={{
        left: `${popup.x}%`,
        top: `${popup.y}%`,
        fontSize: isCrit ? "2rem" : isHigh ? "1.6rem" : "1.2rem",
        color: isCrit ? "#c9a84c" : isHigh ? "#c48888" : "#e8e0d4",
        textShadow: isCrit
          ? "1px 1px 0 #3a3530, -1px -1px 0 #3a3530"
          : "2px 2px 0 #3a3530",
      }}
    >
      {isCrit && (
        <span className="block text-center text-[10px] text-[#c9a84c]">暴擊</span>
      )}
      -{popup.value.toLocaleString()}
    </div>
  );
}
