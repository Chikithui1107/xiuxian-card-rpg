"use client";

import type { Hero, HeroStats } from "@/lib/stats";
import { formatNumber } from "@/lib/stats";
import type { PlayableCharacter } from "@/data/characters";
import BaiYeIdle from "@/components/BaiYeIdle/BaiYeIdle";
import { RunToast } from "@/components/RunToast";

interface LobbyViewProps {
  hero: Hero;
  character: PlayableCharacter;
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
  onDismissRunMessage?: () => void;
}

export function LobbyView({
  hero,
  character,
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
  onDismissRunMessage,
}: LobbyViewProps) {
  const hpPercent = Math.max(0, (playerHp / stats.maxHp) * 100);
  const art = character.lobbyArt;

  return (
    <div
      className={`lobby-home animate-fade-in relative min-h-0 flex-1 overflow-hidden${
        character.lobbyTheme === "ink" ? " lobby-home-ink" : ""
      }`}
    >
      <BaiYeIdle
        className="absolute inset-0"
        characterSrc={
          character.lobbyPortrait ??
          hero.lobbyPortrait ??
          "/images/baiye/baiye-character.png"
        }
        backgroundSrc={
          character.lobbyBackground ??
          hero.lobbyBackground ??
          "/images/baiye/baiye-bg.png"
        }
        characterName={character.name}
        theme={character.lobbyTheme}
        backgroundPosition={art?.backgroundPosition}
        backgroundFilter={art?.backgroundFilter}
        characterBottom={art?.characterBottom}
        characterHeight={art?.characterHeight}
        characterMaxWidth={art?.characterMaxWidth}
      />

      <div className="lobby-bg-veil pointer-events-none absolute inset-0 z-[19]" />

      {lastRunMessage && onDismissRunMessage && (
        <RunToast
          message={lastRunMessage}
          onDismiss={onDismissRunMessage}
          topClassName="top-[calc(3.85rem+env(safe-area-inset-top,0px))]"
        />
      )}

      <div className="lobby-hero-title pointer-events-none absolute inset-x-0 z-20 px-4 pb-3 pt-8 text-center">
        <h2 className="text-[1.55rem] font-bold tracking-[0.36em] text-[#f5efe4] drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]">
          {hero.name}
        </h2>
        <p className="lobby-hero-subtitle mt-1 text-[11px] tracking-[0.22em]">
          {hero.title} · {hero.realm}
        </p>
      </div>

      <div className="lobby-dock absolute inset-x-0 bottom-0 z-20 px-3 pb-3 pt-3">
        <div className="lobby-stat-sheet mb-3 px-3 py-2.5">
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
              <span className="relative block text-[1.05rem] font-bold tracking-[0.42em]">
                繼續修行
              </span>
              <span className="btn-start-divider" aria-hidden>
                <i className="btn-start-diamond" />
              </span>
              <span className="relative block text-[10px] font-semibold tracking-[0.22em] text-[#b8a878]/90">
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
            aria-label="開始修行，前往秘境試煉"
          >
            <span className="relative block text-[1.05rem] font-bold tracking-[0.42em]">
              開始修行
            </span>
            <span className="btn-start-divider" aria-hidden>
              <i className="btn-start-diamond" />
            </span>
            <span className="relative block text-[10px] font-semibold tracking-[0.22em] text-[#b8a878]/90">
              前往秘境試煉
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
