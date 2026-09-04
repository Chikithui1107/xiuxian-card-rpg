"use client";

import type { DungeonTier } from "@/types/game";
import {
  getDungeonChapterMeta,
  getRecommendedPowerLabel,
} from "@/lib/dungeon";

interface TierSelectionViewProps {
  tiers: DungeonTier[];
  unlockedAchievements: string[];
  playerAttack: number;
  onSelectTier: (tierId: string) => void;
  onBack?: () => void;
}

const ACCENT_STYLES: Record<
  DungeonTier["accent"],
  { border: string; badge: string; text: string; line: string }
> = {
  cyan: {
    border: "border-[#4a7c6f]/35 hover:border-[#7aab9a]/50",
    badge: "bg-stone-900/60 text-[#7aab9a]",
    text: "text-[#7aab9a]",
    line: "bg-[#4a7c6f]/40",
  },
  purple: {
    border: "border-[#5a5a7a]/35 hover:border-[#8a8aaa]/45",
    badge: "bg-stone-900/60 text-[#9a9ab8]",
    text: "text-[#9a9ab8]",
    line: "bg-[#5a5a7a]/40",
  },
  amber: {
    border: "border-[#8a7340]/35 hover:border-[#c9a84c]/50",
    badge: "bg-stone-900/60 text-[#c9a84c]",
    text: "text-[#c9a84c]",
    line: "bg-[#8a7340]/40",
  },
};

const STAGE_MARKS = ["①", "②", "③"];

export function TierSelectionView({
  tiers,
  unlockedAchievements,
  playerAttack,
  onSelectTier,
  onBack,
}: TierSelectionViewProps) {
  return (
    <div className="flex flex-col gap-3 px-3 pt-3 pb-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="zone-label">天下祕境</p>
          <h2 className="title-ink mt-1 text-lg font-bold">祕境試煉</h2>
          <p className="mt-1 text-[11px] tracking-wide text-stone-400">
            選擇本次修行的關卡
          </p>
          <p className="mt-0.5 text-[10px] text-stone-500">
            當前攻伐 {playerAttack.toLocaleString()}
          </p>
        </div>
        {onBack && (
          <button onClick={onBack} className="btn-cyber shrink-0 px-3 py-1 text-xs">
            ← 山門
          </button>
        )}
      </div>

      <div className="space-y-3">
        {tiers.map((tier, index) => {
          const styles = ACCENT_STYLES[tier.accent];
          const cleared = unlockedAchievements.includes(tier.achievementId);
          const powerHint = getRecommendedPowerLabel(tier);
          const chapter = getDungeonChapterMeta(tier);
          const stageMark = STAGE_MARKS[index] ?? `${chapter.stage}`;
          const floorPath = Array.from(
            { length: tier.floors },
            (_, i) => i + 1
          ).join(" → ");


          return (
            <button
              key={tier.id}
              onClick={() => onSelectTier(tier.id)}
              className={`card-hover w-full rounded border-2 bg-stone-900/90 p-4 text-left transition-all active:scale-[0.98] ${styles.border}`}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] tracking-[0.18em] text-stone-500">
                    第 {chapter.stage} 階段
                  </p>
                  <h3 className={`mt-0.5 text-base font-bold ${styles.text}`}>
                    {stageMark} {tier.name}
                  </h3>
                  <span
                    className={`mt-1 inline-block rounded border border-stone-700/40 px-2 py-0.5 text-[10px] font-semibold ${styles.badge}`}
                  >
                    {chapter.chapterLabel}
                  </span>
                </div>
                {cleared && (
                  <span className="shrink-0 rounded border border-[#8a7340]/40 bg-stone-900/80 px-2 py-0.5 text-[10px] text-[#c9a84c]">
                    已通關
                  </span>
                )}
              </div>

              <p className="mb-3 text-xs leading-relaxed text-stone-400">
                {tier.description}
              </p>

              <FloorTrack
                floors={tier.floors}
                cleared={cleared}
                lineClass={styles.line}
                floorPath={floorPath}
              />

              <div className="mt-2 mb-1 flex flex-wrap gap-2 text-[10px]">
                <span className="rounded border border-stone-700/40 bg-black/30 px-2 py-0.5 text-stone-400">
                  推薦修為：{chapter.realmLabel}
                </span>
                <span className="rounded border border-[#8a7340]/30 bg-black/30 px-2 py-0.5 text-[#c9a84c]/90">
                  獎勵：+{tier.bonusSpiritStones} 靈石
                </span>
                <span className="rounded border border-stone-700/40 bg-black/30 px-2 py-0.5 text-stone-500">
                  {powerHint}
                </span>
              </div>

              {tier.passiveDescription && (
                <p className="mt-2 text-[10px] italic text-[#9a9ab8]">
                  ◈ {tier.passiveDescription}
                </p>
              )}

              {cleared && (
                <p className="mt-1 text-[10px] text-[#8a7340]">
                  功業：{tier.achievementName}
                </p>
              )}

              <div className="mt-3 flex items-center justify-end border-t border-stone-700/30 pt-2.5">
                <span
                  className={`text-xs font-bold tracking-[0.2em] ${styles.text}`}
                >
                  {cleared ? "再挑戰（新一輪） →" : "開始挑戰 →"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FloorTrack({
  floors,
  cleared,
  lineClass,
  floorPath,
}: {
  floors: number;
  cleared: boolean;
  lineClass: string;
  floorPath: string;
}) {
  return (
    <div className="mb-1">
      <div className="flex items-center gap-1">
        {Array.from({ length: floors }, (_, i) => {
          const floor = i + 1;
          const state = cleared
            ? "done"
            : floor === 1
              ? "current"
              : "locked";
          return (
            <div key={floor} className="flex flex-1 items-center last:flex-none">
              <div
                className={`floor-node ${
                  state === "done"
                    ? "floor-node-done"
                    : state === "current"
                      ? "floor-node-current"
                      : "floor-node-locked"
                }`}
                title={
                  state === "done"
                    ? `關卡 ${floor} 已完成`
                    : state === "current"
                      ? `當前關卡 ${floor}`
                      : `關卡 ${floor} 未解鎖`
                }
              >
                {state === "done" ? "✓" : floor}
              </div>
              {floor < floors && (
                <div className={`mx-1 h-px flex-1 ${lineClass}`} />
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-1.5 text-[10px] tracking-wide text-stone-500">
        {cleared
          ? `已通關 · 關卡 ${floors} / ${floors}`
          : `關卡 ${floorPath} · 從第 1 關開始`}
      </p>
    </div>
  );
}
