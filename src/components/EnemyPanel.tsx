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
  lastCounterDamage?: number | null;
  lastComboDamage?: number | null;
  lastReflectDamage?: number | null;
  lastPassiveHeal?: number | null;
}

export function EnemyPanel({
  enemy,
  damagePopups,
  isShaking,
  lastEnemyDamage,
  lastDodge,
  lastCounterDamage,
  lastComboDamage,
  lastReflectDamage,
  lastPassiveHeal,
}: EnemyPanelProps) {
  const hpPercent = Math.max(0, (enemy.currentHp / enemy.maxHp) * 100);
  const isDefeated = enemy.currentHp <= 0;
  const intent = getEnemyIntent(enemy);

  return (
    <div className="glass-panel-danger overflow-hidden">
      <div className="border-b border-[#8b3a3a]/20 bg-black/20 px-4 py-2.5 text-center">
        <p className="zone-label text-[#a85555]/80">妖邪</p>
        <h2
          className={`text-lg font-bold tracking-wider ${isDefeated ? "text-stone-600 line-through" : "text-[#c48888]"}`}
        >
          {enemy.name}
        </h2>
        <p className="text-[10px] text-stone-500">{enemy.realm}</p>
        <p className="mt-1 text-[10px] text-amber-400/90">
          意圖：{intent.label}
          {intent.damage > 0 ? ` · ${intent.damage} 傷` : ""}
        </p>
        <div className="mt-1 flex justify-center gap-1">
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
        {enemy.attackPatternLabel && (
          <p className="mt-1 text-[10px] text-[#c48888]">
            ⚔ {enemy.attackPatternLabel}
          </p>
        )}
        {enemy.passiveLabel && (
          <p className="mt-1 text-[10px] italic text-[#9a9ab8]">
            ◈ {enemy.passiveLabel}
          </p>
        )}
      </div>

      <div
        className={`relative px-4 py-4 transition-all ${isShaking ? "animate-shake" : ""} ${!isDefeated ? "animate-qi-breathe rounded" : "opacity-60"}`}
      >
        <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#8b3a3a]/35 bg-gradient-to-br from-stone-900/70 to-black/60">
          <span className="text-3xl font-black text-[#8b3a3a]/60">妖</span>
        </div>

        <div className="mb-1 flex justify-between text-[10px]">
          <span className="text-[#a85555]/80">氣血</span>
          <span className="stat-value font-bold text-[#c48888]">
            {formatNumber(Math.max(0, enemy.currentHp))} /{" "}
            {formatNumber(enemy.maxHp)}
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-black/40">
          <div
            className="enemy-hp-fill h-full rounded-full transition-all duration-300"
            style={{ width: `${hpPercent}%` }}
          />
        </div>

        {damagePopups.map((popup) => (
          <DamageNumber key={popup.id} popup={popup} />
        ))}

        {lastComboDamage != null && lastComboDamage > 0 && (
          <p className="mt-1 text-center text-[10px] text-[#c9a84c]">
            慧劍連擊 -{lastComboDamage}
          </p>
        )}

        {lastReflectDamage != null && lastReflectDamage > 0 && (
          <p className="mt-1 text-center text-[10px] text-[#7aab9a]">
            逆流反彈 -{lastReflectDamage}
          </p>
        )}

        {lastDodge && (
          <p className="mt-2 text-center text-[10px] text-[#7aab9a]">
            閃避成功！
          </p>
        )}

        {lastCounterDamage != null && lastCounterDamage > 0 && (
          <p className="mt-1 text-center text-[10px] text-[#c9a84c]">
            玄鐵反擊 -{lastCounterDamage}
          </p>
        )}

        {lastEnemyDamage != null && lastEnemyDamage > 0 && (
          <p className="mt-2 text-center text-[10px] text-[#a85555]">
            反噬 -{lastEnemyDamage}
            {enemy.passive === "burn" && (
              <span className="text-[#c48888]">（灼燒）</span>
            )}
          </p>
        )}

        {lastEnemyDamage === 0 && lastDodge && (
          <p className="mt-1 text-center text-[10px] text-stone-500">
            完全閃避，未受傷害
          </p>
        )}

        {lastPassiveHeal != null && lastPassiveHeal > 0 && (
          <p className="mt-1 text-center text-[10px] text-[#7aab9a]">
            妖法回復 +{lastPassiveHeal}
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
