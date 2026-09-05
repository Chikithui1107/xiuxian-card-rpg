"use client";

import { useEffect, useState } from "react";
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

const TIP_KEY = "xiuxian_swipe_tip_seen";

export function CardHand({
  hand,
  energy,
  drawPileCount,
  discardPileCount,
  exhaustPileCount: _exhaustPileCount,
  deckCount: _deckCount,
  onPlayCard,
  onDenyPlay,
  onEndTurn,
  lastDamage: _lastDamage,
  disabled,
  denyShake = false,
  feelToast = null,
  playerBar,
}: CardHandProps) {
  const [showTip, setShowTip] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(TIP_KEY)) return;
      sessionStorage.setItem(TIP_KEY, "1");
      setShowTip(true);
      const t = window.setTimeout(() => setShowTip(false), 2400);
      return () => window.clearTimeout(t);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <div className="relative flex h-full flex-col gap-1">
      <div className="shrink-0">{playerBar}</div>

      <div className="flex min-h-0 flex-1 items-center gap-1.5 overflow-visible">
        <div className="relative min-h-0 min-w-0 flex-1 overflow-visible">
          <p className="pointer-events-none absolute left-1 top-0 z-10 text-[9px] tracking-wide text-stone-500">
            <span className="text-stone-600">抽</span>{" "}
            <span className="tabular-nums text-[#9ab8aa]">{drawPileCount}</span>
            <span className="mx-1.5 text-stone-700">·</span>
            <span className="text-stone-600">棄</span>{" "}
            <span className="tabular-nums text-stone-400">{discardPileCount}</span>
          </p>

          <HandUI
            hand={hand}
            energy={energy}
            disabled={disabled}
            denyShake={denyShake}
            onPlayCard={onPlayCard}
            onDenyPlay={onDenyPlay}
          />
          {(feelToast || showTip) && (
            <p className="animate-feel-toast pointer-events-none absolute left-1/2 top-1 z-20 -translate-x-1/2 rounded-sm border border-stone-600/30 bg-stone-950/70 px-2.5 py-0.5 text-[10px] tracking-wide text-stone-300">
              {feelToast ?? "上拖出牌"}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onEndTurn}
          disabled={disabled}
          className="btn-end-turn-seal shrink-0 self-center disabled:cursor-not-allowed disabled:opacity-35"
          aria-label="結束回合"
        >
          <span className="btn-end-turn-seal-label">
            <span>結束</span>
            <span>回合</span>
          </span>
        </button>
      </div>
    </div>
  );
}
