"use client";

import { useEffect, useMemo, useState } from "react";
import type { DungeonTier } from "@/types/game";
import {
  getDungeonChapterMeta,
  getDungeonRealmBackground,
  getDungeonUnlockHint,
  isDungeonTierUnlocked,
} from "@/lib/dungeon";
import { publicAsset } from "@/lib/paths";

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
  const bgSrc = getDungeonRealmBackground(tier.id);
  const unlocked = isDungeonTierUnlocked(
    tiers,
    focusIndex,
    unlockedAchievements
  );
  const cleared = unlockedAchievements.includes(tier.achievementId);
  const unlockHint = getDungeonUnlockHint(tiers, focusIndex);
  const realmTitle = `${meta.realmLabel.replace("期", "")}秘境 · ${meta.locationName}`;

  return (
    <div
      className={`realm-select relative flex min-h-0 flex-1 flex-col overflow-hidden realm-tone-${meta.stage}`}
    >
      {bgSrc ? (
        <img
          className="realm-select-bg"
          src={publicAsset(bgSrc)}
          alt=""
          draggable={false}
          decoding="async"
        />
      ) : (
        <div className="realm-select-bg realm-select-bg-fallback" aria-hidden />
      )}
      <div className="realm-select-veil pointer-events-none" aria-hidden />

      <section className="realm-stage relative z-10 flex min-h-0 flex-1 flex-col">
        {/*
          縱向節奏（刻度固定）：
          Header → 遠景空隙 → 主資訊（避開竹葉）→ 間距 → 進入秘境 → 石路場景 → 境界選擇
        */}
        <div className="realm-info relative mx-auto w-full max-w-[20rem] shrink-0 px-4">
          <div className="realm-info-mist pointer-events-none" aria-hidden />

          <div className="relative z-10 flex flex-col items-center text-center">
            <p className="realm-eyebrow text-[10px] tracking-[0.32em]">
              ───── 秘境 ─────
            </p>

            <h2 className="realm-title mt-2.5 text-[1.12rem] font-bold tracking-[0.26em]">
              {realmTitle}
            </h2>
            <p className="realm-eyebrow mt-1.5 text-[10px] tracking-[0.22em]">
              {meta.chapterLabel}
            </p>

            <p className="realm-body mt-2.5 max-w-[17rem] text-[12px] leading-relaxed tracking-wide">
              {tier.description}
            </p>

            {tier.passiveDescription && meta.lawName && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => setLawOpen((v) => !v)}
                  className="realm-accent border-none bg-transparent px-1 py-0.5 text-[10px] tracking-[0.16em] opacity-90"
                >
                  ◇ 秘境法則　{meta.lawName}
                </button>
                {lawOpen && (
                  <p className="realm-eyebrow mt-1.5 max-w-[16rem] text-[10px] leading-relaxed">
                    {tier.passiveDescription}
                  </p>
                )}
              </div>
            )}

            <div className="mt-3.5 flex items-center gap-1.5">
              <span className="realm-accent text-[9px] opacity-60">◇</span>
              {Array.from({ length: tier.floors }, (_, i) => {
                const floor = i + 1;
                const isCurrent = unlocked && !cleared && floor === 1;
                const isDone = cleared;
                const active = isCurrent || (isDone && floor === 1);
                return (
                  <div key={floor} className="flex items-center gap-1.5">
                    <span
                      className={`text-[13px] font-semibold tabular-nums ${
                        active
                          ? "realm-floor-active"
                          : isDone
                            ? "realm-accent opacity-80"
                            : "realm-floor-idle"
                      }`}
                    >
                      {floor}
                    </span>
                    {floor < tier.floors && (
                      <span className="realm-floor-sep">──</span>
                    )}
                  </div>
                );
              })}
              <span className="realm-floor-idle text-[9px]">◇</span>
            </div>

            <p className="mt-3 text-[11px] tracking-[0.12em]">
              <span className="realm-accent">{meta.realmLabel}</span>
              <span className="mx-2.5 text-stone-600">｜</span>
              <span className="realm-meta-dim">{tier.floors}關</span>
              <span className="mx-2.5 text-stone-600">｜</span>
              <span className="realm-reward">
                {tier.bonusSpiritStones}靈石
              </span>
            </p>

            {!unlocked && (
              <div className="mt-2.5">
                <p className="text-sm tracking-[0.28em] text-stone-300">
                  🔒 尚未解鎖
                </p>
                <p className="mt-1 text-[10px] text-stone-400">{unlockHint}</p>
              </div>
            )}

            {unlocked && cleared && (
              <p className="realm-accent mt-2 text-[10px] tracking-wide opacity-80">
                已通關 · 可再挑戰
              </p>
            )}
          </div>

          {/* 與數據區保持 5–7vh；落在中部偏上、石門上方意象 */}
          <div className="relative z-10 mt-[6vh] flex justify-center">
            <button
              type="button"
              disabled={!unlocked}
              onClick={() => unlocked && onSelectTier(tier.id)}
              className={`btn-enter-realm ${
                unlocked ? "" : "pointer-events-none opacity-35"
              }`}
              aria-label={unlocked ? `進入${meta.locationName}` : "尚未解鎖"}
            >
              <span className="btn-enter-realm-line" aria-hidden>
                ——
              </span>
              <span className="btn-enter-realm-diamond" aria-hidden>
                ◇
              </span>
              <span className="btn-enter-realm-label">
                {unlocked ? (cleared ? "再次進入" : "進入秘境") : "尚未解鎖"}
              </span>
              <span className="btn-enter-realm-diamond" aria-hidden>
                ◇
              </span>
              <span className="btn-enter-realm-line" aria-hidden>
                ——
              </span>
            </button>
          </div>
        </div>

        {/* 適量露出山谷石路；境界選擇貼底欄上方 */}
        <div className="realm-scene-gap" aria-hidden />

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
                className={`flex min-w-[4.5rem] flex-col items-center gap-0.5 border-none bg-transparent py-1 transition-opacity ${
                  active ? "realm-tab-active" : "realm-tab-idle"
                }`}
              >
                <span className="text-[11px] font-semibold tracking-[0.2em]">
                  {m.stageTab}
                </span>
                <span
                  className={`mt-0.5 h-1.5 w-1.5 rounded-full ${
                    active
                      ? "realm-tab-dot-active"
                      : open
                        ? "bg-stone-500"
                        : "border border-stone-600 bg-transparent"
                  }`}
                />
                  <span className="mt-0.5 text-[9px] tracking-wide">
                    {m.locationName}
                  </span>
                  <span className="text-[8px] tracking-wide opacity-80">
                    {!open ? "未解鎖" : active ? "當前" : "可查看"}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      </section>
    </div>
  );
}
