"use client";

import { HandUI } from "@/components/HandUI";
import type { Card } from "@/types/battle";

interface CardHandProps {
  hand: Card[];
  energy: number;
  drawPileCount: number;
  discardPileCount: number;
  exhaustPileCount: number;
  deckCount: number;
  onPlayCard: (card: Card, origin: DOMRect) => void;
  onDenyPlay?: (reason: "energy" | "locked") => void;
  onEndTurn: () => void;
  lastDamage: number | null;
  disabled: boolean;
  denyShake?: boolean;
  feelToast?: string | null;
}

export function CardHand({
  hand,
  energy,
  drawPileCount,
  discardPileCount,
  exhaustPileCount,
  deckCount,
  onPlayCard,
  onDenyPlay,
  onEndTurn,
  lastDamage,
  disabled,
  denyShake = false,
  feelToast = null,
}: CardHandProps) {
  return (
    <div className="relative space-y-2">
      <div className="flex items-end justify-between px-0.5">
        <p className="zone-label">手牌 · 懸停／點選查看 · 上滑出牌</p>
        <div className="flex gap-3 text-center">
          <MiniStat label="牌庫" value={String(drawPileCount)} color="jade" />
          <MiniStat label="棄牌" value={String(discardPileCount)} color="stone" />
          <MiniStat label="消耗" value={String(exhaustPileCount)} color="stone" />
          <MiniStat label="牌組" value={`${deckCount}`} color="gold" />
        </div>
      </div>

      <HandUI
        hand={hand}
        energy={energy}
        disabled={disabled}
        denyShake={denyShake}
        onPlayCard={onPlayCard}
        onDenyPlay={onDenyPlay}
      />

      {feelToast && (
        <p className="animate-feel-toast pointer-events-none absolute left-1/2 top-8 z-20 -translate-x-1/2 rounded border border-[#a85555]/50 bg-stone-950/90 px-3 py-1 text-[11px] font-semibold text-[#c48888] shadow-lg">
          {feelToast}
        </p>
      )}

      <div>
        <button
          onClick={onEndTurn}
          disabled={disabled}
          className="btn-cyber-gold w-full py-3 text-sm disabled:cursor-not-allowed disabled:opacity-40"
        >
          收功結束
        </button>
        {lastDamage !== null && (
          <p className="mt-2 text-center text-[9px] leading-relaxed text-stone-500">
            上式傷害{" "}
            <span className="text-[#c9a84c]">
              {lastDamage.toLocaleString()}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "jade" | "stone" | "gold";
}) {
  const c = {
    jade: "text-[#7aab9a]",
    stone: "text-stone-400",
    gold: "text-[#c9a84c]",
  }[color];

  return (
    <div>
      <p className="text-[9px] text-stone-500">{label}</p>
      <p className={`stat-value text-xs font-bold ${c}`}>{value}</p>
    </div>
  );
}
