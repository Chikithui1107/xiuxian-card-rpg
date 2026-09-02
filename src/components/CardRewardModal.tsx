"use client";

import type { Card } from "@/types/card";
import { CARD_TYPE_ACCENT, CARD_TYPE_COLORS } from "@/types/game";

interface CardRewardModalProps {
  rewardCards: Card[];
  onSelect: (card: Card) => void;
  enemyName: string;
  floorReward?: number;
  isTierComplete?: boolean;
  tierName?: string;
  tierFloor?: number;
  totalFloors?: number;
}

export function CardRewardModal({
  rewardCards,
  onSelect,
  enemyName,
  floorReward = 0,
  isTierComplete = false,
  tierName,
  tierFloor,
  totalFloors,
}: CardRewardModalProps) {
  const progressLabel =
    tierName && tierFloor && totalFloors
      ? `${tierName} · 第 ${tierFloor}/${totalFloors} 重`
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center">
      <div className="glass-panel-gold mx-auto w-full max-w-md rounded-t-lg p-5 sm:rounded-lg">
        <div className="mb-4 text-center">
          <p className="zone-label text-[#8a7340]">
            {isTierComplete ? "試煉圓滿 · 三選一" : "過關 · 三選一"}
          </p>
          <h2 className="mt-1 text-lg font-bold text-[#c9a84c]">
            斬殺 {enemyName}
          </h2>
          {progressLabel && (
            <p className="mt-1 text-[10px] text-[#7aab9a]">{progressLabel}</p>
          )}
          {floorReward > 0 && (
            <p className="mt-1 text-xs text-[#c9a84c]">
              +{floorReward} 靈石
              {isTierComplete && " · 通關獎賞另計"}
            </p>
          )}
          <p className="mt-1 text-[10px] text-stone-500">
            擇一劍訣，永久納入牌庫
            {!isTierComplete && tierFloor && totalFloors && tierFloor < totalFloors
              ? "，續闖下一重"
              : ""}
          </p>
        </div>

        <div className="space-y-3">
          {rewardCards.map((card) => {
            const typeStyle =
              CARD_TYPE_COLORS[card.type] ?? "border-[#8a7340] bg-[#1a1814]";
            const typeAccent =
              CARD_TYPE_ACCENT[card.type] ?? "text-[#c9a84c]";

            return (
              <button
                key={card.id}
                onClick={() => onSelect(card)}
                className={`card-hover flex w-full items-center gap-3 rounded border-2 p-3 text-left hover:border-[#7aab9a]/45 active:scale-[0.98] ${typeStyle}`}
              >
                <div className="flex-1">
                  <div className="mb-0.5 flex items-center gap-2">
                    <span className={`text-[10px] font-semibold ${typeAccent}`}>
                      {card.type}
                    </span>
                    <span className="text-[10px] text-[#7aab9a]">
                      真元{card.energyCost}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-stone-200">
                    {card.name}
                  </h3>
                  <p className="text-[10px] text-stone-500">{card.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
