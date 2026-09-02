"use client";

import { formatNumber } from "@/lib/stats";
import { ENEMY_INTENT_CYCLE, getEnemyIntent } from "@/lib/dungeon";
import type { CombatEnemy, DamagePopup } from "@/types/game";

interface EnemyPanelProps {
  enemy: CombatEnemy;
  damagePopups: DamagePopup[];
  isShaking: boolean;
  lastEnemyDamage?: number | null;
  lastDodge?: boolean;
  lastPassiveHeal?: number | null;
}

export function EnemyPanel({
  enemy,
  damagePopups,
  isShaking,
  lastEnemyDamage,
  lastDodge,
  lastPassiveHeal,
}: EnemyPanelProps) {
  const hpPercent = Math.max(0, (enemy.currentHp / enemy.maxHp) * 100);
  const isDefeated = enemy.currentHp <= 0;
  const intent = getEnemyIntent(enemy);

  return (
    <div
      className={`glass-panel-danger relative overflow-hidden p-3 ${isShaking ? "animate-shake" : ""} ${
        isDefeated ? "opacity-60" : "animate-qi-breathe"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-[#8b3a3a]/40 bg-gradient-to-br from-stone-900/80 to-black/70">
          <span className="text-2xl font-black text-[#c48888]/75">
            {enemy.name.slice(0, 1)}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h2
              className={`truncate text-base font-bold tracking-wider ${
                isDefeated ? "text-stone-600 line-through" : "text-[#c48888]"
              }`}
            >
              {enemy.name}
            </h2>
            <span className="shrink-0 text-[10px] text-stone-500">
              {enemy.realm}
            </span>
          </div>
          <p className="mt-0.5 text-[10px] text-amber-400/90">
            意圖：{intent.label}
            {intent.damage > 0 ? ` · ${intent.damage} 傷` : ""}
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
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
          <div className="mt-1.5 mb-0.5 flex justify-between text-[10px]">
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
          {enemy.passiveLabel && (
            <p className="mt-1 truncate text-[10px] italic text-[#9a9ab8]">
              ◈ {enemy.passiveLabel}
            </p>
          )}
        </div>
      </div>

      {damagePopups.map((popup) => (
        <DamageNumber key={popup.id} popup={popup} />
      ))}

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
