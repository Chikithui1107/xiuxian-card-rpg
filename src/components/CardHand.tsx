"use client";

import { useEffect, useState, type ReactNode, type Ref } from "react";
import { HandUI } from "@/components/HandUI";
import { DeckPile } from "@/components/DeckPile";
import type { Card } from "@/types/battle";
import type { CardFacePreviewState } from "@/lib/card-face-display";

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
  facePreview?: CardFacePreviewState;
  /** 抽／棄動畫進行中暫時隱藏真實手牌 */
  hiddenCardIds?: ReadonlySet<string>;
  drawPileRef?: Ref<HTMLDivElement | null>;
  discardPileRef?: Ref<HTMLDivElement | null>;
  discardPilePulse?: boolean;
  drawPilePulse?: boolean;
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
  facePreview,
  hiddenCardIds,
  drawPileRef,
  discardPileRef,
  discardPilePulse = false,
  drawPilePulse = false,
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
    <div className="relative flex h-full min-h-0 flex-col gap-0.5">
      <div className="flex shrink-0 items-start justify-between gap-2 px-0.5">
        <div className="min-w-0 flex-1">{playerBar}</div>
        {hand.length >= 7 && (
          <p className="shrink-0 pt-1 text-[9px] tracking-wide text-stone-500">
            <span className="text-stone-600">手牌</span>{" "}
            <span className="tabular-nums text-[#c9a84c]">{hand.length}</span>
          </p>
        )}
      </div>

      {/* 手牌區：貼近 HUD、佔滿寬；結束回合與牌堆在下方 */}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-visible">
        <div className="relative flex min-h-0 flex-1 items-start justify-center pt-0.5">
          <HandUI
            hand={hand}
            energy={energy}
            disabled={disabled}
            denyShake={denyShake}
            onPlayCard={onPlayCard}
            onDenyPlay={onDenyPlay}
            facePreview={facePreview}
            hiddenCardIds={hiddenCardIds}
          />
          {(feelToast || showTip) && (
            <p className="animate-feel-toast pointer-events-none absolute left-1/2 top-0 z-20 -translate-x-1/2 rounded-sm border border-stone-600/30 bg-stone-950/70 px-2.5 py-0.5 text-[10px] tracking-wide text-stone-300">
              {feelToast ?? "上拖出牌"}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-end justify-between gap-2 px-0.5 pb-0.5 pt-1">
          <DeckPile
            ref={drawPileRef}
            label="抽牌堆"
            count={drawPileCount}
            variant="draw"
            pulse={drawPilePulse}
          />
          <button
            type="button"
            onClick={onEndTurn}
            disabled={disabled}
            className="btn-end-turn-seal disabled:cursor-not-allowed disabled:opacity-35"
            aria-label="結束回合"
          >
            <span className="btn-end-turn-seal-label">
              <span>結束</span>
              <span>回合</span>
            </span>
          </button>
          <DeckPile
            ref={discardPileRef}
            label="棄牌堆"
            count={discardPileCount}
            variant="discard"
            pulse={discardPilePulse}
          />
        </div>
      </div>
    </div>
  );
}
