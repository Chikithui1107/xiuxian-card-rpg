"use client";

import { useEffect, useMemo, useState } from "react";
import type { DungeonTier } from "@/types/game";
import {
  getDungeonChapterMeta,
  getDungeonUnlockHint,
  isDungeonTierUnlocked,
} from "@/lib/dungeon";

interface TierSelectionViewProps {
  tiers: DungeonTier[];
  unlockedAchievements: string[];
  playerAttack: number;
  onSelectTier: (tierId: string) => void;
  onBack?: () => void;
}

export function TierSelectionView({
  tiers,
  unlockedAchievements,
  onSelectTier,
}: TierSelectionViewProps) {
  const initialIndex = useMemo(() => {
    for (let i = 0; i < tiers.length; i++) {
      if (!isDungeonTierUnlocked(tiers, i, unlockedAchievements)) {
        return Math.max(0, i - 1);
      }
      if (!unlockedAchievements.includes(tiers[i].achievementId)) {
        return i;
      }
    }
    return Math.max(0, tiers.length - 1);
  }, [tiers, unlockedAchievements]);

  const [focusIndex, setFocusIndex] = useState(initialIndex);
  const [lawOpen, setLawOpen] = useState(false);

  useEffect(() => {
    setFocusIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    setLawOpen(false);
  }, [focusIndex]);

  const tier = tiers[focusIndex];
  if (!tier) return null;

  const meta = getDungeonChapterMeta(tier);
  const unlocked = isDungeonTierUnlocked(
    tiers,
    focusIndex,
    unlockedAchievements
  );
  const cleared = unlockedAchievements.includes(tier.achievementId);
  const unlockHint = getDungeonUnlockHint(tiers, focusIndex);
  const realmTitle = `${meta.realmLabel.replace("期", "")}秘境 · ${meta.locationName}`;

  return (
    <div className="realm-select relative flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* 中央舞台：佔主體高度，預留秘境背景層 */}
      <section className="realm-stage relative flex min-h-0 flex-1 flex-col">
        <div className="realm-stage-bg" aria-hidden />

        <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center px-5 py-2">
          <p className="text-[10px] tracking-[0.32em] text-stone-500">
            ───── 秘境
            {meta.stage === 1 ? "一" : meta.stage === 2 ? "二" : "三"} ─────
          </p>

          <h2 className="mt-3 text-[1.15rem] font-bold tracking-[0.28em] text-[#d5e8dc]">
            {realmTitle}
          </h2>
          <p className="mt-1.5 text-[10px] tracking-[0.22em] text-stone-500">
            {meta.chapterLabel}
          </p>

          <p className="mt-3 max-w-[17rem] text-center text-[12px] leading-relaxed tracking-wide text-stone-400">
            {tier.description}
          </p>

          {tier.passiveDescription && meta.lawName && (
            <div className="mt-2.5">
              <button
                type="button"
                onClick={() => setLawOpen((v) => !v)}
                className="border-none bg-transparent px-1 py-0.5 text-[10px] tracking-[0.16em] text-[#c9b07a]/90"
              >
                ◇ 秘境法則　{meta.lawName}
              </button>
              {lawOpen && (
                <p className="mt-1.5 max-w-[16rem] text-center text-[10px] leading-relaxed text-stone-500">
                  {tier.passiveDescription}
                </p>
              )}
            </div>
          )}

          {/* 關卡進度 */}
          <div className="mt-4 flex items-center gap-2">
            {Array.from({ length: tier.floors }, (_, i) => {
              const floor = i + 1;
              const state = cleared
                ? "done"
                : unlocked && floor === 1
                  ? "current"
                  : "locked";
              return (
                <div key={floor} className="flex items-center gap-2">
                  <div
                    className={`flex h-7 w-7 flex-col items-center justify-center ${
                      state === "current"
                        ? "text-[#c9a84c]"
                        : state === "done"
                          ? "text-[#8eb8a8]"
                          : "text-stone-600"
                    }`}
                  >
                    <span className="text-[9px] opacity-70">◇</span>
                    <span className="text-[11px] font-semibold">{floor}</span>
                  </div>
                  {floor < tier.floors && (
                    <span className="text-stone-700">─</span>
                  )}
                </div>
              );
            })}
          </div>
          {unlocked && !cleared && (
            <p className="mt-0.5 text-[9px] tracking-wide text-stone-600">
              ↑ 當前進度
            </p>
          )}

          {/* 一行資訊 */}
          <p className="mt-3 text-[11px] tracking-[0.08em] text-[#a8c4b8]">
            <span>{meta.realmLabel}</span>
            <span className="mx-2 text-stone-600">｜</span>
            <span>{tier.floors}關</span>
            <span className="mx-2 text-stone-600">｜</span>
            <span className="text-[#c9a84c]">
              {tier.bonusSpiritStones}靈石
            </span>
          </p>

          {!unlocked && (
            <div className="mt-3 text-center">
              <p className="text-sm tracking-[0.28em] text-stone-400">
                🔒 尚未解鎖
              </p>
              <p className="mt-1 text-[10px] text-stone-500">{unlockHint}</p>
            </div>
          )}

          {unlocked && cleared && (
            <p className="mt-2 text-[10px] tracking-wide text-[#8a7340]">
              已通關 · 可再挑戰
            </p>
          )}

          <button
            type="button"
            disabled={!unlocked}
            onClick={() => unlocked && onSelectTier(tier.id)}
            className={`btn-start-game mt-4 w-auto min-w-[10rem] px-2 ${
              unlocked ? "" : "pointer-events-none opacity-35"
            }`}
            aria-label={unlocked ? `進入${meta.locationName}` : "尚未解鎖"}
          >
            <span className="relative block text-[1.02rem] font-bold tracking-[0.36em]">
              {unlocked ? (cleared ? "再次進入" : "進入秘境") : "尚未解鎖"}
            </span>
            <span className="btn-start-divider" aria-hidden>
              <i className="btn-start-diamond" />
            </span>
            <span className="relative block text-[10px] font-semibold tracking-[0.2em] text-[#b8a878]/90">
              {unlocked ? meta.locationName : unlockHint}
            </span>
          </button>
        </div>
      </section>

      {/* 階段選擇器：成長目標可見 */}
      <nav
        className="realm-tabs relative z-10 shrink-0 px-2 pb-1 pt-1"
        aria-label="秘境階段"
      >
        <div className="flex items-start justify-around">
          {tiers.map((t, i) => {
            const m = getDungeonChapterMeta(t);
            const active = i === focusIndex;
            const open = isDungeonTierUnlocked(tiers, i, unlockedAchievements);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setFocusIndex(i)}
                className={`flex min-w-[4.5rem] flex-col items-center gap-0.5 border-none bg-transparent py-1 ${
                  active ? "text-[#c9a84c]" : "text-stone-500 opacity-60"
                }`}
              >
                <span className="text-[11px] font-semibold tracking-[0.2em]">
                  {m.stageTab}
                </span>
                <span
                  className={`mt-0.5 h-1.5 w-1.5 rounded-full ${
                    active
                      ? "bg-[#c9a84c] shadow-[0_0_6px_rgba(201,168,76,0.45)]"
                      : open
                        ? "bg-stone-500"
                        : "border border-stone-600 bg-transparent"
                  }`}
                />
                <span className="mt-0.5 text-[9px] tracking-wide opacity-80">
                  {m.locationName}
                </span>
                <span className="text-[8px] tracking-wide opacity-55">
                  {!open ? "未解鎖" : active ? "當前" : "可查看"}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
