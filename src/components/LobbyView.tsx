"use client";

import { CultivatorPanel } from "@/components/CultivatorPanel";
import type { Hero, HeroStats } from "@/lib/stats";

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
  return (
    <div className="flex flex-col gap-3 px-3 pt-3">
      {lastRunMessage && (
        <div className="glass-panel-gold px-3 py-2.5 text-center text-xs text-[#c9a84c]">
          {lastRunMessage}
        </div>
      )}

      <CultivatorPanel
        hero={hero}
        stats={stats}
        playerHp={playerHp}
        spiritStones={spiritStones}
        totalClears={totalClears}
        achievementCount={achievementCount}
        deckCount={deckCount}
      />

      {hasActiveRun ? (
        <div className="glass-panel-gold space-y-2.5 p-3">
          <button
            onClick={onContinueGame}
            className="btn-start-game"
            aria-label="繼續遊戲"
          >
            <span className="relative block text-xl font-bold tracking-[0.32em]">
              繼續遊戲
            </span>
            <span className="relative mt-1.5 block text-[11px] font-semibold tracking-[0.22em] text-[#8a7340]">
              {runLabel ?? "返回本次試煉"}
            </span>
          </button>
          <button
            onClick={onAbandonGame}
            className="btn-abandon"
            aria-label="放棄遊戲"
          >
            放棄遊戲
          </button>
          <p className="text-center text-[10px] tracking-wide text-stone-500">
            繼續則回到當前祕境 · 放棄則結束本局
          </p>
        </div>
      ) : (
        <div className="glass-panel-gold p-3">
          <button
            onClick={onEnterDungeon}
            className="btn-start-game"
            aria-label="開始遊戲，前往祕境試煉"
          >
            <span className="relative block text-xl font-bold tracking-[0.32em]">
              開始遊戲
            </span>
            <span className="relative mt-1.5 block text-[11px] font-semibold tracking-[0.22em] text-[#8a7340]">
              前往祕境試煉
            </span>
          </button>
          <p className="mt-2.5 text-center text-[10px] tracking-wide text-stone-500">
            選擇祕境，開始本次修行
          </p>
        </div>
      )}
    </div>
  );
}
