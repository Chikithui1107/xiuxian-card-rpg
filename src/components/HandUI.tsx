"use client";

import {
  CARD_TEMPLATES,
  type CardTemplateId,
} from "@/lib/battle-deck";
import type { Card } from "@/types/battle";
import { CARD_TYPE_ACCENT, CARD_TYPE_COLORS } from "@/types/game";

interface HandUIProps {
  hand: Card[];
  energy: number;
  disabled?: boolean;
  onPlayCard: (card: Card) => void;
}

function getOverlapClass(total: number) {
  if (total <= 4) return "-space-x-2";
  if (total === 5) return "-space-x-6";
  return "-space-x-10";
}

export function HandUI({
  hand,
  energy,
  disabled = false,
  onPlayCard,
}: HandUIProps) {
  if (hand.length === 0) {
    return (
      <p className="flex min-h-[8.5rem] items-center justify-center text-xs text-stone-500">
        手牌已空
      </p>
    );
  }

  return (
    <div className="flex justify-center px-1 pb-1 pt-2">
      <div
        className={`flex items-end justify-center ${getOverlapClass(hand.length)} transition-all duration-300`}
      >
        {hand.map((card, index) => {
          const template = CARD_TEMPLATES[card.id as CardTemplateId];
          const canAfford = energy >= card.cost;
          const cardDisabled = disabled || !canAfford;
          const typeStyle =
            CARD_TYPE_COLORS[template?.type ?? ""] ??
            "border-[#8a7340] bg-[#1a1814]";
          const typeAccent =
            CARD_TYPE_ACCENT[template?.type ?? ""] ?? "text-[#c9a84c]";

          return (
            <button
              key={card.instanceId}
              type="button"
              disabled={cardDisabled}
              onClick={() => onPlayCard(card)}
              className={`ink-card group relative origin-bottom transform transition-all duration-200 hover:z-30 hover:-translate-y-8 hover:scale-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:scale-100 ${typeStyle}`}
              style={{ zIndex: index }}
            >
              <div className="group/card flex h-[8.75rem] w-[5.25rem] flex-col rounded-lg border-2 p-1.5 shadow-lg shadow-black/40 sm:h-[9.5rem] sm:w-24 sm:p-2">
                <div className="flex items-start justify-between gap-0.5">
                  <span className="line-clamp-2 text-left text-[9px] font-bold leading-tight text-[#f0e6d3] sm:text-[10px]">
                    {card.name}
                  </span>
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-extrabold sm:h-5 sm:w-5 sm:text-[10px] ${
                      canAfford
                        ? "bg-[#7aab9a] text-stone-950"
                        : "bg-[#a85555] text-stone-100"
                    }`}
                  >
                    {card.cost}
                  </span>
                </div>
                <p className="mt-1 line-clamp-4 flex-1 overflow-hidden text-left text-[7px] leading-snug text-stone-400 group-hover/card:line-clamp-none sm:text-[8px]">
                  {template?.description}
                </p>
                <div className="mt-1 shrink-0">
                  <p className={`text-[7px] font-semibold sm:text-[8px] ${typeAccent}`}>
                    {template?.type}
                  </p>
                  {card.isExhaust && (
                    <p className="text-[7px] text-amber-500/80 sm:text-[8px]">消耗</p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
