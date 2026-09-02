"use client";

import type { Hero, HeroStats } from "@/lib/stats";
import { formatNumber } from "@/lib/stats";

interface CultivatorPanelProps {
  hero: Hero;
  stats: HeroStats;
  playerHp: number;
  spiritStones: number;
  totalClears: number;
  achievementCount: number;
  deckCount: number;
}

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

  return (
    <div className="glass-panel-gold overflow-hidden p-3.5">
      <div className="mb-3 flex items-center gap-3">
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
          <div className="absolute inset-0 animate-seal-pulse rounded-full border border-[#4a7c6f]/40 bg-gradient-to-br from-stone-900/80 to-stone-950/90" />
          <span className="relative text-2xl font-black text-[#c9a84c]">仙</span>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold tracking-wider text-[#c9a84c]">
            {hero.name}
          </h3>
          <p className="text-[11px] text-[#7aab9a]">{hero.title}</p>
          <div className="mt-1 inline-block rounded border border-[#8a7340]/35 bg-black/30 px-2 py-0.5">
            <span className="text-[11px] font-bold text-[#c9a84c]">{hero.realm}</span>
          </div>
        </div>
      </div>

      <div className="mb-3">
        <div className="mb-0.5 flex justify-between text-[10px]">
          <span className="text-[#7aab9a]">氣血</span>
          <span className="stat-value font-bold text-[#9ab8aa]">
            {formatNumber(playerHp)} / {formatNumber(stats.maxHp)}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-black/40">
          <div
            className="hp-bar-fill h-full rounded-full transition-all duration-500"
            style={{ width: `${hpPercent}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatChip label="攻伐" value={formatNumber(stats.attack)} accent="amber" />
        <StatChip label="靈石" value={formatNumber(spiritStones)} accent="jade" />
        <StatChip
          label="法訣倍率"
          value={`+${stats.equipmentMultiplierBonus.toFixed(1)}`}
          accent="mist"
        />
        <StatChip label="法訣牌組" value={`${deckCount} 張`} accent="stone" />
      </div>

      <p className="mt-2 text-center text-[10px] text-stone-500">
        試煉通關 {totalClears} 次 · 功業 {achievementCount} · 暴擊{" "}
        {(stats.critRate * 100).toFixed(0)}%
      </p>
    </div>
  );
}

function StatChip({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "amber" | "jade" | "mist" | "stone";
}) {
  const colors = {
    amber: "border-[#8a7340]/25 text-[#c9a84c]",
    jade: "border-[#4a7c6f]/25 text-[#7aab9a]",
    mist: "border-[#5a6a7c]/25 text-[#8a9aaa]",
    stone: "border-stone-600/25 text-stone-400",
  };

  return (
    <div className={`rounded border bg-black/30 px-2.5 py-2 ${colors[accent]}`}>
      <p className="text-[9px] text-stone-500">{label}</p>
      <p className="stat-value text-sm font-bold">{value}</p>
    </div>
  );
}
