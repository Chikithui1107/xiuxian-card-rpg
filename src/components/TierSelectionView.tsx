"use client";

import type { DungeonTier } from "@/types/game";
import { getRecommendedPowerLabel } from "@/lib/dungeon";

interface TierSelectionViewProps {
  tiers: DungeonTier[];
  unlockedAchievements: string[];
  playerAttack: number;
  onSelectTier: (tierId: string) => void;
  onBack?: () => void;
}

const ACCENT_STYLES: Record<
  DungeonTier["accent"],
  { border: string; badge: string; text: string }
> = {
  cyan: {
    border: "border-[#4a7c6f]/35 hover:border-[#7aab9a]/50",
    badge: "bg-stone-900/60 text-[#7aab9a]",
    text: "text-[#7aab9a]",
  },
  purple: {
    border: "border-[#5a5a7a]/35 hover:border-[#8a8aaa]/45",
    badge: "bg-stone-900/60 text-[#9a9ab8]",
    text: "text-[#9a9ab8]",
  },
  amber: {
    border: "border-[#8a7340]/35 hover:border-[#c9a84c]/50",
    badge: "bg-stone-900/60 text-[#c9a84c]",
    text: "text-[#c9a84c]",
  },
};

export function TierSelectionView({
  tiers,
  unlockedAchievements,
  playerAttack,
  onSelectTier,
  onBack,
}: TierSelectionViewProps) {
  return (
    <div className="flex flex-col gap-4 px-3 pt-3 pb-4">
      <div className="text-center">
        <p className="zone-label">祕境試煉</p>
        <h2 className="title-ink mt-1 text-lg font-bold">選擇試煉難度</h2>
        <p className="mt-1 text-[10px] text-stone-500">
          當前攻伐 {playerAttack.toLocaleString()} · 擇境而入
        </p>
      </div>

      {onBack && (
        <button onClick={onBack} className="btn-cyber self-start px-3 py-1 text-xs">
          ← 返回山門
        </button>
      )}

      <div className="space-y-3">
        {tiers.map((tier) => {
          const styles = ACCENT_STYLES[tier.accent];
          const cleared = unlockedAchievements.includes(tier.achievementId);
          const powerHint = getRecommendedPowerLabel(tier);

          return (
            <button
              key={tier.id}
              onClick={() => onSelectTier(tier.id)}
              className={`card-hover w-full rounded border-2 bg-stone-900/90 p-4 text-left transition-all active:scale-[0.98] ${styles.border}`}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <h3 className={`text-base font-bold ${styles.text}`}>
                    {tier.name}
                  </h3>
                  <span
                    className={`mt-1 inline-block rounded border border-stone-700/40 px-2 py-0.5 text-[10px] font-semibold ${styles.badge}`}
                  >
                    建議修為 · {tier.recommendedPower}
                  </span>
                </div>
                {cleared && (
                  <span className="shrink-0 rounded border border-[#8a7340]/40 bg-stone-900/80 px-2 py-0.5 text-[10px] text-[#c9a84c]">
                    已通關
                  </span>
                )}
              </div>

              <p className="mb-2 text-xs leading-relaxed text-stone-400">
                {tier.description}
              </p>

              <div className="mb-2 flex flex-wrap gap-2 text-[10px]">
                <span className="rounded border border-stone-700/40 bg-black/30 px-2 py-0.5 text-stone-400">
                  {tier.floors} 重關卡
                </span>
                <span className="rounded border border-stone-700/40 bg-black/30 px-2 py-0.5 text-stone-400">
                  難度 {tier.difficulty}
                </span>
                <span className="rounded border border-[#8a7340]/30 bg-black/30 px-2 py-0.5 text-[#c9a84c]/90">
                  +{tier.bonusSpiritStones} 靈石
                </span>
              </div>

              <p className="text-[10px] text-stone-500">{powerHint}</p>

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
            </button>
          );
        })}
      </div>
    </div>
  );
}
