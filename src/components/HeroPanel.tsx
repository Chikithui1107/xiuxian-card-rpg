"use client";

import { getEquipmentList } from "@/lib/equipment";
import type { Hero, HeroStats } from "@/lib/stats";
import { formatNumber } from "@/lib/stats";
import { SLOT_LABELS } from "@/types/game";

interface HeroPanelProps {
  hero: Hero;
  stats: HeroStats;
  equippedIds: string[];
  currentHp: number;
  energy: number;
  floor: number;
}

export function HeroPanel({
  hero,
  stats,
  equippedIds,
  currentHp,
  energy,
  floor,
}: HeroPanelProps) {
  const equipped = getEquipmentList(equippedIds);
  const hpPercent = Math.max(0, (currentHp / stats.maxHp) * 100);

  return (
    <div className="glass-panel-gold p-4">
      <p className="zone-label mb-3 text-[#8a7340]">修士狀態</p>

      <div className="mb-3 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-widest text-[#c9a84c]">
            {hero.name}
          </h2>
          <p className="text-xs text-[#7aab9a]">{hero.title}</p>
        </div>
        <div className="rounded border border-[#8a7340]/25 bg-black/30 px-2 py-1 text-center">
          <p className="text-[10px] text-stone-500">第 {floor} 重</p>
          <p className="text-xs font-semibold text-[#c9a84c]">{hero.realm}</p>
        </div>
      </div>

      <div className="mb-3">
        <div className="mb-1 flex justify-between text-xs">
          <span className="text-[#7aab9a]">氣血</span>
          <span className="stat-value font-bold text-[#9ab8aa]">
            {formatNumber(Math.max(0, currentHp))} / {formatNumber(stats.maxHp)}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full border border-[#4a7c6f]/20 bg-black/40">
          <div
            className="hp-bar-fill h-full rounded-full transition-all duration-300"
            style={{ width: `${hpPercent}%` }}
          />
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <StatBox label="攻伐" value={formatNumber(stats.attack)} highlight pulse />
        <StatBox
          label="法訣倍率"
          value={`+${stats.equipmentMultiplierBonus.toFixed(1)}`}
          highlight={stats.equipmentMultiplierBonus > 0}
        />
        <StatBox label="暴擊率" value={`${(stats.critRate * 100).toFixed(1)}%`} />
        <StatBox label="真元" value={`${energy} / 3`} accent="jade" />
      </div>

      <div>
        <p className="mb-2 text-[10px] tracking-wider text-stone-500">已佩法寶</p>
        <div className="space-y-1.5">
          {equipped.length === 0 ? (
            <p className="text-xs text-stone-600">尚未裝備</p>
          ) : (
            equipped.map((eq) => (
              <div
                key={eq.id}
                className="flex items-center justify-between rounded border border-stone-700/40 bg-black/30 px-2 py-1.5"
              >
                <div>
                  <span className="text-xs text-stone-300">{eq.name}</span>
                  <span className="ml-1 text-[10px] text-stone-600">
                    [{SLOT_LABELS[eq.slot]}]
                  </span>
                </div>
                <div className="text-right text-[10px]">
                  {eq.attackBonus > 0 && (
                    <span className="text-[#c9a84c]">+{eq.attackBonus}攻 </span>
                  )}
                  {eq.cardMultiplierBonus > 0 && (
                    <span className="text-[#9a9ab8]">
                      +{eq.cardMultiplierBonus}倍
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  highlight = false,
  pulse = false,
  accent,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  pulse?: boolean;
  accent?: "jade";
}) {
  return (
    <div
      className={`rounded border border-stone-700/40 bg-black/30 px-2 py-2 transition-all duration-300 ${pulse && highlight ? "animate-qi-breathe" : ""}`}
    >
      <p className="text-[10px] text-stone-500">{label}</p>
      <p
        className={`stat-value text-base font-bold ${
          accent === "jade"
            ? "text-[#7aab9a]"
            : highlight
              ? "text-[#c9a84c]"
              : "text-stone-400"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
