"use client";

import type { Hero, HeroStats } from "@/lib/stats";
import { formatNumber } from "@/lib/stats";
import { publicAsset } from "@/lib/paths";

interface LobbyViewProps {
  hero: Hero;
  stats: HeroStats;
  playerHp: number;
  spiritStones: number;
  totalClears: number;
  achievementCount: number;
  deckCount: number;
  lastRunMessage: string | null;
  hasActiveRun: boolean;
  runLabel?: string | null;
  onEnterDungeon: () => void;
  onContinueGame: () => void;
  onAbandonGame: () => void;
}

export function LobbyView({
  hero,
  stats,
  playerHp,
  spiritStones,
  totalClears,
  deckCount,
  lastRunMessage,
  hasActiveRun,
  runLabel,
  onEnterDungeon,
  onContinueGame,
  onAbandonGame,
}: LobbyViewProps) {
  const portraitSrc = publicAsset(
    hero.lobbyPortrait ?? hero.portrait ?? "/heroes/baiye-lobby.png"
  );
  const hpPercent = Math.max(0, (playerHp / stats.maxHp) * 100);

  return (
    <div className="lobby-home animate-fade-in relative min-h-0 flex-1 overflow-hidden">
      <img
        src={portraitSrc}
        alt={hero.name}
        className="lobby-hero-art absolute inset-0 h-full w-full object-cover object-[center_12%]"
        draggable={false}
      />
      <div className="lobby-hero-veil pointer-events-none absolute inset-0" />

      {lastRunMessage && (
        <div className="absolute left-3 right-3 top-3 z-20 rounded border border-[#8a7340]/40 bg-stone-950/80 px-3 py-2 text-center text-[11px] text-[#c9a84c]">
          {lastRunMessage}
        </div>
      )}

      {/* 底部一體：名字 + 狀態 + CTA，疊在立繪上，避免黑空一塊 */}
      <div className="lobby-dock absolute inset-x-0 bottom-0 z-10 px-3 pb-3 pt-24">
        <div className="mb-3">
          <h2 className="text-[1.65rem] font-bold tracking-[0.36em] text-[#f5efe4]">
            {hero.name}
          </h2>
          <p className="mt-1 text-[11px] tracking-[0.22em] text-[#a8c4b8]">
            {hero.title} · {hero.realm}
          </p>
        </div>

        <div className="lobby-stat-sheet mb-3 rounded-lg border border-[#8a7340]/30 bg-stone-950/55 px-3 py-2.5 backdrop-blur-[3px]">
          <div className="mb-1 flex items-center justify-between text-[10px]">
            <span className="text-[#8eb8a8]">氣血</span>
            <span className="stat-value text-[#d5e8dc]">
              {formatNumber(playerHp)} / {formatNumber(stats.maxHp)}
            </span>
          </div>
          <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-black/55">
            <div
              className="hp-bar-fill h-full rounded-full"
              style={{ width: `${hpPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between gap-2 text-[10px]">
            <span className="text-stone-400">
              靈石{" "}
              <span className="font-semibold text-[#8eb8a8]">
                {formatNumber(spiritStones)}
              </span>
            </span>
            <span className="text-stone-400">
              牌組{" "}
              <span className="font-semibold text-[#c9a84c]">{deckCount}</span>
            </span>
            <span className="text-stone-400">
              通關{" "}
              <span className="font-semibold text-[#c9a84c]">{totalClears}</span>
            </span>
          </div>
        </div>

        {hasActiveRun ? (
          <div className="space-y-2">
            <button
              onClick={onContinueGame}
              className="btn-start-game"
              aria-label="繼續修行"
            >
              <span className="relative block text-xl font-bold tracking-[0.32em]">
                繼續修行
              </span>
              <span className="relative mt-1.5 block text-[11px] font-semibold tracking-[0.2em] text-[#8a7340]">
                {runLabel ?? "返回本次秘境"}
              </span>
            </button>
            <button
              onClick={onAbandonGame}
              className="btn-abandon"
              aria-label="退出本次修行"
            >
              退出本次修行
            </button>
          </div>
        ) : (
          <button
            onClick={onEnterDungeon}
            className="btn-start-game"
            aria-label="開始修行，前往祕境試煉"
          >
            <span className="relative block text-xl font-bold tracking-[0.32em]">
              開始修行
            </span>
            <span className="relative mt-1.5 block text-[11px] font-semibold tracking-[0.2em] text-[#8a7340]">
              前往祕境試煉
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
