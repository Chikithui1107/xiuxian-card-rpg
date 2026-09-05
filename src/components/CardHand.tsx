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
    <div className="relative flex h-full flex-col gap-1">
      <div className="flex shrink-0 items-center justify-between gap-2 px-0.5">
        <p className="text-[9px] tracking-[0.16em] text-stone-500">上拖出牌</p>
        <p className="text-[9px] tabular-nums text-stone-500">
          <span className="text-[#9ab8aa]">{drawPileCount}</span>
          <span className="mx-0.5 text-stone-600">/</span>
          <span className="text-stone-400">{discardPileCount}</span>
          <span className="mx-0.5 text-stone-600">·</span>
          <span className="text-stone-500">{exhaustPileCount}</span>
          <span className="mx-0.5 text-stone-600">·</span>
          <span className="text-[#c9a84c]/80">{deckCount}</span>
        </p>
      </div>

      <div className="shrink-0">{playerBar}</div>

      <div className="relative min-h-0 flex-1">
        <HandUI
          hand={hand}
          energy={energy}
          disabled={disabled}
          denyShake={denyShake}
          onPlayCard={onPlayCard}
          onDenyPlay={onDenyPlay}
        />
        {feelToast && (
          <p className="animate-feel-toast pointer-events-none absolute left-1/2 top-2 z-20 -translate-x-1/2 rounded-sm border border-[#a85555]/35 bg-stone-950/75 px-2.5 py-0.5 text-[10px] font-semibold text-[#c48888]">
            {feelToast}
          </p>
        )}

        <button
          type="button"
          onClick={onEndTurn}
          disabled={disabled}
          className="btn-end-turn-seal absolute bottom-1 right-0 z-30 disabled:cursor-not-allowed disabled:opacity-35"
          aria-label="收功結束回合"
        >
          <span className="btn-end-turn-seal-label">收功</span>
        </button>
      </div>

      <p
        className={`shrink-0 text-center text-[8px] leading-3 ${
          lastDamage !== null ? "text-stone-600" : "invisible"
        }`}
      >
        上式{" "}
        <span className="text-[#c9a84c]/80">
          {(lastDamage ?? 0).toLocaleString()}
        </span>
      </p>
    </div>
  );
}
