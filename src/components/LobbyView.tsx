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
  const bgSrc = publicAsset("/backgrounds/lobby-moon-path.jpg");
  const cutoutSrc = publicAsset(
    hero.lobbyPortrait ?? "/heroes/baiye-cutout.png"
  );
  const hpPercent = Math.max(0, (playerHp / stats.maxHp) * 100);

  return (
    <div className="lobby-home animate-fade-in relative min-h-0 flex-1 overflow-hidden">
      {/* 層 1：場景背景 */}
      <img
        src={bgSrc}
        alt=""
        className="lobby-bg absolute inset-0 h-full w-full object-cover object-[center_35%]"
        draggable={false}
      />
      <div className="lobby-bg-veil pointer-events-none absolute inset-0" />

      {/* 層 2：無背景主角 */}
      <div className="lobby-actor pointer-events-none absolute inset-x-0 bottom-[9.5rem] top-6 flex items-end justify-center sm:bottom-40">
        <img
          src={cutoutSrc}
          alt={hero.name}
          className="lobby-actor-art h-full w-auto max-w-[min(100%,22rem)] object-contain object-bottom drop-shadow-[0_18px_28px_rgba(0,0,0,0.55)]"
          draggable={false}
        />
      </div>

      {lastRunMessage && (
        <div className="absolute left-3 right-3 top-3 z-20 rounded border border-[#8a7340]/40 bg-stone-950/80 px-3 py-2 text-center text-[11px] text-[#c9a84c]">
          {lastRunMessage}
        </div>
      )}

      {/* 層 3：底部資訊 + CTA */}
      <div className="lobby-dock absolute inset-x-0 bottom-0 z-10 px-3 pb-3 pt-10">
        <div className="mb-2.5 text-center">
          <h2 className="text-[1.55rem] font-bold tracking-[0.36em] text-[#f5efe4] drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]">
            {hero.name}
          </h2>
          <p className="mt-1 text-[11px] tracking-[0.22em] text-[#a8c4b8] drop-shadow">
            {hero.title} · {hero.realm}
          </p>
        </div>

        <div className="lobby-stat-sheet mb-3 rounded-lg border border-[#8a7340]/30 bg-stone-950/60 px-3 py-2.5 backdrop-blur-[3px]">
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
