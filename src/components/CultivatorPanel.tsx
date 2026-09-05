"use client";

import type { Hero, HeroStats } from "@/lib/stats";
import { formatNumber } from "@/lib/stats";
import { publicAsset } from "@/lib/paths";

interface CultivatorPanelProps {
  hero: Hero;
  stats: HeroStats;
  playerHp: number;
  spiritStones: number;
  totalClears: number;
  achievementCount: number;
  deckCount: number;
}

/** 輕量修士狀態條（非大廳主視覺時備用） */
export function CultivatorPanel({
  hero,
  stats,
  playerHp,
  spiritStones,
  totalClears,
  achievementCount,
  deckCount,
}: CultivatorPanelProps) {
  const hpPercent = Math.max(0, (playerHp / stats.maxHp) * 100);
  const avatarSrc = hero.avatar ? publicAsset(hero.avatar) : null;

  return (
    <div className="rounded-lg border border-[#8a7340]/35 bg-stone-950/70 px-3 py-2.5">
      <div className="mb-2 flex items-center gap-2.5">
        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-[#8a7340]/45 bg-stone-950">
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt={hero.name}
              className="h-full w-full object-cover object-center"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-lg font-black text-[#c9a84c]">
              仙
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-bold tracking-wider text-[#c9a84c]">
            {hero.name}
          </h3>
          <p className="text-[10px] text-[#7aab9a]">
            {hero.title} · {hero.realm}
          </p>
        </div>
        <div className="shrink-0 text-right text-[10px] text-stone-500">
          通關 {totalClears} · 功業 {achievementCount}
        </div>
      </div>

      <div className="mb-0.5 flex justify-between text-[10px]">
        <span className="text-[#7aab9a]">氣血</span>
        <span className="stat-value text-[#9ab8aa]">
          {formatNumber(playerHp)} / {formatNumber(stats.maxHp)}
        </span>
      </div>
      <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-black/40">
        <div
          className="hp-bar-fill h-full rounded-full transition-all duration-500"
          style={{ width: `${hpPercent}%` }}
        />
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-stone-400">
        <span>
          靈石 <span className="text-[#7aab9a]">{formatNumber(spiritStones)}</span>
        </span>
        <span>
          攻伐 <span className="text-[#c9a84c]">{formatNumber(stats.attack)}</span>
        </span>
        <span>
          牌組 <span className="text-[#c9a84c]">{deckCount}</span>
        </span>
      </div>
    </div>
  );
}
