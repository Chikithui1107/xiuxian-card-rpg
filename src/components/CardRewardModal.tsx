"use client";

import { CARD_TEMPLATES, type CardTemplateId } from "@/lib/battle-deck";
import { CARD_TYPE_ACCENT, CARD_TYPE_COLORS } from "@/types/game";

interface CardRewardModalProps {
  rewardTemplateIds: CardTemplateId[];
  onSelect: (templateId: CardTemplateId) => void;
  onSkip: () => void;
  enemyName: string;
  floorReward?: number;
  isTierComplete?: boolean;
  tierName?: string;
  tierFloor?: number;
  totalFloors?: number;
  onContinue?: () => void;
}

export function CardRewardModal({
  rewardTemplateIds,
  onSelect,
  onSkip,
  enemyName,
  floorReward = 0,
  isTierComplete = false,
  tierName,
  tierFloor,
  totalFloors,
  onContinue,
}: CardRewardModalProps) {
  const progressLabel =
    tierName && tierFloor && totalFloors
      ? `${tierName} · 關卡 ${tierFloor}/${totalFloors}`
      : null;

  const rewardSummary = [
    floorReward > 0 ? `獲得靈石 +${floorReward}` : null,
    "可擇一劍訣納入牌庫",
  ]
    .filter(Boolean)
    .join(" | ");

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
        <p className="mt-3 text-sm text-stone-400">{rewardSummary}</p>
        {isTierComplete && (
          <p className="mt-1 text-[10px] text-[#c9a84c]">通關獎賞另計</p>
        )}
      </div>

      <div className="mb-6 flex w-full max-w-lg flex-wrap justify-center gap-3">
        {rewardTemplateIds.map((templateId) => {
          const card = CARD_TEMPLATES[templateId];
          const typeStyle =
            CARD_TYPE_COLORS[card.type] ?? "border-[#8a7340] bg-[#1a1814]";
          const typeAccent =
            CARD_TYPE_ACCENT[card.type] ?? "text-[#c9a84c]";

          return (
            <button
              key={templateId}
              onClick={() => onSelect(templateId)}
              className={`card-hover ink-card w-[7.5rem] rounded border-2 p-2.5 text-left hover:border-[#7aab9a]/45 active:scale-[0.98] sm:w-28 ${typeStyle}`}
            >
              <div className="mb-0.5 flex items-center justify-between gap-1">
                <span className={`text-[8px] font-semibold ${typeAccent}`}>
                  {card.type}
                </span>
                <span className="text-[8px] text-[#7aab9a]">真元{card.cost}</span>
              </div>
              <h3 className="text-xs font-bold text-stone-200">{card.name}</h3>
              <p className="mt-1 line-clamp-4 text-[8px] leading-snug text-stone-500">
                {card.description}
              </p>
            </button>
          );
        })}
      </div>

      <p className="mb-4 text-center text-[10px] text-stone-500">
        擇一劍訣永久納入牌庫，或放棄以免污染牌組
        {!isTierComplete && tierFloor && totalFloors && tierFloor < totalFloors
          ? "，續闖下一關"
          : ""}
      </p>

      <div className="flex flex-col items-center gap-2.5">
        <button
          type="button"
          onClick={onSkip}
          className="btn-abandon !px-6 !py-2.5 text-xs"
        >
          棄劍不入庫
        </button>
        <p className="text-[9px] text-stone-600">僅保留靈石，不增加牌組張數</p>
      </div>

      {onContinue && (
        <button
          type="button"
          onClick={onContinue}
          className="rounded-full border border-[#7aab9a]/50 bg-[#7aab9a] px-8 py-3 text-sm font-extrabold tracking-wider text-stone-950 shadow-lg shadow-[#7aab9a]/30 transition hover:scale-105 hover:bg-[#9ab8aa]"
        >
          踏入下一重天 →
        </button>
      )}
    </div>
  );
}
