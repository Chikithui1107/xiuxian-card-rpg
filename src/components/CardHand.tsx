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
    <div className="relative flex h-full flex-col gap-1.5">
      <div className="flex shrink-0 items-center justify-between gap-2 px-0.5">
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

      <div className="relative shrink-0">
        <HandUI
          hand={hand}
          energy={energy}
          disabled={disabled}
          denyShake={denyShake}
          onPlayCard={onPlayCard}
          onDenyPlay={onDenyPlay}
        />
        {feelToast && (
          <p className="animate-feel-toast pointer-events-none absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded border border-[#a85555]/50 bg-stone-950/90 px-3 py-1 text-[11px] font-semibold text-[#c48888] shadow-lg">
            {feelToast}
          </p>
        )}
      </div>

      <div className="shrink-0">{playerBar}</div>

      <button
        onClick={onEndTurn}
        disabled={disabled}
        className="btn-cyber-gold w-full shrink-0 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
      >
        收功結束
      </button>

      {/* 固定佔位，避免出牌後出現「上式傷害」把整頁頂上去 */}
      <p
        className={`shrink-0 text-center text-[9px] leading-4 ${
          lastDamage !== null ? "text-stone-500" : "invisible"
        }`}
      >
        上式{" "}
        <span className="text-[#c9a84c]">
          {(lastDamage ?? 0).toLocaleString()}
        </span>
      </p>
    </div>
  );
}
