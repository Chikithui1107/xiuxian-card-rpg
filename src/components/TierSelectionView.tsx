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
  onBack,
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

  return (
    <div className="realm-select relative flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-2 pt-3">
      {/* 頂部品牌區 */}
      <header className="shrink-0 text-center">
        <p
          className="text-[1.05rem] font-bold tracking-[0.72em] text-[rgba(201,168,76,0.78)]"
          style={{ textIndent: "0.72em" }}
        >
          仙途
        </p>
        <p className="mt-1 text-[10px] tracking-[0.28em] text-[rgba(198,216,208,0.55)]">
          天下秘境 · 試煉
        </p>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="mt-2 text-[10px] tracking-[0.18em] text-stone-500 transition hover:text-[#c9a84c]"
          >
            ← 返回山門
          </button>
        )}
      </header>

      {/* 中央當前秘境 */}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center py-3">
        <p className="text-[10px] tracking-[0.32em] text-stone-500">
          ───── 秘境{meta.stage === 1 ? "一" : meta.stage === 2 ? "二" : "三"}{" "}
          ─────
        </p>

        <h2 className="mt-3 text-xl font-bold tracking-[0.36em] text-[#d5e8dc]">
          {meta.realmLabel.replace("期", "")}秘境
        </h2>
        <p className="mt-1.5 text-[15px] font-semibold tracking-[0.28em] text-[rgba(201,168,76,0.88)]">
          「{meta.locationName}」
        </p>
        <p className="mt-1 text-[10px] tracking-[0.2em] text-stone-500">
          {meta.chapterLabel}
        </p>

        <p className="mt-4 max-w-[17rem] text-center text-[12px] leading-relaxed tracking-wide text-stone-400">
          {tier.description}
        </p>

        {/* 秘境法則標籤 */}
        {tier.passiveDescription && meta.lawName && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setLawOpen((v) => !v)}
              className="rounded-sm border border-[#8a7340]/25 bg-black/25 px-2.5 py-1 text-[10px] tracking-[0.16em] text-[#c9b07a]"
            >
              ◇ 秘境法則　{meta.lawName}
            </button>
            {lawOpen && (
              <p className="mt-2 max-w-[16rem] text-center text-[10px] leading-relaxed text-stone-500">
                {tier.passiveDescription}
              </p>
            )}
          </div>
        )}

        {/* 關卡進度 */}
        <div className="mt-5 flex items-center gap-2">
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
          <p className="mt-1 text-[9px] tracking-wide text-stone-600">
            ↑ 當前進度
          </p>
        )}

        {/* 推薦 / 獎勵 */}
        <div className="mt-5 grid w-full max-w-[16rem] grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 text-[11px]">
          <span className="text-stone-500">推薦境界</span>
          <span className="text-right text-[#a8c4b8]">{meta.realmLabel}</span>
          <span className="text-stone-500">關卡</span>
          <span className="text-right text-[#a8c4b8]">{tier.floors} 關</span>
          <span className="text-stone-500">首通獎勵</span>
          <span className="text-right text-[#c9a84c]">
            {tier.bonusSpiritStones} 靈石
          </span>
        </div>

        {/* 鎖定狀態 */}
        {!unlocked && (
          <div className="mt-4 text-center">
            <p className="text-sm tracking-[0.28em] text-stone-400">🔒 尚未解鎖</p>
            <p className="mt-1 text-[10px] text-stone-500">{unlockHint}</p>
          </div>
        )}

        {unlocked && cleared && (
          <p className="mt-3 text-[10px] tracking-wide text-[#8a7340]">
            已通關 · 可再挑戰
          </p>
        )}

        {/* CTA */}
        <button
          type="button"
          disabled={!unlocked}
          onClick={() => unlocked && onSelectTier(tier.id)}
          className={`btn-start-game mt-5 w-full max-w-[16rem] ${
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

      {/* 階段選擇器 */}
      <div className="shrink-0 pb-1 pt-1">
        <div className="flex items-start justify-around px-1">
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
                  active
                    ? "text-[#c9a84c]"
                    : "text-stone-500 opacity-60"
                }`}
              >
                <span
                  className={`text-[11px] font-semibold tracking-[0.2em] ${
                    active ? "" : ""
                  }`}
                >
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
      </div>
    </div>
  );
}
