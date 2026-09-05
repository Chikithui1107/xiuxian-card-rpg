"use client";

import { HandUI } from "@/components/HandUI";
import type { Card } from "@/types/battle";
import type { ReactNode } from "react";

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
  /** 主角狀態條：放在手牌下方 */
  playerBar?: ReactNode;
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
  playerBar,
}: CardHandProps) {
  return (
    <div className="relative space-y-1.5">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <p className="text-[10px] tracking-[0.18em] text-stone-400">上拖出牌</p>
        <p className="text-[10px] tabular-nums text-stone-400">
          <span className="text-[#9ab8aa]">{drawPileCount}</span>
          <span className="mx-1 text-stone-600">/</span>
          <span className="text-stone-300">{discardPileCount}</span>
          <span className="mx-1 text-stone-600">·</span>
          <span className="text-stone-500">{exhaustPileCount}</span>
          <span className="mx-1 text-stone-600">·</span>
          <span className="text-[#c9a84c]">{deckCount}</span>
        </p>
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
        <p className="animate-feel-toast pointer-events-none absolute left-1/2 top-6 z-20 -translate-x-1/2 rounded border border-[#a85555]/50 bg-stone-950/90 px-3 py-1 text-[11px] font-semibold text-[#c48888] shadow-lg">
          {feelToast}
        </p>
      )}

      {playerBar}

      <button
        onClick={onEndTurn}
        disabled={disabled}
        className="btn-cyber-gold w-full py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
      >
        收功結束
      </button>
      {lastDamage !== null && (
        <p className="text-center text-[9px] text-stone-500">
          上式{" "}
          <span className="text-[#c9a84c]">{lastDamage.toLocaleString()}</span>
        </p>
      )}
    </div>
  );
}
