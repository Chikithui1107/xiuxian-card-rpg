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
  achievementCount,
  deckCount,
  lastRunMessage,
  hasActiveRun,
  runLabel,
  onEnterDungeon,
  onContinueGame,
  onAbandonGame,
}: LobbyViewProps) {
  const portraitSrc = publicAsset(
    hero.lobbyPortrait ?? hero.portrait ?? hero.avatar ?? "/heroes/baiye-lobby.png"
  );
  const hpPercent = Math.max(0, (playerHp / stats.maxHp) * 100);

  return (
    <div className="lobby-home animate-fade-in relative flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* 主視覺立繪 */}
      <div className="lobby-hero relative min-h-0 flex-1">
        <img
          src={portraitSrc}
          alt={hero.name}
          className="lobby-hero-art absolute inset-0 h-full w-full object-cover object-[center_18%]"
          draggable={false}
        />
        <div className="lobby-hero-veil pointer-events-none absolute inset-0" />

        {lastRunMessage && (
          <div className="absolute left-3 right-3 top-3 z-20 rounded border border-[#8a7340]/35 bg-stone-950/75 px-3 py-2 text-center text-[11px] text-[#c9a84c] backdrop-blur-[2px]">
            {lastRunMessage}
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 z-10 px-4 pb-3 pt-16">
          <p className="zone-label text-[#8a7340]/90">青雲宗 · 山門</p>
          <div className="mt-1 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-2xl font-bold tracking-[0.28em] text-[#f0e6d3] drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
                {hero.name}
              </h2>
              <p className="mt-0.5 text-[12px] tracking-widest text-[#9ab8aa]">
                {hero.title} · {hero.realm}
              </p>
            </div>
            <div className="shrink-0 rounded border border-[#8a7340]/35 bg-black/45 px-2 py-1 text-right">
              <p className="text-[9px] text-stone-500">通關</p>
              <p className="stat-value text-sm font-bold text-[#c9a84c]">
                {totalClears}
              </p>
            </div>
          </div>

          <div className="mt-3 space-y-1.5">
            <div className="flex justify-between text-[10px]">
              <span className="text-[#7aab9a]">氣血</span>
              <span className="stat-value text-[#c5d8cc]">
                {formatNumber(playerHp)} / {formatNumber(stats.maxHp)}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-black/50">
              <div
                className="hp-bar-fill h-full rounded-full transition-all duration-500"
                style={{ width: `${hpPercent}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 pt-0.5 text-[10px] text-stone-400">
              <span>
                靈石{" "}
                <span className="text-[#7aab9a]">
                  {formatNumber(spiritStones)}
                </span>
              </span>
              <span>
                牌組{" "}
                <span className="text-[#c9a84c]">{deckCount}</span>
              </span>
              <span>
                攻伐{" "}
                <span className="text-[#c9a84c]">
                  {formatNumber(stats.attack)}
                </span>
              </span>
              <span className="text-stone-500">功業 {achievementCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="lobby-cta shrink-0 space-y-2 border-t border-[#8a7340]/25 bg-[#121110]/95 px-3 py-3">
        {hasActiveRun ? (
          <>
            <button
              onClick={onContinueGame}
              className="btn-start-game"
              aria-label="繼續修行"
            >
              <span className="relative block text-xl font-bold tracking-[0.32em]">
                繼續修行
              </span>
              <span className="relative mt-1.5 block text-[11px] font-semibold tracking-[0.22em] text-[#8a7340]">
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
            <p className="text-center text-[10px] tracking-wide text-stone-500">
              {runLabel?.includes("戰鬥")
                ? "繼續則回到當前戰鬥 · 退出則清空本局進度"
                : "繼續則回到當前岔路 · 退出則清空本局進度"}
            </p>
          </>
        ) : (
          <>
            <button
              onClick={onEnterDungeon}
              className="btn-start-game"
              aria-label="開始遊戲，前往祕境試煉"
            >
              <span className="relative block text-xl font-bold tracking-[0.32em]">
                開始修行
              </span>
              <span className="relative mt-1.5 block text-[11px] font-semibold tracking-[0.22em] text-[#8a7340]">
                前往祕境試煉
              </span>
            </button>
            <p className="text-center text-[10px] tracking-wide text-stone-500">
              選擇祕境，開始本次修行
            </p>
          </>
        )}
      </div>
    </div>
  );
}
