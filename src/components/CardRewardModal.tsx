"use client";

import { CARD_TEMPLATES, type CardTemplateId } from "@/lib/battle-deck";
import { playRewardClickSfx } from "@/lib/combat-audio";
import { CARD_TYPE_COLORS } from "@/types/game";
import { CardFace, cardFaceFromTemplate } from "@/components/CardFace";

interface CardRewardModalProps {
  rewardTemplateIds: CardTemplateId[];
  onSelect: (templateId: CardTemplateId) => void;
  onSkip: () => void;
  enemyName: string;
  floorReward?: number;
  isTierComplete?: boolean;
  isEliteReward?: boolean;
  tierName?: string;
  tierFloor?: number;
  totalFloors?: number;
}

export function CardRewardModal({
  rewardTemplateIds,
  onSelect,
  onSkip,
  enemyName,
  floorReward = 0,
  isTierComplete = false,
  isEliteReward = false,
  tierName,
  tierFloor,
  totalFloors,
}: CardRewardModalProps) {
  const progressLabel =
    tierName && tierFloor && totalFloors
      ? `秘境進度 ${tierFloor}/${totalFloors}`
      : null;

  const rewardSummary = [
    floorReward > 0 ? `獲得靈砂 +${floorReward}` : null,
    "可擇一法訣加入本次牌組",
  ]
    .filter(Boolean)
    .join(" | ");

  const handleSelect = (templateId: CardTemplateId) => {
    playRewardClickSfx();
    onSelect(templateId);
  };

  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 px-4 backdrop-blur-md">
      <div className="mb-6 w-full max-w-md text-center">
        <p className="zone-label text-[#7aab9a]">
          {isTierComplete ? "試煉圓滿" : "戰利品結算"}
        </p>
        <h1 className="victory-title mt-2 text-2xl font-extrabold tracking-[0.28em] sm:text-3xl">
          一劍斬落・強敵伏誅
        </h1>
        <p className="mt-2 text-xs text-stone-500">斬殺 {enemyName}</p>
        {progressLabel && (
          <p className="mt-1 text-[10px] text-[#7aab9a]">{progressLabel}</p>
        )}
        {tierName && (
          <p className="mt-0.5 text-[10px] text-stone-600">{tierName}</p>
        )}
        {isEliteReward && (
          <p className="mt-1 text-[10px] tracking-wide text-[#c9a84c]/90">
            精英戰利品 · 額外法訣可選
          </p>
        )}
        <p className="mt-3 text-sm text-stone-400">{rewardSummary}</p>
        {isTierComplete && (
          <p className="mt-1 text-[10px] text-[#c9a84c]">通關獎賞另計</p>
        )}
      </div>

      <div className="mb-6 flex w-full max-w-2xl flex-wrap justify-center gap-3">
        {rewardTemplateIds.map((templateId) => {
          const card = CARD_TEMPLATES[templateId];
          const typeStyle =
            CARD_TYPE_COLORS[card.type] ?? "ink-card-type-basic bg-[#1a1814]";
          const face = cardFaceFromTemplate(card);

          return (
            <button
              key={templateId}
              onClick={() => handleSelect(templateId)}
              className={`card-hover ink-card overflow-hidden text-left active:scale-[0.98] ${typeStyle}`}
            >
              <CardFace {...face} />
            </button>
          );
        })}
      </div>

      <p className="mb-4 text-center text-[10px] text-stone-500">
        擇一法訣加入本次牌組，或放棄以免牌組臃腫
        {!isTierComplete && tierFloor && totalFloors && tierFloor < totalFloors
          ? "，續行下一段路程"
          : ""}
      </p>

      <div className="flex flex-col items-center gap-2.5">
        <button
          type="button"
          onClick={onSkip}
          className="btn-abandon !px-6 !py-2.5 text-xs"
        >
          捨棄此法
        </button>
        <p className="text-[9px] text-stone-600">
          僅保留靈砂，不增加本次牌組張數
        </p>
      </div>
    </div>
  );
}
