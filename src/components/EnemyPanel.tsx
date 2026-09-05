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

  const [hitShake, setHitShake] = useState(false);
  const [intentFloat, setIntentFloat] = useState<string | null>(null);
  const prevHpRef = useRef(enemy.currentHp);
  const feedbackKeyRef = useRef(0);

  useEffect(() => {
    if (enemy.currentHp < prevHpRef.current) {
      setHitShake(true);
      const timer = setTimeout(() => setHitShake(false), 350);
      prevHpRef.current = enemy.currentHp;
      return () => clearTimeout(timer);
    }
    prevHpRef.current = enemy.currentHp;
  }, [enemy.currentHp]);

  useEffect(() => {
    let label: string | null = null;
    if (lastDodge) {
      label = "閃避成功";
    } else if (lastEnemyDamage != null && lastEnemyDamage > 0) {
      const hint =
        intentDamage > 0
          ? `${intent.label} · ${intentDamage}傷`
          : `反噬 · ${lastEnemyDamage}`;
      label = enemy.passive === "burn" ? `${hint}（灼燒）` : hint;
    } else if (lastPassiveHeal != null && lastPassiveHeal > 0) {
      label = `回復 +${lastPassiveHeal}`;
    }
    if (!label) return;
    feedbackKeyRef.current += 1;
    setIntentFloat(label);
    const t = setTimeout(() => setIntentFloat(null), 1100);
    return () => clearTimeout(t);
  }, [
    lastDodge,
    lastEnemyDamage,
    lastPassiveHeal,
    intent.label,
    intentDamage,
    enemy.passive,
  ]);

  const shaking = isShaking || hitShake;

  return (
    <div
      className={`enemy-panel relative flex h-full min-h-0 flex-col items-center justify-start pt-[5vh] ${
        isDefeated ? "opacity-70" : ""
      }`}
    >
      {/* 頭頂輕量 HUD：名稱 + 境界，細血條（與立繪緊貼） */}
      <div className="enemy-hud pointer-events-none z-20 mb-1 w-full max-w-[12rem] shrink-0 text-center">
        <p className="flex items-baseline justify-center gap-2 text-[11px] tracking-wide">
          <span
            className={`font-bold ${
              isDefeated ? "text-stone-500 line-through" : "text-[#f0e6d3]"
            }`}
          >
            {displayName}
          </span>
          <span className="text-stone-400">{enemy.realm}</span>
        </p>
        <div className="mx-auto mt-1 flex w-[90%] items-center gap-1.5">
          <div className="h-[3px] min-w-0 flex-1 overflow-hidden rounded-full bg-black/45">
            <div
              className="enemy-hp-fill h-full rounded-full transition-all duration-300"
              style={{ width: `${hpPercent}%` }}
            />
          </div>
          <span className="shrink-0 text-[9px] tabular-nums text-[#e0a8a8]">
            {formatNumber(Math.max(0, enemy.currentHp))}/
            {formatNumber(enemy.maxHp)}
          </span>
        </div>
        {enemy.passiveLabel && (
          <p className="mt-0.5 text-[9px] tracking-wide text-[#a8a0c8]/80">
            {enemy.passiveLabel}
          </p>
        )}
      </div>

      {/* 人形基準舞台；各怪用 visualScale / visualOffsetY 個別調整 */}
      <div
        className={`enemy-sprite-stage relative mx-auto flex h-[min(42vh,15.5rem)] w-[min(56vw,15.75rem)] max-w-[15.75rem] shrink-0 items-end justify-center ${
          shaking ? "animate-shake" : ""
        } ${hitFlash ? "enemy-hit-flash" : ""}`}
      >
        <div
          className="pointer-events-none absolute bottom-[2%] left-1/2 h-[12%] w-[58%] -translate-x-1/2 rounded-[100%] bg-[radial-gradient(ellipse,rgba(4,8,14,0.45)_0%,rgba(4,8,14,0.12)_55%,transparent_75%)] blur-[6px]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-[4%] left-1/2 h-[18%] w-[70%] -translate-x-1/2 rounded-[100%] bg-[radial-gradient(ellipse,rgba(90,130,150,0.1)_0%,transparent_70%)] blur-[10px]"
          aria-hidden
        />

        {monster ? (
          <div
            className="relative z-[1] flex h-full w-full items-end justify-center"
            style={{
              transform: `translateY(${monster.visualOffsetY}vh) scale(${monster.visualScale})`,
              transformOrigin: "bottom center",
            }}
          >
            <img
              src={monster.image}
              alt={displayName}
              className={`enemy-sprite h-full w-auto max-w-full object-contain object-bottom ${
                isDefeated
                  ? "scale-90 opacity-40 grayscale transition-all duration-500"
                  : "enemy-sprite-float"
              }`}
              style={{
                filter:
                  "drop-shadow(0 8px 14px rgba(0,0,0,0.55)) contrast(1.08) saturate(1.02) brightness(1.04)",
              }}
              draggable={false}
            />
          </div>
        ) : (
          <div className="relative z-[1] mb-2 flex h-24 w-24 items-center justify-center rounded-full border border-[#8b3a3a]/35 bg-stone-950/50">
            <span className="text-3xl font-black text-[#c48888]">
              {displayName.slice(0, 1)}
            </span>
          </div>
        )}

        {intentFloat && (
          <div
            key={feedbackKeyRef.current}
            className="animate-combat-float pointer-events-none absolute left-1/2 top-[8%] z-30 -translate-x-1/2 whitespace-nowrap text-[12px] font-semibold tracking-wide text-[#f0d8a8]"
            style={{
              textShadow: "0 1px 4px rgba(0,0,0,0.85), 0 0 12px rgba(0,0,0,0.4)",
            }}
          >
            {intentFloat}
          </div>
        )}

        {damagePopups.map((popup) => (
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
      className={`pointer-events-none absolute z-20 font-black ${
        isCrit ? "animate-crit-pop" : "animate-float-up"
      }`}
      style={{
        left: `${popup.x}%`,
        top: `${popup.y}%`,
        fontSize: isCrit ? "1.75rem" : isHigh ? "1.45rem" : "1.15rem",
        color: isCrit ? "#c9a84c" : isHigh ? "#c48888" : "#e8e0d4",
        textShadow: isCrit
          ? "1px 1px 0 #3a3530, -1px -1px 0 #3a3530"
          : "2px 2px 0 #3a3530",
      }}
    >
      {isCrit && (
        <span className="block text-center text-[10px] text-[#c9a84c]">
          暴擊
        </span>
      )}
      -{popup.value.toLocaleString()}
    </div>
  );
}
