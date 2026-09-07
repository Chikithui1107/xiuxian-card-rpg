"use client";

import { useState } from "react";
import {
  resolveCardIcon,
  type CardTemplate,
} from "@/lib/battle-deck";
import {
  getKarmaCardFaceDisplay,
  type CardFacePreviewState,
} from "@/lib/card-face-display";
import { getKarmaTemplate, type KarmaAspect } from "@/lib/karma-deck";
import { publicAsset } from "@/lib/paths";
import { CARD_TYPE_ACCENT } from "@/types/game";

export interface CardFaceProps {
  name: string;
  type: string;
  cost: number;
  description: string;
  art?: string | null;
  icon?: string | null;
  templateId?: string;
  canAfford?: boolean;
  isExhaust?: boolean;
  pulledByKarma?: boolean;
  showSelectHint?: boolean;
  showReady?: boolean;
  compact?: boolean;
  preview?: CardFacePreviewState;
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

function AspectMark({ type }: { type: string }) {
  if (type === "因牌") return <span aria-hidden>因</span>;
  if (type === "果牌") return <span aria-hidden>果</span>;
  if (type === "因／果牌") return <span aria-hidden>因／果</span>;
  return null;
}

/** 將 **粗體** 片段渲染為高亮數值 */
function FaceLineText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <span
              key={i}
              className="font-semibold tabular-nums text-[#f0e6d3]"
            >
              {part.slice(2, -2)}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

export function CardFace({
  name,
  type,
  cost,
  description,
  icon,
  templateId,
  canAfford = true,
  isExhaust = false,
  pulledByKarma = false,
  showSelectHint = false,
  showReady = false,
  compact = false,
  preview,
}: CardFaceProps) {
  const [iconBroken, setIconBroken] = useState(false);
  const typeAccent = CARD_TYPE_ACCENT[type] ?? "text-[#c9a84c]";
  const iconPath = !iconBroken ? resolveCardIcon(icon) : null;
  const karmaDisplay = templateId
    ? getKarmaCardFaceDisplay(templateId, preview)
    : null;

  if (compact) {
    return (
      <div className="relative z-[2] flex w-full items-center gap-2 p-1.5">
        {iconPath && (
          <div className="ink-card-icon ink-card-icon--compact shrink-0 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={publicAsset(iconPath)}
              alt=""
              draggable={false}
              className="h-full w-full object-contain"
              onError={() => setIconBroken(true)}
            />
          </div>
        )}
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
    <div className="relative z-[2] flex h-full w-full min-h-0 flex-col px-1.5 pb-1.5 pt-1.5">
      <div className="flex shrink-0 items-start justify-between gap-1">
        <span className="min-w-0 flex-1 text-left text-[11px] font-bold leading-tight tracking-wide text-[#f0e6d3]">
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

      {iconPath && (
        <div className="ink-card-icon relative mx-auto mt-1 shrink-0 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={publicAsset(iconPath)}
            alt=""
            draggable={false}
            className="h-full w-full object-contain"
            onError={() => setIconBroken(true)}
          />
        </div>
      )}

      <div className="mt-1 flex min-h-0 flex-1 flex-col justify-center gap-0.5">
        {karmaDisplay ? (
          karmaDisplay.coreLines.map((line, i) => (
            <p
              key={`${line.text}-${i}`}
              className={`text-left text-[9px] leading-snug text-stone-400 ${
                line.dimmed ? "opacity-35" : ""
              }`}
            >
              <FaceLineText text={line.text} />
            </p>
          ))
        ) : (
          <p className="text-left text-[9px] leading-snug text-stone-300">
            {description}
          </p>
        )}
      </div>

      <div className="mt-1 shrink-0">
        <p
          className={`flex items-center gap-1 text-[8px] font-semibold tracking-wide ${typeAccent}`}
        >
          <AspectMark type={type} />
          <span>{type}</span>
        </p>
        {pulledByKarma && (
          <p className="text-[8px] font-semibold tracking-[0.18em] text-[#9ec9b8]">
            牽引
          </p>
        )}
        {isExhaust && <p className="text-[8px] text-amber-500/70">消耗</p>}
        {showSelectHint && (
          <p className="mt-0.5 text-[8px] text-stone-500">上拖出牌</p>
        )}
        {showReady && (
          <p className="mt-0.5 text-[9px] font-bold text-[#7aab9a]">松手出牌</p>
        )}
      </div>
    </div>
  );
}

export function cardFaceFromTemplate(
  template: CardTemplate,
  extras: Partial<CardFaceProps> = {}
): CardFaceProps {
  return {
    name: template.name,
    type: template.type,
    cost: template.cost,
    description: template.description,
    icon: template.icon ?? template.art,
    templateId: template.id,
    isExhaust: template.isExhaust,
    ...extras,
  };
}
