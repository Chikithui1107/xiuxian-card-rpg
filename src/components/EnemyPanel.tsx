"use client";

import { useEffect, useRef, useState } from "react";
import { getMonsterConfig } from "@/data/monsters";
import { formatNumber } from "@/lib/stats";
import { ENEMY_INTENT_CYCLE, getEnemyIntent } from "@/lib/dungeon";
import type { CombatEnemy, DamagePopup } from "@/types/game";

interface EnemyPanelProps {
  enemy: CombatEnemy;
  damagePopups: DamagePopup[];
  isShaking?: boolean;
  lastEnemyDamage?: number | null;
  lastDodge?: boolean;
  lastPassiveHeal?: number | null;
}

export function EnemyPanel({
  enemy,
  damagePopups,
  isShaking = false,
  lastEnemyDamage,
  lastDodge,
  lastPassiveHeal,
}: EnemyPanelProps) {
  const hpPercent = Math.max(0, (enemy.currentHp / enemy.maxHp) * 100);
  const isDefeated = enemy.currentHp <= 0;
  const intent = getEnemyIntent(enemy);
  const monster = getMonsterConfig(enemy);

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

  return (
    <div className="relative bg-transparent">
      {monster ? (
        <div
          className={`enemy-sprite-stage relative mx-auto mb-2 flex h-40 w-full max-w-[16rem] items-end justify-center bg-transparent ${
            shaking ? "animate-shake" : isDefeated ? "" : "animate-qi-breathe"
          }`}
        >
          <img
            src={monster.image}
            alt={monster.name}
            className={`enemy-sprite max-h-full w-auto bg-transparent object-contain drop-shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all duration-500 ${
              isDefeated ? "scale-90 opacity-40 grayscale" : ""
            }`}
            draggable={false}
          />
          {damagePopups.map((popup) => (
            <DamageNumber key={popup.id} popup={popup} />
          ))}
        </div>
      ) : (
        <div
          className={`mx-auto mb-2 flex h-24 w-24 items-center justify-center rounded-full border-2 border-[#8b3a3a]/40 bg-gradient-to-br from-stone-900/80 to-stone-950/80 ${
            shaking ? "animate-shake" : ""
          }`}
        >
          <span className="text-3xl font-black text-[#c48888]/75">
            {enemy.name.slice(0, 1)}
          </span>
        </div>
      )}

      <div
        className={`glass-panel-danger relative p-3 ${isDefeated ? "opacity-70" : ""}`}
      >
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h2
            className={`text-base font-bold tracking-wider ${
              isDefeated ? "text-stone-600 line-through" : "text-[#c48888]"
            }`}
          >
            {monster?.name ?? enemy.name}
          </h2>
          <span className="shrink-0 text-[10px] text-stone-500">
            {enemy.realm}
          </span>
        </div>

        <p className="text-center text-[10px] text-amber-400/90">
          意圖：{intent.label}
          {intent.damage > 0 ? ` · ${intent.damage} 傷` : ""}
        </p>
        <div className="mt-1 flex flex-wrap justify-center gap-1">
          {ENEMY_INTENT_CYCLE.map((it, i) => (
            <span
              key={it.id}
              className={`rounded px-1 py-0.5 text-[8px] ${
                i === (enemy.intentIndex ?? 0)
                  ? "bg-amber-500/30 text-amber-200"
                  : "bg-stone-800 text-stone-500"
              }`}
            >
              {it.label}
            </span>
          ))}
        </div>

        <div className="mt-2 mb-0.5 flex justify-between text-[10px]">
          <span className="text-[#a85555]/80">氣血</span>
          <span className="stat-value font-bold text-[#c48888]">
            {formatNumber(Math.max(0, enemy.currentHp))} /{" "}
            {formatNumber(enemy.maxHp)}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-black/40">
          <div
            className="enemy-hp-fill h-full rounded-full transition-all duration-300"
            style={{ width: `${hpPercent}%` }}
          />
        </div>

        {(monster?.description ?? enemy.description) && (
          <p className="mt-1.5 text-center text-[10px] text-stone-500">
            {monster?.description ?? enemy.description}
          </p>
        )}
        {enemy.passiveLabel && (
          <p className="mt-1 truncate text-center text-[10px] italic text-[#9a9ab8]">
            ◈ {enemy.passiveLabel}
          </p>
        )}

        <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[10px]">
          {lastDodge && <span className="text-[#7aab9a]">閃避成功</span>}
          {lastEnemyDamage != null && lastEnemyDamage > 0 && (
            <span className="text-[#a85555]">
              反噬 -{lastEnemyDamage}
              {enemy.passive === "burn" ? "（灼燒）" : ""}
            </span>
          )}
          {lastEnemyDamage === 0 && lastDodge && (
            <span className="text-stone-500">完全閃避</span>
          )}
          {lastPassiveHeal != null && lastPassiveHeal > 0 && (
            <span className="text-[#7aab9a]">回復 +{lastPassiveHeal}</span>
          )}
        </div>

        {!monster &&
          damagePopups.map((popup) => (
            <DamageNumber key={popup.id} popup={popup} />
          ))}
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
