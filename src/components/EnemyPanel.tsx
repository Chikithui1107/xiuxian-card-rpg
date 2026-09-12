"use client";

import { useEffect, useRef, useState } from "react";
import { getMonsterConfig } from "@/data/monsters";
import { formatNumber } from "@/lib/stats";
import { getEnemyIntent, totalIntentDamage } from "@/lib/enemy-intent";
import { publicAsset } from "@/lib/paths";
import {
  CARD_IMPACT_DELAY_MS,
  HIT_IMPACT_OFFSET_MS,
  HIT_SHAKE_MS,
  HIT_SLASH_MS,
  HP_BAR_DELAY_MS,
  HP_BAR_TRANSITION_MS,
  STAT_PULSE_MS,
} from "@/lib/combat-feedback";
import type { CombatEnemy, DamagePopup, EnemyIntent } from "@/types/game";

interface EnemyPanelProps {
  enemy: CombatEnemy;
  damagePopups: DamagePopup[];
  /** @deprecated 震動改由立繪本體處理 */
  isShaking?: boolean;
  hitFlash?: boolean;
  lastEnemyDamage?: number | null;
  lastDodge?: boolean;
  lastPassiveHeal?: number | null;
  karmaMarks?: number;
  /** 白夜：霜白劍光；因果道先不開 */
  frostSlash?: boolean;
}

const INTENT_ICON: Partial<Record<EnemyIntent["type"], string>> = {
  attack: publicAsset("/ui/intent/attack.jpg"),
  multiAttack: publicAsset("/ui/intent/multi-attack.jpg"),
  defend: publicAsset("/ui/intent/defend.jpg"),
  buff: publicAsset("/ui/intent/buff.jpg"),
  debuff: publicAsset("/ui/intent/debuff.jpg"),
};

function IntentGlyph({ type }: { type: EnemyIntent["type"] }) {
  const src = INTENT_ICON[type];
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className="enemy-intent__icon"
        draggable={false}
        aria-hidden
      />
    );
  }
  return <span aria-hidden>？</span>;
}

function formatIntentText(intent: EnemyIntent): string {
  switch (intent.type) {
    case "attack":
      return `${intent.value}`;
    case "multiAttack":
      return `${intent.value}×${intent.hits ?? 2}`;
    case "defend":
      return `${intent.value}`;
    case "debuff":
    case "buff":
      return intent.label;
    case "special":
      return intent.value > 0 ? `${intent.label} ${intent.value}` : intent.label;
    default:
      return intent.label;
  }
}

