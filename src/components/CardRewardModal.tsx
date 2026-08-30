"use client";

import type { Card } from "@/types/game";
import { CARD_TYPE_ACCENT, CARD_TYPE_COLORS } from "@/types/game";

interface CardRewardModalProps {
  rewardCards: Card[];
  onSelect: (card: Card) => void;
  enemyName: string;
}

export function CardRewardModal({
  rewardCards,
  onSelect,
  enemyName,
}: CardRewardModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0a]/85 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-2xl rounded-xl border-2 border-[#c9a84c]/50 bg-[#1a1814] p-6 shadow-2xl">
        <div className="mb-6 text-center">
          <p className="text-sm tracking-[0.4em] text-[#8a7340]">戰鬥勝利</p>
          <h2 className="mt-1 text-2xl font-bold tracking-widest text-[#c9a84c]">
            斬殺 {enemyName}
          </h2>
          <p className="mt-2 text-xs text-[#5a5550]">
            選擇一張卡牌，永久加入你的牌庫
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-4">
          {rewardCards.map((card) => (
            <button
              key={card.id}
              onClick={() => onSelect(card)}
              className={`card-hover w-44 rounded-lg border-2 p-4 text-left transition-all duration-200 ${CARD_TYPE_COLORS[card.type]}`}
            >
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={`text-[10px] font-semibold tracking-wider ${CARD_TYPE_ACCENT[card.type]}`}
                >
                  {card.type}
                </span>
                <span className="text-[10px] text-[#5a9a88]">
                  ⚡{card.energyCost}
                </span>
              </div>
              <h3 className="mb-2 text-base font-bold text-[#f0e6d3]">
                {card.name}
              </h3>
              <p className="mb-3 text-[10px] leading-relaxed text-[#5a5550]">
                {card.description}
              </p>
              <div className="flex items-center justify-between border-t border-[#2a2824] pt-2">
                <span className="text-[10px] text-[#8a7340]">
                  ×{card.multiplier}
                </span>
                <span className="stat-value text-sm font-bold text-[#c9a84c]">
                  +{card.baseValue}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
