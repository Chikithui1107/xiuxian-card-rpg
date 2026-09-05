"use client";

import { useState } from "react";
import {
  CARD_ART_PLACEHOLDER,
  resolveCardArt,
  type CardTemplate,
} from "@/lib/battle-deck";
import { getKarmaTemplate, type KarmaAspect } from "@/lib/karma-deck";
import { publicAsset } from "@/lib/paths";
import { CARD_TYPE_ACCENT } from "@/types/game";

export interface CardFaceProps {
  name: string;
  type: string;
  cost: number;
  description: string;
  art?: string | null;
  /** 模板 id，用於推斷因／果視覺 */
  templateId?: string;
  canAfford?: boolean;
  isExhaust?: boolean;
  pulledByKarma?: boolean;
  enlarged?: boolean;
  showSelectHint?: boolean;
  showReady?: boolean;
  /** 緊湊列（棄牌選擇） */
  compact?: boolean;
}

export function aspectClassName(aspect: KarmaAspect | null): string {
  if (aspect === "yin") return "ink-card-aspect-yin";
  if (aspect === "yang") return "ink-card-aspect-yang";
  if (aspect === "both") return "ink-card-aspect-both";
  return "";
}

export function aspectFromTemplateId(templateId?: string): KarmaAspect | null {
  if (!templateId) return null;
  return getKarmaTemplate(templateId)?.aspect ?? null;
}

export function CardFace({
  name,
  type,
  cost,
  description,
  art,
  templateId: _templateId,
  canAfford = true,
  isExhaust = false,
  pulledByKarma = false,
  enlarged = false,
  showSelectHint = false,
  showReady = false,
  compact = false,
}: CardFaceProps) {
  const [broken, setBroken] = useState(false);
  const typeAccent = CARD_TYPE_ACCENT[type] ?? "text-[#c9a84c]";
  const src = publicAsset(
    broken ? CARD_ART_PLACEHOLDER : resolveCardArt(art)
  );

  if (compact) {
    return (
      <div className="relative z-[2] flex w-full items-center gap-2 p-1.5">
        <div className="ink-card-art ink-card-art--compact shrink-0 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            draggable={false}
            className="h-full w-full object-contain"
            onError={() => setBroken(true)}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <span className="truncate text-[12px] font-bold text-[#f0e6d3]">
              {name}
            </span>
            <span className="text-[10px] tabular-nums text-[#7aab9a]">
              {cost}
            </span>
          </div>
          <p className={`text-[8px] font-semibold ${typeAccent}`}>{type}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-[2] flex h-full w-full min-h-0 flex-col">
      {/* 卡名／費用獨立一列，不壓在插畫上 */}
      <div className="flex shrink-0 items-start justify-between gap-1 px-1.5 pb-0.5 pt-1.5">
        <span
          className={`min-w-0 flex-1 text-left font-bold leading-tight tracking-wide text-[#f0e6d3] ${
            enlarged ? "text-[13px]" : "text-[11px]"
          }`}
        >
          {name}
        </span>
        <span
          className={`flex h-[1.2rem] w-[1.2rem] shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold ${
            canAfford
              ? "bg-[#7aab9a]/92 text-stone-950"
              : "bg-[#a85555]/85 text-stone-100"
          }`}
        >
          {cost}
        </span>
      </div>

      {/* 插畫專區：整圖可見，無文字遮罩 */}
      <div
        className={`ink-card-art relative mx-1.5 shrink-0 overflow-hidden ${
          enlarged ? "ink-card-art--enlarged" : ""
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full object-contain"
          onError={() => setBroken(true)}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-1.5 pb-1.5 pt-1">
        <p
          className={`min-h-0 flex-1 overflow-y-auto break-words text-left text-stone-300 ${
            enlarged
              ? "text-[11px] leading-[1.4]"
              : "text-[9px] leading-[1.35]"
          }`}
        >
          {description}
        </p>

        <div className="mt-1 shrink-0">
          <p className={`text-[8px] font-semibold ${typeAccent}`}>{type}</p>
          {pulledByKarma && (
            <p className="text-[8px] font-semibold tracking-[0.18em] text-[#9ec9b8]">
              牽引
            </p>
          )}
          {isExhaust && (
            <p className="text-[8px] text-amber-500/70">消耗</p>
          )}
          {showSelectHint && (
            <p className="mt-0.5 text-[8px] text-stone-500">上拖出牌</p>
          )}
          {showReady && (
            <p className="mt-0.5 text-[9px] font-bold text-[#7aab9a]">
              松手出牌
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/** 從模板組裝卡面（獎勵／靜態預覽） */
export function cardFaceFromTemplate(
  template: CardTemplate,
  extras: Partial<CardFaceProps> = {}
): CardFaceProps {
  return {
    name: template.name,
    type: template.type,
    cost: template.cost,
    description: template.description,
    art: template.art,
    templateId: template.id,
    isExhaust: template.isExhaust,
    ...extras,
  };
}
