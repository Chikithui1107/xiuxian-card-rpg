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
  onEnterDungeon: () => void;
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
  onEnterDungeon,
}: LobbyViewProps) {
  return (
    <div className="flex flex-col gap-4 px-3 pt-3">
      {lastRunMessage && (
        <div className="glass-panel-gold px-3 py-2.5 text-center text-xs text-[#c9a84c]">
          {lastRunMessage}
        </div>
      )}

      <div className="text-center">
        <p className="zone-label">宗門洞府</p>
        <h2 className="title-ink mt-1 text-xl font-bold">青雲宗 · 外門弟子居</h2>
        <p className="mt-1 text-[10px] text-stone-500">靜修悟道，待時而動</p>
      </div>

      <CultivatorPanel
        hero={hero}
        stats={stats}
        playerHp={playerHp}
        spiritStones={spiritStones}
        totalClears={totalClears}
        achievementCount={achievementCount}
        deckCount={deckCount}
      />

      <div className="glass-panel p-4">
        <button onClick={onEnterDungeon} className="btn-cyber-gold w-full py-4 text-base">
          前往祕境試煉
        </button>
        <p className="mt-2 text-center text-[10px] text-stone-500">
          或點底部「祕境」標籤選擇試煉難度
        </p>
      </div>
    </div>
  );
}
