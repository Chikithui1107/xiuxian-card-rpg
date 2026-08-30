"use client";

import { getEquippedItems, type Hero, type HeroStats } from "@/lib/stats";
import { formatNumber } from "@/lib/stats";

interface HeroPanelProps {
  hero: Hero;
  stats: HeroStats;
  currentHp: number;
  energy: number;
  floor: number;
}

export function HeroPanel({ hero, stats, currentHp, energy, floor }: HeroPanelProps) {
  const equipped = getEquippedItems(hero);
  const hpPercent = Math.max(0, (currentHp / stats.maxHp) * 100);

  return (
    <div className="rounded-lg border border-[#3a3530] bg-[#1a1814] p-4">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-widest text-[#c9a84c]">
            {hero.name}
          </h2>
          <p className="text-xs text-[#8a7340]">{hero.title}</p>
        </div>
        <div className="rounded border border-[#c9a84c]/30 bg-[#0a0a0a] px-3 py-1 text-center">
          <p className="text-[10px] text-[#8a7340]">第 {floor} 層</p>
          <p className="text-sm font-semibold text-[#c9a84c]">{hero.realm}</p>
        </div>
      </div>

      {/* HP Bar */}
      <div className="mb-3">
        <div className="mb-1 flex justify-between text-xs">
          <span className="text-[#8a7340]">氣血</span>
          <span className="stat-value font-bold text-[#5a9a88]">
            {formatNumber(Math.max(0, currentHp))} / {formatNumber(stats.maxHp)}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full border border-[#3a3530] bg-[#0a0a0a]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#3d6b5e] to-[#5a9a88] transition-all duration-300"
            style={{ width: `${hpPercent}%` }}
          />
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <StatBox label="攻擊力" value={formatNumber(stats.attack)} highlight />
        <StatBox
          label="暴擊率"
          value={`${(stats.critRate * 100).toFixed(1)}%`}
        />
        <StatBox
          label="暴擊倍率"
          value={`${stats.critMultiplier.toFixed(1)}x`}
        />
        <StatBox label="靈力" value={`${energy} / 3`} />
      </div>

      <div>
        <p className="mb-2 text-xs tracking-wider text-[#8a7340]">裝備</p>
        <div className="space-y-1.5">
          {equipped.map((eq) => (
            <div
              key={eq.id}
              className="flex items-center justify-between rounded border border-[#2a2824] bg-[#0a0a0a]/60 px-2 py-1.5"
            >
              <div>
                <span className="text-sm text-[#9a958a]">{eq.name}</span>
                <span className="ml-2 text-[10px] text-[#5a5550]">
                  [{eq.slot}]
                </span>
              </div>
              <div className="text-right text-xs">
                <span className="text-[#c9a84c]">+{eq.attackBonus} 攻</span>
                {eq.critRateBonus > 0 && (
                  <span className="ml-2 text-[#c45c5c]">
                    +{(eq.critRateBonus * 100).toFixed(0)}% 暴
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded border border-[#2a2824] bg-[#0a0a0a]/60 px-3 py-2">
      <p className="text-[10px] text-[#5a5550]">{label}</p>
      <p
        className={`stat-value text-lg font-bold ${highlight ? "text-[#c9a84c]" : "text-[#9a958a]"}`}
      >
        {value}
      </p>
    </div>
  );
}
