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
    <div
      className={`flex h-full min-h-0 flex-col items-center justify-end gap-2 pb-2 ${
        isDefeated ? "opacity-70" : ""
      }`}
    >
      <div
        className={`enemy-sprite-stage relative mx-auto flex h-56 w-full max-w-[19rem] shrink-0 items-end justify-center sm:h-60 ${
          shaking ? "animate-shake" : ""
        } ${hitFlash ? "enemy-hit-flash" : ""}`}
      >
        {/* 整塊暗底托住半透明立繪，避免融進月夜 */}
        <div
          className="pointer-events-none absolute inset-x-6 bottom-0 top-6 rounded-[2rem] bg-gradient-to-t from-black/80 via-black/45 to-black/10"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-2 left-1/2 h-14 w-44 -translate-x-1/2 rounded-[100%] bg-black/55 blur-lg"
          aria-hidden
        />

        {monster ? (
          <img
            src={monster.image}
            alt={displayName}
            className={`enemy-sprite relative z-[1] h-[95%] w-auto max-w-[92%] object-contain object-bottom ${
              isDefeated
                ? "scale-90 opacity-40 grayscale transition-all duration-500"
                : "enemy-sprite-float"
            }`}
            style={{
              filter:
                "drop-shadow(0 10px 18px rgba(0,0,0,0.75)) contrast(1.12) saturate(1.08) brightness(1.06)",
            }}
            draggable={false}
          />
        ) : (
          <div className="relative z-[1] mb-2 flex h-28 w-28 items-center justify-center rounded-full border border-[#8b3a3a]/45 bg-stone-950/90">
            <span className="text-4xl font-black text-[#c48888]">
              {displayName.slice(0, 1)}
            </span>
          </div>
        )}

        {!isDefeated && (
          <div className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2">
            <div className="rounded-full border border-amber-400/60 bg-black/85 px-3 py-1 shadow-lg">
              <p className="whitespace-nowrap text-center text-[11px] font-semibold tracking-wide text-amber-200">
                {intent.label}
                {intentDamage > 0
                  ? ` · ${intentDamage} 傷${intentDamageHint}`
                  : ""}
              </p>
            </div>
          </div>
        )}

        {damagePopups.map((popup) => (
          <DamageNumber key={popup.id} popup={popup} />
        ))}
      </div>

      <div className="w-full max-w-[16rem] shrink-0 rounded-md border border-[#8b3a3a]/40 bg-black/55 px-2.5 py-1.5">
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <h2
            className={`text-sm font-bold tracking-[0.14em] ${
              isDefeated ? "text-stone-500 line-through" : "text-[#f0c8c8]"
            }`}
          >
            {displayName}
          </h2>
          <span className="shrink-0 text-[10px] text-stone-300">
            {enemy.realm}
          </span>
        </div>
        <div className="mb-0.5 flex justify-between text-[10px]">
          <span className="text-[#e0a0a0]">氣血</span>
          <span className="stat-value font-bold text-[#f0d0d0]">
            {formatNumber(Math.max(0, enemy.currentHp))} /{" "}
            {formatNumber(enemy.maxHp)}
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full border border-black/50 bg-black/70">
          <div
            className="enemy-hp-fill h-full rounded-full transition-all duration-300"
            style={{ width: `${hpPercent}%` }}
          />
        </div>
        {(enemy.passiveLabel || hasFeedback) && (
          <div className="mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 text-[10px]">
            {enemy.passiveLabel && (
              <span className="text-[#c0c0e0]">{enemy.passiveLabel}</span>
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
