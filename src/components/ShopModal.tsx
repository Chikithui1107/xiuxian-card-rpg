"use client";

import { CARD_TEMPLATES, type CardTemplateId } from "@/lib/battle-deck";
import { playRewardClickSfx } from "@/lib/combat-audio";
import { CARD_TYPE_COLORS } from "@/types/game";
import { CardFace, cardFaceFromTemplate } from "@/components/CardFace";

const SHOP_PRICE = 200;

interface ShopModalProps {
  offerIds: CardTemplateId[];
  runSpirit: number;
  onBuy: (templateId: CardTemplateId) => void;
  onLeave: () => void;
}

export function ShopModal({
  offerIds,
  runSpirit,
  onBuy,
  onLeave,
}: ShopModalProps) {
  const canAfford = runSpirit >= SHOP_PRICE;

  const handleBuy = (templateId: CardTemplateId) => {
    if (!canAfford) return;
    playRewardClickSfx();
    onBuy(templateId);
  };

  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 px-4 backdrop-blur-md">
      <div className="mb-5 w-full max-w-md text-center">
        <p className="zone-label text-[#8a7340]">秘境坊市</p>
        <h2 className="mt-1 text-lg font-bold tracking-[0.28em] text-[#c9a84c]">
          雲遊坊市
        </h2>
        <p className="mt-2 text-[12px] tracking-wide text-stone-400">
          靈砂可換法訣，取捨亦是修行。
        </p>
        <p className="mt-2 text-[11px] text-[#c9a84c]/90">
          現有靈砂 {runSpirit}
        </p>
      </div>

      <div className="mb-5 flex w-full max-w-lg flex-wrap justify-center gap-3">
        {offerIds.map((templateId) => {
          const card = CARD_TEMPLATES[templateId];
          const typeStyle =
            CARD_TYPE_COLORS[card.type] ?? "ink-card-type-basic bg-[#1a1814]";
          const face = cardFaceFromTemplate(card);

          return (
            <div key={templateId} className="flex flex-col items-center gap-2">
              <div
                className={`ink-card overflow-hidden ${typeStyle} ${
                  canAfford ? "" : "opacity-55"
                }`}
              >
                <CardFace {...face} />
              </div>
              <p className="text-[11px] tracking-wide text-[#e8e0d4]">
                {card.name}
              </p>
              <p className="text-[10px] text-[#c9a84c]">200 靈砂</p>
              <button
                type="button"
                disabled={!canAfford}
                onClick={() => handleBuy(templateId)}
                className={`rounded border px-3 py-1.5 text-[11px] tracking-[0.14em] transition ${
                  canAfford
                    ? "border-[#8a7340]/50 bg-stone-950/70 text-[#e8e0d4] hover:border-[#c9a84c]/60"
                    : "cursor-not-allowed border-stone-700/40 bg-stone-950/40 text-stone-500"
                }`}
              >
                {canAfford ? "購得" : "靈砂不足"}
              </button>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onLeave}
        className="btn-abandon !px-6 !py-2.5 text-xs"
      >
        離開坊市
      </button>
      <p className="mt-2 text-[9px] text-stone-600">不購買亦可離去</p>
    </div>
  );
}

export { SHOP_PRICE };
