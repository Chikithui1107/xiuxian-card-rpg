"use client";

import type { Card } from "@/types/battle";
import { getEffectiveCost } from "@/types/battle";
import { getCardTemplate } from "@/lib/battle-deck";
import { CARD_TYPE_COLORS } from "@/types/game";

interface AspectDiscardModalProps {
  open: boolean;
  aspectLabel: string;
  candidates: Card[];
  onChoose: (instanceId: string) => void;
}

export function AspectDiscardModal({
  open,
  aspectLabel,
  candidates,
  onChoose,
}: AspectDiscardModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 px-3 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] pt-8"
      role="dialog"
      aria-modal
      aria-label={`選擇要棄置的${aspectLabel}`}
    >
      <div className="w-full max-w-sm rounded-sm border border-[#8a7340]/30 bg-[#121110]/95 p-3 shadow-xl">
        <p className="text-center text-[10px] tracking-[0.28em] text-[#8a7340]/80">
          棄置
        </p>
        <h3 className="mt-1 text-center text-sm font-semibold tracking-[0.2em] text-[#e8e0d2]">
          選擇 1 張{aspectLabel}
        </h3>
        <ul className="mt-3 flex max-h-[40vh] flex-col gap-2 overflow-y-auto">
          {candidates.map((card) => {
            const template = getCardTemplate(card);
            const typeStyle =
              CARD_TYPE_COLORS[template?.type ?? ""] ??
              "ink-card-type-basic bg-[#1a1814]";
            return (
              <li key={card.instanceId}>
                <button
                  type="button"
                  className={`ink-card flex w-full items-center justify-between gap-2 p-2 text-left ${typeStyle}`}
                  onClick={() => onChoose(card.instanceId)}
                >
                  <span className="text-[12px] font-bold text-[#f0e6d3]">
                    {card.name}
                  </span>
                  <span className="text-[10px] text-[#7aab9a]">
                    {getEffectiveCost(card)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
