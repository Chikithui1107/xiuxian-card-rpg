"use client";

import { formatNumber } from "@/lib/stats";
import type { CombatEnemy, DamagePopup } from "@/types/game";

interface EnemyPanelProps {
  enemy: CombatEnemy;
  damagePopups: DamagePopup[];
  isShaking: boolean;
  lastEnemyDamage?: number | null;
}

export function EnemyPanel({
  enemy,
  damagePopups,
  isShaking,
  lastEnemyDamage,
}: EnemyPanelProps) {
  const hpPercent = Math.max(0, (enemy.currentHp / enemy.maxHp) * 100);
  const isDefeated = enemy.currentHp <= 0;

  return (
    <div className="relative flex flex-col items-center">
      <div className="mb-2 text-center">
        <p className="text-xs tracking-widest text-[#8a7340]">副本敵人</p>
        <h2
          className={`text-2xl font-bold tracking-widest ${isDefeated ? "text-[#5a5550] line-through" : "text-[#c45c5c]"}`}
        >
          {enemy.name}
        </h2>
        <p className="text-xs text-[#5a5550]">
          {enemy.realm} · {enemy.description}
        </p>
      </div>

      <div
        className={`relative w-full max-w-md rounded-lg border-2 border-[#3a3530] bg-[#1a1814] p-6 transition-all ${isShaking ? "animate-shake" : ""} ${isDefeated ? "opacity-50" : "animate-pulse-glow"}`}
      >
        {/* Enemy silhouette */}
        <div className="mx-auto mb-4 flex h-32 w-32 items-center justify-center rounded-full border-2 border-[#8b2020]/40 bg-[#0a0a0a]">
          <span className="text-5xl opacity-60">妖</span>
        </div>

        {/* HP Bar */}
        <div className="mb-1 flex justify-between text-xs">
          <span className="text-[#8a7340]">氣血</span>
          <span className="stat-value font-bold text-[#c45c5c]">
            {formatNumber(Math.max(0, enemy.currentHp))} /{" "}
            {formatNumber(enemy.maxHp)}
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full border border-[#3a3530] bg-[#0a0a0a]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#8b2020] to-[#c45c5c] transition-all duration-300"
            style={{ width: `${hpPercent}%` }}
          />
        </div>

        {/* Damage popups */}
        {damagePopups.map((popup) => (
          <DamageNumber key={popup.id} popup={popup} />
        ))}

        {lastEnemyDamage != null && lastEnemyDamage > 0 && (
          <p className="mt-2 text-center text-xs text-[#c45c5c]">
            敵人反擊造成 {lastEnemyDamage} 點傷害
          </p>
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
        fontSize: isCrit ? "2.5rem" : isHigh ? "2rem" : "1.5rem",
        color: isCrit ? "#ffd700" : isHigh ? "#ff6b35" : "#f0e6d3",
        textShadow: isCrit
          ? "0 0 12px #ffd700, 0 0 24px #ff4500, 2px 2px 0 #8b2020"
          : isHigh
            ? "0 0 8px #ff6b35, 2px 2px 0 #8b2020"
            : "2px 2px 0 #3a3530",
        WebkitTextStroke: isCrit ? "1px #8b4513" : undefined,
      }}
    >
      {isCrit && (
        <span className="mr-1 block text-center text-sm tracking-widest text-[#ffd700]">
          暴擊
        </span>
      )}
      -{popup.value.toLocaleString()}
    </div>
  );
}