export function EnemyPanel({
  enemy,
  damagePopups,
  hitFlash = false,
  lastEnemyDamage,
  lastDodge,
  lastPassiveHeal,
  karmaMarks = 0,
  frostSlash = false,
}: EnemyPanelProps) {
  const isDefeated = enemy.currentHp <= 0;
  const intent = getEnemyIntent(enemy);
  const monster = getMonsterConfig(enemy);
  const displayName = monster?.name ?? enemy.name;
  const previewDamage = totalIntentDamage(intent);

  const [displayHp, setDisplayHp] = useState(enemy.currentHp);
  const [spriteShake, setSpriteShake] = useState(false);
  const [slashKey, setSlashKey] = useState(0);
  const [showSlash, setShowSlash] = useState(false);
  const [karmaPulse, setKarmaPulse] = useState(false);
  const [blockPulse, setBlockPulse] = useState(false);
  const [intentFloat, setIntentFloat] = useState<string | null>(null);
  const prevHpRef = useRef(enemy.currentHp);
  const prevKarmaRef = useRef(karmaMarks);
  const prevBlockRef = useRef(enemy.block ?? 0);
  const feedbackKeyRef = useRef(0);
  const hitTimersRef = useRef<number[]>([]);

  const clearHitTimers = () => {
    for (const id of hitTimersRef.current) window.clearTimeout(id);
    hitTimersRef.current = [];
  };

  // 受擊：slash → shake → HP bar（不碰 enemy-unit 的 scale／offset）
  useEffect(() => {
    const prev = prevHpRef.current;
    const next = enemy.currentHp;
    if (next >= prev) {
      prevHpRef.current = next;
      setDisplayHp(next);
      return;
    }

    clearHitTimers();
    prevHpRef.current = next;

    const tSlash = window.setTimeout(() => {
      if (frostSlash) {
        setSlashKey((k) => k + 1);
        setShowSlash(true);
        const tSlashEnd = window.setTimeout(() => setShowSlash(false), HIT_SLASH_MS);
        hitTimersRef.current.push(tSlashEnd);
      }
    }, CARD_IMPACT_DELAY_MS);

    const tImpact = window.setTimeout(() => {
      setSpriteShake(true);
      const tShakeEnd = window.setTimeout(() => setSpriteShake(false), HIT_SHAKE_MS);
      hitTimersRef.current.push(tShakeEnd);
    }, CARD_IMPACT_DELAY_MS + HIT_IMPACT_OFFSET_MS);

    const tHp = window.setTimeout(() => {
      setDisplayHp(next);
    }, CARD_IMPACT_DELAY_MS + HP_BAR_DELAY_MS);

    hitTimersRef.current.push(tSlash, tImpact, tHp);
    return () => clearHitTimers();
  }, [enemy.currentHp, frostSlash]);

  useEffect(() => {
    if (karmaMarks > prevKarmaRef.current) {
      setKarmaPulse(true);
      const t = window.setTimeout(() => setKarmaPulse(false), STAT_PULSE_MS);
      prevKarmaRef.current = karmaMarks;
      return () => window.clearTimeout(t);
    }
    prevKarmaRef.current = karmaMarks;
  }, [karmaMarks]);

  useEffect(() => {
    const block = enemy.block ?? 0;
    if (block > prevBlockRef.current) {
      setBlockPulse(true);
      const t = window.setTimeout(() => setBlockPulse(false), STAT_PULSE_MS);
      prevBlockRef.current = block;
      return () => window.clearTimeout(t);
    }
    prevBlockRef.current = block;
  }, [enemy.block]);

  useEffect(() => {
    let label: string | null = null;
    if (lastDodge) {
      label = "閃避成功";
    } else if (lastEnemyDamage != null && lastEnemyDamage > 0) {
      const hint =
        previewDamage > 0
          ? `${intent.label} · ${lastEnemyDamage}傷`
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
    previewDamage,
    enemy.passive,
  ]);

  const hpPercent = Math.max(0, (displayHp / enemy.maxHp) * 100);
  const isBoss =
    enemy.id === "enemy_elder" || enemy.monsterSprite === "blood_elder";
  const scale = monster?.visualScale ?? 1;
  const offsetY = monster?.visualOffsetY ?? 0;

  const statusLines = (
    <>
      {(enemy.block ?? 0) > 0 && (
        <p
          className={`mt-0.5 text-[9px] tracking-wide text-[#8a9aaa] ${
            blockPulse ? "hud-stat-pulse" : ""
          }`}
        >
          護盾 {enemy.block}
        </p>
      )}
      {enemy.passiveLabel && (
        <p className="mt-0.5 text-[9px] tracking-wide text-[#a8a0c8]/80">
          {enemy.passiveLabel}
        </p>
      )}
      {karmaMarks > 0 && (
        <p
          className={`mt-0.5 text-[9px] tracking-wide ${
            karmaMarks >= 5
              ? "font-semibold text-[#e0a090] karma-marks-heavy"
              : "text-[#c48888]/90"
          } ${karmaPulse ? "hud-stat-pulse" : ""}`}
        >
          因果印記 · {karmaMarks}
          {karmaMarks >= 5 ? " · 將滿" : ""}
        </p>
      )}
    </>
  );

  const intentChip = !isDefeated && (
    <div
      className={`enemy-intent enemy-intent--${intent.type}`}
      title={intent.label}
    >
      <IntentGlyph type={intent.type} />
      <span className="enemy-intent__text">{formatIntentText(intent)}</span>
    </div>
  );

  return (
    <div
      className={`enemy-panel relative flex h-full min-h-0 flex-col items-center justify-start ${
        isBoss ? "pt-9" : "pt-1"
      } ${isDefeated ? "opacity-70" : ""}`}
    >
      {isBoss && (
        <div className="enemy-boss-hud pointer-events-none absolute left-1/2 top-1 z-30 w-[min(92%,20rem)] -translate-x-1/2 text-center">
          <p className="flex items-baseline justify-center gap-1.5 text-[12px] tracking-wide">
            <span
              className={`font-bold ${
                isDefeated ? "text-stone-500 line-through" : "text-[#f0e6d3]"
              }`}
            >
              {displayName}
            </span>
            <span className="text-stone-400">{enemy.realm}</span>
          </p>
          <div className="mx-auto mt-1 flex w-full items-center gap-1.5">
            <div className="h-[7px] min-w-0 flex-1 overflow-hidden rounded-full border border-[#5a3030]/45 bg-black/55">
              <div
                className="enemy-hp-fill h-full rounded-full"
                style={{
                  width: `${hpPercent}%`,
                  transition: `width ${HP_BAR_TRANSITION_MS}ms ease-out`,
                }}
              />
            </div>
            <span className="shrink-0 text-[10px] tabular-nums text-[#e0a8a8]">
              {formatNumber(Math.max(0, displayHp))}/
              {formatNumber(enemy.maxHp)}
            </span>
          </div>
        </div>
      )}

      <div
        className={`enemy-sprite-stage relative mx-auto w-[min(72%,15.75rem)] max-w-[15.75rem] shrink-0 ${
          hitFlash ? "enemy-hit-flash" : ""
        }`}
      >
        <div
          className="pointer-events-none absolute bottom-[2%] left-1/2 h-[12%] w-[58%] -translate-x-1/2 rounded-[100%] bg-[radial-gradient(ellipse,rgba(4,8,14,0.45)_0%,rgba(4,8,14,0.12)_55%,transparent_75%)] blur-[6px]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-[4%] left-1/2 h-[18%] w-[70%] -translate-x-1/2 rounded-[100%] bg-[radial-gradient(ellipse,rgba(90,130,150,0.1)_0%,transparent_70%)] blur-[10px]"
          aria-hidden
        />

        <div
          className="enemy-unit relative z-[1] flex w-full flex-col items-center"
          style={{
            transform: `translateY(${offsetY}%) scale(${scale})`,
            transformOrigin: "bottom center",
          }}
        >
          <div className="enemy-hud pointer-events-none z-20 mb-0.5 w-full max-w-[10.5rem] shrink-0 text-center">
            {!isBoss && (
              <>
                <p className="flex items-baseline justify-center gap-1.5 text-[11px] tracking-wide">
                  <span
                    className={`font-bold ${
                      isDefeated
                        ? "text-stone-500 line-through"
                        : "text-[#f0e6d3]"
                    }`}
                  >
                    {displayName}
                  </span>
                  <span className="text-stone-400">{enemy.realm}</span>
                </p>
                <div className="mx-auto mt-0.5 flex w-[78%] items-center gap-1">
                  <div className="h-[3px] min-w-0 flex-1 overflow-hidden rounded-full bg-black/45">
                    <div
                      className="enemy-hp-fill h-full rounded-full"
                      style={{
                        width: `${hpPercent}%`,
                        transition: `width ${HP_BAR_TRANSITION_MS}ms ease-out`,
                      }}
                    />
                  </div>
                  <span className="shrink-0 text-[9px] tabular-nums text-[#e0a8a8]">
                    {formatNumber(Math.max(0, displayHp))}/
                    {formatNumber(enemy.maxHp)}
                  </span>
                </div>
              </>
            )}
            {intentChip}
            {statusLines}
          </div>

          <div className="relative flex h-[min(72%,14.25rem)] w-full items-end justify-center">
            {monster ? (
              <div
                className={`flex h-full w-full items-end justify-center ${
                  isDefeated ? "" : "enemy-sprite-float-wrap"
                }`}
              >
                <div
                  className={`relative flex h-full max-w-full items-end justify-center ${
                    spriteShake ? "enemy-sprite-hit-shake" : ""
                  }`}
                >
                  <img
                    src={monster.image}
                    alt={displayName}
                    className={`enemy-sprite h-full w-auto max-w-full object-contain object-bottom ${
                      isDefeated
                        ? "scale-90 opacity-40 grayscale transition-all duration-500"
                        : ""
                    }`}
                    style={{
                      filter:
                        "drop-shadow(0 8px 14px rgba(0,0,0,0.55)) contrast(1.08) saturate(1.02) brightness(1.04)",
                    }}
                    draggable={false}
                  />
                  {showSlash && (
                    <span
                      key={slashKey}
                      className="enemy-frost-slash"
                      aria-hidden
                    />
                  )}
                </div>
              </div>
            ) : (
              <div
                className={`mb-2 flex h-24 w-24 items-center justify-center rounded-full border border-[#8b3a3a]/35 bg-stone-950/50 ${
                  spriteShake ? "enemy-sprite-hit-shake" : ""
                }`}
              >
                <span className="text-3xl font-black text-[#c48888]">
                  {displayName.slice(0, 1)}
                </span>
              </div>
            )}
          </div>
        </div>

        {intentFloat && (
          <div
            key={feedbackKeyRef.current}
            className="animate-combat-float pointer-events-none absolute left-1/2 top-[8%] z-30 -translate-x-1/2 whitespace-nowrap text-[12px] font-semibold tracking-wide text-[#f0d8a8]"
            style={{
              textShadow:
                "0 1px 4px rgba(0,0,0,0.85), 0 0 12px rgba(0,0,0,0.4)",
            }}
          >
            {intentFloat}
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 z-30 overflow-visible">
          {damagePopups.map((popup) => (
            <DamageNumber key={popup.id} popup={popup} />
          ))}
        </div>
      </div>
    </div>
  );
}

function DamageNumber({ popup }: { popup: DamagePopup }) {
  return (
    <div
      className="combat-dmg-number pointer-events-none absolute font-black tabular-nums"
      style={{
        left: `${popup.x}%`,
        top: `${popup.y}%`,
      }}
    >
      -{popup.value.toLocaleString()}
    </div>
  );
}
